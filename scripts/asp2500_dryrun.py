#!/usr/bin/env python3
"""P9D.1 PRIVATE ASP2500 source intake, source audit and offline DB diff.
NO NETWORK, NO DATABASE CLIENT, NO INSERT/UPDATE/DELETE, NO PUBLIC QUESTION OUTPUT.
Uses only Python standard library (zipfile + XML) to read workbook OOXML safely.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import posixpath
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

EXPECTED_SHA256 = "37def22d09ee2deacd5352bd9f6ffaf7ef55fbda1fd798ea456a6690939c24d5"
EXPECTED_SHEETS = {
    "Domain 1": 250, "Domain 2": 625, "Domain 3": 200,
    "Domain 4": 300, "Domain 5": 250, "Domain 6": 300,
    "Domain 7": 175, "Domain 8": 275, "Domain 9": 125,
}
EXPECTED_COLUMNS = (
    "Question", "Option A", "Option B", "Option C", "Option D",
    "Correct Answer", "Explanation",
)
MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
DELIM = "\x1f"
SNAPSHOT_COLS = (
    "snapshot_version", "course_slug", "source_id", "prompt_sha256",
    "choices_key_sha256", "explanation_sha256", "approval_state",
    "mock_exclusive", "ever_attempted",
)


class IntakeError(ValueError):
    pass


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize(text: str) -> str:
    # Identical to SQL lower(regexp_replace(btrim(x),'[[:space:]]+',' ','g'))
    # for plain-English workbook inputs. Non-English casing differences should
    # be inspected manually before trusting cross-database matches.
    return " ".join(text.strip().lower().split())


def canonical_id(question: str) -> str:
    # Stable if sheets/rows are reordered; a changed question becomes a new ID.
    return "ASP2500-" + sha(normalize(question))


def fingerprints(question: str, choices: list[str], answer: str, explanation: str) -> dict:
    answer_idx = "ABCD".index(answer)
    return {
        "source_id": canonical_id(question),
        "prompt_sha256": sha(normalize(question)),
        "choices_key_sha256": sha(DELIM.join([*(normalize(x) for x in choices), str(answer_idx)])),
        "explanation_sha256": sha(normalize(explanation)),
    }


def _xml(archive: zipfile.ZipFile, name: str) -> ET.Element:
    if name.startswith("/") or ".." in name.split("/") or name not in archive.namelist():
        raise IntakeError("Unexpected Excel XML package layout.")
    raw = archive.read(name)
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise IntakeError("Unsafe XML declaration in workbook.")
    return ET.fromstring(raw)


def _cell_col(cell_reference: str) -> int:
    match = re.match(r"^([A-Z]+)[0-9]+$", cell_reference)
    if not match:
        raise IntakeError("Invalid Excel cell address.")
    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - ord("A") + 1
    return index - 1


def _strings(root: ET.Element) -> list[str]:
    return [
        "".join(t.text or "" for t in item.iter(MAIN + "t"))
        for item in root.findall(MAIN + "si")
    ]


def _sheet_data(root: ET.Element, shared: list[str], sheet_name: str) -> list[list[str]]:
    rows = []
    data = root.find(MAIN + "sheetData")
    if data is None:
        raise IntakeError("Missing sheetData in " + sheet_name)
    for row in data.findall(MAIN + "row"):
        vals = [""] * 7
        extra = False
        for cell in row.findall(MAIN + "c"):
            if cell.find(MAIN + "f") is not None:
                raise IntakeError("Formula cell rejected in " + sheet_name)
            col = _cell_col(cell.attrib.get("r", ""))
            if col > 6:
                extra = True
                continue
            typ = cell.attrib.get("t")
            value_node = cell.find(MAIN + "v")
            if typ == "inlineStr":
                inline = cell.find(MAIN + "is")
                value = "".join(t.text or "" for t in inline.iter(MAIN + "t")) if inline is not None else ""
            elif typ == "s":
                try:
                    value = shared[int(value_node.text)]  # type: ignore[arg-type]
                except (TypeError, ValueError, IndexError):
                    raise IntakeError("Invalid shared string reference in " + sheet_name) from None
            elif typ in ("str", "n", None):
                value = value_node.text or "" if value_node is not None else ""
            else:
                raise IntakeError("Unsupported Excel cell type in " + sheet_name)
            vals[col] = str(value)
        if extra:
            raise IntakeError("Unexpected extra column in " + sheet_name)
        if any(vals):
            rows.append(vals)
    if not rows or tuple(rows[0]) != EXPECTED_COLUMNS:
        raise IntakeError("Unexpected seven-column header in " + sheet_name)
    return rows[1:]


def _sheet_paths(archive: zipfile.ZipFile) -> dict[str, str]:
    workbook = _xml(archive, "xl/workbook.xml")
    rels = _xml(archive, "xl/_rels/workbook.xml.rels")
    references = {}
    for r in rels.findall(PKG_REL + "Relationship"):
        if r.attrib.get("Type", "").endswith("/worksheet"):
            target = r.attrib.get("Target", "")
            if target.startswith("/"):
                resolved = posixpath.normpath(target.lstrip("/"))
            else:
                resolved = posixpath.normpath(posixpath.join("xl", target))
            if not resolved.startswith("xl/worksheets/"):
                raise IntakeError("Unsafe worksheet path.")
            references[r.attrib["Id"]] = resolved
    sheets = workbook.find(MAIN + "sheets")
    if sheets is None:
        raise IntakeError("Missing worksheet metadata.")
    result = {}
    for sheet in sheets.findall(MAIN + "sheet"):
        name = sheet.attrib.get("name", "")
        relationship = sheet.attrib.get(REL + "id")
        if relationship not in references or name in result:
            raise IntakeError("Invalid worksheet relationship.")
        result[name] = references[relationship]
    if list(result) != list(EXPECTED_SHEETS):
        raise IntakeError("Expected exactly nine ordered ASP Domain 1..9 worksheets.")
    return result


def read_workbook(path: Path, expected_sha: str) -> tuple[dict, list[dict]]:
    if not path.is_file() or path.suffix.lower() != ".xlsx":
        raise IntakeError("A local .xlsx source file is required.")
    if path.stat().st_size > 15 * 1024 * 1024:
        raise IntakeError("Workbook exceeds 15 MB intake limit.")
    actual_sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if not re.fullmatch(r"[a-f0-9]{64}", expected_sha) or actual_sha != expected_sha:
        raise IntakeError("Workbook SHA256 mismatch. Stop; do not import a changed file.")
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) > 200 or sum(x.file_size for x in members) > 50 * 1024 * 1024:
            raise IntakeError("Workbook ZIP safety threshold exceeded.")
        if any(x.flag_bits & 1 for x in members):
            raise IntakeError("Password-protected workbook unsupported.")
        shared = _strings(_xml(archive, "xl/sharedStrings.xml")) if "xl/sharedStrings.xml" in archive.namelist() else []
        paths = _sheet_paths(archive)
        all_rows = []
        sheet_counts = {}
        for sheet_name, xml_path in paths.items():
            records = _sheet_data(_xml(archive, xml_path), shared, sheet_name)
            sheet_counts[sheet_name] = len(records)
            if len(records) != EXPECTED_SHEETS[sheet_name]:
                raise IntakeError("Unexpected item count in " + sheet_name)
            for row_number, cells in enumerate(records, start=2):
                if not all(value.strip() for value in cells):
                    raise IntakeError("Blank required field in " + sheet_name + ", row " + str(row_number))
                if any(len(value) > (12000 if index == 0 else 20000) for index, value in enumerate(cells)):
                    raise IntakeError("Excessively long field in " + sheet_name + ", row " + str(row_number))
                answer = cells[5].strip().upper()
                if answer not in ("A", "B", "C", "D"):
                    raise IntakeError("Invalid A-D answer in " + sheet_name + ", row " + str(row_number))
                if len(set(normalize(c) for c in cells[1:5])) < 4:
                    raise IntakeError("Duplicate answer options in " + sheet_name + ", row " + str(row_number))
                record = fingerprints(cells[0], cells[1:5], answer, cells[6])
                record["sheet"] = sheet_name
                record["row"] = row_number
                all_rows.append(record)
    ids = [r["source_id"] for r in all_rows]
    if len(ids) != 2500 or len(set(ids)) != 2500:
        raise IntakeError("Missing or duplicate normalized question prompts across 2,500 rows.")
    summary = {
        "source_file_sha256": actual_sha,
        "source_type": "PRIVATE_ASP2500_CANDIDATE",
        "rows": len(all_rows),
        "sheet_counts": sheet_counts,
        "domain_mapping": "PROPOSED_ONLY_NOT_APPROVED",
        "difficulty": "NOT_PROVIDED",
        "independent_references": "NOT_PROVIDED",
        "answer_rights_review": "NOT_VERIFIED",
        "mock_reserved": False,
        "database_writes": 0,
    }
    return summary, all_rows


def _bool(value: str) -> bool:
    if value.lower() in ("true", "t", "1"):
        return True
    if value.lower() in ("false", "f", "0"):
        return False
    raise IntakeError("Invalid boolean in local read-only snapshot.")


def read_snapshot(path: Path) -> list[dict]:
    if not path.is_file() or path.suffix.lower() != ".csv":
        raise IntakeError("Expected local .csv from P9D1_READ_ONLY_DB_FINGERPRINTS.sql.")
    if path.stat().st_size > 20 * 1024 * 1024:
        raise IntakeError("Database snapshot export too large.")
    with path.open(newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or set(reader.fieldnames) != set(SNAPSHOT_COLS):
            raise IntakeError("Unexpected database snapshot CSV columns.")
        rows = []
        for item in reader:
            if item["snapshot_version"] != "P9D1_V1" or item["course_slug"] != "asp":
                raise IntakeError("Wrong project/course/snapshot format; stop.")
            if any(not re.fullmatch(r"[a-f0-9]{64}", item[key]) for key in
                    ("prompt_sha256", "choices_key_sha256", "explanation_sha256")):
                raise IntakeError("Invalid source fingerprint in database snapshot.")
            if item["approval_state"] not in ("draft", "approved", "archived"):
                raise IntakeError("Invalid question status in database snapshot.")
            item["mock_exclusive"] = _bool(item["mock_exclusive"])
            item["ever_attempted"] = _bool(item["ever_attempted"])
            rows.append(item)
            if len(rows) > 100000:
                raise IntakeError("Database snapshot exceeds size limit.")
    if len(set(row["source_id"] for row in rows)) != len(rows):
        raise IntakeError("Duplicate source IDs in database snapshot.")
    return rows


def compare(candidate_rows: list[dict], snapshot: list[dict]) -> dict:
    by_source = {r["source_id"]: r for r in snapshot}
    by_prompt = defaultdict(list)
    for r in snapshot:
        by_prompt[r["prompt_sha256"]].append(r)
    counts = Counter()
    for candidate in candidate_rows:
        current = by_source.get(candidate["source_id"])
        matches = by_prompt[candidate["prompt_sha256"]]
        if current is not None and current["prompt_sha256"] != candidate["prompt_sha256"]:
            status = "SOURCE_ID_COLLISION_STOP"
        elif len(matches) > 1:
            status = "DUPLICATE_DB_PROMPT_REVIEW"
        elif current is None and not matches:
            status = "NEW_DRAFT_CANDIDATE"
        else:
            existing = current or matches[0]
            if (existing["choices_key_sha256"] == candidate["choices_key_sha256"]
                    and existing["explanation_sha256"] == candidate["explanation_sha256"]):
                status = "EXACT_DUPLICATE_PRESERVE_EXISTING"
            elif (existing["approval_state"] != "draft" or existing["mock_exclusive"]
                    or existing["ever_attempted"]):
                status = "PROTECTED_CONTENT_CONFLICT_STOP"
            elif existing["choices_key_sha256"] != candidate["choices_key_sha256"]:
                status = "ANSWER_OR_OPTIONS_MISMATCH_REVIEW"
            else:
                status = "EXPLANATION_MISMATCH_REVIEW"
        counts[status] += 1
    return {
        "comparison_mode": "OFFLINE_PRIVATE_EXPORT",
        "snapshot_rows": len(snapshot),
        "source_rows_compared": len(candidate_rows),
        "counts": {name: counts[name] for name in (
            "NEW_DRAFT_CANDIDATE", "EXACT_DUPLICATE_PRESERVE_EXISTING",
            "ANSWER_OR_OPTIONS_MISMATCH_REVIEW", "EXPLANATION_MISMATCH_REVIEW",
            "PROTECTED_CONTENT_CONFLICT_STOP", "SOURCE_ID_COLLISION_STOP",
            "DUPLICATE_DB_PROMPT_REVIEW"
        )},
        "conflict_count": sum(counts[name] for name in (
            "PROTECTED_CONTENT_CONFLICT_STOP", "SOURCE_ID_COLLISION_STOP",
            "DUPLICATE_DB_PROMPT_REVIEW"
        )),
        "import_authorized": False,
        "database_writes": 0,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="PRIVATE P9D.1 ASP2500 DRY RUN ONLY. NO NETWORK/DB WRITE.")
    parser.add_argument("--source", type=Path, required=True, help="Local private ASP2500 .xlsx")
    parser.add_argument("--expected-sha256", default=EXPECTED_SHA256,
                        help="Pin source SHA256; replace only for explicitly inspected new workbook")
    parser.add_argument("--existing-snapshot", type=Path,
                        help="Optional private local CSV exported using P9D1 read-only SQL")
    parser.add_argument("--report-out", type=Path,
                        help="Optional JSON file with AGGREGATE COUNTS ONLY (no question content)")
    args = parser.parse_args()
    try:
        summary, questions = read_workbook(args.source, args.expected_sha256)
        if args.existing_snapshot:
            summary["comparison"] = compare(questions, read_snapshot(args.existing_snapshot))
        else:
            summary["comparison"] = {
                "comparison_mode": "SOURCE_ONLY_NO_DB_SNAPSHOT",
                "database_counts_known": False,
                "warning": "Run P9D1 read-only SQL in confirmed Technica Supabase; export CSV privately; rerun with --existing-snapshot.",
                "import_authorized": False,
                "database_writes": 0,
            }
        if args.report_out:
            if args.report_out.suffix.lower() != ".json":
                raise IntakeError("Aggregate report output must be .json")
            args.report_out.parent.mkdir(parents=True, exist_ok=True)
            args.report_out.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(summary, indent=2))
        return 0
    except (IntakeError, OSError, zipfile.BadZipFile, ET.ParseError) as exc:
        # No question text or credentials in errors.
        print("P9D1 STOP: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

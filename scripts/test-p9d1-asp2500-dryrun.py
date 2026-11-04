#!/usr/bin/env python3
"""P9D.1 synthetic local QA. Never uses/commits the user's 2,500 private Qs."""
import csv
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
import asp2500_dryrun as subject

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"


def workbook_bytes(rows_per_sheet=None):
    counts = rows_per_sheet or subject.EXPECTED_SHEETS
    wb = ET.Element("workbook", xmlns=NS)
    sheets = ET.SubElement(wb, "sheets")
    rs = ET.Element("Relationships", xmlns=PKG)
    entries = {}
    for index, (name, count) in enumerate(counts.items(), start=1):
        sheet = ET.SubElement(sheets, "sheet", {
            "name": name, "sheetId": str(index), "{%s}id" % REL: "R" + str(index)})
        ET.SubElement(rs, "Relationship", {
            "Id": "R" + str(index), "Type": REL + "/worksheet",
            "Target": "/xl/worksheets/sheet%d.xml" % index})
        root = ET.Element("worksheet", xmlns=NS)
        data = ET.SubElement(root, "sheetData")
        for rowidx in range(count + 1):
            row = ET.SubElement(data, "row", r=str(rowidx + 1))
            if rowidx == 0:
                values = list(subject.EXPECTED_COLUMNS)
            else:
                values = [
                    "Synthetic ASP question %d scenario %04d?" % (index, rowidx),
                    "Synthetic Option A", "Synthetic Option B",
                    "Synthetic Option C", "Synthetic Option D",
                    "A", "Synthetic explanation only",
                ]
            for col, value in enumerate(values):
                cell = ET.SubElement(row, "c", {
                    "r": chr(65 + col) + str(rowidx + 1), "t": "inlineStr"})
                item = ET.SubElement(cell, "is")
                ET.SubElement(item, "t").text = value
        entries["xl/worksheets/sheet%d.xml" % index] = ET.tostring(root, encoding="utf-8")
    entries["xl/workbook.xml"] = ET.tostring(wb, encoding="utf-8")
    entries["xl/_rels/workbook.xml.rels"] = ET.tostring(rs, encoding="utf-8")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries.items():
            archive.writestr(name, data)
    return buffer.getvalue()


class SyntheticIntakeQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p9d1-")
        cls.dir = Path(cls.temp.name)
        content = workbook_bytes()
        cls.path = cls.dir / "qa-private.xlsx"
        cls.path.write_bytes(content)
        cls.sha = hashlib.sha256(content).hexdigest()
        cls.summary, cls.items = subject.read_workbook(cls.path, cls.sha)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def command(self, *args):
        return subprocess.run([
            sys.executable, str(Path(subject.__file__).resolve()),
            "--source", str(self.path), "--expected-sha256", self.sha,
            *args,
        ], capture_output=True, text=True, check=False)

    def test_excel_strict_source(self):
        self.assertEqual(self.summary["rows"], 2500)
        self.assertEqual(self.summary["sheet_counts"], subject.EXPECTED_SHEETS)
        self.assertEqual(self.summary["database_writes"], 0)
        self.assertEqual(len(set(q["source_id"] for q in self.items)), 2500)
        self.assertTrue(all(q["source_id"].startswith("ASP2500-") for q in self.items))
        self.assertEqual(subject.canonical_id("  ABC \n DEF  "),
                         subject.canonical_id("abc def"))
        self.assertEqual(self.items[0]["choices_key_sha256"],
                         subject.fingerprints("any", ["Synthetic Option A",
                         "Synthetic Option B","Synthetic Option C",
                         "Synthetic Option D"],"A","different")["choices_key_sha256"])

    def test_exact_source_sha_pinned(self):
        self.assertNotEqual(self.command("--report-out", str(self.dir / "x.json")).returncode, 0)
        attempt = subprocess.run([
            sys.executable, str(Path(subject.__file__).resolve()),
            "--source", str(self.path),
        ], capture_output=True, text=True, check=False)
        self.assertEqual(attempt.returncode, 2)
        self.assertIn("SHA256 mismatch", attempt.stderr)

    def test_source_only_no_db_claims(self):
        result = self.command()
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report["comparison"]["comparison_mode"], "SOURCE_ONLY_NO_DB_SNAPSHOT")
        self.assertFalse(report["comparison"]["database_counts_known"])
        self.assertEqual(report["comparison"]["database_writes"], 0)
        self.assertNotIn("Synthetic ASP question", result.stdout)
        self.assertNotIn("Synthetic Option A", result.stdout)

    def test_snapshot_diff_and_protected_collision(self):
        q = self.items
        def snap(item, src=None, key=None, explanation=None, prompt=None,
                 state="draft", mock=False, attempted=False):
            return {
                "snapshot_version": "P9D1_V1", "course_slug": "asp",
                "source_id": src or item["source_id"],
                "prompt_sha256": prompt or item["prompt_sha256"],
                "choices_key_sha256": key or item["choices_key_sha256"],
                "explanation_sha256": explanation or item["explanation_sha256"],
                "approval_state": state,
                "mock_exclusive": str(mock).lower(),
                "ever_attempted": str(attempted).lower(),
            }
        rows = [
            snap(q[0]),
            snap(q[1], state="approved"),  # exact: never rewrite approved
            snap(q[2], key="0" * 64),
            snap(q[3], explanation="0" * 64),
            snap(q[4], key="0" * 64, state="approved", mock=True, attempted=True),
            snap(q[5], prompt="f" * 64),  # stable ID collision -> stop
            snap(q[6], src="LEGACY-X"),
            snap(q[6], src="LEGACY-Y"),  # duplicate DB prompt -> stop
        ]
        filename = self.dir / "qa.p9d1.snapshot.csv"
        with filename.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=subject.SNAPSHOT_COLS)
            writer.writeheader()
            writer.writerows(rows)
        outcome = self.command("--existing-snapshot", str(filename))
        self.assertEqual(outcome.returncode, 0, outcome.stderr)
        data = json.loads(outcome.stdout)
        counts = data["comparison"]["counts"]
        self.assertEqual(counts["EXACT_DUPLICATE_PRESERVE_EXISTING"], 2)
        self.assertEqual(counts["ANSWER_OR_OPTIONS_MISMATCH_REVIEW"], 1)
        self.assertEqual(counts["EXPLANATION_MISMATCH_REVIEW"], 1)
        self.assertEqual(counts["PROTECTED_CONTENT_CONFLICT_STOP"], 1)
        self.assertEqual(counts["SOURCE_ID_COLLISION_STOP"], 1)
        self.assertEqual(counts["DUPLICATE_DB_PROMPT_REVIEW"], 1)
        self.assertEqual(counts["NEW_DRAFT_CANDIDATE"], 2493)
        self.assertEqual(data["comparison"]["conflict_count"], 3)
        self.assertEqual(sum(counts.values()), 2500)
        self.assertEqual(data["comparison"]["database_writes"], 0)
        self.assertFalse(data["comparison"]["import_authorized"])
        self.assertNotIn("Synthetic ASP question", outcome.stdout)

    def test_wrong_sheet_count_rejected(self):
        wrong = dict(subject.EXPECTED_SHEETS)
        wrong["Domain 9"] = 124
        raw = workbook_bytes(wrong)
        path = self.dir / "wrong.xlsx"
        path.write_bytes(raw)
        with self.assertRaisesRegex(subject.IntakeError, "Unexpected item count"):
            subject.read_workbook(path, hashlib.sha256(raw).hexdigest())

    def test_no_database_or_network_actions(self):
        source = Path(subject.__file__).read_text(encoding="utf-8")
        self.assertNotIn("create_client", source)
        self.assertNotIn("supabase.auth", source)
        self.assertNotIn("requests.", source)
        self.assertNotIn("urllib.request", source)
        self.assertNotIn(".execute(", source)
        sql = (Path(__file__).resolve().parent.parent /
               "supabase/P9D1_EXISTING_ASP_FINGERPRINTS_READ_ONLY.sql").read_text()
        stripped = "\n".join(line.split("--")[0] for line in sql.splitlines()).strip()
        self.assertTrue(stripped.upper().startswith("WITH "))
        self.assertEqual(stripped.count(";"), 1)
        for bad in ("INSERT ", "UPDATE ", "DELETE ", "ALTER ", "CREATE ",
                    "GRANT ", "REVOKE ", "COPY ", "DO $$", "EXECUTE "):
            self.assertNotIn(bad, stripped.upper())
        for column in ("snapshot_version", "source_id", "prompt_sha256",
                       "choices_key_sha256", "explanation_sha256",
                       "mock_exclusive", "ever_attempted"):
            self.assertIn(column, sql)


if __name__ == "__main__":
    unittest.main(verbosity=2)

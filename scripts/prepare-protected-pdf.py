#!/usr/bin/env python3
"""P14.1 offline PDF-to-private-JPEG prep. Requires free Poppler pdfinfo/pdftoppm.
No Supabase calls, no internet, no original PDF included in output.
Usage: python3 scripts/prepare-protected-pdf.py /private/lesson.pdf /private/lesson-pages
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

MAX_PAGES = 80
MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_TOTAL = 50 * 1024 * 1024


def prepare(source: pathlib.Path, destination: pathlib.Path):
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise ValueError("Input must be an existing PDF.")
    if destination.exists():
        raise ValueError("Output directory already exists. Refusing to overwrite files.")
    for tool in ("pdfinfo", "pdftoppm"):
        if not shutil.which(tool):
            raise RuntimeError(f"Install Poppler first: {tool} not found.")
    info = subprocess.run(["pdfinfo", str(source)], capture_output=True, text=True, check=True)
    match = re.search(r"^Pages:\s+(\d+)", info.stdout, re.MULTILINE)
    if not match:
        raise ValueError("Could not determine PDF page count.")
    count = int(match.group(1))
    if not 1 <= count <= MAX_PAGES:
        raise ValueError(f"PDF must contain 1–{MAX_PAGES} pages; split larger documents.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="technica-pdf-prep-") as temp:
        prefix = pathlib.Path(temp) / "page"
        subprocess.run(["pdftoppm", "-f", "1", "-l", str(count),
                        "-scale-to", "1400", "-jpeg", "-jpegopt", "quality=75",
                        str(source), str(prefix)], check=True, capture_output=True)
        generated = sorted(pathlib.Path(temp).glob("page-*.jpg"),
                           key=lambda p: int(p.stem.split("-")[-1]))
        if len(generated) != count:
            raise ValueError("PDF rasterizer produced an unexpected page count.")
        sizes = [p.stat().st_size for p in generated]
        if any(n < 1 or n > MAX_PAGE_BYTES for n in sizes) or sum(sizes) > MAX_TOTAL:
            raise ValueError("JPG page exceeded 2 MB or total exceeded 50 MB. Reduce resolution.")
        destination.mkdir()
        pages = []
        for i, (file, size) in enumerate(zip(generated, sizes), start=1):
            target = destination / f"{i:04d}.jpg"
            shutil.copyfile(file, target)
            pages.append({"page": i, "file": target.name, "bytes": size})
        (destination / "manifest.json").write_text(json.dumps({
            "version": "technica-p141-pdf-pages-v1",
            "pageCount": count, "totalBytes": sum(sizes), "pages": pages,
            "warning": "Pages can still be saved or screen-captured. Not DRM."
        }, indent=2), encoding="utf-8")
        return count, sum(sizes)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare protected lesson PDF page images locally.")
    parser.add_argument("pdf", type=pathlib.Path)
    parser.add_argument("output", type=pathlib.Path)
    args = parser.parse_args()
    try:
        count, size = prepare(args.pdf.resolve(), args.output.resolve())
        print(f"Prepared {count} JPG pages ({size} bytes). Select ONLY the numbered JPGs in Admin Tools.")
    except (ValueError, RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        print(f"PDF preparation blocked: {exc}", file=sys.stderr)
        sys.exit(2)


#!/usr/bin/env python3
"""PILIGRIM Encoding Audit & Fix Tool."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterable

DEFAULT_PATHS = [
    "src",
    "F:/Obsidian_Vaults/AntiPiry",
]

SKIP_DIRS = {
    "node_modules", "dist", "build", ".git", ".vs", ".vscode",
    "android", ".gradle", "ios", "debug", "out", "coverage",
    "public", "__pycache__", "venv", ".venv",
}

SCAN_EXTS = {".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".css", ".html", ".py"}

# Use \u escape sequences in raw string to avoid mojibake
MOJIBAKE_CHARS = re.compile(r"[\u0420\u0421]")
NORMAL_RU = re.compile(r"[\u0430-\u044f\u0451\u0410-\u042f\u0401]{2,}")

SEG_RE = re.compile(r"[A-Za-z0-9_\-\u0420\u0421]+")


def looks_mojibake(s: str) -> bool:
    prefixes = len(MOJIBAKE_CHARS.findall(s))
    normal = len(NORMAL_RU.findall(s))
    return prefixes >= 2 and normal == 0


def repair_segment(s: str) -> str:
    cur = s
    for _ in range(4):
        if not looks_mojibake(cur):
            return cur
        for enc in ("cp1251", "latin-1"):
            try:
                cur = cur.encode(enc).decode("utf-8")
                break
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
        else:
            return s
    return cur


def fix_line(line: str):
    count = 0
    def repl(m):
        nonlocal count
        seg = m.group(0)
        fixed = repair_segment(seg)
        if fixed != seg:
            count += 1
        return fixed
    new_line = SEG_RE.sub(repl, line)
    return new_line, count


def is_text_file(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        return b"\x00" not in chunk
    except OSError:
        return False


def should_scan(path: Path) -> bool:
    parts = set(path.parts)
    if parts & SKIP_DIRS:
        return False
    if path.suffix.lower() not in SCAN_EXTS:
        return False
    if path.name.endswith(".lock"):
        return False
    return is_text_file(path)


def iter_files(roots):
    for root in roots:
        p = Path(root)
        if not p.exists():
            continue
        if p.is_file():
            if should_scan(p):
                yield p
            continue
        for path in p.rglob("*"):
            if path.is_file() and should_scan(path):
                yield path


def scan_file(path: Path, fix: bool = False):
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError) as e:
        return False, 0, [f"<read error: {e}>"]

    new_lines = []
    total_fixed = 0
    examples = []

    for i, line in enumerate(text.splitlines(keepends=True), start=1):
        new_line, n = fix_line(line)
        if n > 0:
            total_fixed += n
            if len(examples) < 3:
                before = line.rstrip("\r\n")
                after = new_line.rstrip("\r\n")
                if before != after:
                    examples.append(f"   L{i}: {before[:60]!r} -> {after[:60]!r}")
        new_lines.append(new_line)

    if total_fixed > 0 and fix:
        try:
            path.write_text("".join(new_lines), encoding="utf-8")
        except OSError as e:
            return True, 0, [f"<write error: {e}>"]

    return (total_fixed > 0), total_fixed, examples


def main() -> int:
    parser = argparse.ArgumentParser(description="PILIGRIM encoding audit & fix")
    parser.add_argument("--fix", action="store_true", help="Apply fixes in-place")
    parser.add_argument("--paths", nargs="+", default=DEFAULT_PATHS, help="Paths to scan")
    args = parser.parse_args()

    mode = "FIX" if args.fix else "DRY RUN"
    print(f"=== PILIGRIM encoding audit ({mode}) ===")
    print(f"Scanning paths: {args.paths}")

    total_files = 0
    files_with_issues = 0
    total_segments = 0
    affected_files = []

    for path in iter_files(args.paths):
        total_files += 1
        had_issues, fixed, examples = scan_file(path, fix=args.fix)
        if had_issues:
            files_with_issues += 1
            total_segments += fixed
            affected_files.append((path, fixed, examples))

    for path, fixed, examples in affected_files:
        print(f"[MOJIBAKE] {path}: {fixed} segments")
        for ex in examples:
            print(ex)

    print("=== TOTAL ===")
    print(f"  Files scanned:    {total_files}")
    print(f"  With mojibake:    {files_with_issues}")
    print(f"  Segments found:   {total_segments}")
    if not args.fix and total_segments > 0:
        print(f"\nRun: python scripts/check_encoding.py --fix")
    elif args.fix and total_segments > 0:
        print(f"\n[OK] Fixed: {total_segments} segments in {files_with_issues} files")
    elif total_segments == 0:
        print("\n[OK] No mojibake found")

    return 0 if files_with_issues == 0 or args.fix else 1


if __name__ == "__main__":
    sys.exit(main())

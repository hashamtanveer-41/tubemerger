#!/usr/bin/env python3
"""
Bump version across all TubeMerge project files atomically.

Usage:
    python3 scripts/bump_version.py 1.0.6
    python3 scripts/bump_version.py 1.0.6 --dry-run

Files updated:
  - pyproject.toml
  - src/tubemerge/__init__.py
  - src/tubemerge/core/settings.py
  - frontend/package.json
  - website/package.json
  - website/src/data/release.ts
  - website/public/version.json
  - tubemerge.spec
  - scripts/windows_installer.iss
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _current_date() -> str:
    return date.today().isoformat()


def _validate_semver(v: str) -> tuple[int, int, int]:
    parts = v.strip().split(".")
    if len(parts) != 3:
        print(f"ERROR: Version must be in format MAJOR.MINOR.PATCH (got '{v}')")
        sys.exit(1)
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        print(f"ERROR: Version parts must be integers (got '{v}')")
        sys.exit(1)


def bump(new_version: str, dry_run: bool = False) -> None:
    major, minor, patch = _validate_semver(new_version)
    today = _current_date()

    changes: list[tuple[Path, str]] = []

    def _replace(path: Path, pattern: str, replacement: str) -> None:
        full = ROOT / path
        if not full.exists():
            print(f"  WARN  {path} — not found, skipping")
            return
        original = full.read_text(encoding="utf-8")
        updated = re.sub(pattern, replacement, original, count=1)
        if original == updated:
            print(f"  SKIP  {path} — no change detected (already at {new_version}?)")
        else:
            changes.append((full, updated))
            print(f"  BUMP  {path}")

    # ── pyproject.toml ──────────────────────────────────────────────────
    _replace(
        Path("pyproject.toml"),
        r'(version\s*=\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── src/tubemerger/__init__.py ───────────────────────────────────────
    _replace(
        Path("src/tubemerger/__init__.py"),
        r'(__version__\s*=\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── src/tubemerger/core/settings.py ─────────────────────────────────
    _replace(
        Path("src/tubemerger/core/settings.py"),
        r'(VERSION\s*=\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── frontend/package.json ────────────────────────────────────────────
    _replace(
        Path("frontend/package.json"),
        r'("version"\s*:\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── website/package.json ─────────────────────────────────────────────
    _replace(
        Path("website/package.json"),
        r'("version"\s*:\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── website/src/data/release.ts ──────────────────────────────────────
    _replace(
        Path("website/src/data/release.ts"),
        r"(version:\s*)'[\d.]+'",
        f"\\1'{new_version}'",
    )
    _replace(
        Path("website/src/data/release.ts"),
        r'(version:\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )
    # Also update versionInfo strings
    def _update_release_ts(path: Path) -> None:
        full = ROOT / path
        if not full.exists():
            return
        text = full.read_text(encoding="utf-8")
        # Replace vN.N.N patterns in the versionInfo strings
        updated = re.sub(r'v\d+\.\d+\.\d+', f'v{new_version}', text)
        if text != updated:
            changes.append((full, updated))

    # Already queued above, handle versionInfo separately
    _replace(
        Path("website/src/data/release.ts"),
        r"(STATIC_RELEASE: ReleaseData = \{[^}]+version:\s*['\"])[\d.]+",
        f"\\g<1>{new_version}",
    )

    # ── website/public/version.json ──────────────────────────────────────
    version_json_path = ROOT / "website" / "public" / "version.json"
    if version_json_path.exists():
        obj = json.loads(version_json_path.read_text(encoding="utf-8"))
        obj["version"] = new_version
        obj["updated"] = today
        new_content = json.dumps(obj, indent=2) + "\n"
        changes.append((version_json_path, new_content))
        print(f"  BUMP  website/public/version.json")

    # ── tubemerger.spec ──────────────────────────────────────────────────
    _replace(
        Path("tubemerger.spec"),
        r'("CFBundleVersion":\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )
    _replace(
        Path("tubemerger.spec"),
        r'("CFBundleShortVersionString":\s*)"[\d.]+"',
        f'\\1"{new_version}"',
    )

    # ── scripts/windows_installer.iss ────────────────────────────────────
    _replace(
        Path("scripts/windows_installer.iss"),
        r'(#define\s+MyAppVersion\s+)"[\d.]+"',
        f'\\1"{new_version}"',
    )
    _replace(
        Path("scripts/windows_installer.iss"),
        r"(#define\s+MyAppVersion\s+)'[\d.]+'",
        f"\\1'{new_version}'",
    )
    _replace(
        Path("scripts/windows_installer.iss"),
        r'(AppVersion=)[\d.]+',
        f"\\g<1>{new_version}",
    )

    # ── Apply ─────────────────────────────────────────────────────────────
    print()
    if dry_run:
        print(f"DRY RUN — {len(changes)} file(s) would be updated to v{new_version}.")
    else:
        for file_path, content in changes:
            file_path.write_text(content, encoding="utf-8")
        print(f"✓  Bumped {len(changes)} file(s) to v{new_version}.")
        print()
        print("Next steps:")
        print(f"  git add -A")
        print(f"  git commit -m 'chore: bump version to v{new_version}'")
        print(f"  git tag v{new_version}")
        print(f"  git push origin master --tags")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bump TubeMerge version across all project files."
    )
    parser.add_argument("version", help="New version string, e.g. 1.0.6")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing files.",
    )
    args = parser.parse_args()
    bump(args.version, dry_run=args.dry_run)


if __name__ == "__main__":
    main()

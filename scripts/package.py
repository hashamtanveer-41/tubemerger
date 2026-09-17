#!/usr/bin/env python3
"""TubeMerger Desktop Packaging Pipeline.

Automates the build process across Windows, macOS, and Linux:
1. Builds React + Vite client frontend (with VITE_ENABLE_ADMIN=false)
2. Generates icons if missing
3. Invokes PyInstaller with tubemerger.spec
4. Verifies output bundle integrity
"""

import sys
import os
import shutil
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def run_step(desc: str, cmd: list, cwd: Path = ROOT_DIR):
    print(f"\n[BUILD STEP] {desc}...")
    res = subprocess.run(cmd, cwd=str(cwd))
    if res.returncode != 0:
        print(f"[ERROR] Step failed: {desc}")
        sys.exit(res.returncode)
    print(f"[PASS] {desc} completed successfully.")

def ensure_icons():
    """Generates logo.ico from logo.png if missing."""
    ico_path = ROOT_DIR / "assets" / "logo.ico"
    png_path = ROOT_DIR / "assets" / "logo.png"
    if not ico_path.exists() and png_path.exists():
        try:
            from PIL import Image
            img = Image.open(png_path).convert("RGBA")
            img.save(
                ico_path,
                format="ICO",
                sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
            )
            print("[INFO] Generated assets/logo.ico for Windows builds.")
        except Exception as exc:
            print(f"[WARN] Could not generate .ico: {exc}")

def main():
    print("=" * 65)
    print(" TubeMerge Desktop Application Packager")
    print(f" Target Platform: {sys.platform}")
    print("=" * 65)

    # 1. Ensure icons
    ensure_icons()

    # 2. Build Frontend Client (with Admin Console stripped)
    frontend_dir = ROOT_DIR / "frontend"
    if not (frontend_dir / "node_modules").exists():
        run_step("Installing frontend dependencies", ["npm", "install"], cwd=frontend_dir)

    run_step("Compiling Zero-Admin Client Frontend", ["npm", "run", "build:client"], cwd=frontend_dir)

    # 3. Execute PyInstaller
    pyinstaller_bin = shutil.which("pyinstaller") or sys.executable + " -m PyInstaller"
    spec_file = str(ROOT_DIR / "tubemerger.spec")

    if isinstance(pyinstaller_bin, str) and " " in pyinstaller_bin:
        cmd = [sys.executable, "-m", "PyInstaller", "--clean", "--noconfirm", spec_file]
    else:
        cmd = [pyinstaller_bin, "--clean", "--noconfirm", spec_file]

    run_step("Executing PyInstaller Compilation", cmd, cwd=ROOT_DIR)

    # 4. Verify output
    dist_dir = ROOT_DIR / "dist" / "TubeMerger"
    if sys.platform == "darwin":
        app_bundle = ROOT_DIR / "dist" / "TubeMerger.app"
        if app_bundle.exists():
            print(f"\n[SUCCESS] macOS App Bundle created: {app_bundle}")
            return
    elif sys.platform.startswith("win"):
        exe_path = dist_dir / "TubeMerger.exe"
        if exe_path.exists():
            print(f"\n[SUCCESS] Windows Executable created: {exe_path}")
            return
    else:
        bin_path = dist_dir / "TubeMerger"
        if bin_path.exists():
            print(f"\n[SUCCESS] Linux Executable created: {bin_path}")
            return

    print(f"\n[DONE] Built files located in: {ROOT_DIR / 'dist'}")

if __name__ == "__main__":
    main()

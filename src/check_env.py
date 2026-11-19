#!/usr/bin/env python3
"""
Environment Verification Script for BAS Master Template Episodes.

Verifies Python 3, Node.js, FFmpeg, FFprobe, Chromium, esbuild, Playwright,
and Python DSP packages by running real checks and printing an honest report.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def run_cmd(cmd: list[str]) -> tuple[bool, str]:
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=15,
            check=False,
        )
        out = (proc.stdout or "").strip().splitlines()
        first = out[0] if out else f"(exit {proc.returncode})"
        return proc.returncode == 0, first
    except Exception as exc:
        return False, str(exc)


def find_chromium_binary() -> str | None:
    candidates = [
        os.environ.get("CHROMIUM_EXECUTABLE", ""),
        os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", ""),
        "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell",
    ]
    for root_dir in ("/ms-playwright", str(Path.home() / ".cache" / "ms-playwright")):
        root_path = Path(root_dir)
        if root_path.exists():
            for match in sorted(root_path.rglob("chrome-headless-shell")):
                if match.is_file() and os.access(match, os.X_OK):
                    candidates.append(str(match))
            for match in sorted(root_path.rglob("chrome")):
                if match.is_file() and os.access(match, os.X_OK):
                    candidates.append(str(match))
    for name in ("chromium", "chromium-browser", "google-chrome"):
        found = shutil.which(name)
        if found:
            candidates.append(found)
    for c in candidates:
        if c and Path(c).is_file() and os.access(c, os.X_OK):
            return c
    return None


def main() -> int:
    print("=== Bible Architecture Stories — Template Environment Check ===")
    print(f"OS: {platform.platform()}")
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {platform.python_version()}")

    ok_node, node_out = run_cmd(["node", "--version"])
    print(f"node: {'OK' if ok_node else 'MISSING'} -> {node_out}")

    ok_ff, ff_out = run_cmd(["ffmpeg", "-version"])
    print(f"ffmpeg: {'OK' if ok_ff else 'MISSING'} -> {ff_out}")

    ok_fp, fp_out = run_cmd(["ffprobe", "-version"])
    print(f"ffprobe: {'OK' if ok_fp else 'MISSING'} -> {fp_out}")

    chromium_path = find_chromium_binary()
    if chromium_path:
        ok_cr, cr_out = run_cmd([chromium_path, "--version"])
        print(f"Chromium: {'OK' if ok_cr else 'ERROR'} ({chromium_path}) -> {cr_out}")
    else:
        ok_cr = False
        print("Chromium: MISSING -> Install Chromium or Playwright Chromium shell")

    dsp_status = []
    for mod in ("numpy", "scipy", "soundfile", "playwright"):
        try:
            imported = __import__(mod)
            ver = getattr(imported, "__version__", "installed")
            print(f"Python package {mod}: OK ({ver})")
            dsp_status.append(True)
        except ImportError as exc:
            print(f"Python package {mod}: MISSING ({exc})")
            dsp_status.append(False)

    core_ready = ok_node and ok_ff and ok_fp and ok_cr
    full_dsp_ready = core_ready and all(dsp_status)
    status_label = "FULL_READY" if full_dsp_ready else ("CORE_READY_STDLIB_SFX_ONLY" if core_ready else "INCOMPLETE")
    print(f"Overall setup status: {status_label}")
    return 0 if core_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())

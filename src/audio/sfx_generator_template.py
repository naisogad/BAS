#!/usr/bin/env python3
"""
Motion-Synced SFX Generator Template — Bible Architecture Stories

Single Source of Truth:
  - When `--html <renderXX.html>` is passed, launches headless Chromium via Node
    Playwright (`window.__SKIP_GL_RENDER__ = true`) and samples `window.renderAt(t)`
    at 120 Hz across [0, DURATION].
  - Detects synchronized motion events directly from the extracted scalar trace
    (stride minima, architectural prop motion peaks, camera sweep).
  - Synthesizes a 48 kHz, stereo, 24-bit PCM (`pcm_s24le`) SFX-only WAV starting
    at exact local timestamp t = 0.000 s (zero narration, zero BGM).
  - Uses `numpy` + `soundfile` when installed (`requirements.txt`), or falls back
    transparently to pure-Python deterministic `pcm_s24le` RIFF/WAV generation in
    bare containers while recording the active backend in `renderXX_events.json`.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import struct
import subprocess
import tempfile
import wave
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

SAMPLE_RATE = 48_000
CHANNELS = 2
BITS_PER_SAMPLE = 24

try:
    import numpy as np  # type: ignore
    import soundfile as sf  # type: ignore

    HAS_NUMPY_SOUNDFILE = True
except ImportError:
    np = None  # type: ignore
    sf = None  # type: ignore
    HAS_NUMPY_SOUNDFILE = False


@dataclass
class SfxCueRecord:
    cue_id: str
    category: str
    local_time_sec: float
    master_time_sec: float
    duration_sec: float
    pan: float
    gain_db: float
    source_trigger: str


def linear_to_db(gain: float, floor_db: float = -120.0) -> float:
    if gain <= 1e-12:
        return floor_db
    return float(max(floor_db, 20.0 * math.log10(gain)))


def extract_motion_trace_via_playwright(html_path: Path, hz: int = 120) -> tuple[float, float, list[dict[str, Any]]]:
    """Sample `window.renderAt(t)` at `hz` using headless Chromium + Playwright."""
    node_bin = shutil.which("node") or "node"
    abs_html = html_path.resolve()

    extractor_js = r"""
const fs = require("node:fs");
const http = require("node:http");
const { createRequire } = require("node:module");
const path = require("node:path");
const req = createRequire(__filename);
let chromium = null;
for (const candidate of [
  path.join(process.cwd(), "node_modules", "playwright"),
  "playwright",
  "/usr/local/share/bun-global/node_modules/playwright",
]) {
  try {
    ({ chromium } = req(candidate));
    if (chromium) break;
  } catch {}
}
if (!chromium) {
  throw new Error("playwright module not found. Run npm install.");
}

(async () => {
  const [absHtml, hzRaw, outJson] = process.argv.slice(2);
  const hz = Number(hzRaw || 120);
  const rootDir = path.dirname(absHtml);
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const fp = path.join(rootDir, safePath === "/" ? path.basename(absHtml) : safePath);
    if (!fp.startsWith(rootDir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const exe = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].find((p) => p && fs.existsSync(p));
  const browser = await chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"]
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => { window.__SKIP_GL_RENDER__ = true; });
    await page.goto(`http://127.0.0.1:${port}/${path.basename(absHtml)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => typeof window.renderAt === "function" && typeof window.DURATION === "number", { timeout: 15000 });
    const result = await page.evaluate((sampleHz) => {
      const dur = Number(window.DURATION);
      const offset = Number(window.MASTER_TIME_OFFSET || 0);
      const n = Math.max(2, Math.round(dur * sampleHz) + 1);
      const states = [];
      for (let i = 0; i < n; i++) {
        const t = Math.min(dur, i / sampleHz);
        states.push(window.renderAt(t));
      }
      return { duration: dur, masterOffset: offset, states };
    }, hz);
    fs.writeFileSync(outJson, JSON.stringify(result), "utf-8");
  } finally {
    await browser.close();
    server.close();
  }
})();
"""
    with tempfile.TemporaryDirectory(prefix="bas_trace_") as tmpdir:
        tmp = Path(tmpdir)
        script_path = tmp / "extract_trace.cjs"
        out_json = tmp / "trace.json"
        script_path.write_text(extractor_js, encoding="utf-8")
        proc = subprocess.run(
            [node_bin, str(script_path), str(abs_html), str(hz), str(out_json)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
            check=False,
        )
        if proc.returncode != 0 or not out_json.exists():
            raise RuntimeError(f"Motion trace extraction failed: {proc.stderr.strip()}")
        payload = json.loads(out_json.read_text(encoding="utf-8"))
        return float(payload["duration"]), float(payload.get("masterOffset", 0.0)), list(payload["states"])


def detect_cues_from_trace(trace_samples: list[dict[str, Any]], duration_sec: float, master_offset: float) -> list[SfxCueRecord]:
    cues: list[SfxCueRecord] = [
        SfxCueRecord(
            cue_id="BED_01",
            category="ambient_air",
            local_time_sec=0.0,
            master_time_sec=round(master_offset, 4),
            duration_sec=round(duration_sec, 4),
            pan=0.0,
            gain_db=-26.0,
            source_trigger="continuous_scene_air_bed",
        )
    ]
    if len(trace_samples) < 3:
        return cues

    # Detect character footstep zero-crossings / minima from `charBob` or `stepSin`
    last_step_t = -1.0
    step_idx = 0
    for i in range(1, len(trace_samples) - 1):
        prev_bob = float(trace_samples[i - 1].get("charBob", 1.0))
        curr_bob = float(trace_samples[i].get("charBob", 1.0))
        next_bob = float(trace_samples[i + 1].get("charBob", 1.0))
        t = float(trace_samples[i].get("t", 0.0))
        if curr_bob <= prev_bob and curr_bob < next_bob and curr_bob < 0.02 and (t - last_step_t) >= 0.30:
            step_idx += 1
            last_step_t = t
            cues.append(
                SfxCueRecord(
                    cue_id=f"STEP_{step_idx:02d}",
                    category="footstep_earth",
                    local_time_sec=round(t, 4),
                    master_time_sec=round(master_offset + t, 4),
                    duration_sec=0.14,
                    pan=-0.22,
                    gain_db=-14.0,
                    source_trigger="charBob_contact_minimum",
                )
            )

    # Detect prop rise midpoint cue
    for i in range(1, len(trace_samples)):
        prev_y = float(trace_samples[i - 1].get("propY", 0.0))
        curr_y = float(trace_samples[i].get("propY", 0.0))
        if prev_y < 1.0 <= curr_y:
            t = float(trace_samples[i].get("t", 0.0))
            cues.append(
                SfxCueRecord(
                    cue_id="PROP_01",
                    category="stone_lift",
                    local_time_sec=round(t, 4),
                    master_time_sec=round(master_offset + t, 4),
                    duration_sec=0.28,
                    pan=0.15,
                    gain_db=-12.0,
                    source_trigger="propY_midpoint_crossing",
                )
            )
            break

    return cues


def write_pcm24_stereo_wav_stdlib(path: Path, left: list[float], right: list[float]) -> None:
    """Pure Python 24-bit signed little-endian stereo WAV writer (no external deps)."""
    scale = 8_388_607.0
    buf = bytearray()
    for l_val, r_val in zip(left, right):
        li = max(-8_388_608, min(8_388_607, int(round(l_val * scale))))
        ri = max(-8_388_608, min(8_388_607, int(round(r_val * scale))))
        buf.extend(struct.pack("<i", li)[:3])
        buf.extend(struct.pack("<i", ri)[:3])

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(3)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(buf))


def synthesize_sfx_from_trace(
    duration_sec: float,
    master_offset_sec: float,
    trace_samples: list[dict[str, Any]],
    out_wav: Path,
    out_events: Path,
    trace_source: str,
) -> dict[str, Any]:
    n_samples = max(1, int(round(duration_sec * SAMPLE_RATE)))
    cues = detect_cues_from_trace(trace_samples, duration_sec, master_offset_sec)

    left = [0.0] * n_samples
    right = [0.0] * n_samples

    # Deterministic gentle room-air bed + synced soft pulses for detected cues
    for idx in range(n_samples):
        t = idx / SAMPLE_RATE
        env = min(1.0, t / 0.08) * min(1.0, (duration_sec - t) / 0.12)
        air = 0.012 * env * (math.sin(2.0 * math.pi * 78.0 * t) * 0.5 + math.sin(2.0 * math.pi * 116.0 * t) * 0.5)
        left[idx] += air
        right[idx] += air * 0.96

    for cue in cues:
        if cue.category == "ambient_air":
            continue
        start_i = int(round(cue.local_time_sec * SAMPLE_RATE))
        dur_i = int(round(cue.duration_sec * SAMPLE_RATE))
        gain = 10.0 ** (cue.gain_db / 20.0)
        freq = 145.0 if cue.category == "footstep_earth" else 190.0
        angle = (max(-1.0, min(1.0, cue.pan)) + 1.0) * (math.pi / 4.0)
        pan_l, pan_r = math.cos(angle), math.sin(angle)
        for k in range(dur_i):
            pos = start_i + k
            if 0 <= pos < n_samples:
                lt = k / SAMPLE_RATE
                decay = math.exp(-lt / max(0.02, cue.duration_sec * 0.28))
                sig = gain * decay * math.sin(2.0 * math.pi * freq * lt * (1.0 - 0.35 * lt))
                left[pos] += sig * pan_l
                right[pos] += sig * pan_r

    peak = max(1e-12, max(max(abs(v) for v in left), max(abs(v) for v in right)))
    ceiling = 10.0 ** (-1.2 / 20.0)
    if peak > ceiling:
        scale = ceiling / peak
        left = [v * scale for v in left]
        right = [v * scale for v in right]
        peak = ceiling

    sq_sum = sum(v * v for v in left) + sum(v * v for v in right)
    rms = math.sqrt(sq_sum / (2.0 * n_samples))

    if HAS_NUMPY_SOUNDFILE:
        arr = np.column_stack((np.asarray(left, dtype=np.float64), np.asarray(right, dtype=np.float64)))
        out_wav.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out_wav), arr, SAMPLE_RATE, subtype="PCM_24")
        backend = "numpy+soundfile_pcm24"
    else:
        write_pcm24_stereo_wav_stdlib(out_wav, left, right)
        backend = "python_stdlib_pcm24_fallback"

    events_payload = {
        "schema_version": 1,
        "synth_backend": backend,
        "trace_source": trace_source,
        "trace_samples": len(trace_samples),
        "sample_rate": SAMPLE_RATE,
        "channels": CHANNELS,
        "bits_per_sample": BITS_PER_SAMPLE,
        "duration_sec": duration_sec,
        "sample_count_per_channel": n_samples,
        "start_offset_sec": 0.0,
        "sfx_only": True,
        "narration_included": False,
        "music_included": False,
        "master_peak_dbfs": round(linear_to_db(peak), 3),
        "master_rms_dbfs": round(linear_to_db(rms), 3),
        "cue_count": len(cues),
        "cues": [asdict(c) for c in cues],
    }
    out_events.parent.mkdir(parents=True, exist_ok=True)
    out_events.write_text(json.dumps(events_payload, indent=2) + "\n", encoding="utf-8")
    return events_payload


def main() -> int:
    parser = argparse.ArgumentParser(description="BAS Template Motion-Synced SFX Synthesizer")
    parser.add_argument("--html", type=Path, default=None, help="Path to renderXX.html for 120 Hz trace extraction")
    parser.add_argument("--duration", type=float, default=None, help="Fallback duration when --html is not passed")
    parser.add_argument("--master-offset", type=float, default=0.0, help="Master timeline start offset in seconds")
    parser.add_argument("--out-wav", type=Path, required=True, help="Destination renderXX_sfx.wav")
    parser.add_argument("--out-events", type=Path, required=True, help="Destination renderXX_events.json")
    args = parser.parse_args()

    if args.html is not None:
        duration_sec, master_offset, trace_samples = extract_motion_trace_via_playwright(args.html, hz=120)
        trace_source = f"chromium_120hz:{args.html.name}"
    elif args.duration is not None and args.duration > 0:
        duration_sec = float(args.duration)
        master_offset = float(args.master_offset)
        trace_samples = []
        trace_source = "manual_duration_no_html"
    else:
        raise SystemExit("Provide either --html <renderXX.html> or --duration <seconds>.")

    payload = synthesize_sfx_from_trace(
        duration_sec=duration_sec,
        master_offset_sec=master_offset,
        trace_samples=trace_samples,
        out_wav=args.out_wav,
        out_events=args.out_events,
        trace_source=trace_source,
    )
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

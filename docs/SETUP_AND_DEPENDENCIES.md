# Setup & Dependency Requirements

This episode template requires Node.js + esbuild + Chromium + FFmpeg/FFprobe + Python 3 for full deterministic rendering, motion-trace extraction, SFX synthesis, and Windows Local Studio packaging.

---

## 1. System & Runtime Dependencies

| Tool / Runtime | Purpose | Verification Command |
|---|---|---|
| **Node.js (>= 20)** | Bundling TypeScript timelines (`esbuild`), packaging Local Studio ZIPs, Playwright trace runner | `node --version` |
| **esbuild** | Bundles `src/timelines/*.ts` and `src/hud/hud_text_system.ts` into standalone HTML | `node -e "require('esbuild')"` |
| **Chromium / Chrome Headless Shell** | Deterministic WebGL rendering, preview inspection, and 120 Hz `window.renderAt(t)` extraction | `python3 src/check_env.py` |
| **FFmpeg & FFprobe** | WAV stream probing (`48 kHz`, `2 ch`, `pcm_s24le`, exact sample count) and optional frame/video checks | `ffprobe -version` |
| **Python 3.11+** | Motion-synced procedural SFX synthesis (`src/audio/sfx_generator_template.py`) | `python3 --version` |

---

## 2. Python DSP Packages (`requirements.txt`)

Full procedural DSP synthesis uses:
- `numpy==2.2.6`
- `scipy==1.15.3`
- `soundfile==0.14.0`
- `playwright==1.65.2` (optional if running Python-native Playwright; the template also supports Node Playwright trace extraction)

### Installing into a Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> **Minimal Container Fallback:** If `python3-venv` / `pip` / `numpy` / `soundfile` are unavailable in an ephemeral container, `src/audio/sfx_generator_template.py` automatically reports the missing packages in `src/check_env.py` while still allowing standard-library `pcm_s24le` WAV smoke testing. Full episode DSP production should install `requirements.txt` cleanly.

---

## 3. Environment Health Check

Run before every audio synthesis or packaging session:

```bash
python3 src/check_env.py
```

Expected healthy output reports `ffmpeg`, `ffprobe`, `node`, `Chromium`, and Python DSP packages honestly.

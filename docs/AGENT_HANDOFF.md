# Agent Handoff & Safe Recovery Protocol

**Project:** `BAS_EP02`  
**Episode:** `ep02` — *Why Did God Close Noah's Ark?*  
**Main Biblical References:** Genesis 6–9; 1 Peter 3:20; 2 Peter 2:5; Matthew 24:37–42

---

## 1. Startup & Interruption Recovery Checklist
When starting a fresh session or resuming after an interruption (`"continue"` / `"resume"`):
1. Read `AGENTS.md`, `PROJECT_IDENTITY.json`, `docs/ACTIVE_TASK.md`, `docs/PROJECT_SPEC.md`, `docs/PRODUCTION_PLAN.md`, and `docs/ISSUES_REGISTER.md`.
2. Run `node src/tools/resume_checkpoint_template.mjs` and inspect live filesystem state (`manifests/`, `output/`, `assets/`).
3. Run `python3 src/check_env.py` to verify `node`, `ffmpeg`, `ffprobe`, Chromium, and Python DSP readiness before generating SFX or trace telemetry.
4. Compare recorded hashes in `manifests/` against current timeline/builder/audio files on disk.
5. Never invent missing creative approvals, narration lines, MP3 recordings, or assume ephemeral container `/tmp/` caches survived a restart.
6. Log substantial fixes incrementally into `docs/PRODUCTION_CHANGELOG.md` (with all 6 required fields) and update `docs/ACTIVE_TASK.md` atomically—never wait only until the end of a session.

---

## 2. Export State Vocabulary (Mandatory Precision)
Always distinguish these states explicitly in docs and user reports:
- `NOT_STARTED` — Render script/HTML not yet authored.
- `PACKAGED_LOCALLY` — Self-contained `output/local_studio/renderXX/` and `.zip` exist on disk and pass checksum/offline checks.
- `USER_OBTAINED` — Explicitly confirmed downloaded/exported by the user in Windows Local Studio / CapCut.
- `OUTDATED` — Source visual/timing/audio hashes changed after last package or approval.
- `MISSING_AFTER_RESTART` — Previously reported file is absent from disk after container reset.

---

## 3. Current Handoff State
- **Project State:** Clean standalone `BAS_EP02` workspace extracted from `BAS_MASTER_TEMPLATE v1.1`, with local Node dependencies (`package.json` + `package-lock.json`), Three.js `0.160.0` offline assets, `.gitignore`, and verified Local Studio packaging pipeline.
- **Preserved Prior Approvals:** V002 concept (*Why Did God Close Noah's Ark?*), Narration Draft v3, and exact Grandfather Joe audio master.
- **Empty / Unapproved States:** All MasterRefs, shot maps, timelines, renders, creative visual approvals, and technical export approvals are empty/unapproved; `output/` is clean (`.gitkeep` only).
- **Missing External Source Files:** Original Narration Draft v3 script and Grandfather Joe MP3 audio master were not present in the source repo and were **not** reconstructed. Import them into `assets/narration/` before starting Phase 2/3.
- **Do NOT redo:** Do not re-extract `BAS_MASTER_TEMPLATE`; do not develop Episode 02 animation before original narration assets and Phase 2 shot map are ready.

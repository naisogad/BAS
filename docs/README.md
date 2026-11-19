# Bible Architecture Stories — Episode Production Workspace

This folder is the clean **BAS Master Template** for initializing a new *Bible Architecture Stories* episode without carrying over any prior episode's story beats, characters, narration cues, source hashes, stale render jobs, or creative approvals.

---

## Required Agent Reading Order

Before planning, animating, packaging, or recovering work on a new episode, read these files in order:

1. `AGENTS.md` — Mandatory operating rules, contracts, and startup checklist
2. `PROJECT_IDENTITY.json` — Independent episode identity, format, and dynamic segment list
3. `docs/README.md` — This index and phase gate rules
4. `docs/ACTIVE_TASK.md` — Current atomic checkpoint state
5. `docs/AGENT_HANDOFF.md` — Recovery rules and runtime vs user-obtained separation
6. `docs/PROJECT_SPEC.md` — Permanent visual, biblical, technical, audio, and Local Studio rules
7. `docs/SETUP_AND_DEPENDENCIES.md` — Python/Node/Chromium/FFmpeg setup and `src/check_env.py`
8. `docs/PHASE1_RESEARCH_WORKFLOW.md` — Mandatory Phase 1 intake & pre-production checklist
9. `docs/NARRATION_AND_SHOTMAP.md` — Approved narration cue map and shot continuity plan
10. `docs/ISSUES_REGISTER.md` — Active and verified-closed issue log
11. `docs/PRODUCTION_PLAN.md` — Segment build, visual approval, and Local Studio delivery status

---

## Production Phase Gates (Strict Order)

1. **Phase 1 — Research, Script, Timing & Visual Design Blueprint**
   - Initialize episode metadata via `node src/tools/init_episode_template.mjs --episode epXX --title "..." --scripture "..."`.
   - Complete `docs/PHASE1_RESEARCH_WORKFLOW.md` (Biblical accuracy tiers, story concept, humor boundaries, MasterRefs, world palette).
   - Finalize ElevenLabs narration and exact timestamped cue file (`assets/narration/narration_cues.json`).
   - Do **not** assume fixed render counts or fixed 20 s durations; derive segment boundaries cleanly from narration pauses and beat structure.
2. **Phase 2 — Shot Map & Continuity Plan**
   - Document exact shot timings, camera states, entry/exit continuity fields, 2D motion-graphics cues, and SFX beds in `docs/NARRATION_AND_SHOTMAP.md`.
3. **Phase 3 — Deterministic Render Production & SFX Synthesis**
   - Build modular timelines (`src/timelines/`), 2D character rigs (`src/characters/`), 2D HUD (`src/hud/`), Three.js scene/HTML builders (`src/builders/`), lightweight previews, and motion-synced 48 kHz stereo SFX-only WAVs (`src/audio/`).
4. **Phase 4 — Visual Preview & Creative Approval**
   - Present lightweight interactive previews / verification keyframes.
   - Any source hash change resets stale creative approval to `pending_review`.
5. **Phase 5 — Local Studio Packaging & Handover**
   - Package self-contained `renderXX/` directory + ZIP via `src/packaging/package_local_studio_template.mjs`.
   - Windows Local Studio plays HTML + WAV starting at local `t = 0` and exports video; CapCut handles narration, captions, music, and final mix.

---

## Folder Map

```text
BAS_MASTER_TEMPLATE/
├── AGENTS.md
├── PROJECT_IDENTITY.json
├── requirements.txt
├── assets/
│   ├── masterrefs/           # 2D character MasterRefs & environment mood sheets
│   ├── narration/            # Approved script & timestamped narration_cues.json
│   └── three.module.min.js   # Local offline Three.js runtime (zero external CDNs)
├── docs/                     # Standardized episode memory, spec, setup, plan, & handoff docs
├── manifests/                # Per-render & episode manifest templates/records
├── output/                   # Local Studio deliverables & packaged ZIPs (clean on init)
└── src/
    ├── check_env.py          # Runtime environment verification script
    ├── audio/                # Motion-synced procedural SFX generators
    ├── builders/             # Self-contained HTML render builders
    ├── characters/           # 2D illustrated articulated character rigs
    ├── hud/                  # 2D screen-space SVG/HTML motion-graphics helpers
    ├── packaging/            # Local Studio offline validator & ZIP packager
    ├── scene/                # Shared 1080x1920 stage, lighting, & camera utilities
    ├── timelines/            # Pure deterministic evaluateRender(t) timeline modules
    └── tools/                # Episode initializer & checkpoint audit scripts
```

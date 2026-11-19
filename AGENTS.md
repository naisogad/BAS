# Mandatory Coding Agent Instructions — Bible Architecture Stories

Every agent working on this episode workspace MUST read these files in order before editing, animating, synthesizing audio, or packaging deliverables:

1. `AGENTS.md` (this file)
2. `PROJECT_IDENTITY.json`
3. `docs/README.md`
4. `docs/ACTIVE_TASK.md`
5. `docs/AGENT_HANDOFF.md`
6. `docs/PROJECT_SPEC.md`
7. `docs/PHASE1_RESEARCH_WORKFLOW.md`
8. `docs/NARRATION_AND_SHOTMAP.md`
9. `docs/ISSUES_REGISTER.md`
10. `docs/PRODUCTION_PLAN.md`

---

## Non-Negotiable Operating Rules

1. **Respect Phase Gates:** Do NOT write Phase 2 shot maps or Phase 3 animation/audio code until Phase 1 research, biblical accuracy classification, story concept, and ElevenLabs timing cues are approved.
2. **Verify Live Workspace State First:** Inspect `PROJECT_IDENTITY.json`, `manifests/`, `output/local_studio/`, `assets/`, and run `python3 src/check_env.py` + `node src/tools/resume_checkpoint_template.mjs` before starting or resuming work.
3. **Preserve 2.5D Hybrid & Biblical Contracts:**
   - Classify beats as *Scripture-supported*, *Reasoned architectural/historical interpretation*, or *Creative visual/illustrative device*. Never present humor as literal Scripture.
   - All visible humans MUST be 2D illustrated articulated rigs (never 3D primitive mannequins).
   - Worlds, architecture, and props are stylized 3D.
   - Explanatory guides are 2D screen-space motion graphics only (`src/hud/hud_text_system.ts`).
   - Zero baked-in narration subtitles inside individual clips.
4. **Maintain Atomic Checkpoints:** Update `docs/ACTIVE_TASK.md` atomically (`.tmp` write + rename) before substantial tasks, after meaningful edits, before/after packaging, when blocked, and on completion using only:
   `NOT_STARTED`, `IN_PROGRESS`, `INTERRUPTED`, `BLOCKED`, `COMPLETED_UNVERIFIED`, `VERIFIED_COMPLETE`.
5. **Log Corrections Incrementally (All 6 Fields):** Immediately after every substantial fix or milestone (never only at session end), append to `docs/PRODUCTION_CHANGELOG.md` and update `docs/ACTIVE_TASK.md` with:
   `(a)` what was wrong, `(b)` what action was taken, `(c)` which files were modified, `(d)` what test was performed, `(e)` what result was observed, `(f)` what remains unverified.
6. **Separate Technical vs. Creative Approval:** Technical checks (build, lint, deterministic `window.renderAt(t)`, `ffprobe` 48 kHz stereo WAV, SHA-256 ZIP integrity) never grant creative approval. Any visual change resets `creativeApproval.status` to `pending_review` until the user visually approves the updated preview.
7. **Offline Windows Local Studio Delivery:** Package self-contained `output/local_studio/renderXX/` + `<episodeId>_renderXX_local_studio.zip` (`renderXX.html`, `./assets/three.module.min.js`, 48 kHz stereo SFX-only `renderXX_sfx.wav` starting at local `t = 0`, `renderXX_events.json`, `renderXX_manifest.json`) with zero external CDNs or platform-specific paths. Windows Local Studio handles HTML+WAV playback and MP4 export; CapCut handles final narration, captions, music, and audio mixing.

# Bible Architecture Stories — Permanent Production Specification

## 1. Biblical Integrity & Accuracy Tiers
Every story beat, narration line, visual prop, and on-screen note must be classified internally across three tiers:
1. **Scripture-Supported:** Directly anchored in the biblical text (events, dimensions, materials, sequence, characters).
2. **Reasoned Architectural / Historical Interpretation:** Plausible ancient construction, structural engineering, or environmental context clearly compatible with Scripture.
3. **Creative Visual / Illustrative Device:** Expressive storytelling moments or gentle Christian/engineering humor used for viewer engagement.
   - **Hard Rule:** Never present creative visual humor or modern analogies as literal biblical fact. Label conceptual/scale diagrams cleanly if shown on screen.

---

## 2. Storytelling & Pacing Rules
- **Action-Driven Hook:** Open in the first 1–2 seconds with immediate physical action, architectural tension, or relatable human stakes—never a static lecture card.
- **Clear Progression:** Establish the engineering/spiritual problem, demonstrate structural progression step by step, and resolve with a meaningful payoff aligned to the biblical lesson.
- **Narration Authority:** Visual beats, camera reveals, 2D callouts, and ending holds must synchronize to the approved narration cue timings (`assets/narration/narration_cues.json`). Never invent or rewrite approved dialogue mid-render without updating timing cues first.

---

## 3. 2.5D Hybrid Visual Constitution
- **All Visible Humans = 2D Illustrated Characters:**
  - Rendered via high-resolution 2D Canvas/illustrated textures on articulated sprite/billboard parts (explicit neck, shoulder/elbow/wrist/hip/knee/ankle hierarchy, layered gouache/ink outfits, expressive simplified faces with blink/brow/mouth states, soft ground contact shadows).
  - **Forbidden:** 3D primitive capsule/cylinder/sphere/block mannequins for human characters.
- **Worlds, Architecture & Props = Stylized 3D:**
  - Warm parchment/terracotta/sandstone/timber materials, procedural textures, cohesive sunlight + hemisphere fill + atmospheric fog, stylized flora and terrain.
- **2D Screen-Space Motion Graphics Only:**
  - Measurement lines, arrows, brackets, and concise factual cards are rendered strictly in 2D screen space (`SVG` / `HTML+CSS`) via 3D-to-2D projection (`projectWorldToStage`), placed in the subordinate lower safe band (`y = 1320..1540 px`, above `y = 1560 px` social safe margin).
  - **Forbidden:** Volumetric 3D arrows/text plates in world space, baked-in narration subtitles inside individual clips, or cluttered multi-badge HUD overlays.
- **Visual Attention Hierarchy:**
  - Primary: Main 3D architectural subject / 2D character action centered cleanly (`y = 420..1260 px`).
  - Secondary: Concise factual callouts & post-edit CapCut captions.
  - Tertiary: Supporting 2D projected leader lines and highlights.

---

## 4. Continuity & Camera Discipline
- **Shot-to-Shot & Render-to-Render Continuity:** Persist exact world positions, material mixes, lighting/sky parameters, prop states, and camera framing across consecutive render boundaries (`t_end -> t_0`) unless an explicit narrative time jump is planned in `NARRATION_AND_SHOTMAP.md`.
- **Camera Movement:** Every camera move must serve a story beat (reveal scale, follow character intent, inspect structural detail). Keep primary subjects framed away from edge clipping and lower-third caption zones. Smooth cubic/sine transitions; never snap unintentionally.

---

## 5. Deterministic Renderer Contract (`1080 × 1920 @ 30 fps`)
- Fixed portrait stage: `1080 × 1920` (`9:16`), scaled purely via CSS transform on `#stage-frame` inside `#stage-viewport` (`display: block`, never flexbox centering hacks that clip tall viewports).
- Every render HTML exposes:
  - `window.DURATION` (exact segment duration in seconds from the segment timeline; script-driven, not hardcoded globally to 20 s).
  - `window.renderAt(t)` (pure deterministic frame evaluation for `t in [0, DURATION]`; zero unseeded `Math.random()` or wall-clock drift).
  - `window.__SKIP_GL_RENDER__` optional fast trace hook for lightweight 120 Hz scalar telemetry extraction during audio synthesis.
- **No `requestAnimationFrame` dependency** for deterministic scrubbing or frame capture.
- **Software WebGL / SwiftShader Rule:** Never launch Chromium with `--disable-gpu-compositing` (causes HUD/sky compositing regressions). Cap `devicePixelRatio` at `1` during deterministic capture/software GL.

---

## 6. Motion-Synced Sound Rules
- Generate **48 kHz, stereo, 24-bit PCM (`pcm_s24le`)** SFX-only WAVs (`renderXX_sfx.wav`).
- WAV starts cleanly at **local timestamp `t = 0.000 s`** with exact sample count matching `round(DURATION * 48000)` samples/channel (no offset required in Local Studio).
- All foley/SFX cues (footsteps, impacts, wood/stone/fabric handling, architectural UI ticks, camera air whooshes, environmental beds) must derive directly from extracted deterministic timeline telemetry (`renderXX_events.json`).
- **Strictly Excluded from SFX WAV:** No narration voiceover and no background music (handled in CapCut).

---

## 7. Offline Windows Local Studio Delivery Contract
Hydrogen delivers a self-contained folder (`output/local_studio/renderXX/`) and atomic store-ZIP (`output/<episodeId>_renderXX_local_studio.zip`) containing:
1. `renderXX.html` — standalone deterministic Three.js animation
2. `assets/three.module.min.js` (and any local character/art assets) — zero external CDNs, zero `/assets/aistudio/` or platform-specific paths
3. `renderXX_sfx.wav` — 48 kHz stereo SFX-only WAV starting at `t = 0`
4. `renderXX_events.json` — synchronized sound-event cues and peak/RMS telemetry
5. `renderXX_manifest.json` — duration, master/local timeline bounds, resolution, FPS, visual/timing/audio SHA-256 hashes, asset checksums, and audio verification metadata

- Windows Local Studio handles synchronized HTML + WAV playback, scrubbing, and final MP4 export.
- CapCut handles final narration, captions, music, and episode audio mixing.
- Hydrogen does **not** need to export heavy full-resolution MP4s or intermediate JPEG sequences for Local Studio deliverables unless explicitly requested for visual inspection.

---

## 8. Recovery, Versioning & Documentation Rules
- Separate **Visual Hash**, **Timing Hash**, and **Audio Hash** independently so editing audio never invalidates unrelated visual verification, while any visual source change resets stale creative approval to `pending_review`.
- Differentiate export states explicitly: *Not generated*, *Packaged locally on disk*, *Checksum verified*, *Delivered / user-obtained*, *Outdated (source hash changed)*, *Missing after container restart*.
- Update `docs/ACTIVE_TASK.md` atomically (`NOT_STARTED`, `IN_PROGRESS`, `INTERRUPTED`, `BLOCKED`, `COMPLETED_UNVERIFIED`, `VERIFIED_COMPLETE`) before and after every substantial milestone, and append verified entries to `docs/PRODUCTION_CHANGELOG.md`.

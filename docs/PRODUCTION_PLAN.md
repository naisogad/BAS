# Production Plan & Creative Approval Matrix

**Project:** `BAS_EP02`  
**Episode:** `ep02` — *Why Did God Close Noah's Ark?*  
**Main Biblical References:** Genesis 6–9; 1 Peter 3:20; 2 Peter 2:5; Matthew 24:37–42  
**Delivery Pipeline:** `Hydrogen (HTML + Local Assets + 48kHz SFX WAV + Manifest + ZIP) -> Windows Local Studio (MP4) -> CapCut (Final VO + Music + Captions)`

---

## 1. Prior Documented Approvals (Preserved)

| Item | Documented Approval State | Asset Present in Repo? | Notes |
|---|---|---|---|
| **V002 Concept** (*Why Did God Close Noah's Ark?*) | `approved` | N/A | Concept approved by user prior to project bootstrap |
| **Narration Draft v3** | `approved` | `No` (awaiting original file) | Do not reconstruct or rewrite; import original approved text when available |
| **Exact Grandfather Joe Audio Master** | `approved` | `No` (awaiting original MP3) | Do not reconstruct or regenerate; import original MP3 when available |

---

## 2. Phase Gate Tracker

| Phase | Gate Description | Status | Verified Date | Notes |
|---|---|---|---|---|
| Phase 1 | Biblical Research, Concept, Draft v3 Script & Grandfather Joe MP3 | `PARTIAL (CONCEPT/DRAFT v3/AUDIO MASTER APPROVED; FILES AWAITING IMPORT)` | `—` | Concept, Draft v3 & Grandfather Joe master approved; original files + MasterRefs still needed |
| Phase 2 | Shot Map, Continuity Contract & Dynamic Segment Split | `NOT_STARTED` | `—` | Blocked on original MP3 cue extraction & visual MasterRefs |
| Phase 3 | Timeline, 2D Character Rigs, 3D World & SFX Synthesis | `NOT_STARTED` | `—` | Do NOT develop Episode 02 animation before Phase 1+2 completion |
| Phase 4 | Lightweight Preview Inspection & Visual Approval | `NOT_STARTED` | `—` | All creative approval states remain empty/`unapproved` |
| Phase 5 | Windows Local Studio Packaging & Checksum Handover | `NOT_STARTED` | `—` | `output/` is clean; packaging smoke-verified on template only |

---

## 3. Segment Production & Approval Table
*(All segment creative and technical approval states are empty until Phase 2 segment split and Phase 3/4 production.)*

| Render ID | Title | Master Time (s) | Duration (s) | Visual Short Hash | Audio Short Hash | Creative Approval | Technical Approval | Local Studio Package Status |
|---|---|---|---|---|---|---|---|---|
| `TBD` | `Awaiting Phase 2 segment split` | `—` | `—` | `—` | `—` | `unapproved` | `unapproved` | `NOT_STARTED` |

---

## 4. Approval & Stale-Hash Rule
- **Technical verification** (`HTML loads offline`, `renderAt deterministic`, `WAV 48kHz stereo exact samples`, `ZIP checksum passes`) does **NOT** grant **creative approval**.
- **Creative approval** requires user visual confirmation of the current preview matching `visualShortHash`. Any animation edit resets creative approval to `pending_review`.

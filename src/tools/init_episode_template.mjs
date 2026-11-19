#!/usr/bin/env node
/**
 * Initializes a clean episode workspace copied from BAS_MASTER_TEMPLATE
 * with an independent episode ID, title, slug, Scripture reference,
 * and fresh Phase 1 checkpoint records.
 *
 * Usage:
 *   node src/tools/init_episode_template.mjs --episode ep02 --slug tower_of_babel --title "Tower of Babel" --scripture "Genesis 11:1-9"
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const opts = {
    episodeId: "",
    slug: "",
    title: "",
    scripture: "TBD",
    rootDir: process.cwd(),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--episode" && argv[i + 1]) opts.episodeId = argv[++i];
    else if (a === "--slug" && argv[i + 1]) opts.slug = argv[++i];
    else if (a === "--title" && argv[i + 1]) opts.title = argv[++i];
    else if (a === "--scripture" && argv[i + 1]) opts.scripture = argv[++i];
    else if (a === "--root" && argv[i + 1]) opts.rootDir = path.resolve(argv[++i]);
  }
  return opts;
}

function writeAtomic(filePath, content) {
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, filePath);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.episodeId || !opts.title) {
    throw new Error("Provide --episode <epXX> and --title \"<Episode Title>\".");
  }
  const slug =
    opts.slug ||
    opts.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const identityPath = path.join(opts.rootDir, "PROJECT_IDENTITY.json");
  const identity = JSON.parse(fs.readFileSync(identityPath, "utf-8"));
  identity.episodeId = opts.episodeId;
  identity.episodeSlug = slug;
  identity.episodeTitle = opts.title;
  identity.scripturalReference = opts.scripture;
  identity.phaseStatus = "PHASE_1_RESEARCH_IN_PROGRESS";
  identity.narration.scriptStatus = "NOT_STARTED";
  identity.narration.totalDurationSec = null;
  identity.segments = [];
  writeAtomic(identityPath, JSON.stringify(identity, null, 2) + "\n");

  const nowIso = new Date().toISOString();
  const activeTaskPath = path.join(opts.rootDir, "docs", "ACTIVE_TASK.md");
  const activeMd = `# Active Task Checkpoint

- **Current task status:** \`NOT_STARTED\`
- **Last checkpoint timestamp:** \`${nowIso}\`
- **Task ID / Objective:** \`PHASE_1_INTAKE — Complete biblical research, story concept, script, and visual blueprint for ${opts.episodeId} (${opts.title})\`
- **Episode / Render:** \`${opts.episodeId} / None\`

---

## 1. Current Task and Objective
Execute Phase 1 pre-production research and narrative design for **${opts.episodeId}: ${opts.title}** (${opts.scripture}) before any shot map, timeline code, or render creation.

## 2. Episode and Render Number
- **Episode ID:** \`${opts.episodeId}\`
- **Active Render Segment:** \`None (Phase 1 pre-production)\`

## 3. Last Verified Completed Milestone
- Clean episode workspace initialized independently from \`BAS_MASTER_TEMPLATE\` (\`PROJECT_IDENTITY.json\` configured; zero inherited story assets, hashes, jobs, or approvals).

## 4. Currently Unfinished Work
- Complete \`docs/PHASE1_RESEARCH_WORKFLOW.md\`.
- Draft narration script and record ElevenLabs timing cues into \`assets/narration/narration_cues.json\`.

## 5. Files Created or Modified
- \`VERIFIED_COMPLETE\`: \`PROJECT_IDENTITY.json\`, \`docs/ACTIVE_TASK.md\`

## 6. Latest Verified Export Status
- **Runtime Local Studio Outputs:** \`NONE (pre-production)\`
- **User-Obtained Deliverables:** \`NONE\`

## 7. Known Blockers and Open Issue IDs
- **Blockers:** Awaiting Phase 1 research approval and finalized narration timing before Phase 2/3.
- **Open Issue IDs:** \`None\`

## 8. Exact Next Action
Complete \`docs/PHASE1_RESEARCH_WORKFLOW.md\` sections 1–9 with the user (biblical passage, main lesson, story concept, humor guardrails, opening hook, progression, MasterRefs, world palette, and narration estimate).

## 9. Relevant Visual, Timing, and Audio Hashes
- \`No renders defined yet.\`
`;
  writeAtomic(activeTaskPath, activeMd);

  console.log(
    JSON.stringify(
      {
        initialized: true,
        episodeId: opts.episodeId,
        episodeSlug: slug,
        episodeTitle: opts.title,
        scripturalReference: opts.scripture,
        phaseStatus: identity.phaseStatus,
        segmentsCount: identity.segments.length,
      },
      null,
      2
    )
  );
}

main();

#!/usr/bin/env node
/**
 * Verifies template / episode documentation, identity, environment readiness,
 * and checkpoint hygiene cleanly before resuming or beginning work.
 */

import fs from "node:fs";
import path from "node:path";

const REQUIRED_FILES = [
  "AGENTS.md",
  "README.md",
  "PROJECT_IDENTITY.json",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  ".gitignore",
  ".env.example",
  "requirements.txt",
  "docs/README.md",
  "docs/PROJECT_SPEC.md",
  "docs/PHASE1_RESEARCH_WORKFLOW.md",
  "docs/ACTIVE_TASK.md",
  "docs/AGENT_HANDOFF.md",
  "docs/NARRATION_AND_SHOTMAP.md",
  "docs/PRODUCTION_PLAN.md",
  "docs/ISSUES_REGISTER.md",
  "docs/PRODUCTION_CHANGELOG.md",
  "docs/SETUP_AND_DEPENDENCIES.md",
  "manifests/episode_manifest_template.json",
  "assets/three.module.min.js",
  "src/check_env.py",
  "src/timelines/timeline_template.ts",
  "src/characters/character_rig_2d_template.ts",
  "src/scene/three_stage_template.ts",
  "src/hud/hud_text_system.ts",
  "src/builders/build_render_html_template.mjs",
  "src/audio/sfx_generator_template.py",
  "src/packaging/package_local_studio_template.mjs",
];

function main() {
  const rootDir = process.cwd();
  const missingFiles = REQUIRED_FILES.filter((rel) => !fs.existsSync(path.join(rootDir, rel)));

  const identityPath = path.join(rootDir, "PROJECT_IDENTITY.json");
  const identity = fs.existsSync(identityPath)
    ? JSON.parse(fs.readFileSync(identityPath, "utf-8"))
    : null;

  const activeTaskPath = path.join(rootDir, "docs", "ACTIVE_TASK.md");
  const activeTaskText = fs.existsSync(activeTaskPath)
    ? fs.readFileSync(activeTaskPath, "utf-8")
    : "";
  const statusMatch = activeTaskText.match(/\*\*Current task status:\*\*\s*`([^`]+)`/i);

  const report = {
    checkedAt: new Date().toISOString(),
    rootDir,
    missingFiles,
    episodeId: identity?.episodeId ?? null,
    phaseStatus: identity?.phaseStatus ?? null,
    segmentsCount: Array.isArray(identity?.segments) ? identity.segments.length : null,
    activeTaskStatus: statusMatch ? statusMatch[1] : null,
    readyToProceed: missingFiles.length === 0 && Boolean(identity) && Boolean(statusMatch),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.readyToProceed) {
    process.exitCode = 1;
  }
}

main();

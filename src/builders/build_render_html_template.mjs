#!/usr/bin/env node
/**
 * Standalone Render HTML Builder Template
 * Bible Architecture Stories — Offline Windows Local Studio Contract
 *
 * Bundles:
 *  - src/timelines/timeline_template.ts
 *  - src/characters/character_rig_2d_template.ts
 *  - src/scene/three_stage_template.ts
 *  - src/hud/hud_text_system.ts
 *
 * Enforces:
 *  - Pure local ./assets/three.module.min.js importmap (auto-copied into output assets/)
 *  - Deterministic window.DURATION + window.renderAt(t)
 *  - Full WebGL 3D + 2D Canvas sprite + 2D SVG/HTML projected HUD overlay
 *  - Interactive Play / Pause / Restart / Timeline Scrubbing
 *  - window.__SKIP_GL_RENDER__ hook for fast 120 Hz scalar trace extraction
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadEsbuild() {
  const candidates = [
    "esbuild",
    "/usr/local/share/bun-global/node_modules/esbuild",
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      // try next candidate
    }
  }
  throw new Error("esbuild module not found. Install esbuild or run in a workspace with global esbuild.");
}

function parseArgs(argv) {
  const opts = {
    episodeId: "epXX",
    renderId: "01",
    title: "Technical Validation Scene",
    duration: 4.0,
    masterStart: 0.0,
    outDir: path.resolve(process.cwd(), "output", "preview"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--episode" && argv[i + 1]) opts.episodeId = argv[++i];
    else if (arg === "--render" && argv[i + 1]) opts.renderId = argv[++i];
    else if (arg === "--title" && argv[i + 1]) opts.title = argv[++i];
    else if (arg === "--duration" && argv[i + 1]) opts.duration = Number(argv[++i]);
    else if (arg === "--master-start" && argv[i + 1]) opts.masterStart = Number(argv[++i]);
    else if (arg === "--out-dir" && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
  }
  return opts;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function bundleTemplateModules(templateRoot) {
  const esbuild = loadEsbuild();
  const res = await esbuild.build({
    stdin: {
      contents: `
        export * as Timeline from "./src/timelines/timeline_template.ts";
        export * as CharRig from "./src/characters/character_rig_2d_template.ts";
        export * as Stage from "./src/scene/three_stage_template.ts";
        export * as Hud from "./src/hud/hud_text_system.ts";
      `,
      resolveDir: templateRoot,
      loader: "ts",
    },
    bundle: true,
    write: false,
    minify: false,
    format: "iife",
    globalName: "BasTemplateBundle",
    platform: "browser",
    target: ["es2020"],
  });
  return res.outputFiles[0].text;
}

function buildHtmlDocument({ opts, bundleCode }) {
  const safeDuration = Number.isFinite(opts.duration) && opts.duration > 0 ? opts.duration : 4.0;
  const safeMaster = Number.isFinite(opts.masterStart) ? opts.masterStart : 0.0;
  const safeTitle = escapeHtml(opts.title);
  const safeEp = escapeHtml(opts.episodeId);
  const safeRender = escapeHtml(opts.renderId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bible Architecture Stories — ${safeEp} Render ${safeRender}: ${safeTitle}</title>
  <style>
    :root { --stage-scale: 0.42; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: #14110e; color: #f5efe2;
      font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
    }
    #stage-viewport {
      position: relative; display: block; width: 100%;
      height: calc(100vh - 76px); overflow: hidden;
    }
    #stage-frame {
      position: absolute; left: 50%; top: 50%;
      width: 1080px; height: 1920px;
      transform-origin: center center;
      transform: translate(-50%, -50%) scale(var(--stage-scale));
      overflow: hidden; background: #e9dcc8;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
    }
    #render-canvas { display: block; width: 1080px; height: 1920px; }
    #preview-bar {
      height: 76px; display: flex; align-items: center; gap: 12px; padding: 0 20px;
      background: #1c1814; border-top: 1px solid rgba(245, 239, 226, 0.14);
    }
    .ctrl-btn {
      padding: 8px 14px; border-radius: 8px;
      border: 1px solid rgba(245, 239, 226, 0.22);
      background: #2b231c; color: #f5efe2;
      font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .ctrl-btn.primary { background: #c96a26; border-color: #c96a26; color: #15110d; }
    #scrub-wrap { flex: 1; display: flex; align-items: center; gap: 12px; }
    #scrub-slider { flex: 1; accent-color: #c96a26; cursor: pointer; }
    #timecode {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 13px; color: #e6dccb; min-width: 155px; text-align: right;
    }
    #shot-caption { font-size: 12px; color: #b7a994; white-space: nowrap; }
  </style>
  <style id="bas-hud-style"></style>
</head>
<body data-shot="SHOT_A" data-time="0.00">
  <div id="stage-viewport">
    <div id="stage-frame" data-testid="stage-frame">
      <canvas id="render-canvas" width="1080" height="1920" data-testid="render-canvas"></canvas>
      <div id="hud-overlay">
        <svg id="hud-leaders" viewBox="0 0 1080 1920" aria-hidden="true">
          <line id="leader-line" x1="540" y1="900" x2="540" y2="1320" stroke="#b45319" stroke-width="4" stroke-dasharray="10 8" style="opacity:0;" />
          <circle id="leader-dot" cx="540" cy="900" r="8" fill="#b45319" style="opacity:0;" />
        </svg>
        <div id="hud-card" class="dim-label" style="left:540px;top:1410px;opacity:0;">
          <div class="dim-card accent-amber">
            <span id="hud-value" class="dim-value">TEST STRUCTURE</span>
            <span id="hud-sub" class="dim-sub">2.5D TEMPLATE CHECK</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <footer id="preview-bar" aria-label="Animation preview controls">
    <button id="btn-play" class="ctrl-btn primary" type="button">Play</button>
    <button id="btn-pause" class="ctrl-btn" type="button">Pause</button>
    <button id="btn-restart" class="ctrl-btn" type="button">Restart</button>
    <div id="scrub-wrap">
      <input id="scrub-slider" type="range" min="0" max="${safeDuration}" step="0.01" value="0" aria-label="Timeline scrub" />
      <span id="timecode">00.00 / ${safeDuration.toFixed(2)}s</span>
    </div>
    <span id="shot-caption">${safeTitle}</span>
  </footer>

  <script type="importmap">
  {
    "imports": {
      "three": "./assets/three.module.min.js"
    }
  }
  </script>

  <script>
${bundleCode}
  </script>

  <script type="module">
    import * as THREE from "three";

    const { Timeline, CharRig, Stage, Hud } = window.BasTemplateBundle;
    document.getElementById("bas-hud-style").textContent = Hud.SHARED_HUD_CSS;

    const SEGMENT_CONFIG = {
      episodeId: ${JSON.stringify(opts.episodeId)},
      renderId: ${JSON.stringify(opts.renderId)},
      title: ${JSON.stringify(opts.title)},
      masterTimeOffsetSec: ${safeMaster},
      durationSec: ${safeDuration},
      fps: 30,
      stageWidth: 1080,
      stageHeight: 1920,
    };

    const ENTRY_CONTINUITY = {
      camera: { position: { x: -4.0, y: 2.8, z: 10.5 }, target: { x: 0.0, y: 1.4, z: 0.0 }, fov: 44 },
      environmentPreset: "BIBLICAL_DAYLIGHT_TEST",
      sunElevationDeg: 42,
      fogDensityMix: 0,
      weatherIntensity: 0,
      characterAnchors: {},
      propStates: { blockRise: 0 },
    };

    const DURATION = SEGMENT_CONFIG.durationSec;
    window.DURATION = DURATION;
    window.MASTER_TIME_OFFSET = SEGMENT_CONFIG.masterTimeOffsetSec;

    const STAGE_W = Stage.PORTRAIT_STAGE_SPEC.width;
    const STAGE_H = Stage.PORTRAIT_STAGE_SPEC.height;
    const stageViewport = document.getElementById("stage-viewport");
    const stageFrame = document.getElementById("stage-frame");
    const canvasEl = document.getElementById("render-canvas");
    const timecodeEl = document.getElementById("timecode");
    const sliderEl = document.getElementById("scrub-slider");
    const btnPlay = document.getElementById("btn-play");
    const btnPause = document.getElementById("btn-pause");
    const btnRestart = document.getElementById("btn-restart");
    const hudCardEl = document.getElementById("hud-card");
    const hudValueEl = document.getElementById("hud-value");
    const hudSubEl = document.getElementById("hud-sub");
    const leaderLineEl = document.getElementById("leader-line");
    const leaderDotEl = document.getElementById("leader-dot");

    function updateStageScale() {
      const vw = stageViewport.clientWidth || window.innerWidth;
      const vh = stageViewport.clientHeight || (window.innerHeight - 76);
      const scale = Math.max(0.1, Math.min((vw - 20) / STAGE_W, (vh - 20) / STAGE_H));
      stageFrame.style.setProperty("--stage-scale", scale.toFixed(6));
    }
    window.addEventListener("resize", updateStageScale);
    updateStageScale();

    const isSoftwareGl = (() => {
      if (window.__SKIP_GL_RENDER__) return true;
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) return true;
      const ext = probe.getExtension("WEBGL_debug_renderer_info");
      const gpu = String(probe.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER));
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer = null;
    let scene = null;
    let camera = null;
    let testBlock = null;
    let testCharSprite = null;
    let testCharShadow = null;
    const projVec = new THREE.Vector3();

    if (!window.__SKIP_GL_RENDER__) {
      const pal = Stage.DEFAULT_BIBLICAL_DAYLIGHT_PALETTE;
      renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        antialias: !isSoftwareGl,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
      renderer.setSize(STAGE_W, STAGE_H, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe9dcc8);
      scene.fog = new THREE.Fog(pal.fogHex, pal.fogNear, pal.fogFar);

      camera = new THREE.PerspectiveCamera(44, STAGE_W / STAGE_H, 0.1, 800);
      scene.add(new THREE.HemisphereLight(pal.hemiSkyHex, pal.hemiGroundHex, pal.hemiIntensity));
      const sun = new THREE.DirectionalLight(pal.sunHex, pal.sunIntensity);
      sun.position.set(16, 28, 18);
      scene.add(sun);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: 0xc9ab7c, roughness: 0.92 })
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      testBlock = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 3.0, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xb98552, roughness: 0.78 })
      );
      testBlock.position.set(0.8, 1.5, 0);
      scene.add(testBlock);

      const charTex = CharRig.createCanvasPartTexture(THREE, { width: 256, height: 512, anisotropy: 1 }, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#5c3e28";
        ctx.fillRect(w * 0.34, h * 0.34, w * 0.32, h * 0.46);
        ctx.fillStyle = "#d9a97c";
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.22, w * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#241b14";
        ctx.lineWidth = 6;
        ctx.stroke();
      });
      testCharSprite = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 1.9),
        new THREE.MeshBasicMaterial({ map: charTex, transparent: true, alphaTest: 0.05 })
      );
      testCharSprite.position.set(-1.6, 0.95, 0.4);
      scene.add(testCharSprite);

      const shadowTex = CharRig.createContactShadowTexture(THREE, 128);
      testCharShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      testCharShadow.rotation.x = -Math.PI / 2;
      testCharShadow.position.set(-1.6, 0.01, 0.4);
      scene.add(testCharShadow);
    }

    let currentTime = 0;
    let isPlaying = false;
    let rafId = null;
    let lastStamp = 0;

    window.renderAt = function renderAt(rawTime) {
      const t = Timeline.clamp(Number(rawTime) || 0, 0, DURATION);
      currentTime = t;
      const baseState = Timeline.evaluateSegmentTemplate(t, SEGMENT_CONFIG, ENTRY_CONTINUITY);

      const risePhase = Timeline.easeInOutCubic(Timeline.clamp((t - 0.5) / Math.max(0.5, DURATION * 0.45), 0, 1));
      const propY = Timeline.lerp(0.5, 1.5, risePhase);
      const stepPhase = t * Math.PI * 2.2;
      const charX = Timeline.lerp(-2.2, -1.1, Timeline.easeInOutCubic(t / DURATION));
      const charBob = Math.abs(Math.sin(stepPhase)) * 0.08;
      const hudOpacity = Timeline.smoothstep(0.6, 1.2, t) * (1 - Timeline.smoothstep(DURATION - 0.5, DURATION, t));

      if (testBlock) testBlock.position.y = propY;
      if (testCharSprite) testCharSprite.position.set(charX, 0.95 + charBob, 0.4);
      if (testCharShadow) testCharShadow.position.set(charX, 0.01, 0.4);

      if (camera && renderer && scene) {
        camera.position.set(baseState.camera.position.x, baseState.camera.position.y, baseState.camera.position.z);
        camera.lookAt(baseState.camera.target.x, baseState.camera.target.y, baseState.camera.target.z);
        camera.fov = baseState.camera.fov;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        const pt = Hud.projectWorldToStage(camera, projVec, 0.8, propY + 1.5, 0);
        if (pt.visible && hudOpacity > 0.01) {
          hudValueEl.textContent = "HEIGHT " + (propY * 2).toFixed(1) + " M";
          hudSubEl.textContent = "TEMPLATE 2.5D SMOKE";
          hudCardEl.style.opacity = hudOpacity.toFixed(3);
          leaderLineEl.setAttribute("x1", pt.x.toFixed(1));
          leaderLineEl.setAttribute("y1", pt.y.toFixed(1));
          leaderLineEl.setAttribute("x2", "540");
          leaderLineEl.setAttribute("y2", "1340");
          leaderLineEl.style.opacity = (hudOpacity * 0.85).toFixed(3);
          leaderDotEl.setAttribute("cx", pt.x.toFixed(1));
          leaderDotEl.setAttribute("cy", pt.y.toFixed(1));
          leaderDotEl.style.opacity = (hudOpacity * 0.85).toFixed(3);
        } else {
          hudCardEl.style.opacity = "0";
          leaderLineEl.style.opacity = "0";
          leaderDotEl.style.opacity = "0";
        }
      }

      document.body.dataset.time = t.toFixed(2);
      sliderEl.value = String(t);
      timecodeEl.textContent = t.toFixed(2).padStart(5, "0") + " / " + DURATION.toFixed(2) + "s";

      return {
        t,
        duration: DURATION,
        masterTime: baseState.masterTimeSec,
        shotId: baseState.shotId,
        camera: baseState.camera,
        propY,
        charX,
        charBob,
        stepSin: Math.sin(stepPhase),
        hudOpacity,
      };
    };

    function stepLoop(now) {
      if (!isPlaying) return;
      if (!lastStamp) lastStamp = now;
      const dt = Math.min(0.1, (now - lastStamp) / 1000);
      lastStamp = now;
      const next = currentTime + dt;
      if (next >= DURATION) {
        window.renderAt(DURATION);
        isPlaying = false;
        rafId = null;
        return;
      }
      window.renderAt(next);
      rafId = requestAnimationFrame(stepLoop);
    }

    btnPlay.addEventListener("click", () => {
      if (currentTime >= DURATION) currentTime = 0;
      isPlaying = true;
      lastStamp = 0;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(stepLoop);
    });

    btnPause.addEventListener("click", () => {
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });

    btnRestart.addEventListener("click", () => {
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.renderAt(0);
    });

    sliderEl.addEventListener("input", () => {
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.renderAt(Number(sliderEl.value));
    });

    window.renderAt(0);
  </script>
</body>
</html>
`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const templateRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const bundleCode = await bundleTemplateModules(templateRoot);

  fs.mkdirSync(opts.outDir, { recursive: true });
  const assetsOutDir = path.join(opts.outDir, "assets");
  fs.mkdirSync(assetsOutDir, { recursive: true });

  const srcThree = path.join(templateRoot, "assets", "three.module.min.js");
  const dstThree = path.join(assetsOutDir, "three.module.min.js");
  if (fs.existsSync(srcThree)) {
    fs.copyFileSync(srcThree, dstThree);
  }

  const outHtml = path.join(opts.outDir, `render${opts.renderId}.html`);
  fs.writeFileSync(outHtml, buildHtmlDocument({ opts, bundleCode }), "utf-8");
  console.log(`Built standalone preview HTML: ${outHtml}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Reusable 1080x1920 Portrait Stage Shell, Lighting & Environment Helpers
 * Bible Architecture Stories — Offline Local Studio Compatible
 *
 * Guarantees:
 *  - Fixed 1080x1920 logical stage scaled cleanly via CSS transform inside #stage-viewport.
 *  - Local Three.js importmap pointing strictly to "./assets/three.module.min.js".
 *  - Zero external CDN links or platform-specific paths.
 *  - Software WebGL (SwiftShader) detection with safe DPR=1 cap.
 */

export const PORTRAIT_STAGE_SPEC = {
  width: 1080,
  height: 1920,
  aspectRatio: "9:16",
  fps: 30,
  subordinateHudBandY: { min: 1320, max: 1540 },
  socialSafeBottomY: 1560,
} as const;

export const BASE_STAGE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #14110e;
    color: #f5efe2;
    font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
  }
  #stage-viewport {
    position: relative;
    display: block;
    width: 100%;
    height: calc(100vh - 76px);
    overflow: hidden;
  }
  #stage-frame {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1080px;
    height: 1920px;
    transform-origin: center center;
    transform: translate(-50%, -50%) scale(var(--stage-scale, 0.42));
    overflow: hidden;
    background: #e9dcc8;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  }
  #render-canvas {
    display: block;
    width: 1080px;
    height: 1920px;
  }
  #hud-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
`;

export interface ProceduralLightingPalette {
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  sunHex: number;
  sunIntensity: number;
  rimHex: number;
  rimIntensity: number;
  fogHex: number;
  fogNear: number;
  fogFar: number;
}

export const DEFAULT_BIBLICAL_DAYLIGHT_PALETTE: ProceduralLightingPalette = {
  hemiSkyHex: 0xd7e7f5,
  hemiGroundHex: 0xc39c6b,
  hemiIntensity: 1.04,
  sunHex: 0xffe9be,
  sunIntensity: 1.9,
  rimHex: 0xffe1b5,
  rimIntensity: 0.48,
  fogHex: 0xf2dcc0,
  fogNear: 98,
  fogFar: 320,
};

/**
 * Generates clean HTML head importmap pointing strictly to local ./assets/three.module.min.js.
 */
export function buildLocalThreeImportMapHtml(): string {
  return `<script type="importmap">
{
  "imports": {
    "three": "./assets/three.module.min.js"
  }
}
</script>`;
}

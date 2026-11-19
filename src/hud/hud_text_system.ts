/**
 * Reusable 2D Screen-Space Motion Graphics & Factual Annotation System
 * Bible Architecture Stories — 1080 × 1920 Portrait Stage
 *
 * Rules:
 *   1. Visual Attention Hierarchy:
 *      - Primary:   Main 3D structure / 2D character action centered cleanly (y = 420..1260).
 *      - Secondary: Concise factual text & post-edit captions in subordinate band (y = 1320..1540).
 *      - Tertiary:  2D projected SVG leader lines, arrows, brackets, and highlights.
 *   2. Render explanatory motion graphics strictly in 2D screen space via 3D->2D projection.
 *      Never place volumetric 3D arrows or floating 3D label plates in world space.
 *   3. No baked-in narration subtitles inside individual clips.
 */

export const HUD_LAYOUT_SPEC = {
  stageWidth: 1080,
  stageHeight: 1920,
  safeMarginX: 68,
  subjectCenterBand: { topY: 420, bottomY: 1260, centerY: 960 },
  subordinateTextBand: { topY: 1320, bottomY: 1540, centerY: 1430 },
  socialSafeBottomY: 1560,
  typographyPx: { episodeTitle: 54, shortIdentifier: 40, subLabel: 26 },
} as const;

export const SHARED_HUD_CSS = `
  #hud-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  #hud-leaders {
    position: absolute;
    inset: 0;
    width: 1080px;
    height: 1920px;
    pointer-events: none;
  }
  .hud-lower-band {
    position: absolute;
    top: 1320px;
    left: 68px;
    right: 68px;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    pointer-events: none;
  }
  .dim-label {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    will-change: transform, opacity;
  }
  .dim-card {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 24px;
    background: rgba(252, 248, 239, 0.92);
    border: 3px solid #2b2118;
    border-radius: 12px;
    box-shadow: 0 8px 22px rgba(36, 27, 20, 0.16);
  }
  .dim-card.accent-amber { border-color: #b45319; }
  .dim-card.accent-teal { border-color: #1f6f78; }
  .dim-value {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: 0.03em;
    line-height: 1.08;
    font-variant-numeric: tabular-nums;
    color: #241b14;
  }
  .dim-sub {
    margin-top: 3px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1.14;
    color: #5b4838;
  }
`;

export interface StagePoint2D {
  x: number;
  y: number;
  visible: boolean;
  depth: number;
}

export function clampHud(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function projectWorldToStage(
  camera: unknown,
  projVec: { set: (x: number, y: number, z: number) => { project: (c: unknown) => { x: number; y: number; z: number } } },
  wx: number,
  wy: number,
  wz: number
): StagePoint2D {
  const projected = projVec.set(wx, wy, wz).project(camera);
  if (projected.z > 1 || projected.z < -1) {
    return { x: 0, y: 0, visible: false, depth: projected.z };
  }
  return {
    x: (projected.x * 0.5 + 0.5) * HUD_LAYOUT_SPEC.stageWidth,
    y: (-projected.y * 0.5 + 0.5) * HUD_LAYOUT_SPEC.stageHeight,
    visible: true,
    depth: projected.z,
  };
}

/**
 * Reusable Deterministic Timeline & Continuity Engine Template
 * Bible Architecture Stories — Story-Agnostic Starter Skeleton
 *
 * Rules:
 *  - Duration is script-driven (passed via SegmentConfig, never hardcoded to 20s globally).
 *  - All motion functions MUST be pure functions of local time t in [0, durationSec].
 *  - Zero Math.random(), zero Date.now(), zero wall-clock accumulation.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraKeyframeState {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface HudCalloutState {
  visible: boolean;
  opacity: number;
  valueText: string;
  subLabelText: string;
}

export interface SegmentConfig {
  episodeId: string;
  renderId: string;
  title: string;
  masterTimeOffsetSec: number;
  durationSec: number;
  fps: 30;
  stageWidth: 1080;
  stageHeight: 1920;
}

export interface ContinuityBoundaryState {
  camera: CameraKeyframeState;
  environmentPreset: string;
  sunElevationDeg: number;
  fogDensityMix: number;
  weatherIntensity: number;
  characterAnchors: Record<string, { position: Vec3; yaw: number; visible: boolean }>;
  propStates: Record<string, number>;
}

export interface SegmentRenderState {
  localTimeSec: number;
  masterTimeSec: number;
  shotId: string;
  camera: CameraKeyframeState;
  environmentMix: {
    sunlightMix: number;
    stormMix: number;
    fogNear: number;
    fogFar: number;
  };
  characters: Record<
    string,
    {
      visible: boolean;
      opacity: number;
      position: Vec3;
      yaw: number;
      stridePhase: number;
      strideAmount: number;
      headTurn: number;
      blinkAmount: number;
    }
  >;
  props: Record<string, number>;
  hudCallout: HudCalloutState;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = Math.max(1e-6, edge1 - edge0);
  const t = clamp((x - edge0) / span, 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Deterministic periodic eye-blink envelope (returns 0 = open, 1 = closed).
 */
export function computeDeterministicBlink(t: number, periodSec = 4.2, phaseSec = 0.0): number {
  const cycle = ((t + phaseSec) % periodSec + periodSec) % periodSec;
  if (cycle < 0.08) return smoothstep(0, 0.08, cycle);
  if (cycle < 0.16) return 1 - smoothstep(0.08, 0.16, cycle);
  return 0;
}

/**
 * Starter deterministic evaluator skeleton.
 * Replace shot windows and camera curves with Phase 2 NARRATION_AND_SHOTMAP beats.
 */
export function evaluateSegmentTemplate(
  rawTimeSec: number,
  config: SegmentConfig,
  entryContinuity: ContinuityBoundaryState
): SegmentRenderState {
  const t = clamp(rawTimeSec, 0, Math.max(0.1, config.durationSec));
  const progress = t / Math.max(0.1, config.durationSec);
  const camT = easeInOutCubic(progress);

  const endPos: Vec3 = {
    x: entryContinuity.camera.position.x + 2.0,
    y: entryContinuity.camera.position.y,
    z: entryContinuity.camera.position.z,
  };

  return {
    localTimeSec: t,
    masterTimeSec: config.masterTimeOffsetSec + t,
    shotId: "SHOT_A",
    camera: {
      position: lerpVec3(entryContinuity.camera.position, endPos, camT),
      target: { ...entryContinuity.camera.target },
      fov: entryContinuity.camera.fov,
    },
    environmentMix: {
      sunlightMix: 1,
      stormMix: entryContinuity.weatherIntensity,
      fogNear: 90,
      fogFar: 320,
    },
    characters: {},
    props: { ...entryContinuity.propStates },
    hudCallout: {
      visible: false,
      opacity: 0,
      valueText: "",
      subLabelText: "",
    },
  };
}

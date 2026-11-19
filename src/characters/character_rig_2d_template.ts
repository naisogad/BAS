/**
 * Reusable 2D Illustrated Articulated Character Rig Pattern
 * Bible Architecture Stories — 2.5D Hybrid Contract
 *
 * Permanent Rules:
 *  - ALL visible human characters MUST be 2D illustrated (Canvas-to-Texture planes/sprites),
 *    NEVER 3D capsule/cylinder/sphere mannequins.
 *  - Every character requires:
 *      1. Consistent MasterRef proportions in meters.
 *      2. Explicit hierarchical pivots (pelvis -> torso -> head, shoulders/elbows/wrists, hips/knees/ankles).
 *      3. Simplified expressive face planes (brows, blinking eyes, mouth states).
 *      4. Soft ground contact shadow anchored at ground Y.
 */

export interface CharacterProportionsSpec {
  characterId: string;
  displayName: string;
  totalHeightMeters: number;
  pelvisHeight: number;
  torsoWidth: number;
  torsoHeight: number;
  headWidth: number;
  headHeight: number;
  shoulderOffsetX: number;
  shoulderLocalY: number;
  hipOffsetX: number;
  hipLocalY: number;
  upperArmLength: number;
  forearmLength: number;
  upperLegLength: number;
  lowerLegLength: number;
}

export interface CharacterPose2D {
  visible: boolean;
  opacity: number;
  position: { x: number; y: number; z: number };
  yaw: number;
  strideBounce: number;
  forwardLean: number;
  leftLegAngle: number;
  leftKneeAngle: number;
  rightLegAngle: number;
  rightKneeAngle: number;
  leftArmAngle: number;
  leftElbowAngle: number;
  rightArmAngle: number;
  rightElbowAngle: number;
  headTurn: number;
  blinkAmount: number;
  browLift: number;
  expression: "calm" | "focused" | "surprised" | "joyful";
}

export interface CanvasTextureOptions {
  width: number;
  height: number;
  anisotropy?: number;
}

/**
 * Helper pattern for turning 2D Canvas illustrations (gouache/ink outfits, limbs,
 * or face expressions) into crisp sRGB Three.js textures without external image fetches.
 */
export function createCanvasPartTexture(
  THREE: {
    CanvasTexture: new (canvas: HTMLCanvasElement) => {
      colorSpace: unknown;
      anisotropy: number;
      needsUpdate: boolean;
    };
    SRGBColorSpace: unknown;
  },
  opts: CanvasTextureOptions,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) {
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to acquire 2D canvas context for character artwork.");
  }
  drawFn(ctx, opts.width, opts.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.anisotropy ?? 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft radial ground contact shadow texture shared across 2D characters & props.
 */
export function createContactShadowTexture(
  THREE: {
    CanvasTexture: new (canvas: HTMLCanvasElement) => {
      colorSpace: unknown;
      anisotropy: number;
      needsUpdate: boolean;
    };
    SRGBColorSpace: unknown;
  },
  size = 128
) {
  return createCanvasPartTexture(
    THREE,
    { width: size, height: size, anisotropy: 1 },
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.05, w * 0.5, h * 0.5, w * 0.48);
      grad.addColorStop(0, "rgba(28, 20, 12, 0.48)");
      grad.addColorStop(0.55, "rgba(28, 20, 12, 0.22)");
      grad.addColorStop(1, "rgba(28, 20, 12, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  );
}

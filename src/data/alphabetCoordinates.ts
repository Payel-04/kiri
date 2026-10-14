/**
 * Canonical 21-Landmark Hand Coordinate Templates for Indian Sign Language (ISL) Alphabets (A-Z).
 *
 * MediaPipe Landmark Map (0-20):
 * 0: WRIST
 * 1: THUMB_CMC, 2: THUMB_MCP, 3: THUMB_IP, 4: THUMB_TIP
 * 5: INDEX_MCP, 6: INDEX_PIP, 7: INDEX_DIP, 8: INDEX_TIP
 * 9: MIDDLE_MCP, 10: MIDDLE_PIP, 11: MIDDLE_DIP, 12: MIDDLE_TIP
 * 13: RING_MCP, 14: RING_PIP, 15: RING_DIP, 16: RING_TIP
 * 17: PINKY_MCP, 18: PINKY_PIP, 19: PINKY_DIP, 20: PINKY_TIP
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface KeyJointCoordinates {
  wrist: Point3D;
  thumbTip: Point3D;
  indexTip: Point3D;
  middleTip: Point3D;
  ringTip: Point3D;
  pinkyTip: Point3D;
}

export interface CoordinateConstraintRule {
  description: string;
  fingerStatus: {
    thumb: 'extended' | 'curled' | 'touching_index' | 'across_palm' | 'upright';
    index: 'extended' | 'curled' | 'hooked' | 'horizontal' | 'diagonal';
    middle: 'extended' | 'curled' | 'touching_thumb' | 'flat';
    ring: 'extended' | 'curled' | 'flat';
    pinky: 'extended' | 'curled' | 'hooked' | 'interlocked';
  };
  relativeDistances: {
    thumbToIndexTip?: { min: number; max: number };
    indexToMiddleTip?: { min: number; max: number };
    dualIndexTipDistance?: { min: number; max: number };
    interHandContactDistance?: { min: number; max: number };
  };
  vectors: {
    pointingDirection: [number, number, number]; // [vx, vy, vz]
    palmNormal: [number, number, number]; // [nx, ny, nz]
  };
  tolerance: number;
}

export interface AlphabetCoordinateModel {
  letter: string;
  isTwoHanded: boolean;
  dominantLandmarks: Point3D[];
  nonDominantLandmarks?: Point3D[];
  keyJoints: {
    dominant: KeyJointCoordinates;
    nonDominant?: KeyJointCoordinates;
  };
  constraints: CoordinateConstraintRule;
}

/**
 * Standard 21-landmark builder helper
 */
function createHandLandmarks(
  wrist: [number, number, number],
  thumb: [number, number, number][],
  index: [number, number, number][],
  middle: [number, number, number][],
  ring: [number, number, number][],
  pinky: [number, number, number][]
): Point3D[] {
  return [
    { x: wrist[0], y: wrist[1], z: wrist[2] },
    // Thumb 1..4
    { x: thumb[0][0], y: thumb[0][1], z: thumb[0][2] },
    { x: thumb[1][0], y: thumb[1][1], z: thumb[1][2] },
    { x: thumb[2][0], y: thumb[2][1], z: thumb[2][2] },
    { x: thumb[3][0], y: thumb[3][1], z: thumb[3][2] },
    // Index 5..8
    { x: index[0][0], y: index[0][1], z: index[0][2] },
    { x: index[1][0], y: index[1][1], z: index[1][2] },
    { x: index[2][0], y: index[2][1], z: index[2][2] },
    { x: index[3][0], y: index[3][1], z: index[3][2] },
    // Middle 9..12
    { x: middle[0][0], y: middle[0][1], z: middle[0][2] },
    { x: middle[1][0], y: middle[1][1], z: middle[1][2] },
    { x: middle[2][0], y: middle[2][1], z: middle[2][2] },
    { x: middle[3][0], y: middle[3][1], z: middle[3][2] },
    // Ring 13..16
    { x: ring[0][0], y: ring[0][1], z: ring[0][2] },
    { x: ring[1][0], y: ring[1][1], z: ring[1][2] },
    { x: ring[2][0], y: ring[2][1], z: ring[2][2] },
    { x: ring[3][0], y: ring[3][1], z: ring[3][2] },
    // Pinky 17..20
    { x: pinky[0][0], y: pinky[0][1], z: pinky[0][2] },
    { x: pinky[1][0], y: pinky[1][1], z: pinky[1][2] },
    { x: pinky[2][0], y: pinky[2][1], z: pinky[2][2] },
    { x: pinky[3][0], y: pinky[3][1], z: pinky[3][2] },
  ];
}

function extractKeyJoints(lm: Point3D[]): KeyJointCoordinates {
  return {
    wrist: lm[0],
    thumbTip: lm[4],
    indexTip: lm[8],
    middleTip: lm[12],
    ringTip: lm[16],
    pinkyTip: lm[20],
  };
}

// -------------------------------------------------------------
// Canonical 21-Landmark Coordinate Signatures (A-Z)
// -------------------------------------------------------------

export const ISL_COORDINATE_MODELS: Record<string, AlphabetCoordinateModel> = {
  // A: Two-handed peak; dominant & non-dominant index tips touch
  A: (() => {
    const dom = createHandLandmarks(
      [0.45, 0.70, 0.0],
      [[0.42, 0.65, 0.02], [0.40, 0.60, 0.03], [0.41, 0.56, 0.04], [0.43, 0.54, 0.05]],
      [[0.46, 0.58, 0.0], [0.47, 0.50, -0.02], [0.48, 0.44, -0.04], [0.49, 0.38, -0.05]],
      [[0.44, 0.59, 0.02], [0.43, 0.63, 0.05], [0.42, 0.66, 0.06], [0.42, 0.68, 0.06]],
      [[0.41, 0.61, 0.03], [0.40, 0.64, 0.05], [0.39, 0.67, 0.06], [0.39, 0.69, 0.06]],
      [[0.38, 0.63, 0.03], [0.37, 0.65, 0.05], [0.36, 0.68, 0.06], [0.36, 0.70, 0.06]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.70, 0.0],
      [[0.58, 0.65, 0.02], [0.60, 0.60, 0.03], [0.59, 0.56, 0.04], [0.57, 0.54, 0.05]],
      [[0.54, 0.58, 0.0], [0.53, 0.50, -0.02], [0.52, 0.44, -0.04], [0.51, 0.38, -0.05]],
      [[0.56, 0.59, 0.02], [0.57, 0.63, 0.05], [0.58, 0.66, 0.06], [0.58, 0.68, 0.06]],
      [[0.59, 0.61, 0.03], [0.60, 0.64, 0.05], [0.61, 0.67, 0.06], [0.61, 0.69, 0.06]],
      [[0.62, 0.63, 0.03], [0.63, 0.65, 0.05], [0.64, 0.68, 0.06], [0.64, 0.70, 0.06]]
    );
    return {
      letter: 'A',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: {
        dominant: extractKeyJoints(dom),
        nonDominant: extractKeyJoints(nonDom),
      },
      constraints: {
        description: 'Both index tips meet at peak apex (dist < 0.07); remaining fingers curled in fists.',
        fingerStatus: { thumb: 'curled', index: 'diagonal', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { dualIndexTipDistance: { min: 0.0, max: 0.08 } },
        vectors: { pointingDirection: [0.08, -0.99, -0.1], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // B: Two-handed double circular loops (thumbs and index fingers form touching loops)
  B: (() => {
    const dom = createHandLandmarks(
      [0.44, 0.68, 0.0],
      [[0.42, 0.62, 0.02], [0.44, 0.56, 0.03], [0.46, 0.52, 0.02], [0.48, 0.50, 0.01]],
      [[0.46, 0.58, 0.0], [0.47, 0.52, -0.02], [0.48, 0.49, -0.01], [0.48, 0.50, 0.01]],
      [[0.43, 0.59, 0.02], [0.42, 0.56, 0.03], [0.41, 0.60, 0.04], [0.41, 0.63, 0.04]],
      [[0.40, 0.61, 0.03], [0.39, 0.58, 0.03], [0.38, 0.61, 0.04], [0.38, 0.64, 0.04]],
      [[0.37, 0.63, 0.03], [0.36, 0.60, 0.03], [0.35, 0.63, 0.04], [0.35, 0.66, 0.04]]
    );
    const nonDom = createHandLandmarks(
      [0.56, 0.68, 0.0],
      [[0.58, 0.62, 0.02], [0.56, 0.56, 0.03], [0.54, 0.52, 0.02], [0.52, 0.50, 0.01]],
      [[0.54, 0.58, 0.0], [0.53, 0.52, -0.02], [0.52, 0.49, -0.01], [0.52, 0.50, 0.01]],
      [[0.57, 0.59, 0.02], [0.58, 0.56, 0.03], [0.59, 0.60, 0.04], [0.59, 0.63, 0.04]],
      [[0.60, 0.61, 0.03], [0.61, 0.58, 0.03], [0.62, 0.61, 0.04], [0.62, 0.64, 0.04]],
      [[0.63, 0.63, 0.03], [0.64, 0.60, 0.03], [0.65, 0.63, 0.04], [0.65, 0.66, 0.04]]
    );
    return {
      letter: 'B',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Both hands form closed index-thumb loops meeting in center.',
        fingerStatus: { thumb: 'touching_index', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: {
          thumbToIndexTip: { min: 0.0, max: 0.06 },
          dualIndexTipDistance: { min: 0.0, max: 0.07 },
        },
        vectors: { pointingDirection: [0.0, -0.9, -0.2], palmNormal: [0.0, 0.0, 1.0] },
        tolerance: 0.18,
      },
    };
  })(),

  // C: Single-hand open C crescent
  C: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.46, 0.66, 0.02], [0.43, 0.61, 0.04], [0.41, 0.55, 0.05], [0.42, 0.50, 0.05]],
      [[0.50, 0.58, 0.0], [0.50, 0.48, -0.02], [0.47, 0.42, -0.01], [0.43, 0.40, 0.01]],
      [[0.53, 0.58, 0.01], [0.53, 0.49, -0.01], [0.49, 0.44, 0.0], [0.45, 0.42, 0.02]],
      [[0.55, 0.59, 0.02], [0.55, 0.51, 0.0], [0.51, 0.46, 0.01], [0.47, 0.45, 0.03]],
      [[0.57, 0.61, 0.03], [0.57, 0.54, 0.01], [0.53, 0.50, 0.02], [0.49, 0.49, 0.04]]
    );
    return {
      letter: 'C',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'Single hand open curved C arc; thumb tip and finger tips separated by 0.12 - 0.28.',
        fingerStatus: { thumb: 'extended', index: 'hooked', middle: 'flat', ring: 'flat', pinky: 'flat' },
        relativeDistances: { thumbToIndexTip: { min: 0.10, max: 0.26 } },
        vectors: { pointingDirection: [-0.6, -0.8, 0.0], palmNormal: [1.0, 0.0, 0.0] },
        tolerance: 0.18,
      },
    };
  })(),

  // D: Two-handed vertical spine & C loop
  D: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.70, 0.0],
      [[0.46, 0.66, 0.02], [0.44, 0.61, 0.04], [0.45, 0.58, 0.05], [0.47, 0.57, 0.05]],
      [[0.48, 0.58, 0.0], [0.48, 0.48, -0.02], [0.48, 0.40, -0.03], [0.48, 0.32, -0.04]],
      [[0.46, 0.59, 0.02], [0.45, 0.63, 0.05], [0.45, 0.66, 0.06], [0.45, 0.68, 0.06]],
      [[0.44, 0.61, 0.03], [0.43, 0.64, 0.05], [0.43, 0.67, 0.06], [0.43, 0.69, 0.06]],
      [[0.42, 0.63, 0.03], [0.41, 0.65, 0.05], [0.41, 0.68, 0.06], [0.41, 0.70, 0.06]]
    );
    const nonDom = createHandLandmarks(
      [0.58, 0.70, 0.0],
      [[0.55, 0.65, 0.02], [0.52, 0.60, 0.03], [0.49, 0.58, 0.04], [0.48, 0.58, 0.05]],
      [[0.56, 0.58, 0.0], [0.54, 0.48, -0.02], [0.50, 0.38, -0.03], [0.48, 0.33, -0.04]],
      [[0.58, 0.60, 0.02], [0.59, 0.64, 0.04], [0.59, 0.67, 0.05], [0.59, 0.69, 0.05]],
      [[0.60, 0.62, 0.03], [0.61, 0.65, 0.04], [0.61, 0.68, 0.05], [0.61, 0.70, 0.05]],
      [[0.62, 0.64, 0.03], [0.63, 0.66, 0.04], [0.63, 0.69, 0.05], [0.63, 0.71, 0.05]]
    );
    return {
      letter: 'D',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant index straight vertical; non-dominant index touches top, thumb touches base.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { dualIndexTipDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // E: Two-handed index tap / apex touch
  E: (() => {
    const dom = createHandLandmarks(
      [0.46, 0.68, 0.0],
      [[0.43, 0.64, 0.02], [0.41, 0.59, 0.03], [0.42, 0.56, 0.04], [0.44, 0.55, 0.04]],
      [[0.47, 0.57, 0.0], [0.48, 0.48, -0.02], [0.49, 0.40, -0.04], [0.50, 0.33, -0.05]],
      [[0.44, 0.58, 0.02], [0.43, 0.62, 0.04], [0.43, 0.65, 0.05], [0.43, 0.67, 0.05]],
      [[0.42, 0.60, 0.03], [0.41, 0.63, 0.04], [0.41, 0.66, 0.05], [0.41, 0.68, 0.05]],
      [[0.40, 0.62, 0.03], [0.39, 0.64, 0.04], [0.39, 0.67, 0.05], [0.39, 0.69, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.54, 0.68, 0.0],
      [[0.57, 0.64, 0.02], [0.59, 0.59, 0.03], [0.58, 0.56, 0.04], [0.56, 0.55, 0.04]],
      [[0.53, 0.57, 0.0], [0.52, 0.48, -0.02], [0.51, 0.40, -0.04], [0.50, 0.33, -0.05]],
      [[0.56, 0.58, 0.02], [0.57, 0.62, 0.04], [0.57, 0.65, 0.05], [0.57, 0.67, 0.05]],
      [[0.58, 0.60, 0.03], [0.59, 0.63, 0.04], [0.59, 0.66, 0.05], [0.59, 0.68, 0.05]],
      [[0.60, 0.62, 0.03], [0.61, 0.64, 0.04], [0.61, 0.67, 0.05], [0.61, 0.69, 0.05]]
    );
    return {
      letter: 'E',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Both index tips meet at upper apex, upright orientation.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { dualIndexTipDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // F: Two-handed two-finger cross (index + middle cross over index + middle)
  F: (() => {
    const dom = createHandLandmarks(
      [0.45, 0.65, 0.0],
      [[0.42, 0.61, 0.02], [0.41, 0.56, 0.03], [0.43, 0.53, 0.04], [0.46, 0.53, 0.04]],
      [[0.46, 0.55, 0.0], [0.48, 0.47, -0.02], [0.50, 0.40, -0.03], [0.52, 0.35, -0.04]],
      [[0.44, 0.54, 0.01], [0.46, 0.46, -0.01], [0.48, 0.39, -0.02], [0.50, 0.34, -0.03]],
      [[0.41, 0.58, 0.03], [0.40, 0.61, 0.04], [0.40, 0.64, 0.05], [0.40, 0.66, 0.05]],
      [[0.39, 0.60, 0.03], [0.38, 0.62, 0.04], [0.38, 0.65, 0.05], [0.38, 0.67, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.65, 0.0],
      [[0.58, 0.61, 0.02], [0.59, 0.56, 0.03], [0.57, 0.53, 0.04], [0.54, 0.53, 0.04]],
      [[0.54, 0.55, 0.0], [0.51, 0.47, -0.02], [0.48, 0.41, -0.03], [0.46, 0.36, -0.04]],
      [[0.56, 0.54, 0.01], [0.53, 0.46, -0.01], [0.50, 0.40, -0.02], [0.48, 0.35, -0.03]],
      [[0.59, 0.58, 0.03], [0.60, 0.61, 0.04], [0.60, 0.64, 0.05], [0.60, 0.66, 0.05]],
      [[0.61, 0.60, 0.03], [0.62, 0.62, 0.04], [0.62, 0.65, 0.05], [0.62, 0.67, 0.05]]
    );
    return {
      letter: 'F',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Index & middle fingers extended on both hands, crossing at angles.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'extended', ring: 'curled', pinky: 'curled' },
        relativeDistances: {
          indexToMiddleTip: { min: 0.01, max: 0.07 },
          interHandContactDistance: { min: 0.0, max: 0.08 },
        },
        vectors: { pointingDirection: [0.3, -0.9, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.18,
      },
    };
  })(),

  // G: Two-handed stacked closed fists (dominant fist above non-dominant fist)
  G: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.48, 0.0],
      [[0.47, 0.46, 0.02], [0.45, 0.43, 0.04], [0.46, 0.41, 0.05], [0.48, 0.41, 0.05]],
      [[0.50, 0.42, 0.0], [0.49, 0.44, 0.03], [0.49, 0.47, 0.05], [0.49, 0.48, 0.05]],
      [[0.52, 0.42, 0.01], [0.51, 0.44, 0.03], [0.51, 0.47, 0.05], [0.51, 0.48, 0.05]],
      [[0.54, 0.43, 0.02], [0.53, 0.45, 0.03], [0.53, 0.48, 0.05], [0.53, 0.49, 0.05]],
      [[0.56, 0.44, 0.03], [0.55, 0.46, 0.04], [0.55, 0.49, 0.05], [0.55, 0.50, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.50, 0.64, 0.0],
      [[0.47, 0.62, 0.02], [0.45, 0.59, 0.04], [0.46, 0.57, 0.05], [0.48, 0.57, 0.05]],
      [[0.50, 0.58, 0.0], [0.49, 0.60, 0.03], [0.49, 0.63, 0.05], [0.49, 0.64, 0.05]],
      [[0.52, 0.58, 0.01], [0.51, 0.60, 0.03], [0.51, 0.63, 0.05], [0.51, 0.64, 0.05]],
      [[0.54, 0.59, 0.02], [0.53, 0.61, 0.03], [0.53, 0.64, 0.05], [0.53, 0.65, 0.05]],
      [[0.56, 0.60, 0.03], [0.55, 0.62, 0.04], [0.55, 0.65, 0.05], [0.55, 0.66, 0.05]]
    );
    return {
      letter: 'G',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Two closed fists stacked vertically (dominant wrist.y < non-dominant wrist.y).',
        fingerStatus: { thumb: 'curled', index: 'curled', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.05, max: 0.18 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // H: Two-handed flat palm sweep
  H: (() => {
    const dom = createHandLandmarks(
      [0.42, 0.55, 0.0],
      [[0.44, 0.52, 0.01], [0.47, 0.50, 0.02], [0.50, 0.49, 0.02], [0.53, 0.48, 0.02]],
      [[0.45, 0.52, 0.0], [0.49, 0.51, -0.01], [0.54, 0.50, -0.02], [0.58, 0.50, -0.02]],
      [[0.44, 0.54, 0.0], [0.49, 0.53, -0.01], [0.54, 0.52, -0.02], [0.58, 0.52, -0.02]],
      [[0.43, 0.56, 0.01], [0.48, 0.55, 0.0], [0.53, 0.54, -0.01], [0.57, 0.54, -0.01]],
      [[0.42, 0.58, 0.01], [0.46, 0.57, 0.0], [0.51, 0.56, -0.01], [0.55, 0.56, -0.01]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.70, 0.0],
      [[0.52, 0.65, 0.02], [0.50, 0.60, 0.03], [0.49, 0.56, 0.03], [0.48, 0.53, 0.03]],
      [[0.55, 0.58, 0.0], [0.55, 0.50, -0.02], [0.55, 0.43, -0.03], [0.55, 0.37, -0.04]],
      [[0.57, 0.58, 0.0], [0.58, 0.49, -0.02], [0.58, 0.42, -0.03], [0.58, 0.36, -0.04]],
      [[0.59, 0.59, 0.01], [0.60, 0.51, -0.01], [0.61, 0.44, -0.02], [0.61, 0.38, -0.03]],
      [[0.61, 0.61, 0.02], [0.62, 0.54, 0.0], [0.63, 0.48, -0.01], [0.64, 0.42, -0.02]]
    );
    return {
      letter: 'H',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Horizontal flat dominant hand sweeps across vertical open non-dominant palm.',
        fingerStatus: { thumb: 'extended', index: 'extended', middle: 'extended', ring: 'extended', pinky: 'extended' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.08 } },
        vectors: { pointingDirection: [1.0, 0.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.19,
      },
    };
  })(),

  // I: Single upright index finger
  I: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.47, 0.66, 0.02], [0.45, 0.61, 0.04], [0.46, 0.57, 0.05], [0.48, 0.56, 0.05]],
      [[0.50, 0.58, 0.0], [0.50, 0.48, -0.02], [0.50, 0.40, -0.04], [0.50, 0.32, -0.05]],
      [[0.48, 0.59, 0.02], [0.47, 0.63, 0.05], [0.47, 0.66, 0.06], [0.47, 0.68, 0.06]],
      [[0.46, 0.61, 0.03], [0.45, 0.64, 0.05], [0.45, 0.67, 0.06], [0.45, 0.69, 0.06]],
      [[0.44, 0.63, 0.03], [0.43, 0.65, 0.05], [0.43, 0.68, 0.06], [0.43, 0.70, 0.06]]
    );
    return {
      letter: 'I',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'Single hand, only index finger extended straight up (TIP.y < PIP.y); others curled.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { thumbToIndexTip: { min: 0.16, max: 0.32 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.15,
      },
    };
  })(),

  // J: Two-handed index cross with downward hook curve
  J: (() => {
    const dom = createHandLandmarks(
      [0.46, 0.62, 0.0],
      [[0.43, 0.58, 0.02], [0.42, 0.54, 0.03], [0.44, 0.51, 0.04], [0.46, 0.50, 0.04]],
      [[0.48, 0.54, 0.0], [0.50, 0.46, -0.02], [0.52, 0.42, -0.03], [0.51, 0.47, -0.02]],
      [[0.46, 0.56, 0.02], [0.45, 0.60, 0.04], [0.45, 0.63, 0.05], [0.45, 0.65, 0.05]],
      [[0.44, 0.58, 0.03], [0.43, 0.61, 0.04], [0.43, 0.64, 0.05], [0.43, 0.66, 0.05]],
      [[0.42, 0.60, 0.03], [0.41, 0.62, 0.04], [0.41, 0.65, 0.05], [0.41, 0.67, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.68, 0.0],
      [[0.58, 0.64, 0.02], [0.60, 0.59, 0.03], [0.59, 0.56, 0.04], [0.57, 0.55, 0.04]],
      [[0.54, 0.58, 0.0], [0.52, 0.50, -0.02], [0.50, 0.44, -0.03], [0.48, 0.38, -0.04]],
      [[0.56, 0.59, 0.02], [0.57, 0.63, 0.04], [0.57, 0.66, 0.05], [0.57, 0.68, 0.05]],
      [[0.58, 0.61, 0.03], [0.59, 0.64, 0.04], [0.59, 0.67, 0.05], [0.59, 0.69, 0.05]],
      [[0.60, 0.63, 0.03], [0.61, 0.65, 0.04], [0.61, 0.68, 0.05], [0.61, 0.70, 0.05]]
    );
    return {
      letter: 'J',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant index hooks down across non-dominant index finger.',
        fingerStatus: { thumb: 'curled', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { dualIndexTipDistance: { min: 0.02, max: 0.10 } },
        vectors: { pointingDirection: [0.2, -0.6, 0.4], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.18,
      },
    };
  })(),

  // K: Two-handed K crook branch
  K: (() => {
    const dom = createHandLandmarks(
      [0.44, 0.60, 0.0],
      [[0.42, 0.56, 0.02], [0.41, 0.51, 0.03], [0.43, 0.48, 0.04], [0.46, 0.47, 0.04]],
      [[0.46, 0.52, 0.0], [0.49, 0.47, -0.02], [0.51, 0.45, -0.03], [0.52, 0.48, -0.02]],
      [[0.43, 0.54, 0.02], [0.42, 0.58, 0.04], [0.42, 0.61, 0.05], [0.42, 0.63, 0.05]],
      [[0.41, 0.56, 0.03], [0.40, 0.59, 0.04], [0.40, 0.62, 0.05], [0.40, 0.64, 0.05]],
      [[0.39, 0.58, 0.03], [0.38, 0.60, 0.04], [0.38, 0.63, 0.05], [0.38, 0.65, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.70, 0.0],
      [[0.58, 0.65, 0.02], [0.60, 0.60, 0.03], [0.59, 0.56, 0.04], [0.57, 0.55, 0.04]],
      [[0.54, 0.58, 0.0], [0.53, 0.50, -0.02], [0.52, 0.42, -0.03], [0.52, 0.34, -0.04]],
      [[0.56, 0.59, 0.02], [0.57, 0.63, 0.04], [0.57, 0.66, 0.05], [0.57, 0.68, 0.05]],
      [[0.58, 0.61, 0.03], [0.59, 0.64, 0.04], [0.59, 0.67, 0.05], [0.59, 0.69, 0.05]],
      [[0.60, 0.63, 0.03], [0.61, 0.65, 0.04], [0.61, 0.68, 0.05], [0.61, 0.70, 0.05]]
    );
    return {
      letter: 'K',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Bent index crook of dominant hand touches middle joint of non-dominant index post.',
        fingerStatus: { thumb: 'extended', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.5, -0.8, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // L: Single-hand iconic perpendicular 90-degree angle
  L: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.46, 0.66, 0.02], [0.41, 0.64, 0.03], [0.36, 0.63, 0.04], [0.30, 0.62, 0.05]],
      [[0.50, 0.58, 0.0], [0.50, 0.48, -0.02], [0.50, 0.40, -0.04], [0.50, 0.32, -0.05]],
      [[0.48, 0.59, 0.02], [0.47, 0.63, 0.05], [0.47, 0.66, 0.06], [0.47, 0.68, 0.06]],
      [[0.46, 0.61, 0.03], [0.45, 0.64, 0.05], [0.45, 0.67, 0.06], [0.45, 0.69, 0.06]],
      [[0.44, 0.63, 0.03], [0.43, 0.65, 0.05], [0.43, 0.68, 0.06], [0.43, 0.70, 0.06]]
    );
    return {
      letter: 'L',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'Perpendicular L shape; index vertical up, thumb horizontal to side (~90 degrees).',
        fingerStatus: { thumb: 'extended', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { thumbToIndexTip: { min: 0.22, max: 0.38 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.15,
      },
    };
  })(),

  // M: Two-handed 3 fingers resting on palm
  M: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.45, 0.0],
      [[0.45, 0.48, 0.02], [0.43, 0.52, 0.03], [0.44, 0.55, 0.04], [0.46, 0.56, 0.04]],
      [[0.48, 0.52, 0.0], [0.48, 0.57, -0.01], [0.48, 0.62, -0.02], [0.48, 0.66, -0.02]],
      [[0.50, 0.52, 0.01], [0.50, 0.57, 0.0], [0.50, 0.62, -0.01], [0.50, 0.66, -0.01]],
      [[0.52, 0.53, 0.02], [0.52, 0.58, 0.01], [0.52, 0.63, 0.0], [0.52, 0.67, 0.0]],
      [[0.54, 0.55, 0.03], [0.53, 0.58, 0.04], [0.53, 0.61, 0.05], [0.53, 0.63, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.45, 0.68, 0.02], [0.41, 0.67, 0.03], [0.38, 0.66, 0.04], [0.35, 0.66, 0.04]],
      [[0.48, 0.66, 0.0], [0.48, 0.66, -0.04], [0.48, 0.66, -0.08], [0.48, 0.66, -0.12]],
      [[0.50, 0.66, 0.01], [0.50, 0.66, -0.04], [0.50, 0.66, -0.08], [0.50, 0.66, -0.12]],
      [[0.52, 0.66, 0.02], [0.52, 0.66, -0.03], [0.52, 0.66, -0.07], [0.52, 0.66, -0.11]],
      [[0.54, 0.67, 0.03], [0.54, 0.67, -0.02], [0.54, 0.67, -0.06], [0.54, 0.67, -0.10]]
    );
    return {
      letter: 'M',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Three fingers (index, middle, ring) rest downward onto flat open palm.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'extended', ring: 'extended', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, 1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // N: Two-handed 2 fingers resting on palm
  N: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.45, 0.0],
      [[0.45, 0.48, 0.02], [0.43, 0.52, 0.03], [0.44, 0.55, 0.04], [0.46, 0.56, 0.04]],
      [[0.48, 0.52, 0.0], [0.48, 0.57, -0.01], [0.48, 0.62, -0.02], [0.48, 0.66, -0.02]],
      [[0.51, 0.52, 0.01], [0.51, 0.57, 0.0], [0.51, 0.62, -0.01], [0.51, 0.66, -0.01]],
      [[0.52, 0.54, 0.03], [0.51, 0.57, 0.04], [0.51, 0.60, 0.05], [0.51, 0.62, 0.05]],
      [[0.54, 0.55, 0.03], [0.53, 0.58, 0.04], [0.53, 0.61, 0.05], [0.53, 0.63, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.45, 0.68, 0.02], [0.41, 0.67, 0.03], [0.38, 0.66, 0.04], [0.35, 0.66, 0.04]],
      [[0.48, 0.66, 0.0], [0.48, 0.66, -0.04], [0.48, 0.66, -0.08], [0.48, 0.66, -0.12]],
      [[0.50, 0.66, 0.01], [0.50, 0.66, -0.04], [0.50, 0.66, -0.08], [0.50, 0.66, -0.12]],
      [[0.52, 0.66, 0.02], [0.52, 0.66, -0.03], [0.52, 0.66, -0.07], [0.52, 0.66, -0.11]],
      [[0.54, 0.67, 0.03], [0.54, 0.67, -0.02], [0.54, 0.67, -0.06], [0.54, 0.67, -0.10]]
    );
    return {
      letter: 'N',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Two fingers (index, middle) rest downward onto flat open palm; ring & pinky folded.',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'extended', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, 1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // O: Single-hand closed O circle
  O: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.46, 0.66, 0.02], [0.43, 0.61, 0.04], [0.44, 0.54, 0.04], [0.47, 0.50, 0.03]],
      [[0.50, 0.58, 0.0], [0.50, 0.50, -0.02], [0.48, 0.46, 0.0], [0.47, 0.50, 0.03]],
      [[0.52, 0.58, 0.01], [0.52, 0.51, -0.01], [0.49, 0.47, 0.01], [0.48, 0.51, 0.03]],
      [[0.54, 0.59, 0.02], [0.54, 0.52, 0.0], [0.50, 0.48, 0.02], [0.49, 0.52, 0.04]],
      [[0.56, 0.61, 0.03], [0.55, 0.54, 0.01], [0.51, 0.50, 0.02], [0.50, 0.53, 0.04]]
    );
    return {
      letter: 'O',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'All 4 fingertips touch thumb tip forming a closed circle (dist < 0.07).',
        fingerStatus: { thumb: 'touching_index', index: 'hooked', middle: 'touching_thumb', ring: 'curled', pinky: 'curled' },
        relativeDistances: { thumbToIndexTip: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, -0.9, -0.3], palmNormal: [1.0, 0.0, 0.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // P: Two-handed loop on upright post
  P: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.46, 0.0],
      [[0.45, 0.43, 0.02], [0.47, 0.38, 0.03], [0.49, 0.35, 0.02], [0.52, 0.34, 0.01]],
      [[0.50, 0.40, 0.0], [0.51, 0.36, -0.02], [0.52, 0.33, -0.01], [0.52, 0.34, 0.01]],
      [[0.47, 0.42, 0.02], [0.46, 0.45, 0.04], [0.46, 0.48, 0.05], [0.46, 0.50, 0.05]],
      [[0.45, 0.44, 0.03], [0.44, 0.47, 0.04], [0.44, 0.50, 0.05], [0.44, 0.52, 0.05]],
      [[0.43, 0.46, 0.03], [0.42, 0.49, 0.04], [0.42, 0.52, 0.05], [0.42, 0.54, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.70, 0.0],
      [[0.58, 0.65, 0.02], [0.60, 0.60, 0.03], [0.59, 0.56, 0.04], [0.57, 0.55, 0.04]],
      [[0.54, 0.58, 0.0], [0.53, 0.50, -0.02], [0.52, 0.42, -0.03], [0.52, 0.34, -0.04]],
      [[0.56, 0.59, 0.02], [0.57, 0.63, 0.04], [0.57, 0.66, 0.05], [0.57, 0.68, 0.05]],
      [[0.58, 0.61, 0.03], [0.59, 0.64, 0.04], [0.59, 0.67, 0.05], [0.59, 0.69, 0.05]],
      [[0.60, 0.63, 0.03], [0.61, 0.65, 0.04], [0.61, 0.68, 0.05], [0.61, 0.70, 0.05]]
    );
    return {
      letter: 'P',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant index-thumb loop perched on top tip of non-dominant vertical index.',
        fingerStatus: { thumb: 'touching_index', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, 1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // Q: Two-handed circle with hook tail
  Q: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.40, 0.0],
      [[0.45, 0.42, 0.02], [0.43, 0.45, 0.03], [0.44, 0.48, 0.04], [0.46, 0.49, 0.04]],
      [[0.49, 0.45, 0.0], [0.50, 0.50, -0.01], [0.50, 0.55, -0.02], [0.48, 0.58, -0.01]],
      [[0.46, 0.46, 0.02], [0.45, 0.50, 0.04], [0.45, 0.53, 0.05], [0.45, 0.55, 0.05]],
      [[0.44, 0.48, 0.03], [0.43, 0.51, 0.04], [0.43, 0.54, 0.05], [0.43, 0.56, 0.05]],
      [[0.42, 0.50, 0.03], [0.41, 0.52, 0.04], [0.41, 0.55, 0.05], [0.41, 0.57, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.65, 0.0],
      [[0.52, 0.60, 0.02], [0.49, 0.56, 0.03], [0.48, 0.53, 0.03], [0.50, 0.50, 0.02]],
      [[0.54, 0.56, 0.0], [0.53, 0.51, -0.02], [0.51, 0.48, -0.01], [0.50, 0.50, 0.02]],
      [[0.57, 0.58, 0.02], [0.58, 0.62, 0.04], [0.58, 0.65, 0.05], [0.58, 0.67, 0.05]],
      [[0.59, 0.60, 0.03], [0.60, 0.63, 0.04], [0.60, 0.66, 0.05], [0.60, 0.68, 0.05]],
      [[0.61, 0.62, 0.03], [0.62, 0.64, 0.04], [0.62, 0.67, 0.05], [0.62, 0.69, 0.05]]
    );
    return {
      letter: 'Q',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant hooked index passes through center of non-dominant index-thumb loop.',
        fingerStatus: { thumb: 'curled', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.08 } },
        vectors: { pointingDirection: [0.0, 1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.18,
      },
    };
  })(),

  // R: Two-handed curled hook index on flat palm
  R: (() => {
    const dom = createHandLandmarks(
      [0.48, 0.48, 0.0],
      [[0.45, 0.50, 0.02], [0.43, 0.54, 0.03], [0.44, 0.57, 0.04], [0.46, 0.58, 0.04]],
      [[0.49, 0.54, 0.0], [0.50, 0.59, -0.01], [0.51, 0.63, -0.02], [0.50, 0.66, -0.01]],
      [[0.46, 0.55, 0.02], [0.45, 0.59, 0.04], [0.45, 0.62, 0.05], [0.45, 0.64, 0.05]],
      [[0.44, 0.57, 0.03], [0.43, 0.60, 0.04], [0.43, 0.63, 0.05], [0.43, 0.65, 0.05]],
      [[0.42, 0.59, 0.03], [0.41, 0.61, 0.04], [0.41, 0.64, 0.05], [0.41, 0.66, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.45, 0.68, 0.02], [0.41, 0.67, 0.03], [0.38, 0.66, 0.04], [0.35, 0.66, 0.04]],
      [[0.48, 0.66, 0.0], [0.48, 0.66, -0.04], [0.48, 0.66, -0.08], [0.48, 0.66, -0.12]],
      [[0.50, 0.66, 0.01], [0.50, 0.66, -0.04], [0.50, 0.66, -0.08], [0.50, 0.66, -0.12]],
      [[0.52, 0.66, 0.02], [0.52, 0.66, -0.03], [0.52, 0.66, -0.07], [0.52, 0.66, -0.11]],
      [[0.54, 0.67, 0.03], [0.54, 0.67, -0.02], [0.54, 0.67, -0.06], [0.54, 0.67, -0.10]]
    );
    return {
      letter: 'R',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant hooked index finger rests downward on open flat non-dominant palm.',
        fingerStatus: { thumb: 'curled', index: 'hooked', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.0, 1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // S: Two-handed interlocking pinkies
  S: (() => {
    const dom = createHandLandmarks(
      [0.45, 0.65, 0.0],
      [[0.42, 0.62, 0.02], [0.40, 0.58, 0.03], [0.41, 0.55, 0.04], [0.43, 0.54, 0.04]],
      [[0.46, 0.56, 0.0], [0.45, 0.60, 0.03], [0.45, 0.63, 0.05], [0.45, 0.65, 0.05]],
      [[0.44, 0.57, 0.01], [0.43, 0.61, 0.03], [0.43, 0.64, 0.05], [0.43, 0.66, 0.05]],
      [[0.42, 0.58, 0.02], [0.41, 0.62, 0.03], [0.41, 0.65, 0.05], [0.41, 0.67, 0.05]],
      [[0.40, 0.60, 0.03], [0.42, 0.54, 0.01], [0.46, 0.50, -0.01], [0.49, 0.51, -0.02]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.65, 0.0],
      [[0.58, 0.62, 0.02], [0.60, 0.58, 0.03], [0.59, 0.55, 0.04], [0.57, 0.54, 0.04]],
      [[0.54, 0.56, 0.0], [0.55, 0.60, 0.03], [0.55, 0.63, 0.05], [0.55, 0.65, 0.05]],
      [[0.56, 0.57, 0.01], [0.57, 0.61, 0.03], [0.57, 0.64, 0.05], [0.57, 0.66, 0.05]],
      [[0.58, 0.58, 0.02], [0.59, 0.62, 0.03], [0.59, 0.65, 0.05], [0.59, 0.67, 0.05]],
      [[0.60, 0.60, 0.03], [0.58, 0.54, 0.01], [0.54, 0.50, -0.01], [0.51, 0.51, -0.02]]
    );
    return {
      letter: 'S',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Both pinkies extended and hooked together in chain link (dist < 0.06).',
        fingerStatus: { thumb: 'curled', index: 'curled', middle: 'curled', ring: 'curled', pinky: 'interlocked' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.05 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // T: Two-handed horizontal index across vertical index tip
  T: (() => {
    const dom = createHandLandmarks(
      [0.40, 0.35, 0.0],
      [[0.43, 0.37, 0.02], [0.46, 0.39, 0.03], [0.48, 0.40, 0.04], [0.50, 0.40, 0.04]],
      [[0.44, 0.35, 0.0], [0.49, 0.35, -0.01], [0.54, 0.35, -0.02], [0.58, 0.35, -0.03]],
      [[0.42, 0.37, 0.02], [0.41, 0.40, 0.04], [0.41, 0.43, 0.05], [0.41, 0.45, 0.05]],
      [[0.40, 0.39, 0.03], [0.39, 0.42, 0.04], [0.39, 0.45, 0.05], [0.39, 0.47, 0.05]],
      [[0.38, 0.41, 0.03], [0.37, 0.44, 0.04], [0.37, 0.47, 0.05], [0.37, 0.49, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.53, 0.65, 0.02], [0.55, 0.60, 0.03], [0.54, 0.56, 0.04], [0.52, 0.55, 0.04]],
      [[0.50, 0.58, 0.0], [0.50, 0.50, -0.02], [0.50, 0.42, -0.03], [0.50, 0.35, -0.04]],
      [[0.52, 0.59, 0.02], [0.53, 0.63, 0.04], [0.53, 0.66, 0.05], [0.53, 0.68, 0.05]],
      [[0.54, 0.61, 0.03], [0.55, 0.64, 0.04], [0.55, 0.67, 0.05], [0.55, 0.69, 0.05]],
      [[0.56, 0.63, 0.03], [0.57, 0.65, 0.04], [0.57, 0.68, 0.05], [0.57, 0.70, 0.05]]
    );
    return {
      letter: 'T',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant horizontal index finger rests across top tip of non-dominant vertical index.',
        fingerStatus: { thumb: 'curled', index: 'horizontal', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.05 } },
        vectors: { pointingDirection: [1.0, 0.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // U: Single-hand extended index and thumb U channel
  U: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.46, 0.65, 0.02], [0.42, 0.58, 0.03], [0.40, 0.50, 0.04], [0.39, 0.42, 0.04]],
      [[0.50, 0.58, 0.0], [0.50, 0.48, -0.02], [0.50, 0.40, -0.04], [0.50, 0.32, -0.05]],
      [[0.48, 0.59, 0.02], [0.47, 0.63, 0.05], [0.47, 0.66, 0.06], [0.47, 0.68, 0.06]],
      [[0.46, 0.61, 0.03], [0.45, 0.64, 0.05], [0.45, 0.67, 0.06], [0.45, 0.69, 0.06]],
      [[0.44, 0.63, 0.03], [0.43, 0.65, 0.05], [0.43, 0.68, 0.06], [0.43, 0.70, 0.06]]
    );
    return {
      letter: 'U',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'Single hand thumb and index finger extended upward forming open U channel.',
        fingerStatus: { thumb: 'upright', index: 'extended', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { thumbToIndexTip: { min: 0.10, max: 0.22 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.16,
      },
    };
  })(),

  // V: Single-hand open victory V (index + middle separated)
  V: (() => {
    const dom = createHandLandmarks(
      [0.50, 0.70, 0.0],
      [[0.46, 0.66, 0.02], [0.44, 0.62, 0.04], [0.46, 0.58, 0.05], [0.48, 0.57, 0.05]],
      [[0.49, 0.58, 0.0], [0.46, 0.48, -0.02], [0.43, 0.39, -0.03], [0.40, 0.30, -0.04]],
      [[0.52, 0.58, 0.01], [0.55, 0.48, -0.01], [0.58, 0.39, -0.02], [0.61, 0.30, -0.03]],
      [[0.47, 0.61, 0.03], [0.46, 0.64, 0.05], [0.46, 0.67, 0.06], [0.46, 0.69, 0.06]],
      [[0.45, 0.63, 0.03], [0.44, 0.65, 0.05], [0.44, 0.68, 0.06], [0.44, 0.70, 0.06]]
    );
    return {
      letter: 'V',
      isTwoHanded: false,
      dominantLandmarks: dom,
      keyJoints: { dominant: extractKeyJoints(dom) },
      constraints: {
        description: 'Single hand index and middle fingers extended in open separated V shape (> 0.10 distance).',
        fingerStatus: { thumb: 'curled', index: 'extended', middle: 'extended', ring: 'curled', pinky: 'curled' },
        relativeDistances: {
          indexToMiddleTip: { min: 0.12, max: 0.30 },
          thumbToIndexTip: { min: 0.18, max: 0.34 },
        },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.15,
      },
    };
  })(),

  // W: Two-handed multi-peak interlaced fingers
  W: (() => {
    const dom = createHandLandmarks(
      [0.44, 0.68, 0.0],
      [[0.41, 0.64, 0.02], [0.38, 0.59, 0.03], [0.37, 0.54, 0.04], [0.36, 0.49, 0.04]],
      [[0.45, 0.58, 0.0], [0.44, 0.48, -0.02], [0.43, 0.39, -0.03], [0.42, 0.31, -0.04]],
      [[0.48, 0.58, 0.01], [0.48, 0.48, -0.01], [0.48, 0.38, -0.02], [0.48, 0.29, -0.03]],
      [[0.51, 0.59, 0.02], [0.52, 0.49, 0.0], [0.53, 0.40, -0.01], [0.54, 0.32, -0.02]],
      [[0.53, 0.62, 0.03], [0.54, 0.54, 0.01], [0.55, 0.46, 0.0], [0.56, 0.39, -0.01]]
    );
    const nonDom = createHandLandmarks(
      [0.56, 0.68, 0.0],
      [[0.59, 0.64, 0.02], [0.62, 0.59, 0.03], [0.63, 0.54, 0.04], [0.64, 0.49, 0.04]],
      [[0.55, 0.58, 0.0], [0.56, 0.48, -0.02], [0.57, 0.39, -0.03], [0.58, 0.31, -0.04]],
      [[0.52, 0.58, 0.01], [0.52, 0.48, -0.01], [0.52, 0.38, -0.02], [0.52, 0.29, -0.03]],
      [[0.49, 0.59, 0.02], [0.48, 0.49, 0.0], [0.47, 0.40, -0.01], [0.46, 0.32, -0.02]],
      [[0.47, 0.62, 0.03], [0.46, 0.54, 0.01], [0.45, 0.46, 0.0], [0.44, 0.39, -0.01]]
    );
    return {
      letter: 'W',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Both hands have fingers spread and interlacing upward to create multiple W peaks.',
        fingerStatus: { thumb: 'extended', index: 'extended', middle: 'extended', ring: 'extended', pinky: 'extended' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.09 } },
        vectors: { pointingDirection: [0.0, -1.0, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.19,
      },
    };
  })(),

  // X: Two-handed crossed index fingers
  X: (() => {
    const dom = createHandLandmarks(
      [0.44, 0.68, 0.0],
      [[0.41, 0.64, 0.02], [0.39, 0.59, 0.03], [0.40, 0.56, 0.04], [0.42, 0.55, 0.04]],
      [[0.45, 0.57, 0.0], [0.48, 0.48, -0.02], [0.52, 0.41, -0.03], [0.56, 0.35, -0.04]],
      [[0.43, 0.58, 0.02], [0.42, 0.62, 0.04], [0.42, 0.65, 0.05], [0.42, 0.67, 0.05]],
      [[0.41, 0.60, 0.03], [0.40, 0.63, 0.04], [0.40, 0.66, 0.05], [0.40, 0.68, 0.05]],
      [[0.39, 0.62, 0.03], [0.38, 0.64, 0.04], [0.38, 0.67, 0.05], [0.38, 0.69, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.56, 0.68, 0.0],
      [[0.59, 0.64, 0.02], [0.61, 0.59, 0.03], [0.60, 0.56, 0.04], [0.58, 0.55, 0.04]],
      [[0.55, 0.57, 0.0], [0.52, 0.48, -0.02], [0.48, 0.41, -0.03], [0.44, 0.35, -0.04]],
      [[0.57, 0.58, 0.02], [0.58, 0.62, 0.04], [0.58, 0.65, 0.05], [0.58, 0.67, 0.05]],
      [[0.59, 0.60, 0.03], [0.60, 0.63, 0.04], [0.60, 0.66, 0.05], [0.60, 0.68, 0.05]],
      [[0.61, 0.62, 0.03], [0.62, 0.64, 0.04], [0.62, 0.67, 0.05], [0.62, 0.69, 0.05]]
    );
    return {
      letter: 'X',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Both index fingers extended diagonally, crossing over each other in an X intersection.',
        fingerStatus: { thumb: 'curled', index: 'diagonal', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { dualIndexTipDistance: { min: 0.06, max: 0.18 } },
        vectors: { pointingDirection: [0.3, -0.9, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // Y: Two-handed dominant index touching L vertex webbing
  Y: (() => {
    const dom = createHandLandmarks(
      [0.42, 0.60, 0.0],
      [[0.40, 0.57, 0.02], [0.39, 0.53, 0.03], [0.41, 0.50, 0.04], [0.43, 0.50, 0.04]],
      [[0.44, 0.53, 0.0], [0.47, 0.48, -0.02], [0.50, 0.44, -0.03], [0.52, 0.42, -0.04]],
      [[0.42, 0.55, 0.02], [0.41, 0.59, 0.04], [0.41, 0.62, 0.05], [0.41, 0.64, 0.05]],
      [[0.40, 0.57, 0.03], [0.39, 0.60, 0.04], [0.39, 0.63, 0.05], [0.39, 0.65, 0.05]],
      [[0.38, 0.59, 0.03], [0.37, 0.61, 0.04], [0.37, 0.64, 0.05], [0.37, 0.66, 0.05]]
    );
    const nonDom = createHandLandmarks(
      [0.55, 0.70, 0.0],
      [[0.58, 0.65, 0.02], [0.62, 0.62, 0.03], [0.66, 0.60, 0.04], [0.70, 0.59, 0.05]],
      [[0.54, 0.58, 0.0], [0.54, 0.48, -0.02], [0.54, 0.40, -0.04], [0.54, 0.32, -0.05]],
      [[0.56, 0.59, 0.02], [0.57, 0.63, 0.04], [0.57, 0.66, 0.05], [0.57, 0.68, 0.05]],
      [[0.58, 0.61, 0.03], [0.59, 0.64, 0.04], [0.59, 0.67, 0.05], [0.59, 0.69, 0.05]],
      [[0.60, 0.63, 0.03], [0.61, 0.65, 0.04], [0.61, 0.68, 0.05], [0.61, 0.70, 0.05]]
    );
    return {
      letter: 'Y',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Dominant index tip touches inside corner webbing of non-dominant L shape.',
        fingerStatus: { thumb: 'curled', index: 'diagonal', middle: 'curled', ring: 'curled', pinky: 'curled' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.06 } },
        vectors: { pointingDirection: [0.5, -0.7, 0.0], palmNormal: [0.0, 0.0, -1.0] },
        tolerance: 0.17,
      },
    };
  })(),

  // Z: Two-handed flat horizontal palm touches vertical flat palm at 90 degrees
  Z: (() => {
    const dom = createHandLandmarks(
      [0.38, 0.50, 0.0],
      [[0.41, 0.48, 0.01], [0.44, 0.47, 0.02], [0.47, 0.47, 0.02], [0.50, 0.47, 0.02]],
      [[0.42, 0.50, 0.0], [0.46, 0.50, -0.01], [0.50, 0.50, -0.02], [0.53, 0.50, -0.02]],
      [[0.41, 0.52, 0.0], [0.45, 0.52, -0.01], [0.49, 0.52, -0.02], [0.53, 0.52, -0.02]],
      [[0.40, 0.54, 0.01], [0.44, 0.54, 0.0], [0.48, 0.54, -0.01], [0.52, 0.54, -0.01]],
      [[0.39, 0.56, 0.01], [0.43, 0.56, 0.0], [0.47, 0.56, -0.01], [0.51, 0.56, -0.01]]
    );
    const nonDom = createHandLandmarks(
      [0.54, 0.70, 0.0],
      [[0.52, 0.65, 0.02], [0.50, 0.60, 0.03], [0.49, 0.56, 0.03], [0.48, 0.53, 0.03]],
      [[0.54, 0.58, 0.0], [0.54, 0.50, -0.02], [0.54, 0.42, -0.03], [0.54, 0.34, -0.04]],
      [[0.56, 0.58, 0.0], [0.57, 0.49, -0.02], [0.57, 0.41, -0.03], [0.57, 0.33, -0.04]],
      [[0.58, 0.59, 0.01], [0.59, 0.51, -0.01], [0.60, 0.43, -0.02], [0.60, 0.35, -0.03]],
      [[0.60, 0.61, 0.02], [0.61, 0.54, 0.0], [0.62, 0.47, -0.01], [0.63, 0.40, -0.02]]
    );
    return {
      letter: 'Z',
      isTwoHanded: true,
      dominantLandmarks: dom,
      nonDominantLandmarks: nonDom,
      keyJoints: { dominant: extractKeyJoints(dom), nonDominant: extractKeyJoints(nonDom) },
      constraints: {
        description: 'Fingertips of horizontal flat dominant hand touch flat vertical non-dominant palm.',
        fingerStatus: { thumb: 'extended', index: 'extended', middle: 'extended', ring: 'extended', pinky: 'extended' },
        relativeDistances: { interHandContactDistance: { min: 0.0, max: 0.05 } },
        vectors: { pointingDirection: [1.0, 0.0, 0.0], palmNormal: [0.0, 1.0, 0.0] },
        tolerance: 0.18,
      },
    };
  })(),
};

// -------------------------------------------------------------
// Coordinate Matching & Recognition Engine Algorithms
// -------------------------------------------------------------

export function dist3D(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/**
 * Normalizes 21-landmarks so that wrist is at (0,0,0) and scale is proportional to palm size.
 */
export function normalizeLandmarksToPalm(landmarks: Point3D[] | { x: number; y: number; z?: number }[]): Point3D[] {
  if (!landmarks || landmarks.length < 21) return [];
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const scale = Math.max(dist3D(wrist, middleMcp), 0.001);

  return landmarks.map((pt) => ({
    x: (pt.x - wrist.x) / scale,
    y: (pt.y - wrist.y) / scale,
    z: ((pt.z ?? 0) - (wrist.z ?? 0)) / scale,
  }));
}

/**
 * Calculates Euclidean root-mean-square error between observed hand and canonical template.
 */
export function calculateLandmarkRMSE(
  observed: Point3D[] | { x: number; y: number; z?: number }[],
  template: Point3D[]
): number {
  if (!observed || observed.length < 21 || !template || template.length < 21) return 1.0;
  const normObserved = normalizeLandmarksToPalm(observed);
  const normTemplate = normalizeLandmarksToPalm(template);

  let sumSquaredDist = 0;
  for (let i = 0; i < 21; i++) {
    const d = dist3D(normObserved[i], normTemplate[i]);
    sumSquaredDist += d * d;
  }
  return Math.sqrt(sumSquaredDist / 21);
}

/**
 * Evaluates similarity score (0.0 to 1.0) between an observed hand gesture and an ISL letter coordinate model.
 */
export function evaluateCoordinateSimilarity(
  observedDominant: Point3D[] | { x: number; y: number; z?: number }[],
  observedNonDominant?: (Point3D[] | { x: number; y: number; z?: number }[]) | null,
  letterModel?: AlphabetCoordinateModel
): number {
  if (!letterModel || !observedDominant || observedDominant.length < 21) return 0;

  // Dominant RMSE
  const domRmse = calculateLandmarkRMSE(observedDominant, letterModel.dominantLandmarks);
  let score = Math.max(0, 1.0 - domRmse / (letterModel.constraints.tolerance * 3.0));

  // Two-handed handling
  if (letterModel.isTwoHanded) {
    if (!observedNonDominant || observedNonDominant.length < 21 || !letterModel.nonDominantLandmarks) {
      return score * 0.35; // Penalize if missing required second hand
    }
    const nonDomRmse = calculateLandmarkRMSE(observedNonDominant, letterModel.nonDominantLandmarks);
    const nonDomScore = Math.max(0, 1.0 - nonDomRmse / (letterModel.constraints.tolerance * 3.0));
    score = (score + nonDomScore) / 2;

    // Evaluate inter-hand tip distance if specified
    if (letterModel.constraints.relativeDistances.dualIndexTipDistance) {
      const actualDualDist = dist3D(observedDominant[8], observedNonDominant[8]);
      const maxAllowed = letterModel.constraints.relativeDistances.dualIndexTipDistance.max;
      if (actualDualDist <= maxAllowed * 1.5) {
        score = Math.min(1.0, score + 0.1);
      } else {
        score *= 0.7;
      }
    }
  }

  return Math.min(Math.max(score, 0), 1.0);
}

/**
 * Searches the entire ISL Alphabet Coordinate Dataset to find the best matching sign by 3D coordinates.
 */
export function findBestAlphabetMatchByCoordinates(
  observedDominant: Point3D[] | { x: number; y: number; z?: number }[],
  observedNonDominant?: (Point3D[] | { x: number; y: number; z?: number }[]) | null,
  minConfidence = 0.60
): { letter: string; confidence: number; model: AlphabetCoordinateModel } | null {
  let bestLetter: string | null = null;
  let highestScore = 0;

  for (const [letter, model] of Object.entries(ISL_COORDINATE_MODELS)) {
    const score = evaluateCoordinateSimilarity(observedDominant, observedNonDominant, model);
    if (score > highestScore) {
      highestScore = score;
      bestLetter = letter;
    }
  }

  if (bestLetter && highestScore >= minConfidence) {
    return {
      letter: bestLetter,
      confidence: highestScore,
      model: ISL_COORDINATE_MODELS[bestLetter],
    };
  }

  return null;
}

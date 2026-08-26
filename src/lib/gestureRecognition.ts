import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;
let lastVideoTimestamp = -1;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
      return landmarker;
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();
  return initPromise;
}

type Landmark = { x: number; y: number; z: number };

// Landmark indices
const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function dist2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Angle at vertex b formed by points a-b-c (in 2D)
function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;
  return Math.atan2(Math.abs(cross), dot);
}

// A finger is extended if the tip is significantly farther from the wrist than the PIP joint.
// Uses 3D distance for robustness and a tuned threshold.
function isFingerExtended(lm: Landmark[], tip: number, pip: number): boolean {
  const wrist = lm[WRIST];
  const tipDist = dist(lm[tip], wrist);
  const pipDist = dist(lm[pip], wrist);
  return tipDist > pipDist * 1.15;
}

// A finger is curled if the tip is close to the palm (closer to MCP than PIP is)
function isFingerCurled(lm: Landmark[], tip: number, pip: number): boolean {
  const wrist = lm[WRIST];
  const tipDist = dist(lm[tip], wrist);
  const pipDist = dist(lm[pip], wrist);
  return tipDist < pipDist * 0.95;
}

// Thumb is extended if the tip is far from the index MCP relative to the thumb IP joint
function isThumbExtended(lm: Landmark[]): boolean {
  const tip = lm[THUMB_TIP];
  const ip = lm[THUMB_IP];
  const indexMcp = lm[INDEX_MCP];
  const tipDist = dist2d(tip, indexMcp);
  const ipDist = dist2d(ip, indexMcp);
  return tipDist > ipDist * 1.4;
}

// Thumb is across the palm (touching / near the side of the hand)
function isThumbAcrossPalm(lm: Landmark[]): boolean {
  const tip = lm[THUMB_TIP];
  const pinkyMcp = lm[PINKY_MCP];
  const indexMcp = lm[INDEX_MCP];
  // Thumb tip is near the line between index MCP and pinky MCP (across the palm)
  const tipToLine = dist2d(tip, { x: (indexMcp.x + pinkyMcp.x) / 2, y: (indexMcp.y + pinkyMcp.y) / 2, z: 0 });
  const palmWidth = dist2d(indexMcp, pinkyMcp);
  return tipToLine < palmWidth * 0.6;
}

// Check if thumb tip is touching / very close to a finger tip
function thumbTouchesFinger(lm: Landmark[], fingerTip: number): boolean {
  return dist2d(lm[THUMB_TIP], lm[fingerTip]) < 0.07;
}

export type FingerState = {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
};

export function getFingerStates(lm: Landmark[]): FingerState {
  return {
    thumb: isThumbExtended(lm),
    index: isFingerExtended(lm, INDEX_TIP, INDEX_PIP),
    middle: isFingerExtended(lm, MIDDLE_TIP, MIDDLE_PIP),
    ring: isFingerExtended(lm, RING_TIP, RING_PIP),
    pinky: isFingerExtended(lm, PINKY_TIP, PINKY_PIP),
  };
}

// Classify ASL letters based on finger states + landmark geometry.
export function classifyLetter(lm: Landmark[]): string | null {
  const f = getFingerStates(lm);
  const thumbAcross = isThumbAcrossPalm(lm);
  const extendedCount = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;

  // Fist — all fingers curled
  const indexCurled = isFingerCurled(lm, INDEX_TIP, INDEX_PIP);
  const middleCurled = isFingerCurled(lm, MIDDLE_TIP, MIDDLE_PIP);
  const ringCurled = isFingerCurled(lm, RING_TIP, RING_PIP);
  const pinkyCurled = isFingerCurled(lm, PINKY_TIP, PINKY_PIP);
  const allCurled = indexCurled && middleCurled && ringCurled && pinkyCurled;

  // S: fist with thumb tucked across fingers
  if (allCurled && thumbAcross && !f.thumb) return 'S';
  // E: all fingers curled, thumb tip near index-middle area (tucked)
  if (allCurled && !f.thumb) return 'E';
  // A: fist with thumb extended to the side
  if (allCurled && f.thumb) return 'A';
  // O: fingertips meet thumb tip (circle)
  if (!f.index && !f.middle && !f.ring && !f.pinky && !f.thumb) {
    if (thumbTouchesFinger(lm, INDEX_TIP) && thumbTouchesFinger(lm, MIDDLE_TIP)) return 'O';
    return 'A';
  }

  // B: four fingers up, thumb across palm
  if (f.index && f.middle && f.ring && f.pinky && (thumbAcross || !f.thumb)) return 'B';

  // D: index up only, thumb touches middle finger
  if (f.index && !f.middle && !f.ring && !f.pinky) {
    if (thumbTouchesFinger(lm, MIDDLE_TIP) || thumbAcross) return 'D';
    return 'D';
  }

  // F: thumb+index touch (circle), middle/ring/pinky up
  if (!f.index && !f.thumb && f.middle && f.ring && f.pinky) {
    if (thumbTouchesFinger(lm, INDEX_TIP)) return 'F';
    return 'F';
  }

  // G: index points sideways, thumb alongside (horizontal)
  // H: index+middle horizontal
  // These need orientation detection — check if fingers are roughly horizontal
  // Skip for now as they're hard to distinguish heuristically

  // I: pinky only
  if (!f.index && !f.middle && !f.ring && f.pinky && !f.thumb) return 'I';

  // K / V / R: index + middle extended
  if (f.index && f.middle && !f.ring && !f.pinky) {
    const idxTip = lm[INDEX_TIP];
    const midTip = lm[MIDDLE_TIP];
    const sep = dist2d(idxTip, midTip);
    // R: crossed fingers (tips very close together)
    if (sep < 0.04) return 'R';
    // V: fingers spread apart
    if (sep > 0.07) return 'V';
    // K: fingers together but not crossed, thumb extended outward
    if (f.thumb) return 'K';
    return 'V';
  }

  // W / Three: index + middle + ring
  if (f.index && f.middle && f.ring && !f.pinky) return 'W';

  // Y: thumb + pinky only ("hang loose")
  if (f.thumb && !f.index && !f.middle && !f.ring && f.pinky) return 'Y';

  // L: thumb + index (L shape)
  if (f.thumb && f.index && !f.middle && !f.ring && !f.pinky) {
    // Check it's roughly L-shaped (thumb perpendicular to index)
    const thumbAngle = angle(lm[THUMB_TIP], lm[THUMB_MCP], lm[INDEX_MCP]);
    if (thumbAngle > 0.5) return 'L';
    return 'L';
  }

  // P: like K but pointing downward — hard to detect, skip
  // Q: like G but pointing downward — hard to detect, skip

  // U: index + middle together (not spread)
  if (f.index && f.middle && !f.ring && !f.pinky && !f.thumb) {
    const idxTip = lm[INDEX_TIP];
    const midTip = lm[MIDDLE_TIP];
    if (dist2d(idxTip, midTip) < 0.045) return 'U';
    return 'V';
  }

  // Four: index+middle+ring+pinky, thumb not across
  if (f.index && f.middle && f.ring && f.pinky && !f.thumb && !thumbAcross) return '4';

  // Five / open hand
  if (f.thumb && f.index && f.middle && f.ring && f.pinky) return '5';

  // M: thumb under index+middle+ring (three fingers down over thumb)
  if (!f.index && !f.middle && !f.ring && f.pinky && f.thumb) {
    // N: thumb under index+middle (two fingers down)
    // T: thumb between index+middle
    // These are hard to distinguish — skip
  }

  // X: index finger hooked (curled but not fully)
  if (indexCurled && !middleCurled && !ringCurled && !pinkyCurled) return 'X';

  // Z: index finger extended with motion — can't detect statically, treat as D
  if (f.index && !f.middle && !f.ring && !f.pinky) return 'D';

  // Fallbacks
  if (extendedCount === 0 && f.thumb) return 'A';
  if (f.thumb && f.index && f.middle && f.ring && f.pinky) return '5';

  return null;
}

export type RecognitionResult = {
  letter: string | null;
  confidence: number;
  landmarks: Landmark[] | null;
};

export async function recognizeFrame(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<RecognitionResult> {
  const lm = await getHandLandmarker();
  let result: HandLandmarkerResult;
  const safeTimestamp = Math.max(timestampMs, lastVideoTimestamp + 1);
  lastVideoTimestamp = safeTimestamp;

  try {
    result = lm.detectForVideo(video, safeTimestamp);
  } catch {
    return { letter: null, confidence: 0, landmarks: null };
  }

  if (!result.landmarks || result.landmarks.length === 0) {
    return { letter: null, confidence: 0, landmarks: null };
  }

  const hand = result.landmarks[0];
  const letter = classifyLetter(hand as unknown as Landmark[]);

  // Use handedness score for confidence if available
  let confidence = 0.75;
  if (result.handedness && result.handedness.length > 0 && result.handedness[0].length > 0) {
    const score = result.handedness[0][0].score;
    if (score !== undefined) confidence = Math.max(confidence, score);
  }
  if (letter) confidence = Math.max(confidence, 0.8);

  return {
    letter,
    confidence: letter ? confidence : 0,
    landmarks: hand as unknown as Landmark[],
  };
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { findBestAlphabetMatchByCoordinates } from '../data/alphabetCoordinates';

// WASM and Model resource locations
const LOCAL_WASM_PATH = '/wasm';
const WASM_CDN_PRIMARY = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const WASM_CDN_UNPKG = 'https://unpkg.com/@mediapipe/tasks-vision@1.0.1/wasm';
const WASM_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

const LOCAL_MODEL_PATH = '/models/hand_landmarker.task';
const REMOTE_MODEL_LATEST =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';
const REMOTE_MODEL_V1 =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;
let lastVideoTimestamp = -1;

export function resetLandmarkerTimestamp(): void {
  lastVideoTimestamp = -1;
  resetPipelineBuffers();
}

export function isHandLandmarkerReady(): boolean {
  return landmarker !== null;
}

/**
 * Validates whether a Uint8Array contains a valid zip archive (such as MediaPipe task bundle).
 */
function isValidTaskBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 1000000) return false; // HandLandmarker model is at least 5-7MB
  
  // Check for PK magic bytes in the first 64 bytes (handles optional 2-byte alignment offset)
  let hasZipHeader = false;
  for (let i = 0; i < Math.min(bytes.length - 4, 64); i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
      hasZipHeader = true;
      break;
    }
  }
  if (!hasZipHeader) return false;

  // Check for End of Central Directory signature (PK\x05\x06) in the last 64KB
  const searchStart = Math.max(0, bytes.length - 65536);
  for (let i = bytes.length - 4; i >= searchStart; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      return true;
    }
  }
  return false;
}

async function loadModelBuffer(): Promise<Uint8Array | null> {
  const modelSources = [LOCAL_MODEL_PATH, REMOTE_MODEL_LATEST, REMOTE_MODEL_V1];

  for (const src of modelSources) {
    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) continue;
      const arrayBuf = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      if (isValidTaskBuffer(bytes)) {
        return bytes;
      }
    } catch {
      // Try next source
    }
  }
  return null;
}

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Resolve WASM fileset
      const wasmSources = [LOCAL_WASM_PATH, WASM_CDN_PRIMARY, WASM_CDN_UNPKG, WASM_CDN_FALLBACK];
      let vision = null;
      for (const wasmPath of wasmSources) {
        try {
          vision = await FilesetResolver.forVisionTasks(wasmPath);
          if (vision) break;
        } catch {
          // Try next WASM path
        }
      }

      if (!vision) {
        throw new Error('Failed to resolve MediaPipe WebAssembly runtime. Please check network connectivity.');
      }

      // 2. Load model binary buffer or fall back to URL paths
      const modelBuffer = await loadModelBuffer();
      let instance: HandLandmarker | null = null;

      // Strategy A: Direct in-memory buffer (avoids secondary network request inside wasm)
      if (modelBuffer) {
        // Try GPU first
        try {
          instance = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetBuffer: modelBuffer, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        } catch {
          // Fallback to CPU
          try {
            instance = await HandLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetBuffer: modelBuffer, delegate: 'CPU' },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.40,
              minHandPresenceConfidence: 0.40,
              minTrackingConfidence: 0.40,
            });
          } catch {
            instance = null;
          }
        }
      }

      // Strategy B: If buffer failed or was unavailable, try model path URLs
      if (!instance) {
        const pathCandidates = [LOCAL_MODEL_PATH, REMOTE_MODEL_LATEST, REMOTE_MODEL_V1];
        for (const path of pathCandidates) {
          try {
            instance = await HandLandmarker.createFromOptions(vision, {
              baseOptions: { modelAssetPath: path, delegate: 'GPU' },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: 0.45,
              minHandPresenceConfidence: 0.45,
              minTrackingConfidence: 0.45,
            });
            break;
          } catch {
            try {
              instance = await HandLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: path, delegate: 'CPU' },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.40,
                minHandPresenceConfidence: 0.40,
                minTrackingConfidence: 0.40,
              });
              break;
            } catch {
              // Try next model path
            }
          }
        }
      }

      if (!instance) {
        throw new Error('Could not initialize ISL gesture model. Please verify camera and network access.');
      }

      landmarker = instance;
      return landmarker;
    } catch (err) {
      initPromise = null;
      landmarker = null;
      throw err;
    }
  })();

  return initPromise;
}

export type Landmark = { x: number; y: number; z: number };

// Landmark indices
export const WRIST = 0;
export const THUMB_CMC = 1;
export const THUMB_MCP = 2;
export const THUMB_IP = 3;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_DIP = 7;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_DIP = 11;
export const MIDDLE_TIP = 12;
export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_DIP = 15;
export const RING_TIP = 16;
export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_DIP = 19;
export const PINKY_TIP = 20;

export function dist3d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

export function dist2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Normalized angle between three landmarks in 3D (in radians)
export function angleBetween(a: Landmark, vertex: Landmark, c: Landmark): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v1z = (a.z ?? 0) - (vertex.z ?? 0);
  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const v2z = (c.z ?? 0) - (vertex.z ?? 0);
  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const mag1 = Math.hypot(v1x, v1y, v1z);
  const mag2 = Math.hypot(v2x, v2y, v2z);
  if (mag1 * mag2 === 0) return 0;
  const cos = Math.min(Math.max(dot / (mag1 * mag2), -1), 1);
  return Math.acos(cos);
}

export type FingerState = {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  indexCurled: boolean;
  middleCurled: boolean;
  ringCurled: boolean;
  pinkyCurled: boolean;
  indexHooked: boolean;
  thumbExtended: boolean;
  thumbAcross: boolean;
  thumbUpright: boolean;
  palmSize: number;
  orientation: 'up' | 'down' | 'horizontal' | 'forward';
  isFlatPalm: boolean;
  isClosedFist: boolean;
};

// ==========================================
// VIDEO PROCESSING PIPELINE CONFIGURATION
// ==========================================

export interface PipelineConfig {
  /** Minimum confidence required to accept a detected ISL gesture (0.40 - 0.95). Default: 0.68 */
  confidenceThreshold: number;
  /** Temporal frame averaging sliding window size (1 - 15 frames). Default: 6 */
  frameWindowSize: number;
  /** Whether to apply adaptive coordinate EMA filtering on raw landmarks. Default: true */
  enableLandmarkSmoothing: boolean;
  /** Minimum temporal consistency ratio required across the sliding window (0.30 - 0.85). Default: 0.50 */
  minConsistencyRatio: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  confidenceThreshold: 0.68,
  frameWindowSize: 6,
  enableLandmarkSmoothing: true,
  minConsistencyRatio: 0.50,
};

let activePipelineConfig: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };

export function setPipelineConfig(config: Partial<PipelineConfig>): void {
  activePipelineConfig = {
    ...activePipelineConfig,
    ...config,
    confidenceThreshold: Math.min(Math.max(config.confidenceThreshold ?? activePipelineConfig.confidenceThreshold, 0.35), 0.95),
    frameWindowSize: Math.min(Math.max(config.frameWindowSize ?? activePipelineConfig.frameWindowSize, 1), 15),
    minConsistencyRatio: Math.min(Math.max(config.minConsistencyRatio ?? activePipelineConfig.minConsistencyRatio, 0.2), 0.9),
  };
}

export function getPipelineConfig(): PipelineConfig {
  return { ...activePipelineConfig };
}

// ==========================================
// ADAPTIVE LANDMARK TEMPORAL FILTER
// ==========================================

let prevSmoothedHands: Landmark[][] = [];

export function smoothLandmarks(
  rawHands: Landmark[][],
  _timestampMs?: number,
  enableSmoothing = true
): Landmark[][] {
  if (!enableSmoothing || rawHands.length === 0) {
    prevSmoothedHands = rawHands.map((hand) => hand.map((p) => ({ ...p })));
    return rawHands;
  }

  const smoothedHands: Landmark[][] = [];

  for (let h = 0; h < rawHands.length; h++) {
    const rawHand = rawHands[h];
    const prevHand = prevSmoothedHands[h];

    if (!prevHand || prevHand.length !== rawHand.length) {
      smoothedHands.push(rawHand.map((p) => ({ ...p })));
      continue;
    }

    // Velocity-based adaptive alpha
    const wristDist = dist2d(rawHand[WRIST], prevHand[WRIST]);
    const indexDist = dist2d(rawHand[INDEX_TIP], prevHand[INDEX_TIP]);
    const avgMovement = (wristDist + indexDist) / 2;

    // When stationary (low jitter), alpha ~ 0.38 for rock-solid stability
    // When in fast motion, alpha ~ 0.85 for lag-free responsiveness
    const alpha = Math.min(Math.max(0.38 + avgMovement * 5.0, 0.38), 0.88);

    const smoothedHand: Landmark[] = rawHand.map((pt, i) => {
      const prev = prevHand[i];
      return {
        x: prev.x * (1 - alpha) + pt.x * alpha,
        y: prev.y * (1 - alpha) + pt.y * alpha,
        z: (prev.z ?? 0) * (1 - alpha) + (pt.z ?? 0) * alpha,
      };
    });

    smoothedHands.push(smoothedHand);
  }

  prevSmoothedHands = smoothedHands;
  return smoothedHands;
}

export function resetPipelineBuffers(): void {
  prevSmoothedHands = [];
  prevTimestampMs = 0;
  temporalPredictionBuffer.length = 0;
  trajectoryHistory.index.length = 0;
  trajectoryHistory.pinky.length = 0;
}

// Motion trajectory history for dynamic gestures like J and Z
type MotionPoint = { x: number; y: number; time: number };
const trajectoryHistory: { index: MotionPoint[]; pinky: MotionPoint[] } = {
  index: [],
  pinky: [],
};

export function updateTrajectory(lm: Landmark[]): void {
  const now = performance.now();
  const cutoff = now - 1200; // retain last 1.2s

  trajectoryHistory.index.push({ x: lm[INDEX_TIP].x, y: lm[INDEX_TIP].y, time: now });
  trajectoryHistory.pinky.push({ x: lm[PINKY_TIP].x, y: lm[PINKY_TIP].y, time: now });

  trajectoryHistory.index = trajectoryHistory.index.filter((p) => p.time >= cutoff);
  trajectoryHistory.pinky = trajectoryHistory.pinky.filter((p) => p.time >= cutoff);
}

function detectZMotion(): boolean {
  const pts = trajectoryHistory.index;
  if (pts.length < 8) return false;
  // Detect Z: right -> down-left -> right
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  return spanX > 0.08 && spanY > 0.08 && pts.length >= 10;
}

function detectJMotion(): boolean {
  const pts = trajectoryHistory.pinky.length >= 8 ? trajectoryHistory.pinky : trajectoryHistory.index;
  if (pts.length < 8) return false;
  // Detect J: down -> curve left/up
  const startY = pts[0].y;
  const midY = Math.max(...pts.map((p) => p.y));
  const endY = pts[pts.length - 1].y;
  return midY - startY > 0.06 && midY - endY > 0.03;
}

export function getFingerStates(lm: Landmark[]): FingerState {
  const wrist = lm[WRIST];
  const middleMcp = lm[MIDDLE_MCP];
  const indexMcp = lm[INDEX_MCP];
  const pinkyMcp = lm[PINKY_MCP];
  const palmSize = Math.max(dist2d(wrist, middleMcp), 0.001);

  // Hand orientation vector (wrist -> middle MCP)
  const dirY = middleMcp.y - wrist.y;
  const dirX = middleMcp.x - wrist.x;
  let orientation: 'up' | 'down' | 'horizontal' | 'forward' = 'up';

  if (dirY > 0.12 && Math.abs(dirY) > Math.abs(dirX)) {
    orientation = 'down';
  } else if (Math.abs(dirX) > Math.abs(dirY) * 1.1) {
    orientation = 'horizontal';
  } else {
    orientation = 'up';
  }

  // Precise joint angle and Euclidean ratio checks
  const isExtendedByAngle = (tip: number, pip: number, mcp: number): boolean => {
    const angle = angleBetween(lm[tip], lm[pip], lm[mcp]);
    const tipToMcp = dist2d(lm[tip], lm[mcp]) / palmSize;
    const tipToWrist = dist2d(lm[tip], wrist) / palmSize;
    return (angle > 2.2 && tipToMcp > 0.60) || tipToWrist > 0.85;
  };

  const isCurledByAngle = (tip: number, pip: number, mcp: number): boolean => {
    const angle = angleBetween(lm[tip], lm[pip], lm[mcp]);
    const tipToMcp = dist2d(lm[tip], lm[mcp]) / palmSize;
    return angle < 2.0 || tipToMcp < 0.50;
  };

  const indexExt = isExtendedByAngle(INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middleExt = isExtendedByAngle(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ringExt = isExtendedByAngle(RING_TIP, RING_PIP, RING_MCP);
  const pinkyExt = isExtendedByAngle(PINKY_TIP, PINKY_PIP, PINKY_MCP);

  const indexC = isCurledByAngle(INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middleC = isCurledByAngle(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ringC = isCurledByAngle(RING_TIP, RING_PIP, RING_MCP);
  const pinkyC = isCurledByAngle(PINKY_TIP, PINKY_PIP, PINKY_MCP);

  const indexHooked = !indexExt && dist2d(lm[INDEX_TIP], lm[INDEX_MCP]) / palmSize > 0.40 && angleBetween(lm[INDEX_TIP], lm[INDEX_PIP], lm[INDEX_MCP]) < 2.1;

  // Thumb analysis
  const thumbTip = lm[THUMB_TIP];
  const thumbMcp = lm[THUMB_MCP];
  const thumbAngle = angleBetween(thumbTip, lm[THUMB_IP], thumbMcp);
  const thumbLength = dist2d(thumbTip, thumbMcp) / palmSize;
  const thumbToIndexMcp = dist2d(thumbTip, indexMcp) / palmSize;
  const thumbToPinkyMcp = dist2d(thumbTip, pinkyMcp) / palmSize;

  const thumbExtended = thumbAngle > 2.1 && thumbLength > 0.42 && thumbToIndexMcp > 0.35;
  const thumbUpright = thumbTip.y < thumbMcp.y - 0.05 * palmSize && thumbToIndexMcp < 0.50;

  const palmMidX = (indexMcp.x + pinkyMcp.x) / 2;
  const palmMidY = (indexMcp.y + pinkyMcp.y) / 2;
  const thumbToPalmMid = Math.hypot(thumbTip.x - palmMidX, thumbTip.y - palmMidY) / palmSize;
  const thumbAcross = thumbToPalmMid < 0.55 || thumbToPinkyMcp < 0.58;

  const isFlatPalm = indexExt && middleExt && ringExt && pinkyExt;
  const isClosedFist = indexC && middleC && ringC && pinkyC;

  return {
    thumb: thumbExtended,
    index: indexExt,
    middle: middleExt,
    ring: ringExt,
    pinky: pinkyExt,
    indexCurled: indexC,
    middleCurled: middleC,
    ringCurled: ringC,
    pinkyCurled: pinkyC,
    indexHooked,
    thumbExtended,
    thumbAcross,
    thumbUpright,
    palmSize,
    orientation,
    isFlatPalm,
    isClosedFist,
  };
}

export type GestureClassification = {
  letter: string | null;
  label: string;
  hindiLabel?: string;
  category: 'letter' | 'number' | 'sign' | 'phrase';
  confidence: number;
  mode?: 'Two-Handed ISL' | 'Single-Hand ISL';
};

// Helper: Calculate center of a hand
function getHandCenter(lm: Landmark[]): { x: number; y: number } {
  const wrist = lm[WRIST];
  const middleMcp = lm[MIDDLE_MCP];
  return {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
  };
}

/**
 * Comprehensive Two-Handed Indian Sign Language (ISL) Classifier
 * Supports all 26 ISL manual alphabet gestures (A-Z) and authentic phrases.
 * Symmetrically evaluates (Hand1, Hand2) and (Hand2, Hand1) for left/right dominance.
 */
export function classifyDualHandGesture(
  handA: Landmark[],
  handB: Landmark[]
): GestureClassification | null {
  const fA = getFingerStates(handA);
  const fB = getFingerStates(handB);

  const avgPalmSize = (fA.palmSize + fB.palmSize) / 2;
  const centerA = getHandCenter(handA);
  const centerB = getHandCenter(handB);
  const handsDistance = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y) / avgPalmSize;

  // 1. NAMASTE / HELLO (नमस्ते / प्रणाम 🙏): Both palms pressed upright together
  const wristDist = dist2d(handA[WRIST], handB[WRIST]) / avgPalmSize;
  const tipDist = dist2d(handA[MIDDLE_TIP], handB[MIDDLE_TIP]) / avgPalmSize;
  if (
    wristDist < 1.7 &&
    tipDist < 1.4 &&
    handA[MIDDLE_TIP].y < handA[WRIST].y &&
    handB[MIDDLE_TIP].y < handB[WRIST].y &&
    (fA.isFlatPalm || fA.index) &&
    (fB.isFlatPalm || fB.index)
  ) {
    return {
      letter: '🙏',
      label: 'Namaste 🙏 (नमस्ते)',
      hindiLabel: 'नमस्ते / प्रणाम',
      category: 'phrase',
      confidence: 0.98,
      mode: 'Two-Handed ISL',
    };
  }

  // 2. HELP (मदद / सहायता 🆘): Fist/thumbs-up resting on flat open palm
  if (
    (fA.isFlatPalm && fB.isClosedFist && dist2d(handB[WRIST], handA[INDEX_MCP]) / avgPalmSize < 1.4) ||
    (fB.isFlatPalm && fA.isClosedFist && dist2d(handA[WRIST], handB[INDEX_MCP]) / avgPalmSize < 1.4)
  ) {
    return {
      letter: '🆘',
      label: 'Help 🆘 (मदद)',
      hindiLabel: 'मदद / सहायता',
      category: 'phrase',
      confidence: 0.96,
      mode: 'Two-Handed ISL',
    };
  }

  // Check symmetrical pairings (h1 as dominant, h2 as non-dominant, and vice versa)
  const candidates: Array<{ h1: Landmark[]; h2: Landmark[]; f1: FingerState; f2: FingerState }> = [
    { h1: handA, h2: handB, f1: fA, f2: fB },
    { h1: handB, h2: handA, f1: fB, f2: fA },
  ];

  for (const { h1, h2, f1, f2 } of candidates) {
    const indexTip1 = h1[INDEX_TIP];
    const indexTip2 = h2[INDEX_TIP];
    const indexPip1 = h1[INDEX_PIP];
    const indexPip2 = h2[INDEX_PIP];
    const indexMcp1 = h1[INDEX_MCP];
    const indexMcp2 = h2[INDEX_MCP];
    const thumbTip1 = h1[THUMB_TIP];
    const thumbTip2 = h2[THUMB_TIP];
    const pinkyTip1 = h1[PINKY_TIP];
    const pinkyTip2 = h2[PINKY_TIP];

    const indexTipDistance = dist2d(indexTip1, indexTip2) / avgPalmSize;
    const thumbTipDistance = dist2d(thumbTip1, thumbTip2) / avgPalmSize;

    // A: Two-handed peak apex (both index extended, tips touching at top in inverted V)
    if (
      f1.index &&
      !f1.middle &&
      !f1.ring &&
      !f1.pinky &&
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky
    ) {
      // If tips touch at apex
      if (indexTipDistance < 0.48 && indexTip1.y < indexMcp1.y && indexTip2.y < indexMcp2.y) {
        return {
          letter: 'A',
          label: 'Letter A (Two-Handed ISL)',
          hindiLabel: 'वर्ण A (ए / अ)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // B: Spectacles / Dual Circles (both hands form thumb+index loops touching side-by-side)
    const isCircle1 = dist2d(thumbTip1, indexTip1) / f1.palmSize < 0.45;
    const isCircle2 = dist2d(thumbTip2, indexTip2) / f2.palmSize < 0.45;
    if (isCircle1 && isCircle2 && (indexTipDistance < 0.95 || thumbTipDistance < 0.95)) {
      return {
        letter: 'B',
        label: 'Letter B (Two-Handed ISL)',
        hindiLabel: 'वर्ण B (ब)',
        category: 'letter',
        confidence: 0.95,
        mode: 'Two-Handed ISL',
      };
    }

    // D: Upright index spine + curved loop touching top tip and base
    if (
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      isCircle1 &&
      dist2d(indexTip1, indexTip2) / avgPalmSize < 0.75
    ) {
      return {
        letter: 'D',
        label: 'Letter D (Two-Handed ISL)',
        hindiLabel: 'वर्ण D (द)',
        category: 'letter',
        confidence: 0.94,
        mode: 'Two-Handed ISL',
      };
    }

    // E: Non-dominant index points up, dominant index touches its tip at an angle
    if (
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      f1.index &&
      !f1.middle &&
      indexTipDistance < 0.40 &&
      indexTip1.y < indexMcp2.y
    ) {
      return {
        letter: 'E',
        label: 'Letter E (Two-Handed ISL)',
        hindiLabel: 'वर्ण E (ई / ए)',
        category: 'letter',
        confidence: 0.93,
        mode: 'Two-Handed ISL',
      };
    }

    // F: Non-dominant index+middle horizontal, dominant index+middle crossed over them
    if (
      f1.index &&
      f1.middle &&
      !f1.pinky &&
      f2.index &&
      f2.middle &&
      !f2.pinky
    ) {
      const midTouch = dist2d(h1[MIDDLE_TIP], h2[INDEX_PIP]) / avgPalmSize;
      if (midTouch < 0.85 || indexTipDistance < 0.85) {
        return {
          letter: 'F',
          label: 'Letter F (Two-Handed ISL)',
          hindiLabel: 'वर्ण F (फ)',
          category: 'letter',
          confidence: 0.94,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // G: Stacked Fists (dominant closed fist resting squarely on non-dominant fist)
    if (f1.isClosedFist && f2.isClosedFist) {
      const isStacked =
        h1[WRIST].y < h2[WRIST].y - 0.35 * avgPalmSize &&
        Math.abs(h1[WRIST].x - h2[WRIST].x) / avgPalmSize < 0.85;
      if (isStacked && handsDistance < 1.5) {
        return {
          letter: 'G',
          label: 'Letter G (Two-Handed ISL)',
          hindiLabel: 'वर्ण G (ग)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // H: Open flat dominant hand sweeping / resting horizontally across vertical open palm
    if (f1.isFlatPalm && f2.isFlatPalm) {
      const centerDist = dist2d(centerA, centerB) / avgPalmSize;
      if (centerDist < 0.95 && tipDist < 1.1) {
        return {
          letter: 'H',
          label: 'Letter H (Two-Handed ISL)',
          hindiLabel: 'वर्ण H (ह)',
          category: 'letter',
          confidence: 0.93,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // K: Non-dominant upright index, dominant bent index touches middle joint (PIP)
    if (
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      (f1.indexHooked || (f1.index && angleBetween(indexTip1, indexPip1, indexMcp1) < 2.2))
    ) {
      const touchPip = dist2d(indexTip1, indexPip2) / avgPalmSize;
      if (touchPip < 0.65) {
        return {
          letter: 'K',
          label: 'Letter K (Two-Handed ISL)',
          hindiLabel: 'वर्ण K (क)',
          category: 'letter',
          confidence: 0.94,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // M: Non-dominant flat palm, dominant 3 fingers (index, middle, ring) resting on palm
    if (
      f2.isFlatPalm &&
      f1.index &&
      f1.middle &&
      f1.ring &&
      !f1.pinky
    ) {
      const touchPalm = dist2d(h1[MIDDLE_TIP], h2[MIDDLE_MCP]) / avgPalmSize;
      if (touchPalm < 0.90) {
        return {
          letter: 'M',
          label: 'Letter M (Two-Handed ISL)',
          hindiLabel: 'वर्ण M (म)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // N: Non-dominant flat palm, dominant 2 fingers (index, middle) resting on palm
    if (
      f2.isFlatPalm &&
      f1.index &&
      f1.middle &&
      !f1.ring &&
      !f1.pinky
    ) {
      const touchPalm = dist2d(h1[INDEX_TIP], h2[MIDDLE_MCP]) / avgPalmSize;
      if (touchPalm < 0.90) {
        return {
          letter: 'N',
          label: 'Letter N (Two-Handed ISL)',
          hindiLabel: 'वर्ण N (न)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // P: Non-dominant upright vertical index, dominant thumb+index loop resting at top tip
    if (
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      isCircle1 &&
      dist2d(indexTip1, indexTip2) / avgPalmSize < 0.60
    ) {
      return {
        letter: 'P',
        label: 'Letter P (Two-Handed ISL)',
        hindiLabel: 'वर्ण P (प)',
        category: 'letter',
        confidence: 0.94,
        mode: 'Two-Handed ISL',
      };
    }

    // Q: Non-dominant thumb+index O-circle, dominant index hooked into/through it
    if (
      isCircle2 &&
      f1.index &&
      !f1.middle &&
      dist2d(indexTip1, (thumbTip2.x + indexTip2.x) / 2) / avgPalmSize < 0.65
    ) {
      return {
        letter: 'Q',
        label: 'Letter Q (Two-Handed ISL)',
        hindiLabel: 'वर्ण Q (क़)',
        category: 'letter',
        confidence: 0.93,
        mode: 'Two-Handed ISL',
      };
    }

    // R: Non-dominant flat palm, dominant curled index resting on palm
    if (
      f2.isFlatPalm &&
      (f1.indexHooked || (f1.index && f1.middleCurled))
    ) {
      const touchPalm = dist2d(indexTip1, h2[MIDDLE_MCP]) / avgPalmSize;
      if (touchPalm < 0.85) {
        return {
          letter: 'R',
          label: 'Letter R (Two-Handed ISL)',
          hindiLabel: 'वर्ण R (र)',
          category: 'letter',
          confidence: 0.93,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // S: Interlocked Pinkies (both hands fists with pinky fingers hooked together)
    if (
      !f1.index &&
      !f1.middle &&
      !f1.ring &&
      f1.pinky &&
      !f2.index &&
      !f2.middle &&
      !f2.ring &&
      f2.pinky
    ) {
      const pinkyDist = dist2d(pinkyTip1, pinkyTip2) / avgPalmSize;
      if (pinkyDist < 0.60) {
        return {
          letter: 'S',
          label: 'Letter S (Two-Handed ISL)',
          hindiLabel: 'वर्ण S (स)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // T: Non-dominant index stands upright, dominant index horizontal across top tip (T crossbar)
    if (
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      f1.index &&
      !f1.middle &&
      !f1.ring &&
      !f1.pinky
    ) {
      // h1 horizontal and h2 vertical
      const isH1Horizontal = Math.abs(indexTip1.x - indexMcp1.x) > Math.abs(indexTip1.y - indexMcp1.y) * 0.8;
      const isH2Vertical = indexTip2.y < indexMcp2.y - 0.2 * f2.palmSize;
      const crossTouch = dist2d(indexPip1, indexTip2) / avgPalmSize < 0.60 || indexTipDistance < 0.60;
      if (isH1Horizontal && isH2Vertical && crossTouch) {
        return {
          letter: 'T',
          label: 'Letter T (Two-Handed ISL)',
          hindiLabel: 'वर्ण T (त)',
          category: 'letter',
          confidence: 0.95,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // W: Fingers of both hands extended upward and interlacing (Crown of 3 peaks)
    if (
      f1.index &&
      f1.middle &&
      f1.ring &&
      f2.index &&
      f2.middle &&
      f2.ring &&
      handsDistance < 1.1
    ) {
      if (h1[MIDDLE_TIP].y < h1[WRIST].y && h2[MIDDLE_TIP].y < h2[WRIST].y) {
        return {
          letter: 'W',
          label: 'Letter W (Two-Handed ISL)',
          hindiLabel: 'वर्ण W (डब्लू)',
          category: 'letter',
          confidence: 0.94,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // X: Both index fingers extended crossing each other symmetrically
    if (
      f1.index &&
      !f1.middle &&
      !f1.ring &&
      !f1.pinky &&
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky
    ) {
      if (indexTipDistance < 0.85 && handsDistance < 1.3) {
        return {
          letter: 'X',
          label: 'Letter X (Two-Handed ISL)',
          hindiLabel: 'वर्ण X (क्ष / क्स)',
          category: 'letter',
          confidence: 0.94,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // Y: Non-dominant in L shape, dominant index pointing into vertex webbing
    if (
      f2.thumbExtended &&
      f2.index &&
      !f2.middle &&
      !f2.ring &&
      !f2.pinky &&
      f1.index &&
      !f1.middle
    ) {
      const touchWebbing = dist2d(indexTip1, h2[THUMB_MCP]) / avgPalmSize;
      if (touchWebbing < 0.65) {
        return {
          letter: 'Y',
          label: 'Letter Y (Two-Handed ISL)',
          hindiLabel: 'वर्ण Y (य)',
          category: 'letter',
          confidence: 0.94,
          mode: 'Two-Handed ISL',
        };
      }
    }

    // Z: Non-dominant flat vertical hand, dominant flat horizontal hand meeting at 90 deg
    if (
      f1.isFlatPalm &&
      f2.isFlatPalm &&
      handsDistance < 1.2
    ) {
      const isTouch = dist2d(h1[MIDDLE_TIP], h2[MIDDLE_MCP]) / avgPalmSize < 0.80;
      if (isTouch) {
        return {
          letter: 'Z',
          label: 'Letter Z (Two-Handed ISL)',
          hindiLabel: 'वर्ण Z (ज़)',
          category: 'letter',
          confidence: 0.93,
          mode: 'Two-Handed ISL',
        };
      }
    }
  }

  return null;
}

/**
 * Comprehensive Single-Hand ISL & Manual Fingerspelling Classifier (A-Z, 0-10, Core Phrases)
 */
export function classifyGesture(lm: Landmark[]): GestureClassification {
  updateTrajectory(lm);
  const f = getFingerStates(lm);
  const { palmSize } = f;

  const wrist = lm[WRIST];
  const thumbTip = lm[THUMB_TIP];
  const thumbMcp = lm[THUMB_MCP];
  const indexTip = lm[INDEX_TIP];
  const indexPip = lm[INDEX_PIP];
  const indexMcp = lm[INDEX_MCP];
  const middleTip = lm[MIDDLE_TIP];
  const middleMcp = lm[MIDDLE_MCP];
  const ringTip = lm[RING_TIP];
  const ringMcp = lm[RING_MCP];
  const pinkyTip = lm[PINKY_TIP];
  const pinkyMcp = lm[PINKY_MCP];

  const extCount = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;
  const allFourCurled = f.isClosedFist;
  const allFourExtended = f.isFlatPalm;

  // Normalized Distances
  const thumbToIndexTip = dist2d(thumbTip, indexTip) / palmSize;
  const thumbToMiddleTip = dist2d(thumbTip, middleTip) / palmSize;
  const thumbToRingTip = dist2d(thumbTip, ringTip) / palmSize;
  const thumbToPinkyTip = dist2d(thumbTip, pinkyTip) / palmSize;
  const indexToMiddleTip = dist2d(indexTip, middleTip) / palmSize;
  const middleToRingTip = dist2d(middleTip, ringTip) / palmSize;
  const ringToPinkyTip = dist2d(ringTip, pinkyTip) / palmSize;

  // Dynamic stroke detection in ISL
  if (detectZMotion() && f.index && !f.middle && !f.ring && !f.pinky) {
    return { letter: 'Z', label: 'Letter Z', hindiLabel: 'वर्ण Z (ज़)', category: 'letter', confidence: 0.95, mode: 'Single-Hand ISL' };
  }
  if (detectJMotion() && !f.index && !f.middle && !f.ring && f.pinky) {
    return { letter: 'J', label: 'Letter J', hindiLabel: 'वर्ण J (ज)', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
  }

  // 1. I LOVE YOU / PYAR (प्यार 🤟): Thumb + Index + Pinky extended
  if (f.thumbExtended && f.index && !f.middle && !f.ring && f.pinky) {
    return {
      letter: '🤟',
      label: 'I Love You / Pyar 🤟 (प्यार)',
      hindiLabel: 'प्यार / स्नेह',
      category: 'phrase',
      confidence: 0.96,
      mode: 'Single-Hand ISL',
    };
  }

  // 2. Y ("Hang Loose" / Yellow / Y 🤙): Thumb + Pinky extended only
  if (f.thumbExtended && !f.index && !f.middle && !f.ring && f.pinky) {
    return { letter: 'Y', label: 'Letter Y', hindiLabel: 'वर्ण Y (य)', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
  }

  // 3. L: Thumb + Index extended in an L-shape (~90 deg)
  if (f.thumbExtended && f.index && !f.middle && !f.ring && !f.pinky && f.orientation === 'up') {
    const lAngle = angleBetween(thumbTip, thumbMcp, indexTip);
    if (lAngle > 0.42 && thumbToIndexTip > 0.45) {
      return { letter: 'L', label: 'Letter L', hindiLabel: 'वर्ण L (ल)', category: 'letter', confidence: 0.95, mode: 'Single-Hand ISL' };
    }
  }

  // 4. G: Index & Thumb pointing horizontally forward in parallel
  if (
    f.index &&
    !f.middle &&
    !f.ring &&
    !f.pinky &&
    (f.orientation === 'horizontal' || Math.abs(indexTip.x - indexMcp.x) > Math.abs(indexTip.y - indexMcp.y))
  ) {
    if (thumbToIndexTip < 0.50 && indexTip.y <= wrist.y + 0.1 * palmSize) {
      return { letter: 'G', label: 'Letter G', hindiLabel: 'वर्ण G (ग)', category: 'letter', confidence: 0.92, mode: 'Single-Hand ISL' };
    }
  }

  // 5. H: Index + Middle fingers pointing horizontally forward together
  if (
    f.index &&
    f.middle &&
    !f.ring &&
    !f.pinky &&
    (f.orientation === 'horizontal' || Math.abs(indexTip.x - indexMcp.x) > Math.abs(indexTip.y - indexMcp.y))
  ) {
    if (indexToMiddleTip < 0.25) {
      return { letter: 'H', label: 'Letter H', hindiLabel: 'वर्ण H (ह)', category: 'letter', confidence: 0.93, mode: 'Single-Hand ISL' };
    }
  }

  // 6. P: K-handshape oriented downwards
  if (
    f.index &&
    f.middle &&
    !f.ring &&
    !f.pinky &&
    (f.orientation === 'down' || middleTip.y > wrist.y + 0.05 * palmSize)
  ) {
    return { letter: 'P', label: 'Letter P', hindiLabel: 'वर्ण P (प)', category: 'letter', confidence: 0.91, mode: 'Single-Hand ISL' };
  }

  // 7. Q: G-handshape pointing downward
  if (f.index && !f.middle && !f.ring && !f.pinky && (f.orientation === 'down' || indexTip.y > indexMcp.y + 0.15 * palmSize)) {
    if (thumbToIndexTip < 0.45) {
      return { letter: 'Q', label: 'Letter Q', hindiLabel: 'वर्ण Q (क़)', category: 'letter', confidence: 0.91, mode: 'Single-Hand ISL' };
    }
  }

  // 8. F / 9: Thumb & Index tips touching forming a circle, Middle, Ring, Pinky extended
  if (f.middle && f.ring && f.pinky && !f.index) {
    if (thumbToIndexTip < 0.30) {
      return { letter: 'F', label: 'Letter F / 9', hindiLabel: 'वर्ण F / ९', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
    }
  }

  // 9. ISL NUMBERS 6, 7, 8 (Touching thumb to specific finger)
  if (f.index && f.middle && f.ring && !f.pinky && thumbToPinkyTip < 0.28) {
    return { letter: '6', label: 'Number 6 (६)', hindiLabel: '६ (छह)', category: 'number', confidence: 0.92, mode: 'Single-Hand ISL' };
  }
  if (f.index && f.middle && !f.ring && f.pinky && thumbToRingTip < 0.28) {
    return { letter: '7', label: 'Number 7 (७)', hindiLabel: '७ (सात)', category: 'number', confidence: 0.92, mode: 'Single-Hand ISL' };
  }
  if (f.index && !f.middle && f.ring && f.pinky && thumbToMiddleTip < 0.28) {
    return { letter: '8', label: 'Number 8 (८)', hindiLabel: '८ (आठ)', category: 'number', confidence: 0.92, mode: 'Single-Hand ISL' };
  }

  // 10. OPEN HAND / 5 (५): All 5 fingers extended and spread apart
  if (allFourExtended && f.thumbExtended && indexToMiddleTip > 0.16 && middleToRingTip > 0.16) {
    return { letter: '5', label: 'Open Hand / 5 (५) ✋', hindiLabel: '५ (पाँच)', category: 'number', confidence: 0.93, mode: 'Single-Hand ISL' };
  }

  // 11. B / 4 (४): 4 fingers extended upright together
  if (allFourExtended) {
    if (f.thumbAcross || !f.thumbExtended) {
      if (indexToMiddleTip < 0.22 && middleToRingTip < 0.22 && ringToPinkyTip < 0.22) {
        return { letter: 'B', label: 'Letter B', hindiLabel: 'वर्ण B (ब)', category: 'letter', confidence: 0.93, mode: 'Single-Hand ISL' };
      }
      return { letter: '4', label: 'Number 4 (४)', hindiLabel: '४ (चार)', category: 'number', confidence: 0.90, mode: 'Single-Hand ISL' };
    }
  }

  // 12. W / 3 (३): Index, Middle, Ring extended upright, Pinky curled
  if (f.index && f.middle && f.ring && !f.pinky) {
    if (f.thumbExtended || thumbToPinkyTip < 0.38) {
      return { letter: '3', label: 'Number 3 (३)', hindiLabel: '३ (तीन)', category: 'number', confidence: 0.91, mode: 'Single-Hand ISL' };
    }
    return { letter: 'W', label: 'Letter W / Water (पानी)', hindiLabel: 'वर्ण W / पानी', category: 'letter', confidence: 0.93, mode: 'Single-Hand ISL' };
  }

  // 13. V / PEACE / 2 (२) / U / R / K: Index + Middle extended, Ring & Pinky curled
  if (f.index && f.middle && !f.ring && !f.pinky && f.orientation === 'up') {
    // R (crossed index and middle)
    const isCrossed =
      Math.abs(indexTip.x - middleTip.x) < 0.05 * palmSize || (indexTip.x > middleTip.x && indexMcp.x < middleMcp.x);
    if (isCrossed) {
      return { letter: 'R', label: 'Letter R', hindiLabel: 'वर्ण R (र)', category: 'letter', confidence: 0.92, mode: 'Single-Hand ISL' };
    }
    // U: Index & Middle held tightly together
    if (indexToMiddleTip < 0.16 && !f.thumbExtended) {
      return { letter: 'U', label: 'Letter U', hindiLabel: 'वर्ण U (उ)', category: 'letter', confidence: 0.92, mode: 'Single-Hand ISL' };
    }
    // K: Thumb placed between index and middle
    if (f.thumbExtended && thumbToMiddleTip < 0.40 && indexToMiddleTip >= 0.16) {
      return { letter: 'K', label: 'Letter K', hindiLabel: 'वर्ण K (क)', category: 'letter', confidence: 0.91, mode: 'Single-Hand ISL' };
    }
    // V / Peace: Spread apart
    if (indexToMiddleTip >= 0.16) {
      return { letter: 'V', label: 'Letter V / Peace ✌', hindiLabel: 'वर्ण V (व) / २', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
    }
    return { letter: '2', label: 'Number 2 (२)', hindiLabel: '२ (दो)', category: 'number', confidence: 0.89, mode: 'Single-Hand ISL' };
  }

  // 14. D / 1 (१): Index extended straight UP
  if (f.index && !f.middle && !f.ring && !f.pinky && f.orientation === 'up') {
    const isDLoop = thumbToMiddleTip < 0.35 && thumbToRingTip < 0.38;
    if (isDLoop) {
      return { letter: 'D', label: 'Letter D', hindiLabel: 'वर्ण D (द)', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
    }
    return { letter: '1', label: 'Number 1 / Letter I (१)', hindiLabel: '१ (एक) / I (इ)', category: 'letter', confidence: 0.92, mode: 'Single-Hand ISL' };
  }

  // 15. I: Pinky extended straight UP
  if (!f.index && !f.middle && !f.ring && f.pinky && !f.thumbExtended && f.orientation === 'up') {
    return { letter: 'I', label: 'Letter I', hindiLabel: 'वर्ण I (इ)', category: 'letter', confidence: 0.94, mode: 'Single-Hand ISL' };
  }

  // 16. O / 0: All fingertips meeting thumb tip in a circular O shape
  if (!f.index && !f.middle && !f.ring && !f.pinky) {
    if (thumbToIndexTip < 0.30 && thumbToMiddleTip < 0.30 && thumbToRingTip < 0.34) {
      return { letter: 'O', label: 'Letter O / 0 (शून्य)', hindiLabel: 'वर्ण O / ०', category: 'letter', confidence: 0.93, mode: 'Single-Hand ISL' };
    }
  }

  // 17. C / CHAI CUP (चाय ☕ / C): Curved hand forming an open 'C' arc
  if (!allFourExtended && !allFourCurled && extCount >= 2) {
    const isCurvedArc =
      thumbToIndexTip > 0.25 &&
      thumbToIndexTip < 0.75 &&
      dist2d(indexTip, indexMcp) / palmSize > 0.50 &&
      dist2d(middleTip, middleMcp) / palmSize > 0.50;
    if (isCurvedArc) {
      return { letter: 'C', label: 'Letter C / Chai (चाय ☕)', hindiLabel: 'वर्ण C / चाय', category: 'letter', confidence: 0.90, mode: 'Single-Hand ISL' };
    }
  }

  // 18. X: Index hooked (half-curled at PIP)
  if (f.indexHooked && f.middleCurled && f.ringCurled && f.pinkyCurled) {
    return { letter: 'X', label: 'Letter X', hindiLabel: 'वर्ण X (क्ष)', category: 'letter', confidence: 0.90, mode: 'Single-Hand ISL' };
  }

  // 19. Fist & Thumb Variations: Thumbs Up / Down / E / M / N / T / S / A
  if (allFourCurled || extCount === 0) {
    // Thumbs Down (👎)
    if (f.orientation === 'down' && thumbTip.y > wrist.y + 0.1 * palmSize) {
      return { letter: '👎', label: 'Disagree / Bad 👎 (असहमत)', hindiLabel: 'असहमत / बुरा', category: 'sign', confidence: 0.94, mode: 'Single-Hand ISL' };
    }

    // Thumbs Up (👍 / 10 / Good / अच्छा)
    const isThumbPointingUp =
      thumbTip.y < lm[THUMB_MCP].y - 0.08 * palmSize &&
      Math.abs(thumbTip.x - lm[THUMB_MCP].x) < 0.18 * palmSize;
    if (isThumbPointingUp && f.thumbExtended) {
      return { letter: '👍', label: 'Good / Superb 👍 (बढ़िया)', hindiLabel: 'अच्छा / बढ़िया', category: 'sign', confidence: 0.95, mode: 'Single-Hand ISL' };
    }

    // E: Fingertips curled against thumb with thumb tucked beneath all 4 tips
    const allTipsCloseToThumb =
      thumbToIndexTip < 0.28 && thumbToMiddleTip < 0.28 && thumbToRingTip < 0.32 && thumbToPinkyTip < 0.36;
    if (allTipsCloseToThumb && thumbTip.y > indexPip.y) {
      return { letter: 'E', label: 'Letter E', hindiLabel: 'वर्ण E (ए)', category: 'letter', confidence: 0.91, mode: 'Single-Hand ISL' };
    }

    // M: 3 fingers folded over thumb
    if (thumbTip.x > middleMcp.x && thumbTip.x < pinkyMcp.x && thumbTip.y > ringTip.y - 0.05 * palmSize) {
      return { letter: 'M', label: 'Letter M', hindiLabel: 'वर्ण M (म)', category: 'letter', confidence: 0.90, mode: 'Single-Hand ISL' };
    }

    // N: 2 fingers folded over thumb
    if (thumbTip.x > indexMcp.x && thumbTip.x < ringMcp.x && thumbTip.y > middleTip.y - 0.05 * palmSize) {
      return { letter: 'N', label: 'Letter N', hindiLabel: 'वर्ण N (न)', category: 'letter', confidence: 0.90, mode: 'Single-Hand ISL' };
    }

    // T: Index folded over thumb
    if (thumbTip.x > indexMcp.x && thumbTip.x < middleMcp.x && thumbTip.y < indexPip.y + 0.05 * palmSize) {
      return { letter: 'T', label: 'Letter T', hindiLabel: 'वर्ण T (त)', category: 'letter', confidence: 0.91, mode: 'Single-Hand ISL' };
    }

    // S: Fist with thumb folded horizontally across front of fingers
    if (f.thumbAcross && thumbToMiddleTip < 0.38 && thumbTip.y > indexPip.y - 0.05 * palmSize) {
      return { letter: 'S', label: 'Letter S', hindiLabel: 'वर्ण S (स)', category: 'letter', confidence: 0.92, mode: 'Single-Hand ISL' };
    }

    // A: Fist with thumb upright resting alongside the index finger
    if (f.thumbUpright || thumbTip.y < indexMcp.y) {
      return { letter: 'A', label: 'Letter A', hindiLabel: 'वर्ण A (अ)', category: 'letter', confidence: 0.93, mode: 'Single-Hand ISL' };
    }

    return { letter: 'A', label: 'Letter A', hindiLabel: 'वर्ण A (अ)', category: 'letter', confidence: 0.85, mode: 'Single-Hand ISL' };
  }

  return { letter: null, label: 'Detecting ISL Gesture...', category: 'letter', confidence: 0 };
}

// Multi-frame prediction smoothing and temporal frame-averaging buffer
export interface GesturePredictionSample {
  letter: string | null;
  label: string;
  hindiLabel?: string;
  category: 'letter' | 'number' | 'sign' | 'phrase';
  confidence: number;
  mode?: 'Two-Handed ISL' | 'Single-Hand ISL';
  timestamp: number;
}

const temporalPredictionBuffer: GesturePredictionSample[] = [];

export interface TemporalSmoothingResult {
  smoothed: GestureClassification;
  rawConfidence: number;
  consistencyRatio: number;
  threshold: number;
  isAboveThreshold: boolean;
}

/**
 * Multi-frame temporal frame-averaging & confidence thresholding
 */
export function smoothPrediction(
  raw: GestureClassification,
  timestampMs: number = performance.now(),
  customConfig?: Partial<PipelineConfig>
): TemporalSmoothingResult {
  const config = customConfig ? { ...activePipelineConfig, ...customConfig } : activePipelineConfig;
  const windowSize = Math.max(config.frameWindowSize, 1);

  // Push new frame sample into sliding window
  temporalPredictionBuffer.push({
    letter: raw.letter,
    label: raw.label,
    hindiLabel: raw.hindiLabel,
    category: raw.category,
    confidence: raw.confidence,
    mode: raw.mode,
    timestamp: timestampMs,
  });

  while (temporalPredictionBuffer.length > windowSize) {
    temporalPredictionBuffer.shift();
  }

  if (!raw.letter) {
    const hasAnyLetter = temporalPredictionBuffer.some((s) => s.letter !== null);
    if (!hasAnyLetter) {
      temporalPredictionBuffer.length = 0;
    }
  }

  const n = temporalPredictionBuffer.length;
  if (n === 0) {
    return {
      smoothed: raw,
      rawConfidence: raw.confidence,
      consistencyRatio: 0,
      threshold: config.confidenceThreshold,
      isAboveThreshold: false,
    };
  }

  // Multi-frame candidate voting with exponential temporal weighting
  const candidates = new Map<
    string,
    {
      count: number;
      weightedConfidenceSum: number;
      totalWeight: number;
      sample: GesturePredictionSample;
    }
  >();

  for (let i = 0; i < n; i++) {
    const s = temporalPredictionBuffer[i];
    if (!s.letter) continue;

    // Linearly increasing temporal weight towards recent frames
    const weight = 1.0 + (i / Math.max(n - 1, 1));

    const existing = candidates.get(s.letter) || {
      count: 0,
      weightedConfidenceSum: 0,
      totalWeight: 0,
      sample: s,
    };

    existing.count += 1;
    existing.weightedConfidenceSum += s.confidence * weight;
    existing.totalWeight += weight;
    candidates.set(s.letter, existing);
  }

  if (candidates.size === 0) {
    return {
      smoothed: {
        letter: null,
        label: raw.label || 'Detecting ISL Gesture...',
        hindiLabel: raw.hindiLabel,
        category: 'letter',
        confidence: 0,
      },
      rawConfidence: raw.confidence,
      consistencyRatio: 0,
      threshold: config.confidenceThreshold,
      isAboveThreshold: false,
    };
  }

  // Find dominant candidate
  let bestEntry: {
    letter: string;
    avgConfidence: number;
    consistency: number;
    sample: GesturePredictionSample;
  } | null = null;
  let secondBestConfidence = 0;

  for (const [letter, data] of candidates.entries()) {
    const avgConfidence = data.weightedConfidenceSum / Math.max(data.totalWeight, 0.001);
    const consistency = data.count / n;
    const combinedScore = avgConfidence * (0.6 + 0.4 * consistency);

    if (!bestEntry || combinedScore > bestEntry.avgConfidence * (0.6 + 0.4 * bestEntry.consistency)) {
      if (bestEntry) {
        secondBestConfidence = bestEntry.avgConfidence;
      }
      bestEntry = {
        letter,
        avgConfidence,
        consistency,
        sample: data.sample,
      };
    } else if (avgConfidence > secondBestConfidence) {
      secondBestConfidence = avgConfidence;
    }
  }

  if (!bestEntry) {
    return {
      smoothed: raw,
      rawConfidence: raw.confidence,
      consistencyRatio: 0,
      threshold: config.confidenceThreshold,
      isAboveThreshold: false,
    };
  }

  const { letter, avgConfidence, consistency, sample } = bestEntry;
  const margin = avgConfidence - secondBestConfidence;

  // Boost confidence when frames are highly consistent, penalize if ambiguous margin
  let finalConfidence = avgConfidence;
  if (consistency >= 0.8) {
    finalConfidence = Math.min(0.99, finalConfidence + 0.03);
  } else if (margin < 0.08 && consistency < 0.6) {
    finalConfidence = finalConfidence * 0.90;
  }

  // Apply Confidence Thresholding & Consistency Check
  const passedThreshold =
    finalConfidence >= config.confidenceThreshold &&
    consistency >= config.minConsistencyRatio;

  if (passedThreshold) {
    return {
      smoothed: {
        letter,
        label: sample.label,
        hindiLabel: sample.hindiLabel,
        category: sample.category,
        confidence: Number(finalConfidence.toFixed(2)),
        mode: sample.mode,
      },
      rawConfidence: raw.confidence,
      consistencyRatio: Number(consistency.toFixed(2)),
      threshold: config.confidenceThreshold,
      isAboveThreshold: true,
    };
  }

  // Sub-threshold or stabilizing
  return {
    smoothed: {
      letter: null,
      label: `Stabilizing '${letter}' (${Math.round(finalConfidence * 100)}% / ${Math.round(config.confidenceThreshold * 100)}%)`,
      hindiLabel: sample.hindiLabel,
      category: sample.category,
      confidence: Number(finalConfidence.toFixed(2)),
      mode: sample.mode,
    },
    rawConfidence: raw.confidence,
    consistencyRatio: Number(consistency.toFixed(2)),
    threshold: config.confidenceThreshold,
    isAboveThreshold: false,
  };
}

export type RecognitionResult = {
  letter: string | null;
  rawLetter?: string | null;
  label: string;
  hindiLabel?: string;
  category: 'letter' | 'number' | 'sign' | 'phrase';
  confidence: number;
  rawConfidence: number;
  threshold: number;
  isAboveThreshold: boolean;
  consistencyRatio: number;
  mode?: 'Two-Handed ISL' | 'Single-Hand ISL';
  landmarks: Landmark[] | null;
  allLandmarks?: Landmark[][];
  fingerStates?: FingerState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
  center?: { x: number; y: number };
};

export async function recognizeFrame(
  video: HTMLVideoElement,
  timestampMs: number,
  customConfig?: Partial<PipelineConfig>
): Promise<RecognitionResult> {
  const config = customConfig ? { ...activePipelineConfig, ...customConfig } : activePipelineConfig;
  const lm = await getHandLandmarker();
  let result: HandLandmarkerResult;

  // Enforce strictly monotonic timestamp required by MediaPipe
  const safeTimestamp = Math.max(Math.round(timestampMs), lastVideoTimestamp + 1);
  lastVideoTimestamp = safeTimestamp;

  try {
    result = lm.detectForVideo(video, safeTimestamp);
  } catch {
    return {
      letter: null,
      label: 'Analyzing frame...',
      category: 'letter',
      confidence: 0,
      rawConfidence: 0,
      threshold: config.confidenceThreshold,
      isAboveThreshold: false,
      consistencyRatio: 0,
      landmarks: null,
    };
  }

  if (!result.landmarks || result.landmarks.length === 0) {
    temporalPredictionBuffer.length = 0;
    return {
      letter: null,
      label: 'No hand detected',
      category: 'letter',
      confidence: 0,
      rawConfidence: 0,
      threshold: config.confidenceThreshold,
      isAboveThreshold: false,
      consistencyRatio: 0,
      landmarks: null,
    };
  }

  const rawHands = result.landmarks as unknown as Landmark[][];

  // Apply Adaptive Coordinate EMA Smoothing
  const allHands = smoothLandmarks(rawHands, safeTimestamp, config.enableLandmarkSmoothing);
  const dominantHand = allHands[0];

  let rawClassification: GestureClassification;

  // 1. Check Dual-Hand ISL Gesture when 2 hands are present in frame
  if (allHands.length >= 2) {
    const dualClassification = classifyDualHandGesture(allHands[0], allHands[1]);
    if (dualClassification) {
      rawClassification = dualClassification;
    } else {
      rawClassification = classifyGesture(dominantHand);
    }
  } else {
    // 2. Single-Hand ISL Gesture
    rawClassification = classifyGesture(dominantHand);
  }

  // 3. 21-Point Landmark Coordinate Evaluation Corroborator
  // Directly evaluates 3D position coordinates and landmark topologies against canonical templates
  if (!rawClassification.letter || rawClassification.confidence < 0.78) {
    const coordMatch = findBestAlphabetMatchByCoordinates(
      dominantHand,
      allHands.length >= 2 ? allHands[1] : null,
      0.60
    );
    if (coordMatch && (!rawClassification.letter || coordMatch.confidence > rawClassification.confidence)) {
      rawClassification = {
        letter: coordMatch.letter,
        label: `Letter ${coordMatch.letter}`,
        hindiLabel: `वर्ण ${coordMatch.letter}`,
        category: 'letter',
        confidence: Number(coordMatch.confidence.toFixed(2)),
        mode: coordMatch.model.isTwoHanded ? 'Two-Handed ISL' : 'Single-Hand ISL',
      };
    }
  }

  const fingerStates = getFingerStates(dominantHand);

  // Apply Multi-Frame Temporal Averaging & Confidence Thresholding
  const temporal = smoothPrediction(rawClassification, safeTimestamp, config);
  const classification = temporal.smoothed;

  // Compute bounding box and center
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;

  for (const pt of dominantHand) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
    sumX += pt.x;
    sumY += pt.y;
  }

  const center = {
    x: sumX / dominantHand.length,
    y: sumY / dominantHand.length,
  };

  return {
    letter: classification.letter,
    rawLetter: rawClassification.letter,
    label: classification.label,
    hindiLabel: classification.hindiLabel,
    category: classification.category,
    confidence: classification.confidence,
    rawConfidence: temporal.rawConfidence,
    threshold: temporal.threshold,
    isAboveThreshold: temporal.isAboveThreshold,
    consistencyRatio: temporal.consistencyRatio,
    mode: classification.mode || (allHands.length >= 2 ? 'Two-Handed ISL' : 'Single-Hand ISL'),
    landmarks: dominantHand,
    allLandmarks: allHands,
    fingerStates,
    boundingBox: { minX, minY, maxX, maxY },
    center,
  };
}

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [WRIST, THUMB_CMC],
  [THUMB_CMC, THUMB_MCP],
  [THUMB_MCP, THUMB_IP],
  [THUMB_IP, THUMB_TIP],
  // Index
  [WRIST, INDEX_MCP],
  [INDEX_MCP, INDEX_PIP],
  [INDEX_PIP, INDEX_DIP],
  [INDEX_DIP, INDEX_TIP],
  // Middle
  [INDEX_MCP, MIDDLE_MCP],
  [MIDDLE_MCP, MIDDLE_PIP],
  [MIDDLE_PIP, MIDDLE_DIP],
  [MIDDLE_DIP, MIDDLE_TIP],
  // Ring
  [MIDDLE_MCP, RING_MCP],
  [RING_MCP, RING_PIP],
  [RING_PIP, RING_DIP],
  [RING_DIP, RING_TIP],
  // Pinky
  [RING_MCP, PINKY_MCP],
  [PINKY_MCP, PINKY_PIP],
  [PINKY_PIP, PINKY_DIP],
  [PINKY_DIP, PINKY_TIP],
  // Palm base
  [WRIST, PINKY_MCP],
];

// Color mapping for hand landmark fingers for neon canvas rendering
export const FINGER_COLORS = {
  thumb: '#2dd4bf', // Teal
  index: '#38bdf8', // Sky blue
  middle: '#818cf8', // Indigo
  ring: '#c084fc', // Purple
  pinky: '#f472b6', // Pink
  palm: '#94a3b8', // Slate
};

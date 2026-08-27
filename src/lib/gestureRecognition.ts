import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

const WASM_CDN_PRIMARY = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const WASM_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let landmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;
let lastVideoTimestamp = -1;

export function resetLandmarkerTimestamp(): void {
  lastVideoTimestamp = -1;
}

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks(WASM_CDN_PRIMARY);
      } catch {
        vision = await FilesetResolver.forVisionTasks(WASM_CDN_FALLBACK);
      }

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
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
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

// Normalized angle between three 2D landmarks (in radians)
export function angleBetween(a: Landmark, vertex: Landmark, c: Landmark): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
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
  thumbExtended: boolean;
  thumbAcross: boolean;
  palmSize: number;
};

export function getFingerStates(lm: Landmark[]): FingerState {
  const wrist = lm[WRIST];
  const middleMcp = lm[MIDDLE_MCP];
  const palmSize = Math.max(dist2d(wrist, middleMcp), 0.001);

  // Finger extension based on normalized distance from MCP and wrist
  const checkExtended = (tip: number, pip: number, mcp: number): boolean => {
    const tipToMcp = dist2d(lm[tip], lm[mcp]);
    const pipToMcp = dist2d(lm[pip], lm[mcp]);
    const tipToWrist = dist2d(lm[tip], wrist);
    const pipToWrist = dist2d(lm[pip], wrist);
    return tipToMcp > pipToMcp * 1.35 && tipToWrist > pipToWrist * 1.1;
  };

  const checkCurled = (tip: number, pip: number, mcp: number): boolean => {
    const tipToMcp = dist2d(lm[tip], lm[mcp]);
    const pipToMcp = dist2d(lm[pip], lm[mcp]);
    const tipToWrist = dist2d(lm[tip], wrist);
    const pipToWrist = dist2d(lm[pip], wrist);
    return tipToMcp < pipToMcp * 1.05 || tipToWrist < pipToWrist * 0.95;
  };

  const indexExt = checkExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middleExt = checkExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ringExt = checkExtended(RING_TIP, RING_PIP, RING_MCP);
  const pinkyExt = checkExtended(PINKY_TIP, PINKY_PIP, PINKY_MCP);

  const indexC = checkCurled(INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middleC = checkCurled(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ringC = checkCurled(RING_TIP, RING_PIP, RING_MCP);
  const pinkyC = checkCurled(PINKY_TIP, PINKY_PIP, PINKY_MCP);

  // Thumb analysis
  const thumbTip = lm[THUMB_TIP];
  const thumbMcp = lm[THUMB_MCP];
  const indexMcp = lm[INDEX_MCP];
  const pinkyMcp = lm[PINKY_MCP];

  // Thumb extended out (away from palm)
  const thumbTipToIndexMcp = dist2d(thumbTip, indexMcp) / palmSize;
  const thumbTipToPinkyMcp = dist2d(thumbTip, pinkyMcp) / palmSize;
  const thumbLength = dist2d(thumbTip, thumbMcp) / palmSize;
  const thumbExtended = thumbTipToIndexMcp > 0.45 && thumbLength > 0.45;

  // Thumb folded across palm
  const palmMidX = (indexMcp.x + pinkyMcp.x) / 2;
  const palmMidY = (indexMcp.y + pinkyMcp.y) / 2;
  const thumbToPalmMid = Math.hypot(thumbTip.x - palmMidX, thumbTip.y - palmMidY) / palmSize;
  const thumbAcross = thumbToPalmMid < 0.55 || thumbTipToPinkyMcp < 0.6;

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
    thumbExtended,
    thumbAcross,
    palmSize,
  };
}

export type GestureClassification = {
  letter: string | null;
  label: string;
  category: 'letter' | 'number' | 'sign' | 'phrase';
  confidence: number;
};

// Comprehensive ASL alphabet and gesture classifier
export function classifyGesture(lm: Landmark[]): GestureClassification {
  const f = getFingerStates(lm);
  const { palmSize } = f;
  const thumbTip = lm[THUMB_TIP];
  const indexTip = lm[INDEX_TIP];
  const middleTip = lm[MIDDLE_TIP];
  const ringTip = lm[RING_TIP];
  const indexMcp = lm[INDEX_MCP];

  const extCount = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;
  const allFourCurled = f.indexCurled && f.middleCurled && f.ringCurled && f.pinkyCurled;
  const allFourExtended = f.index && f.middle && f.ring && f.pinky;

  // Distances normalized by palm size
  const thumbToIndexTipDist = dist2d(thumbTip, indexTip) / palmSize;
  const thumbToMiddleTipDist = dist2d(thumbTip, middleTip) / palmSize;
  const thumbToRingTipDist = dist2d(thumbTip, ringTip) / palmSize;
  const indexToMiddleTipDist = dist2d(indexTip, middleTip) / palmSize;
  const middleToRingTipDist = dist2d(middleTip, ringTip) / palmSize;

  // 1. I LOVE YOU (ILY): Thumb + Index + Pinky extended, Middle & Ring curled
  if (f.thumbExtended && f.index && !f.middle && !f.ring && f.pinky) {
    return { letter: 'ILY', label: 'I Love You 🤟', category: 'phrase', confidence: 0.94 };
  }

  // 2. Y ("Hang Loose" / Yellow / Y): Thumb + Pinky extended only
  if (f.thumbExtended && !f.index && !f.middle && !f.ring && f.pinky) {
    return { letter: 'Y', label: 'Letter Y', category: 'letter', confidence: 0.92 };
  }

  // 3. L: Thumb + Index extended in an L shape (~90 deg), Middle, Ring, Pinky curled
  if (f.thumbExtended && f.index && !f.middle && !f.ring && !f.pinky) {
    const lAngle = angleBetween(thumbTip, lm[THUMB_MCP], indexTip);
    if (lAngle > 0.4 && thumbToIndexTipDist > 0.5) {
      return { letter: 'L', label: 'Letter L', category: 'letter', confidence: 0.93 };
    }
  }

  // 4. OPEN HAND / 5 / HELLO: All 5 fingers extended and spread
  if (allFourExtended && f.thumbExtended && indexToMiddleTipDist > 0.18) {
    return { letter: '5', label: 'Open Hand / 5', category: 'number', confidence: 0.91 };
  }

  // 5. B / 4: 4 fingers extended upright together
  if (allFourExtended) {
    if (f.thumbAcross || !f.thumbExtended) {
      if (indexToMiddleTipDist < 0.22 && middleToRingTipDist < 0.22) {
        return { letter: 'B', label: 'Letter B', category: 'letter', confidence: 0.9 };
      }
      return { letter: '4', label: 'Number 4', category: 'number', confidence: 0.88 };
    }
  }

  // 6. W / 3: Index, Middle, Ring extended upright, Pinky curled
  if (f.index && f.middle && f.ring && !f.pinky) {
    if (f.thumbAcross || !f.thumbExtended) {
      return { letter: 'W', label: 'Letter W', category: 'letter', confidence: 0.9 };
    }
    return { letter: '3', label: 'Number 3', category: 'number', confidence: 0.88 };
  }

  // 7. F / OK: Thumb & Index tips touching forming a circle, Middle, Ring, Pinky extended
  if (f.middle && f.ring && f.pinky && !f.index) {
    if (thumbToIndexTipDist < 0.28) {
      return { letter: 'F', label: 'Letter F / OK', category: 'letter', confidence: 0.92 };
    }
  }

  // 8. V / PEACE / 2 / U / R / K: Index + Middle extended, Ring & Pinky curled
  if (f.index && f.middle && !f.ring && !f.pinky) {
    // Check if fingers are crossed for 'R'
    if (indexToMiddleTipDist < 0.12 && Math.abs(indexTip.x - middleTip.x) < 0.03 * palmSize) {
      return { letter: 'R', label: 'Letter R', category: 'letter', confidence: 0.89 };
    }
    // U: Index & Middle held tightly together
    if (indexToMiddleTipDist < 0.18 && !f.thumbExtended) {
      return { letter: 'U', label: 'Letter U', category: 'letter', confidence: 0.89 };
    }
    // K: Thumb placed between index and middle
    if (f.thumbExtended && thumbToMiddleTipDist < 0.35) {
      return { letter: 'K', label: 'Letter K', category: 'letter', confidence: 0.87 };
    }
    // V: Peace sign, fingers spread apart
    if (indexToMiddleTipDist >= 0.18) {
      return { letter: 'V', label: 'Letter V / Peace ✌', category: 'letter', confidence: 0.92 };
    }
    return { letter: 'V', label: 'Letter V', category: 'letter', confidence: 0.86 };
  }

  // 9. D / 1 / Z: Index extended straight UP, others curled, thumb touching middle finger
  if (f.index && !f.middle && !f.ring && !f.pinky && !f.thumbExtended) {
    return { letter: 'D', label: 'Letter D / 1', category: 'letter', confidence: 0.91 };
  }

  // 10. I: Pinky extended straight UP, others curled
  if (!f.index && !f.middle && !f.ring && f.pinky && !f.thumbExtended) {
    return { letter: 'I', label: 'Letter I', category: 'letter', confidence: 0.92 };
  }

  // 11. O: All fingertips meeting thumb tip in a circular loop
  if (!f.index && !f.middle && !f.ring && !f.pinky) {
    if (thumbToIndexTipDist < 0.28 && thumbToMiddleTipDist < 0.28) {
      return { letter: 'O', label: 'Letter O', category: 'letter', confidence: 0.9 };
    }
  }

  // 12. C: Curved hand forming a 'C' arc
  if (!allFourExtended && !allFourCurled && extCount >= 2) {
    const isCurved =
      thumbToIndexTipDist > 0.25 &&
      thumbToIndexTipDist < 0.7 &&
      dist2d(indexTip, lm[INDEX_MCP]) / palmSize > 0.5;
    if (isCurved) {
      return { letter: 'C', label: 'Letter C', category: 'letter', confidence: 0.85 };
    }
  }

  // 13. X: Index hooked (half-curled), others curled
  if (dist2d(indexTip, indexMcp) / palmSize > 0.45 && !f.index && f.middleCurled && f.ringCurled && f.pinkyCurled) {
    return { letter: 'X', label: 'Letter X', category: 'letter', confidence: 0.85 };
  }

  // 14. THUMBS UP / A / S / E / M / N / T (Fist variations)
  if (allFourCurled || extCount === 0) {
    // Thumbs Up: Thumb pointing upward (Y lower than wrist / MCP in upright posture)
    const isThumbVertical = thumbTip.y < lm[THUMB_MCP].y && Math.abs(thumbTip.x - lm[THUMB_MCP].x) < 0.12 * palmSize;
    if (isThumbVertical && f.thumbExtended) {
      return { letter: '👍', label: 'Thumbs Up 👍', category: 'sign', confidence: 0.93 };
    }

    // A: Fist with thumb extended upright alongside the index finger
    if (f.thumbExtended || thumbTip.y < indexMcp.y) {
      return { letter: 'A', label: 'Letter A', category: 'letter', confidence: 0.9 };
    }

    // S: Fist with thumb folded over front of fingers
    if (f.thumbAcross && thumbToMiddleTipDist < 0.35) {
      return { letter: 'S', label: 'Letter S', category: 'letter', confidence: 0.88 };
    }

    // E: Fingertips curled against thumb with thumb tucked beneath
    if (thumbToIndexTipDist < 0.3 && thumbToRingTipDist < 0.35) {
      return { letter: 'E', label: 'Letter E', category: 'letter', confidence: 0.87 };
    }

    // Default fist fallback -> A
    return { letter: 'A', label: 'Letter A', category: 'letter', confidence: 0.82 };
  }

  return { letter: null, label: 'Detecting...', category: 'letter', confidence: 0 };
}

export type RecognitionResult = {
  letter: string | null;
  label: string;
  category: 'letter' | 'number' | 'sign' | 'phrase';
  confidence: number;
  landmarks: Landmark[] | null;
  fingerStates?: FingerState;
  boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
  center?: { x: number; y: number };
};

export async function recognizeFrame(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<RecognitionResult> {
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
      landmarks: null,
    };
  }

  if (!result.landmarks || result.landmarks.length === 0) {
    return {
      letter: null,
      label: 'No hand detected',
      category: 'letter',
      confidence: 0,
      landmarks: null,
    };
  }

  const rawLandmarks = result.landmarks[0] as unknown as Landmark[];
  const fingerStates = getFingerStates(rawLandmarks);
  const classification = classifyGesture(rawLandmarks);

  // Compute bounding box and center
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;

  for (const pt of rawLandmarks) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
    sumX += pt.x;
    sumY += pt.y;
  }

  const center = {
    x: sumX / rawLandmarks.length,
    y: sumY / rawLandmarks.length,
  };

  return {
    letter: classification.letter,
    label: classification.label,
    category: classification.category,
    confidence: classification.confidence,
    landmarks: rawLandmarks,
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


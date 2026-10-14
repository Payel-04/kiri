/**
 * Authentic Indian Sign Language (ISL) Alphabet Dataset
 * Based on 26 reference manual handshape gesture captures (A to Z).
 * Includes detailed mechanics, single vs two-handed classification,
 * Hindi phonetics, landmark coordinates, execution steps, and mnemonics.
 */

import {
  ISL_COORDINATE_MODELS,
  type AlphabetCoordinateModel,
  type Point3D,
  type KeyJointCoordinates,
  type CoordinateConstraintRule,
  findBestAlphabetMatchByCoordinates,
  evaluateCoordinateSimilarity,
  calculateLandmarkRMSE,
  normalizeLandmarksToPalm,
} from './alphabetCoordinates';

export type { Point3D, KeyJointCoordinates, CoordinateConstraintRule, AlphabetCoordinateModel };
export {
  ISL_COORDINATE_MODELS,
  findBestAlphabetMatchByCoordinates,
  evaluateCoordinateSimilarity,
  calculateLandmarkRMSE,
  normalizeLandmarksToPalm,
};

export type ISLAlphabetEntry = {
  id: string;
  letter: string;
  hindiName: string;
  devanagariPhonetic: string;
  type: 'Single-Hand' | 'Two-Handed';
  summary: string;
  referenceImage: string;
  dominantHand: {
    handshape: string;
    palmFacing: string;
    fingerPositions: string;
  };
  nonDominantHand?: {
    handshape: string;
    palmFacing: string;
    fingerPositions: string;
  };
  contactPoint: string;
  executionSteps: string[];
  mnemonic: string;
  difficulty: 'Beginner' | 'Intermediate';
  cameraRecognitionSupported: boolean;
  landmarksHint: string;
  coordinates: AlphabetCoordinateModel;
  keyJoints: {
    dominant: KeyJointCoordinates;
    nonDominant?: KeyJointCoordinates;
  };
  coordinateConstraints: CoordinateConstraintRule;
};

const BASE_ISL_ALPHABET_DATASET: Omit<ISLAlphabetEntry, 'coordinates' | 'keyJoints' | 'coordinateConstraints'>[] = [
  {
    id: 'isl-alpha-a',
    letter: 'A',
    hindiName: 'ए',
    devanagariPhonetic: 'अ / आ',
    type: 'Two-Handed',
    summary: 'Two-handed peak formation: Both index fingers point upward and touch at their tips to form the apex of the letter A.',
    referenceImage: 'A.jpg',
    dominantHand: {
      handshape: 'Fist with index finger extended straight up at a diagonal angle.',
      palmFacing: 'Inward towards the body / partner.',
      fingerPositions: 'Thumb resting on curled middle, ring, and pinky fingers.',
    },
    nonDominantHand: {
      handshape: 'Fist with index finger extended straight up at matching diagonal angle.',
      palmFacing: 'Inward towards the body / partner.',
      fingerPositions: 'Thumb resting on curled middle, ring, and pinky fingers.',
    },
    contactPoint: 'Tips of both index fingers meet at the apex in an inverted V.',
    executionSteps: [
      'Form loose fists with both hands in front of your chest.',
      'Extend both index fingers upward and angle them slightly inward toward each other.',
      'Touch the tips of both index fingers together to create the triangular peak of the letter A.',
    ],
    mnemonic: 'The two index fingertips touch together at the top to build the peaked roof of the letter A.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Dual hands detected; index fingertip [8] of Hand 1 in close proximity to index fingertip [8] of Hand 2; remaining fingers folded (PIP > TIP distance check).',
  },
  {
    id: 'isl-alpha-b',
    letter: 'B',
    hindiName: 'बी',
    devanagariPhonetic: 'ब / बा',
    type: 'Two-Handed',
    summary: 'Two-handed dual circular loops: Both hands form curved loops with thumbs and index fingers, touching side-by-side to create the two rounded lobes of B.',
    referenceImage: 'B.jpg',
    dominantHand: {
      handshape: 'Curved circle with index and thumb tips touching.',
      palmFacing: 'Facing inward toward chest.',
      fingerPositions: 'Index and thumb form an open round loop; middle, ring, and pinky gently curved.',
    },
    nonDominantHand: {
      handshape: 'Mirrored curved circle with index and thumb tips touching.',
      palmFacing: 'Facing inward toward chest.',
      fingerPositions: 'Index and thumb form an open round loop; middle, ring, and pinky gently curved.',
    },
    contactPoint: 'Fingertips and thumbs of both hands meet in the middle to form two symmetrical circular loops (like spectacles).',
    executionSteps: [
      'Bring both hands up in front of your chest with palms facing your chest.',
      'Curve the index finger and thumb on each hand to touch their tips.',
      'Bring both circular hand shapes together so the fingertips and knuckles touch in the center.',
    ],
    mnemonic: 'Two touching circular loops mirror the double rounded curves of the capital letter B.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Both hands close together; thumb tip [4] touching index tip [8] on both hands; wrists roughly level horizontally.',
  },
  {
    id: 'isl-alpha-c',
    letter: 'C',
    hindiName: 'सी',
    devanagariPhonetic: 'स / क',
    type: 'Single-Hand',
    summary: 'Single-hand curved crescent: The dominant hand curves all four fingers and thumb into an open half-circle C shape.',
    referenceImage: 'C.jpg',
    dominantHand: {
      handshape: 'Curved open C arc.',
      palmFacing: 'Facing sideways toward the non-dominant side.',
      fingerPositions: 'Index, middle, ring, and pinky fingers curve in parallel together, separated from the curved thumb.',
    },
    contactPoint: 'None (Single-hand open spatial gesture).',
    executionSteps: [
      'Raise your dominant hand to chest height with palm facing sideways.',
      'Curve all four fingers downward while extending the thumb forward and slightly upward.',
      'Maintain an open gap between thumb and fingers to form the open curve of C.',
    ],
    mnemonic: 'Your hand naturally traces the open crescent curve of the letter C.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; distance between thumb tip [4] and index tip [8] is moderate (0.15–0.35); fingers curled into semi-circle arc.',
  },
  {
    id: 'isl-alpha-d',
    letter: 'D',
    hindiName: 'डी',
    devanagariPhonetic: 'ड / द',
    type: 'Two-Handed',
    summary: 'Two-handed D shape: Non-dominant hand forms the curved loop with thumb and index, while dominant index finger stands upright as the spine.',
    referenceImage: 'D.jpg',
    dominantHand: {
      handshape: 'Fist with straight vertical upright index finger.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Index finger pointing straight vertically; others curled into a fist.',
    },
    nonDominantHand: {
      handshape: 'Curved open C arch.',
      palmFacing: 'Facing the upright dominant finger.',
      fingerPositions: 'Thumb and index fingers curved outward.',
    },
    contactPoint: 'Top tip of non-dominant index touches top of dominant index; thumb of non-dominant hand touches base/knuckle of dominant index.',
    executionSteps: [
      'Hold dominant hand in a fist with index finger pointing straight up (forming the vertical back of D).',
      'With non-dominant hand, curve thumb and index finger to form an arch.',
      'Touch the tip of the non-dominant index to the top of the dominant index, and the non-dominant thumb to the base.',
    ],
    mnemonic: 'The straight upright finger provides the spine, while the other hand completes the rounded loop of D.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'One upright index finger (Hand 1 TIP.y < MCP.y); Hand 2 forms a C-curve contacting top and base of Hand 1 index.',
  },
  {
    id: 'isl-alpha-e',
    letter: 'E',
    hindiName: 'ई / इ',
    devanagariPhonetic: 'इ / ई / ए',
    type: 'Two-Handed',
    summary: 'Two-handed index touch: Non-dominant index finger points upward, and dominant index finger angles upward to touch at the tip.',
    referenceImage: 'E.jpg',
    dominantHand: {
      handshape: 'Index finger extended pointing up and diagonally inward.',
      palmFacing: 'Facing chest.',
      fingerPositions: 'Middle, ring, pinky tucked into palm.',
    },
    nonDominantHand: {
      handshape: 'Index finger extended pointing vertically upward.',
      palmFacing: 'Facing chest.',
      fingerPositions: 'Middle, ring, pinky tucked into palm.',
    },
    contactPoint: 'Dominant index fingertip touches the non-dominant index fingertip at a high apex.',
    executionSteps: [
      'Point the non-dominant index finger straight up in front of your chest.',
      'Extend the dominant index finger diagonally up toward the non-dominant index tip.',
      'Touch the two fingertips together at an acute angle.',
    ],
    mnemonic: 'Fingertip to fingertip touch resembling the top accent stroke of letter E.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two hands detected; both index fingers extended; fingertips [8] in close proximity (distance < 0.08).',
  },
  {
    id: 'isl-alpha-f',
    letter: 'F',
    hindiName: 'एफ',
    devanagariPhonetic: 'फ / फ़',
    type: 'Two-Handed',
    summary: 'Two-handed dual-finger cross: Non-dominant index and middle fingers extended; dominant index and middle fingers cross over them at an angle.',
    referenceImage: 'F.jpg',
    dominantHand: {
      handshape: 'Index and middle fingers extended together.',
      palmFacing: 'Facing down/inward.',
      fingerPositions: 'Ring and pinky tucked with thumb holding them.',
    },
    nonDominantHand: {
      handshape: 'Index and middle fingers extended together horizontally.',
      palmFacing: 'Facing body.',
      fingerPositions: 'Ring and pinky tucked with thumb holding them.',
    },
    contactPoint: 'Dominant index & middle fingers lay across the non-dominant index & middle fingers.',
    executionSteps: [
      'Extend index and middle fingers of your non-dominant hand horizontally.',
      'Extend index and middle fingers of your dominant hand.',
      'Cross the dominant fingers over the non-dominant fingers at a 45-to-90 degree angle.',
    ],
    mnemonic: 'Two pairs of extended fingers crossing over each other to form the crossbars of F.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Both hands have index [8] and middle [12] extended; fingertips of dominant hand overlap middle phalanges of non-dominant hand.',
  },
  {
    id: 'isl-alpha-g',
    letter: 'G',
    hindiName: 'जी',
    devanagariPhonetic: 'ग / ज्ञ',
    type: 'Two-Handed',
    summary: 'Two-handed stacked fists: Both hands form closed fists with the dominant fist resting directly on top of the non-dominant fist.',
    referenceImage: 'G.jpg',
    dominantHand: {
      handshape: 'Solid closed fist.',
      palmFacing: 'Inward / downward.',
      fingerPositions: 'All four fingers curled into palm with thumb over fingers.',
    },
    nonDominantHand: {
      handshape: 'Solid closed fist.',
      palmFacing: 'Inward / upward.',
      fingerPositions: 'All four fingers curled into palm with thumb over fingers.',
    },
    contactPoint: 'Bottom base of dominant fist rests squarely on the top knuckles of non-dominant fist.',
    executionSteps: [
      'Make solid fists with both hands.',
      'Place the non-dominant fist in front of your chest at lower rib level.',
      'Stack the dominant fist directly on top of the non-dominant fist.',
    ],
    mnemonic: 'Ground and tower: One fist stacked solidly on top of the other.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two closed fists detected (all fingertips close to MCPs); dominant wrist.y < non-dominant wrist.y; vertical alignment.',
  },
  {
    id: 'isl-alpha-h',
    letter: 'H',
    hindiName: 'एच',
    devanagariPhonetic: 'ह / हे',
    type: 'Two-Handed',
    summary: 'Two-handed flat palm sweep: Non-dominant hand holds an open flat palm upright/diagonal, while dominant open hand sweeps flatly across it.',
    referenceImage: 'H.jpg',
    dominantHand: {
      handshape: 'Open flat hand with fingers together.',
      palmFacing: 'Facing the non-dominant palm.',
      fingerPositions: 'All fingers extended straight and touching.',
    },
    nonDominantHand: {
      handshape: 'Open flat hand with fingers spread or together.',
      palmFacing: 'Facing toward dominant side / chest.',
      fingerPositions: 'All fingers extended straight.',
    },
    contactPoint: 'Dominant palm brushes horizontally across the non-dominant palm surface.',
    executionSteps: [
      'Hold non-dominant hand upright with palm open facing toward your center.',
      'Place dominant hand flat against or across the non-dominant palm.',
      'Sweep or tap the dominant palm across the open hand.',
    ],
    mnemonic: 'Horizontal palm bridging across the vertical palm like the crossbar of H.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Both hands fully open (all 5 fingers extended); dominant palm centroid overlapping non-dominant palm centroid.',
  },
  {
    id: 'isl-alpha-i',
    letter: 'I',
    hindiName: 'आई',
    devanagariPhonetic: 'इ / आई',
    type: 'Single-Hand',
    summary: 'Single-hand upright index finger: Dominant hand forms a closed fist with only the index finger extended straight up.',
    referenceImage: 'I.jpg',
    dominantHand: {
      handshape: 'Single upright index finger.',
      palmFacing: 'Facing forward / slightly sideways.',
      fingerPositions: 'Index extended straight; thumb locking down middle, ring, and pinky fingers.',
    },
    contactPoint: 'None (Single-hand upright gesture).',
    executionSteps: [
      'Make a fist with your dominant hand.',
      'Extend only your index finger straight up toward the sky.',
      'Hold steadily at chest or shoulder height.',
    ],
    mnemonic: 'A single upright line stands tall, precisely mirroring the shape of the capital letter I.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; index finger extended (TIP.y < PIP.y); middle, ring, pinky curled; thumb folded over fingers.',
  },
  {
    id: 'isl-alpha-j',
    letter: 'J',
    hindiName: 'जे',
    devanagariPhonetic: 'ज / जी',
    type: 'Two-Handed',
    summary: 'Two-handed index cross with hook: Dominant index finger crosses the non-dominant index finger and hooks downward in a J curve.',
    referenceImage: 'J.jpg',
    dominantHand: {
      handshape: 'Index finger extended and slightly curved/hooked downward.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Middle, ring, pinky tucked.',
    },
    nonDominantHand: {
      handshape: 'Index finger extended straight.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Middle, ring, pinky tucked.',
    },
    contactPoint: 'Dominant index finger crosses over the non-dominant index finger with tip curving down.',
    executionSteps: [
      'Extend non-dominant index finger diagonally up.',
      'Cross dominant index finger over it.',
      'Curve the dominant index fingertip down to trace the hook tail of the letter J.',
    ],
    mnemonic: 'Crossing index fingers where the top finger curls into the hook of J.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two index fingers extended crossing at MCP/PIP joints; dominant index tip hooked downward.',
  },
  {
    id: 'isl-alpha-k',
    letter: 'K',
    hindiName: 'के',
    devanagariPhonetic: 'क / के',
    type: 'Two-Handed',
    summary: 'Two-handed K branch: Non-dominant index stands upright while dominant bent index finger touches the mid-joint, creating the diagonal arms of K.',
    referenceImage: 'K.jpg',
    dominantHand: {
      handshape: 'Bent index finger with thumb extended.',
      palmFacing: 'Facing downward / sideways.',
      fingerPositions: 'Index bent at second knuckle; thumb supporting.',
    },
    nonDominantHand: {
      handshape: 'Straight upright index finger.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Fist with index pointing vertically.',
    },
    contactPoint: 'Knuckle/crook of dominant index finger touches the middle joint of the non-dominant upright index finger.',
    executionSteps: [
      'Hold non-dominant index finger straight up as a vertical post.',
      'Bend dominant index finger into a hook/crook.',
      'Touch the bent crook against the middle of the vertical index finger to form the angled arms of K.',
    ],
    mnemonic: 'The bent finger attaches to the upright finger to form the diagonal arms of K.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 index upright; Hand 2 index bent at PIP joint touching Hand 1 index landmark [6] or [7].',
  },
  {
    id: 'isl-alpha-l',
    letter: 'L',
    hindiName: 'एल',
    devanagariPhonetic: 'ल / ले',
    type: 'Single-Hand',
    summary: 'Single-hand 90-degree right angle: Dominant hand extends index finger straight up and thumb horizontally to form a perfect L.',
    referenceImage: 'L.jpg',
    dominantHand: {
      handshape: 'Perpendicular L shape.',
      palmFacing: 'Facing forward.',
      fingerPositions: 'Index points straight up; thumb extended at 90 degrees outward; middle, ring, pinky tucked into palm.',
    },
    contactPoint: 'None (Single-hand iconic shape).',
    executionSteps: [
      'Raise dominant hand with palm facing the viewer.',
      'Extend index finger straight upward.',
      'Extend thumb straight out to the side at a 90-degree angle.',
      'Keep middle, ring, and pinky fingers tucked into the palm.',
    ],
    mnemonic: 'The iconic L handshape forms a distinct right angle between thumb and index finger.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; index finger extended vertically; thumb extended horizontally (angle between vector(2->4) and vector(5->8) ≈ 90°); other fingers curled.',
  },
  {
    id: 'isl-alpha-m',
    letter: 'M',
    hindiName: 'एम',
    devanagariPhonetic: 'म / मा',
    type: 'Two-Handed',
    summary: 'Two-handed three-finger palm rest: Non-dominant hand holds open flat palm, while dominant hand rests 3 fingers (index, middle, ring) on it.',
    referenceImage: 'M.jpg',
    dominantHand: {
      handshape: 'Three fingers (index, middle, ring) extended straight down together.',
      palmFacing: 'Facing non-dominant palm.',
      fingerPositions: 'Pinky tucked into palm with thumb resting on it.',
    },
    nonDominantHand: {
      handshape: 'Open flat palm facing upward/diagonal.',
      palmFacing: 'Facing upward.',
      fingerPositions: 'All fingers open flat.',
    },
    contactPoint: 'Fingertips of dominant index, middle, and ring fingers rest on the flat non-dominant palm.',
    executionSteps: [
      'Hold non-dominant hand flat with palm facing upward.',
      'Extend index, middle, and ring fingers of dominant hand together.',
      'Place the tips of all three fingers down onto the open palm.',
    ],
    mnemonic: '3 fingers placed on the palm represent the 3 downward strokes of the letter M.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Non-dominant palm flat; dominant hand has 3 fingers extended (index, middle, ring) with tips touching non-dominant palm plane.',
  },
  {
    id: 'isl-alpha-n',
    letter: 'N',
    hindiName: 'एन',
    devanagariPhonetic: 'न / ना',
    type: 'Two-Handed',
    summary: 'Two-handed two-finger palm rest: Non-dominant hand holds open flat palm, while dominant hand rests 2 fingers (index and middle) on it.',
    referenceImage: 'N.jpg',
    dominantHand: {
      handshape: 'Two fingers (index and middle) extended straight down together.',
      palmFacing: 'Facing non-dominant palm.',
      fingerPositions: 'Ring and pinky tucked into palm with thumb resting on them.',
    },
    nonDominantHand: {
      handshape: 'Open flat palm facing upward/diagonal.',
      palmFacing: 'Facing upward.',
      fingerPositions: 'All fingers open flat.',
    },
    contactPoint: 'Fingertips of dominant index and middle fingers rest on the flat non-dominant palm.',
    executionSteps: [
      'Hold non-dominant hand flat with palm facing upward.',
      'Extend index and middle fingers of dominant hand together.',
      'Place the tips of both fingers down onto the open palm.',
    ],
    mnemonic: '2 fingers placed on the palm represent the 2 downward strokes of the letter N.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Non-dominant palm flat; dominant hand has 2 fingers extended (index, middle) with tips touching non-dominant palm plane.',
  },
  {
    id: 'isl-alpha-o',
    letter: 'O',
    hindiName: 'ओ',
    devanagariPhonetic: 'ओ / औ',
    type: 'Single-Hand',
    summary: 'Single-hand complete circle: Dominant hand curls all four fingertips to touch the thumb tip, forming a closed O circle.',
    referenceImage: 'O.jpg',
    dominantHand: {
      handshape: 'Closed circular O ring.',
      palmFacing: 'Facing sideways / forward.',
      fingerPositions: 'Index, middle, ring, and pinky fingertips all touch the tip of the thumb in an oval/circle.',
    },
    contactPoint: 'All four fingertips contact the thumb tip.',
    executionSteps: [
      'Bring dominant hand up in front of chest.',
      'Curve all four fingers and thumb toward each other.',
      'Touch the fingertips directly to the thumb tip to form a continuous circular O hole.',
    ],
    mnemonic: 'A full continuous circle formed by all fingers meeting the thumb, mirroring letter O.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; distance between thumb tip [4] and all finger tips ([8], [12], [16], [20]) < 0.07; fingers curved.',
  },
  {
    id: 'isl-alpha-p',
    letter: 'P',
    hindiName: 'पी',
    devanagariPhonetic: 'प / पा',
    type: 'Two-Handed',
    summary: 'Two-handed loop over post: Non-dominant hand index finger stands upright, while dominant hand forms a curved loop at the top to complete P.',
    referenceImage: 'P.jpg',
    dominantHand: {
      handshape: 'Curved thumb and index finger forming a circle/loop.',
      palmFacing: 'Facing downward.',
      fingerPositions: 'Thumb and index form a round loop; other fingers curved.',
    },
    nonDominantHand: {
      handshape: 'Straight upright vertical index finger.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Fist with index finger pointing up.',
    },
    contactPoint: 'Dominant thumb and index loop sits on the top tip of non-dominant vertical index finger.',
    executionSteps: [
      'Point non-dominant index finger straight up as a vertical stem.',
      'Form an open loop with dominant index finger and thumb.',
      'Position the loop at the very top of the upright index finger to form the head of P.',
    ],
    mnemonic: 'The circular loop perched on top of the straight vertical line creates the letter P.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 index upright; Hand 2 forms a circular loop contacting top tip of Hand 1 index.',
  },
  {
    id: 'isl-alpha-q',
    letter: 'Q',
    hindiName: 'क्यू',
    devanagariPhonetic: 'क्यु / क',
    type: 'Two-Handed',
    summary: 'Two-handed circle with hook: Non-dominant hand forms an O circle, and dominant index finger inserts into or hooks through the loop.',
    referenceImage: 'Q.jpg',
    dominantHand: {
      handshape: 'Hooked / curved index finger pointing downward through loop.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Index finger hooked; others curled into palm.',
    },
    nonDominantHand: {
      handshape: 'Curved circle formed by thumb and index finger.',
      palmFacing: 'Facing forward / sideways.',
      fingerPositions: 'Thumb and index form a circular ring.',
    },
    contactPoint: 'Dominant index finger hooks through the center of the non-dominant circular loop.',
    executionSteps: [
      'Form a circular O ring with your non-dominant hand.',
      'Extend dominant index finger and curve it downward.',
      'Insert the dominant index finger through the circle to form the tail stroke of Q.',
    ],
    mnemonic: 'The finger hooking through the circular loop forms the distinctive tail of Q.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 forms a circular loop; Hand 2 index finger tip positioned inside Hand 1 loop boundary.',
  },
  {
    id: 'isl-alpha-r',
    letter: 'R',
    hindiName: 'आर',
    devanagariPhonetic: 'र / री',
    type: 'Two-Handed',
    summary: 'Two-handed curled finger on palm: Non-dominant hand holds open flat palm, while dominant index finger is hooked and rests on the palm surface.',
    referenceImage: 'R.jpg',
    dominantHand: {
      handshape: 'Curled hook index finger.',
      palmFacing: 'Facing down toward palm.',
      fingerPositions: 'Index finger bent sharply into an arch; others curled.',
    },
    nonDominantHand: {
      handshape: 'Open flat palm facing upward/diagonal.',
      palmFacing: 'Facing upward.',
      fingerPositions: 'All fingers open flat.',
    },
    contactPoint: 'Tip and arch of curled dominant index finger rests on the open non-dominant palm.',
    executionSteps: [
      'Hold non-dominant hand flat with palm facing upward.',
      'Curl the dominant index finger into a rounded hook.',
      'Rest the curled index finger onto the middle of the open palm.',
    ],
    mnemonic: 'The rounded arch of R resting upon the flat base palm.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Non-dominant palm open horizontal; dominant index finger curled (TIP to MCP distance < 0.12) resting on palm plane.',
  },
  {
    id: 'isl-alpha-s',
    letter: 'S',
    hindiName: 'एस',
    devanagariPhonetic: 'स / सी',
    type: 'Two-Handed',
    summary: 'Two-handed interlocking pinkies: Both hands form closed fists with pinky fingers extended and hooked together.',
    referenceImage: 'S.jpg',
    dominantHand: {
      handshape: 'Closed fist with pinky finger extended and hooked.',
      palmFacing: 'Facing chest / inward.',
      fingerPositions: 'Thumb holds index, middle, ring curled; pinky extended and bent into a hook.',
    },
    nonDominantHand: {
      handshape: 'Closed fist with pinky finger extended and hooked.',
      palmFacing: 'Facing chest / inward.',
      fingerPositions: 'Thumb holds index, middle, ring curled; pinky extended and bent into a hook.',
    },
    contactPoint: 'Both pinky fingers interlock together in a hook grasp.',
    executionSteps: [
      'Make fists with both hands.',
      'Extend only the pinky (little) finger on both hands.',
      'Hook the two pinky fingers together in front of your chest like links in a chain.',
    ],
    mnemonic: 'The two hooked pinkies link together to trace the serpentine curves of S.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two hands; pinky fingers [20] extended while other fingers curled; pinky tips [20] interlocked (distance < 0.05).',
  },
  {
    id: 'isl-alpha-t',
    letter: 'T',
    hindiName: 'टी',
    devanagariPhonetic: 'ट / त',
    type: 'Two-Handed',
    summary: 'Two-handed crossbar T: Non-dominant index finger stands straight upright, while dominant index finger rests horizontally across its top tip.',
    referenceImage: 'T.jpg',
    dominantHand: {
      handshape: 'Horizontal straight index finger.',
      palmFacing: 'Facing down / chest.',
      fingerPositions: 'Index extended horizontally; others in a fist.',
    },
    nonDominantHand: {
      handshape: 'Vertical straight index finger.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Index extended straight vertically; others in a fist.',
    },
    contactPoint: 'Underside of dominant index finger rests across the top tip of non-dominant index finger at a 90-degree angle.',
    executionSteps: [
      'Point non-dominant index finger straight up to form the vertical post.',
      'Extend dominant index finger horizontally.',
      'Place the middle of the dominant index finger directly across the top tip of the vertical finger.',
    ],
    mnemonic: 'The horizontal finger sits across the vertical finger to create a perfect capital T.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 index vertical (vector y-axis); Hand 2 index horizontal (vector x-axis); Hand 2 index mid-point touches Hand 1 index tip [8].',
  },
  {
    id: 'isl-alpha-u',
    letter: 'U',
    hindiName: 'यू',
    devanagariPhonetic: 'उ / ऊ / यु',
    type: 'Single-Hand',
    summary: 'Single-hand curved U channel: Dominant hand extends index finger and thumb upward in a wide curved U channel.',
    referenceImage: 'U.jpg',
    dominantHand: {
      handshape: 'Extended thumb and index finger forming a U shape.',
      palmFacing: 'Facing sideways / forward.',
      fingerPositions: 'Thumb and index extended upward in a wide arch; middle, ring, pinky tucked into palm.',
    },
    contactPoint: 'None (Single-hand iconic gesture).',
    executionSteps: [
      'Raise your dominant hand with palm facing slightly sideways.',
      'Extend thumb and index finger upward with a curved separation.',
      'Tuck the other three fingers into your palm.',
    ],
    mnemonic: 'The open gap between thumb and index finger forms an upward-facing U trough.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; index finger [8] and thumb [4] extended upwards; distance between tips moderate; other fingers tucked.',
  },
  {
    id: 'isl-alpha-v',
    letter: 'V',
    hindiName: 'वी',
    devanagariPhonetic: 'व / वी',
    type: 'Single-Hand',
    summary: 'Single-hand open peace V: Dominant hand extends index and middle fingers upward in a separated V victory shape.',
    referenceImage: 'V.jpg',
    dominantHand: {
      handshape: 'Open V peace sign.',
      palmFacing: 'Facing forward.',
      fingerPositions: 'Index and middle fingers extended straight and separated at 30–45 degrees; thumb holds ring and pinky into palm.',
    },
    contactPoint: 'None (Single-hand iconic peace/victory shape).',
    executionSteps: [
      'Raise dominant hand in front of your chest with palm facing forward.',
      'Extend index and middle fingers straight up.',
      'Spread the two fingers apart to form the letter V.',
      'Hold ring and pinky fingers down with your thumb.',
    ],
    mnemonic: 'The classic peace / victory two-finger spread directly represents letter V.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Single hand; index [8] and middle [12] extended (TIP.y < PIP.y); distance between [8] and [12] > 0.08; ring and pinky curled.',
  },
  {
    id: 'isl-alpha-w',
    letter: 'W',
    hindiName: 'डब्ल्यू',
    devanagariPhonetic: 'डब्लू / व',
    type: 'Two-Handed',
    summary: 'Two-handed multi-peak crown: Both hands cross/interlace fingers upward in front of chest to form the three peaks of W.',
    referenceImage: 'W.jpg',
    dominantHand: {
      handshape: 'Open spread fingers pointing diagonally up.',
      palmFacing: 'Facing chest / inward.',
      fingerPositions: 'Index, middle, ring fingers spread and interlaced.',
    },
    nonDominantHand: {
      handshape: 'Open spread fingers pointing diagonally up.',
      palmFacing: 'Facing chest / inward.',
      fingerPositions: 'Index, middle, ring fingers spread and interlaced.',
    },
    contactPoint: 'Fingers of both hands interlace and cross at the knuckles with fingertips pointing upward.',
    executionSteps: [
      'Bring both hands together with palms facing your chest.',
      'Spread your fingers open on both hands.',
      'Interlace the fingers so they point upward together, creating the multiple peaks of W.',
    ],
    mnemonic: 'Interlacing upward fingers creates the three peaks and valleys of letter W.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two hands detected in close proximity; fingers of both hands extended upward (all TIP.y < PIP.y) and interlacing.',
  },
  {
    id: 'isl-alpha-x',
    letter: 'X',
    hindiName: 'एक्स',
    devanagariPhonetic: 'क्स / एक्स',
    type: 'Two-Handed',
    summary: 'Two-handed crossed index fingers: Both hands extend index fingers and cross them symmetrically over each other to form an X.',
    referenceImage: 'X.jpg',
    dominantHand: {
      handshape: 'Fist with index finger extended straight diagonally.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Index extended; others tucked.',
    },
    nonDominantHand: {
      handshape: 'Fist with index finger extended straight diagonally.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Index extended; others tucked.',
    },
    contactPoint: 'Both index fingers cross over each other at their midpoint forming an X intersection.',
    executionSteps: [
      'Make fists with both hands in front of your chest.',
      'Extend both index fingers.',
      'Cross the dominant index finger diagonally over the non-dominant index finger to form an X.',
    ],
    mnemonic: 'Crossing two index fingers directly replicates the criss-cross shape of letter X.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Two hands; both index fingers extended diagonally; index finger segments cross each other (intersection detected).',
  },
  {
    id: 'isl-alpha-y',
    letter: 'Y',
    hindiName: 'वाई',
    devanagariPhonetic: 'य / या',
    type: 'Two-Handed',
    summary: 'Two-handed Y branch: Non-dominant hand forms an L shape (thumb & index), and dominant index finger points into the webbing between them.',
    referenceImage: 'Y.jpg',
    dominantHand: {
      handshape: 'Single straight index finger.',
      palmFacing: 'Facing inward / upward.',
      fingerPositions: 'Index extended pointing diagonally; others tucked.',
    },
    nonDominantHand: {
      handshape: 'Open L shape with thumb and index finger.',
      palmFacing: 'Facing inward.',
      fingerPositions: 'Thumb and index extended at 90 degrees.',
    },
    contactPoint: 'Tip of dominant index finger touches the webbing between non-dominant thumb and index finger.',
    executionSteps: [
      'Form an L shape with non-dominant thumb and index finger.',
      'Extend dominant index finger.',
      'Place dominant index finger directly into the corner webbing between thumb and index, forming the third arm of Y.',
    ],
    mnemonic: 'Adding a third branch into the L angle turns it into a three-branch Y.',
    difficulty: 'Intermediate',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 in L-shape; Hand 2 index tip [8] touches the vertex [2] / [5] of Hand 1.',
  },
  {
    id: 'isl-alpha-z',
    letter: 'Z',
    hindiName: 'ज़ेड',
    devanagariPhonetic: 'ज़ / ज़ेड',
    type: 'Two-Handed',
    summary: 'Two-handed perpendicular meeting: Non-dominant hand stands flat vertically, and dominant flat hand meets it horizontally at a 90-degree angle.',
    referenceImage: 'Z.jpg',
    dominantHand: {
      handshape: 'Open flat hand held horizontally.',
      palmFacing: 'Facing downward.',
      fingerPositions: 'All fingers extended straight and together.',
    },
    nonDominantHand: {
      handshape: 'Open flat hand held vertically.',
      palmFacing: 'Facing sideways / dominant hand.',
      fingerPositions: 'All fingers extended straight and together.',
    },
    contactPoint: 'Fingertips of horizontal dominant hand touch the vertical non-dominant palm at right angle.',
    executionSteps: [
      'Hold non-dominant hand with flat palm standing vertically.',
      'Hold dominant hand flat horizontally.',
      'Touch the fingertips of the horizontal hand against the vertical palm at a sharp 90-degree angle.',
    ],
    mnemonic: 'Perpendicular flat hands meeting at right angles to represent the sharp turns of Z.',
    difficulty: 'Beginner',
    cameraRecognitionSupported: true,
    landmarksHint: 'Hand 1 flat vertical (normal along x-axis); Hand 2 flat horizontal (normal along y-axis); fingertips of Hand 2 touch Hand 1 palm.',
  },
];

/**
 * The complete ISL Alphabet Dataset enriched with 21-point MediaPipe hand coordinates,
 * key joint positions, vector orientations, and coordinate recognition constraints.
 */
export const ISL_ALPHABET_DATASET: ISLAlphabetEntry[] = BASE_ISL_ALPHABET_DATASET.map((base) => {
  const coordModel = ISL_COORDINATE_MODELS[base.letter] || ISL_COORDINATE_MODELS['A'];
  return {
    ...base,
    coordinates: coordModel,
    keyJoints: coordModel.keyJoints,
    coordinateConstraints: coordModel.constraints,
  };
});

/**
 * Retrieves the full coordinate model and 21 landmark positions for a given ISL letter.
 */
export function getAlphabetCoordinateModel(letter: string): AlphabetCoordinateModel | undefined {
  const upper = letter.toUpperCase();
  return ISL_COORDINATE_MODELS[upper];
}

/**
 * Retrieves the ISL Alphabet Entry by letter with its coordinate matrix.
 */
export function getAlphabetEntryByLetter(letter: string): ISLAlphabetEntry | undefined {
  const upper = letter.toUpperCase();
  return ISL_ALPHABET_DATASET.find((e) => e.letter === upper);
}


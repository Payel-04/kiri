import { useEffect, useState, useRef, useCallback } from 'react';
import {
  BookOpen,
  HelpCircle,
  Camera,
  CheckCircle2,
  Award,
  Flame,
  RotateCcw,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Layers,
  Activity,
  Check,
  X,
  ArrowRight,
  CircleStop,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/context/AuthContext';
import { speak } from '@/lib/speech';
import {
  getHandLandmarker,
  recognizeFrame,
  HAND_CONNECTIONS,
} from '@/lib/gestureRecognition';
import {
  fetchUserProgress,
  saveLessonProgress,
  computeLearningStats,
  recordQuizAttempt,
  type LessonProgressItem,
  type UserLearningStats,
} from '@/lib/learningService';

// Audio feedback synthesizers
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // audio fallback
  }
}

function playErrorTone() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  } catch {
    // audio fallback
  }
}

// 12 Authentic Indian Sign Language (ISL) Lessons
interface LessonData {
  id: string;
  sign: string;
  targetKey: string; // for camera matcher
  title: string;
  hindiName: string;
  devanagariPhonetic: string;
  category: 'Greeting' | 'Essential' | 'Culture' | 'Alphabet' | 'Number';
  type: 'Single-Hand' | 'Two-Handed';
  description: string;
  dominantHand: string;
  nonDominantHand?: string;
  contactPoint: string;
  mnemonic: string;
  points: number;
}

const ISL_LESSONS: LessonData[] = [
  {
    id: 'namaste',
    sign: '🙏',
    targetKey: '🙏',
    title: 'Namaste',
    hindiName: 'नमस्ते',
    devanagariPhonetic: 'न-म-स्ते',
    category: 'Greeting',
    type: 'Two-Handed',
    description: 'Place both flat palms together in front of your chest (Anjali Mudra) with fingertips pointing upward, accompanied by a slight respectful nod.',
    dominantHand: 'Flat open palm held vertically, fingers aligned upward.',
    nonDominantHand: 'Mirroring flat open palm pressed flush against dominant palm.',
    contactPoint: 'Palms and fingertips press gently together in front of the chest.',
    mnemonic: 'Two open palms uniting at the heart represents soul honoring soul.',
    points: 30,
  },
  {
    id: 'help',
    sign: '🆘',
    targetKey: '🆘',
    title: 'Help',
    hindiName: 'मदद',
    devanagariPhonetic: 'म-द-द',
    category: 'Essential',
    type: 'Two-Handed',
    description: 'Rest your dominant hand in a closed thumbs-up fist directly onto the flat open palm of your non-dominant hand and lift them slightly together.',
    dominantHand: 'Closed fist with thumb extended straight up (thumbs-up handshape).',
    nonDominantHand: 'Flat palm resting horizontally upward beneath dominant fist.',
    contactPoint: 'Base of dominant fist rests squarely on non-dominant palm.',
    mnemonic: 'One hand supports and lifts the struggling hand upward.',
    points: 30,
  },
  {
    id: 'water',
    sign: '💧',
    targetKey: 'W',
    title: 'Water',
    hindiName: 'पानी',
    devanagariPhonetic: 'पा-नी',
    category: 'Essential',
    type: 'Single-Hand',
    description: 'Form a "W" handshape with 3 middle fingers extended upright and tap your index finger gently against your chin twice.',
    dominantHand: 'Index, middle, and ring fingers extended upward in a W shape; thumb holds pinky.',
    contactPoint: 'Side of index finger taps twice lightly on the chin.',
    mnemonic: 'The three fingers resemble ripples of clear flowing water.',
    points: 25,
  },
  {
    id: 'chai',
    sign: '☕',
    targetKey: 'C',
    title: 'Chai / Tea',
    hindiName: 'चाय',
    devanagariPhonetic: 'चा-य',
    category: 'Culture',
    type: 'Single-Hand',
    description: 'Form a small "C" cup shape with your thumb and curved index finger, tilting it gently near your lips as if sipping steaming chai.',
    dominantHand: 'Thumb and index form a curved cup arc; other fingers relaxed in loose curl.',
    contactPoint: 'Hand held slightly in front of the lower lip / mouth.',
    mnemonic: 'Holding a warm clay kulhad cup of spiced Indian tea.',
    points: 25,
  },
  {
    id: 'love',
    sign: '🤟',
    targetKey: '🤟',
    title: 'I Love You',
    hindiName: 'प्यार',
    devanagariPhonetic: 'प्या-र',
    category: 'Essential',
    type: 'Single-Hand',
    description: 'Extend your thumb, index finger, and pinky simultaneously while curling middle and ring fingers flat into your palm.',
    dominantHand: 'Thumb (I), Index & Pinky (L and Y) extended at once.',
    contactPoint: 'Hand raised palm facing forward with confident posture.',
    mnemonic: 'Combines the manual alphabet letters I, L, and Y into one universal sign.',
    points: 25,
  },
  {
    id: 'good',
    sign: '👍',
    targetKey: '👍',
    title: 'Good / Superb',
    hindiName: 'बढ़िया',
    devanagariPhonetic: 'ब-ढ़ि-या',
    category: 'Greeting',
    type: 'Single-Hand',
    description: 'Form a firm closed fist with thumb pointed straight upward to express agreement, excellence, or appreciation.',
    dominantHand: 'Tight fist with thumb pointing firmly vertical toward the sky.',
    contactPoint: 'Held at chest or shoulder height, presented forward.',
    mnemonic: 'Upward direction signifies rising spirits and positive quality.',
    points: 20,
  },
  {
    id: 'letter-a',
    sign: '🅰️',
    targetKey: 'A',
    title: 'Letter A',
    hindiName: 'वर्ण A (ए/अ)',
    devanagariPhonetic: 'अ / आ',
    category: 'Alphabet',
    type: 'Two-Handed',
    description: 'Both index fingers point upward at an angle and touch at their tips to form the peaked triangular roof of the letter A.',
    dominantHand: 'Fist with index finger extended straight up at a diagonal.',
    nonDominantHand: 'Matching fist with index extended, meeting dominant tip.',
    contactPoint: 'Apex tips of both index fingers meet in an inverted V.',
    mnemonic: 'The two fingertips join together to build the roof of uppercase A.',
    points: 25,
  },
  {
    id: 'letter-b',
    sign: '🅱️',
    targetKey: 'B',
    title: 'Letter B',
    hindiName: 'वर्ण B (ब)',
    devanagariPhonetic: 'ब / बा',
    category: 'Alphabet',
    type: 'Two-Handed',
    description: 'Both hands form circular loops using thumb and index fingers, touching side-by-side to represent the two rounded lobes of B.',
    dominantHand: 'Curved circle with index and thumb tips touching.',
    nonDominantHand: 'Matching circle with index and thumb tips touching.',
    contactPoint: 'Knuckles or index finger sides touch side-by-side.',
    mnemonic: 'Two round circular frames like eyeglasses or the twin curves of B.',
    points: 25,
  },
  {
    id: 'letter-c',
    sign: '🅲',
    targetKey: 'C',
    title: 'Letter C',
    hindiName: 'वर्ण C (सी)',
    devanagariPhonetic: 'सी',
    category: 'Alphabet',
    type: 'Single-Hand',
    description: 'Form a prominent curved open "C" arc with all fingers and thumb facing outward to the side.',
    dominantHand: 'Four fingers curved together facing thumb tip with an open 2-inch gap.',
    contactPoint: 'Single hand held clearly in signing space.',
    mnemonic: 'The physical crescent moon shape of the letter C.',
    points: 20,
  },
  {
    id: 'letter-d',
    sign: '🅳',
    targetKey: 'D',
    title: 'Letter D',
    hindiName: 'वर्ण D (द)',
    devanagariPhonetic: 'द / दा',
    category: 'Alphabet',
    type: 'Two-Handed',
    description: 'Non-dominant index finger forms a vertical spine, while dominant curved thumb and index form the curved belly of D.',
    dominantHand: 'Curved arch with index and thumb meeting non-dominant spine.',
    nonDominantHand: 'Vertical upright index finger acting as straight back of D.',
    contactPoint: 'Dominant fingertips touch top and base of non-dominant index.',
    mnemonic: 'A straight backbone with a rounded arch makes a complete D.',
    points: 25,
  },
  {
    id: 'number-5',
    sign: '🖐️',
    targetKey: '5',
    title: 'Number 5 (पाँच)',
    hindiName: 'पाँच',
    devanagariPhonetic: 'पाँ-च',
    category: 'Number',
    type: 'Single-Hand',
    description: 'Open hand with all five fingers extended and spread comfortably apart facing the camera.',
    dominantHand: 'All five digits (thumb through pinky) extended and separated.',
    contactPoint: 'Presented steadily facing forward at chest level.',
    mnemonic: 'All five fingers of the hand spread proudly open.',
    points: 20,
  },
  {
    id: 'letter-v',
    sign: '✌️',
    targetKey: 'V',
    title: 'Victory / Letter V',
    hindiName: 'वर्ण V / शांति',
    devanagariPhonetic: 'व / वी',
    category: 'Alphabet',
    type: 'Single-Hand',
    description: 'Index and middle fingers extended upward spread apart in a sharp V shape; thumb holds ring and pinky fingers.',
    dominantHand: 'Index and middle spread in open V; palm facing forward.',
    contactPoint: 'Held firmly in center field of vision.',
    mnemonic: 'Classic V for Victory and peace in Indian manual communication.',
    points: 20,
  },
];

// Interactive Quiz Questions
interface QuizQuestion {
  id: string;
  question: string;
  hindiQuestion: string;
  signEmoji: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Which Indian Sign Language (ISL) gesture involves pressing both palms together in front of the chest?',
    hindiQuestion: 'दोनों हथेलियों को छाती के सामने जोड़ने वाला संकेत कौन सा है?',
    signEmoji: '🙏',
    options: ['Help (मदद)', 'Namaste (नमस्ते)', 'Water (पानी)', 'Chai (चाय)'],
    correctIndex: 1,
    explanation: 'Namaste (नमस्ते) is performed by placing both palms together in Anjali Mudra with fingertips pointing upward.',
  },
  {
    id: 'q2',
    question: 'How is the ISL sign for "Help" (मदद) constructed?',
    hindiQuestion: 'ISL में "मदद" का संकेत कैसे बनाया जाता है?',
    signEmoji: '🆘',
    options: [
      'Two peace signs crossing',
      'Thumbs-up fist resting on a flat open palm',
      'Curved index finger tapping the nose',
      'Circular motion near the ear',
    ],
    correctIndex: 1,
    explanation: 'Help in ISL uses a closed fist (thumbs up) resting directly on the flat horizontal palm of the opposite hand, lifting together.',
  },
  {
    id: 'q3',
    question: 'In Indian Sign Language, how is the uppercase letter "A" formed?',
    hindiQuestion: 'भारतीय सांकेतिक भाषा (ISL) में वर्ण "A" कैसे बनता है?',
    signEmoji: '🅰️',
    options: [
      'Closed fist with thumb upright (single hand)',
      'Both index fingertips touching at the top apex in an inverted V',
      'Two flat hands clapping together',
      'Hooked index finger',
    ],
    correctIndex: 1,
    explanation: 'ISL alphabet letter A is a two-handed gesture where both index fingertips meet at the top to build the peaked apex of the letter.',
  },
  {
    id: 'q4',
    question: 'Which hand configuration represents the letter "C" or sipping "Chai" (चाय)?',
    hindiQuestion: '"चाय" या वर्ण "C" के लिए कौन सा हस्त-संकेत होता है?',
    signEmoji: '☕',
    options: [
      'Flat palm facing down',
      'Curved hand forming an open C-arc like holding a cup',
      'Two thumbs touching pinkies',
      'Closed fist with thumb across',
    ],
    correctIndex: 1,
    explanation: 'Letter C and Chai both use an open curved C arc formed by the thumb and curved fingers.',
  },
  {
    id: 'q5',
    question: 'What is the correct finger position for "I Love You" (🤟)?',
    hindiQuestion: '"I Love You" (🤟) के लिए सही उंगलियों की स्थिति क्या है?',
    signEmoji: '🤟',
    options: [
      'Thumb, Index, and Pinky extended while Middle and Ring curl inward',
      'Only Index finger pointing up',
      'All fingers closed into a fist',
      'Only Pinky finger upright',
    ],
    correctIndex: 0,
    explanation: 'The universal and ISL "I Love You" sign extends the Thumb, Index, and Pinky simultaneously.',
  },
  {
    id: 'q6',
    question: 'How do you sign the ISL letter "B"?',
    hindiQuestion: 'ISL में वर्ण "B" कैसे संकेतित किया जाता है?',
    signEmoji: '🅱️',
    options: [
      'Single hand waving left and right',
      'Both hands forming index+thumb loops touching side-by-side like spectacles',
      'Crossing middle and ring fingers',
      'Pointing index finger downwards',
    ],
    correctIndex: 1,
    explanation: 'Letter B in ISL is two-handed: both hands create circular loops with index and thumb, placed side-by-side.',
  },
  {
    id: 'q7',
    question: 'Which sign is represented by 3 fingers (index, middle, ring) held upright in a "W" shape tapping the chin?',
    hindiQuestion: 'ठोड़ी पर तीन उंगलियों (W आकार) को थपथपाने से क्या संकेत बनता है?',
    signEmoji: '💧',
    options: ['Milk (दूध)', 'Water (पानी)', 'Food (खाना)', 'Friend (मित्र)'],
    correctIndex: 1,
    explanation: 'The letter W handshape tapped against the chin is the authentic ISL sign for Water (पानी).',
  },
];

type LearningTab = 'lessons' | 'quiz' | 'cameraPractice';

export default function Learn() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LearningTab>('lessons');
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);

  // User learning state
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgressItem>>({});
  const [stats, setStats] = useState<UserLearningStats>(() =>
    computeLearningStats({}, ISL_LESSONS.length)
  );

  // Load progress on mount / auth change
  useEffect(() => {
    let isMounted = true;
    fetchUserProgress(user?.id).then((map) => {
      if (isMounted) {
        setProgressMap(map);
        setStats(computeLearningStats(map, ISL_LESSONS.length));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Quiz state
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Camera practice state
  const [practiceLessonId, setPracticeLessonId] = useState<string>('namaste');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedSign, setDetectedSign] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [holdProgress, setHoldProgress] = useState<number>(0); // 0 to 100
  const [practiceSuccess, setPracticeSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);

  const currentLesson = ISL_LESSONS[currentLessonIdx];
  const currentQuiz = QUIZ_QUESTIONS[quizIdx];
  const practiceLesson = ISL_LESSONS.find((l) => l.id === practiceLessonId) || ISL_LESSONS[0];

  // Mark lesson complete
  const handleMarkMastered = useCallback(async (lesson: LessonData) => {
    playSuccessChime();
    setProgressMap((prev) => {
      const updatedMap = {
        ...prev,
        [lesson.id]: {
          lessonId: lesson.id,
          completed: true,
          score: lesson.points,
          updatedAt: new Date().toISOString(),
        },
      };
      setStats(computeLearningStats(updatedMap, ISL_LESSONS.length));
      return updatedMap;
    });
    await saveLessonProgress(lesson.id, true, lesson.points, user?.id);
  }, [user?.id]);

  // Pronounce Hindi phonetic audio
  const handlePronounce = (lesson: LessonData) => {
    speak(`${lesson.title}. ${lesson.hindiName}`, { lang: 'hi-IN' });
  };

  // Quiz answer handler
  const handleSelectAnswer = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(idx);
    setIsAnswerSubmitted(true);

    const isCorrect = idx === currentQuiz.correctIndex;
    if (isCorrect) {
      playSuccessChime();
      setQuizScore((prev) => prev + 10);
      recordQuizAttempt(true);
    } else {
      playErrorTone();
      recordQuizAttempt(false);
    }

    // Refresh stats
    setStats((prev) => ({
      ...prev,
      totalScore: prev.totalScore + (isCorrect ? 10 : 0),
    }));
  };

  const handleNextQuizQuestion = () => {
    if (quizIdx + 1 < QUIZ_QUESTIONS.length) {
      setQuizIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizIdx(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  // Camera practice start / stop
  const stopCameraPractice = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
    setDetectedSign(null);
    setMatchScore(0);
    setHoldProgress(0);
  }, []);

  const startCameraPractice = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setPracticeSuccess(false);
    setHoldProgress(0);

    try {
      await getHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraLoading(false);
    } catch (err) {
      console.error('Camera initiation failed:', err);
      setCameraError('Unable to access webcam. Please verify camera permissions.');
      setCameraLoading(false);
    }
  };

  // Frame processing loop for camera practice
  useEffect(() => {
    if (!cameraActive) return;

    let active = true;

    const processLoop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(processLoop);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      const result = await recognizeFrame(video, performance.now());

      if (canvas && ctx && result.allLandmarks) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections and landmarks
        for (const hand of result.allLandmarks) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#2dd4bf'; // teal
          for (const [start, end] of HAND_CONNECTIONS) {
            const p1 = hand[start];
            const p2 = hand[end];
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          }

          // Draw joints
          for (let i = 0; i < hand.length; i++) {
            const pt = hand[i];
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fillStyle = i === 8 || i === 4 ? '#f59e0b' : '#38bdf8';
            ctx.fill();
          }
        }
      }

      const recognized = result.letter;
      setDetectedSign(recognized);

      // Check match with practice target
      const isTargetMatched =
        recognized &&
        (recognized.toUpperCase() === practiceLesson.targetKey.toUpperCase() ||
          result.label.toLowerCase().includes(practiceLesson.title.toLowerCase()) ||
          result.label.toLowerCase().includes(practiceLesson.hindiName.toLowerCase()));

      const currentConfidence = result.confidence || 0;

      if (isTargetMatched && currentConfidence >= 0.65) {
        setMatchScore(Math.round(currentConfidence * 100));

        // Accumulate hold progress (needs 1.2 seconds of stable pose)
        if (!holdStartRef.current) {
          holdStartRef.current = performance.now();
        } else {
          const elapsed = performance.now() - holdStartRef.current;
          const pct = Math.min(100, Math.round((elapsed / 1200) * 100));
          setHoldProgress(pct);

          if (pct >= 100 && !practiceSuccess) {
            setPracticeSuccess(true);
            playSuccessChime();
            void handleMarkMastered(practiceLesson);
            holdStartRef.current = null;
          }
        }
      } else {
        setMatchScore(isTargetMatched ? Math.round(currentConfidence * 100) : Math.max(0, Math.round(currentConfidence * 40)));
        holdStartRef.current = null;
        setHoldProgress(0);
      }

      if (active) {
        animFrameRef.current = requestAnimationFrame(processLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(processLoop);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, practiceLesson, practiceSuccess, handleMarkMastered]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCameraPractice();
    };
  }, [stopCameraPractice]);

  return (
    <section id="learn" className="relative bg-slate-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Interactive ISL Academy"
          title="Master Indian Sign Language with Intelligent Real-Time Guidance"
          description="Build muscle memory with authentic 21-point hand posture models, step-by-step mechanics, interactive skill quizzes, and live AI camera verification."
        />

        {/* PROGRESS DASHBOARD CARD */}
        <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1 */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                <BookOpen size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mastered</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-slate-900">
                    {stats.completedCount}
                  </span>
                  <span className="text-xs font-medium text-slate-400">/ {stats.totalLessons}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
                <Target size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quiz Accuracy</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-slate-900">
                    {stats.quizAccuracy}%
                  </span>
                  <span className="text-xs font-medium text-teal-600">Avg</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {stats.completedCount > 0 ? `${stats.completedCount * 10} XP gained` : 'Ready to start'}
                </p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Flame size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Practice Streak</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-slate-900">
                    {stats.streakDays}
                  </span>
                  <span className="text-xs font-medium text-amber-600">days</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Keep it burning!</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                <Award size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
                <p className="font-display text-base font-bold text-slate-900">{stats.levelTitle}</p>
                <p className="text-[11px] font-medium text-slate-400">
                  {stats.lastPracticed ? `Last: ${stats.lastPracticed}` : 'Fresh journey'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODE SWITCHER TABS */}
        <div className="mx-auto mt-10 flex max-w-md justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === 'lessons'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={16} />
            Lessons
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === 'quiz'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={16} />
            Skill Quiz
          </button>
          <button
            onClick={() => setActiveTab('cameraPractice')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === 'cameraPractice'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera size={16} />
            Camera Challenge
          </button>
        </div>

        {/* TAB 1: GUIDED LESSONS */}
        {activeTab === 'lessons' && (
          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lesson {currentLessonIdx + 1}: {currentLesson.title}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500">
                    Category: {currentLesson.category} • {currentLesson.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentLessonIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentLessonIdx === 0}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Previous lesson"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-2 text-xs font-bold text-slate-500">
                  {currentLessonIdx + 1} / {ISL_LESSONS.length}
                </span>
                <button
                  onClick={() => setCurrentLessonIdx((prev) => Math.min(ISL_LESSONS.length - 1, prev + 1))}
                  disabled={currentLessonIdx === ISL_LESSONS.length - 1}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Next lesson"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Lesson Body */}
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
              {/* Left Column: Sign Visual & Pronunciation */}
              <div className="flex flex-col items-center justify-center border-b border-slate-200 bg-slate-50 p-8 text-center md:border-b-0 md:border-r">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl border border-slate-200 bg-white text-7xl shadow-md">
                  {currentLesson.sign}
                  {progressMap[currentLesson.id]?.completed && (
                    <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                      <Check size={18} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <h4 className="mt-5 font-display text-2xl font-bold text-slate-900">
                  {currentLesson.title}
                </h4>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-base font-semibold text-brand-600">
                    {currentLesson.hindiName}
                  </span>
                  <span className="text-xs text-slate-400">({currentLesson.devanagariPhonetic})</span>
                </div>

                <button
                  onClick={() => handlePronounce(currentLesson)}
                  className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <Volume2 size={15} className="text-brand-600" />
                  Listen Audio (सुनें)
                </button>

                <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                  <SlidersHorizontal size={13} />
                  Award: +{currentLesson.points} XP
                </div>
              </div>

              {/* Right Column: Mechanics & Coordinate Breakdown */}
              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div className="space-y-5">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Execution Mechanics
                    </h5>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                      {currentLesson.description}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <h5 className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Layers size={14} className="text-brand-600" />
                      Hand Landmarks & Posture Anatomy
                    </h5>
                    <div className="mt-2.5 space-y-2 text-xs text-slate-600">
                      <p>
                        <strong className="text-slate-800">Dominant Hand:</strong>{' '}
                        {currentLesson.dominantHand}
                      </p>
                      {currentLesson.nonDominantHand && (
                        <p>
                          <strong className="text-slate-800">Non-Dominant Hand:</strong>{' '}
                          {currentLesson.nonDominantHand}
                        </p>
                      )}
                      <p>
                        <strong className="text-slate-800">Contact / Spatial Anchor:</strong>{' '}
                        {currentLesson.contactPoint}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <h5 className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Compass size={14} className="text-amber-600" />
                      Memory Hook / Mnemonic
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      {currentLesson.mnemonic}
                    </p>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <button
                    onClick={() => {
                      setPracticeLessonId(currentLesson.id);
                      setActiveTab('cameraPractice');
                    }}
                    className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
                  >
                    <Camera size={15} />
                    Practice in Camera
                  </button>

                  <button
                    onClick={() => handleMarkMastered(currentLesson)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md transition ${
                      progressMap[currentLesson.id]?.completed
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-brand-600 text-white shadow-brand-600/20 hover:bg-brand-700'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    {progressMap[currentLesson.id]?.completed ? 'Mastered ✓' : 'Mark as Mastered (+XP)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE SKILL QUIZ */}
        {activeTab === 'quiz' && (
          <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
            {!quizFinished ? (
              <div>
                {/* Quiz Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                      <HelpCircle size={15} />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Question {quizIdx + 1} of {QUIZ_QUESTIONS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600">
                    <Award size={15} />
                    Score: {quizScore} XP
                  </div>
                </div>

                {/* Question & Sign Display */}
                <div className="mt-6 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-5xl shadow-inner">
                    {currentQuiz.signEmoji}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 sm:text-xl">
                    {currentQuiz.question}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {currentQuiz.hindiQuestion}
                  </p>
                </div>

                {/* Multiple-Choice Options */}
                <div className="mt-8 space-y-3">
                  {currentQuiz.options.map((opt, i) => {
                    const isChosen = selectedAnswer === i;
                    const isCorrect = i === currentQuiz.correctIndex;

                    let btnStyle = 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800';
                    if (isAnswerSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                      } else if (isChosen) {
                        btnStyle = 'border-red-400 bg-red-50 text-red-900 font-bold';
                      } else {
                        btnStyle = 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={i}
                        disabled={isAnswerSubmitted}
                        onClick={() => handleSelectAnswer(i)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm transition-all ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${
                              isAnswerSubmitted && isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isAnswerSubmitted && isChosen
                                ? 'bg-red-500 text-white'
                                : 'bg-white text-slate-600 shadow-sm'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isAnswerSubmitted && isCorrect && (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        )}
                        {isAnswerSubmitted && isChosen && !isCorrect && (
                          <X size={18} className="text-red-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation feedback */}
                {isAnswerSubmitted && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-700">Explanation:</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {currentQuiz.explanation}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleNextQuizQuestion}
                        className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700"
                      >
                        {quizIdx + 1 === QUIZ_QUESTIONS.length ? 'View Results' : 'Next Question'}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Quiz Finished View */
              <div className="py-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-lg shadow-emerald-500/10">
                  <Award size={40} />
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold text-slate-900">
                  Quiz Completed!
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  You earned <strong className="text-brand-600">{quizScore} XP</strong> with an accuracy
                  of {Math.round((quizScore / (QUIZ_QUESTIONS.length * 10)) * 100)}%!
                </p>

                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <strong className="text-slate-900">{QUIZ_QUESTIONS.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Answers:</span>
                    <strong className="text-emerald-600">{quizScore / 10}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance Grade:</span>
                    <strong className="text-brand-600">
                      {quizScore >= 60 ? 'ISL Virtuoso ⭐' : 'Progressing Learner 👍'}
                    </strong>
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-3">
                  <button
                    onClick={handleRestartQuiz}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <RotateCcw size={15} />
                    Retake Quiz
                  </button>
                  <button
                    onClick={() => setActiveTab('cameraPractice')}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700"
                  >
                    <Camera size={15} />
                    Try Camera Practice
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE CAMERA SIGN PRACTICE CHALLENGE */}
        {activeTab === 'cameraPractice' && (
          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            {/* Header / Target Selection */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Sign Practice Challenge</h3>
                <p className="text-[11px] text-slate-500">
                  Hold your hand to your camera to match the target sign posture
                </p>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Target Sign:</label>
                <select
                  value={practiceLessonId}
                  onChange={(e) => {
                    setPracticeLessonId(e.target.value);
                    setPracticeSuccess(false);
                    setHoldProgress(0);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  {ISL_LESSONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.sign} {l.title} ({l.hindiName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Practice Body */}
            <div className="grid md:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: Live Camera Video Stream */}
              <div className="relative flex min-h-[360px] flex-col items-center justify-center bg-slate-950 p-4">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full max-h-[380px] w-full rounded-2xl object-cover ${
                    !cameraActive ? 'hidden' : ''
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className={`pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded-2xl ${
                    !cameraActive ? 'hidden' : ''
                  }`}
                />

                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-teal-400 border border-slate-800 shadow-lg">
                      <Camera size={32} />
                    </div>
                    <h4 className="mt-4 text-base font-bold text-white">Camera is Inactive</h4>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">
                      Enable your webcam to verify your hand positions against 3D coordinate templates.
                    </p>
                    <button
                      onClick={() => void startCameraPractice()}
                      disabled={cameraLoading}
                      className="mt-6 flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-600 disabled:opacity-50"
                    >
                      {cameraLoading ? (
                        <>
                          <Activity size={16} className="animate-spin" />
                          Loading Gesture Engine...
                        </>
                      ) : (
                        <>
                          <Play size={16} fill="currentColor" />
                          Launch Live Practice
                        </>
                      )}
                    </button>
                    {cameraError && (
                      <p className="mt-3 text-xs font-medium text-rose-400">{cameraError}</p>
                    )}
                  </div>
                )}

                {/* Active HUD Overlays */}
                {cameraActive && (
                  <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-teal-300 backdrop-blur-md border border-teal-500/30">
                      <span className="h-2 w-2 animate-ping rounded-full bg-teal-400" />
                      Live MediaPipe Engine
                    </span>

                    <button
                      onClick={stopCameraPractice}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-rose-700"
                    >
                      <CircleStop size={14} />
                      Stop Camera
                    </button>
                  </div>
                )}

                {/* Match Indicator Badge at bottom */}
                {cameraActive && (
                  <div className="absolute bottom-6 inset-x-6 flex items-center justify-between rounded-2xl bg-slate-900/85 p-3 backdrop-blur-md border border-slate-800">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Detected Gesture
                      </p>
                      <p className="text-sm font-bold text-white">
                        {detectedSign ? `Sign: ${detectedSign}` : 'Place hands in view...'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Match Confidence
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          matchScore >= 70 ? 'text-teal-400' : 'text-amber-400'
                        }`}
                      >
                        {matchScore}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Target Sign Guide & Hold Verification */}
              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl shadow-sm">
                      {practiceLesson.sign}
                    </span>
                    <div>
                      <h4 className="font-display text-lg font-bold text-slate-900">
                        Target: {practiceLesson.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-500">
                        {practiceLesson.hindiName} ({practiceLesson.type})
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h5 className="text-xs font-bold text-slate-800">How to hold the sign:</h5>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {practiceLesson.description}
                    </p>
                  </div>

                  {/* Hold Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">Stability Hold Verification</span>
                      <span className="text-teal-600">{holdProgress}%</span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-150"
                        style={{ width: `${holdProgress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Hold the matching pose steady for 1.2s to verify mastery.
                    </p>
                  </div>

                  {/* Success notification */}
                  {practiceSuccess && (
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 animate-fade-in">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Check size={20} strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Sign Mastered Successfully!</p>
                        <p className="text-[11px] text-emerald-700">
                          +{practiceLesson.points} XP recorded to your learning profile!
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Cloud Sync:</span>
                    <span className="font-semibold text-slate-700">
                      {user ? 'Synced with Supabase' : 'Saved in Local Storage'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

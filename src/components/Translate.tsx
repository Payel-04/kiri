import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CircleStop,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Mic2,
  MicOff,
  Hand,
  Loader2,
  Plus,
  Info,
  Target,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import {
  getHandLandmarker,
  recognizeFrame,
  setPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  HAND_CONNECTIONS,
  FINGER_COLORS,
  WRIST,
  THUMB_TIP,
  INDEX_TIP,
  MIDDLE_TIP,
  RING_TIP,
  PINKY_TIP,
  type RecognitionResult,
  type PipelineConfig,
} from '@/lib/gestureRecognition';
import { ISL_ALPHABET_DATASET, type ISLAlphabetEntry } from '@/data/alphabetDataset';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import SectionHeading from '@/components/SectionHeading';

type TranslateProps = { onAuthClick: () => void };

const ISL_VOCAB_GUIDE = [
  { sign: '🙏 Namaste', desc: 'Both palms pressed together upright (नमस्ते)', category: 'Greeting', type: 'Two-Handed' },
  { sign: '🆘 Help', desc: 'Closed fist resting on flat palm (मदद)', category: 'Essential', type: 'Two-Handed' },
  { sign: '🤟 Love', desc: 'Thumb + Index + Pinky extended (प्यार)', category: 'Phrase', type: 'Single-Hand' },
  { sign: '👍 Good', desc: 'Solid thumbs up (अच्छा / बढ़िया)', category: 'Sign', type: 'Single-Hand' },
  { sign: '👎 Disagree', desc: 'Thumbs pointing downward (असहमत)', category: 'Sign', type: 'Single-Hand' },
  { sign: 'A (ए/अ)', desc: 'Two index fingertips meeting at top apex', category: 'Letter', type: 'Two-Handed' },
  { sign: 'B (ब)', desc: 'Two index+thumb circles touching side-by-side', category: 'Letter', type: 'Two-Handed' },
  { sign: 'C (सी)', desc: 'Curved open C arc facing sideways', category: 'Letter', type: 'Single-Hand' },
  { sign: 'D (द)', desc: 'Upright index spine + curved arch on side', category: 'Letter', type: 'Two-Handed' },
  { sign: 'E (ई/ए)', desc: 'Dominant index touches upright index tip', category: 'Letter', type: 'Two-Handed' },
  { sign: 'F (फ)', desc: 'Index & middle of both hands crossing', category: 'Letter', type: 'Two-Handed' },
  { sign: 'G (ग)', desc: 'Two closed fists stacked vertically', category: 'Letter', type: 'Two-Handed' },
  { sign: 'H (ह)', desc: 'Flat horizontal palm across vertical palm', category: 'Letter', type: 'Two-Handed' },
  { sign: 'I (इ)', desc: 'Single upright vertical index finger', category: 'Letter', type: 'Single-Hand' },
  { sign: 'J (ज)', desc: 'Index fingers cross with hook curve', category: 'Letter', type: 'Two-Handed' },
  { sign: 'K (क)', desc: 'Bent index touching middle joint of upright index', category: 'Letter', type: 'Two-Handed' },
  { sign: 'L (ल)', desc: 'Thumb & index at 90° right angle L', category: 'Letter', type: 'Single-Hand' },
  { sign: 'M (म)', desc: '3 fingers (index, mid, ring) on flat palm', category: 'Letter', type: 'Two-Handed' },
  { sign: 'N (न)', desc: '2 fingers (index, mid) on flat palm', category: 'Letter', type: 'Two-Handed' },
  { sign: 'O (ओ)', desc: 'All fingertips meet thumb in circular O', category: 'Letter', type: 'Single-Hand' },
  { sign: 'P (प)', desc: 'Index+thumb loop on top of upright index', category: 'Letter', type: 'Two-Handed' },
  { sign: 'Q (क़)', desc: 'Index finger hooked through O-circle loop', category: 'Letter', type: 'Two-Handed' },
  { sign: 'R (र)', desc: 'Curled hook index resting on flat palm', category: 'Letter', type: 'Two-Handed' },
  { sign: 'S (स)', desc: 'Fists with pinky fingers hooked together', category: 'Letter', type: 'Two-Handed' },
  { sign: 'T (त)', desc: 'Horizontal index across top tip of vertical index', category: 'Letter', type: 'Two-Handed' },
  { sign: 'U (उ)', desc: 'Index & middle held tightly together', category: 'Letter', type: 'Single-Hand' },
  { sign: 'V (व)', desc: 'Peace sign with 2 fingers spread in V', category: 'Letter', type: 'Single-Hand' },
  { sign: 'W (w)', desc: 'Both hands interlaced pointing up (3 peaks)', category: 'Letter', type: 'Two-Handed' },
  { sign: 'X (क्ष)', desc: 'Both index fingers crossing diagonally in X', category: 'Letter', type: 'Two-Handed' },
  { sign: 'Y (य)', desc: 'Index points into webbing of L-shaped hand', category: 'Letter', type: 'Two-Handed' },
  { sign: 'Z (ज़)', desc: 'Horizontal hand meets vertical palm at 90°', category: 'Letter', type: 'Two-Handed' },
  { sign: '1 (१)', desc: 'Index finger up only (एक)', category: 'Number', type: 'Single-Hand' },
  { sign: '2 (२)', desc: 'Index & middle fingers up (दो)', category: 'Number', type: 'Single-Hand' },
  { sign: '3 (३)', desc: '3 fingers upright (तीन)', category: 'Number', type: 'Single-Hand' },
  { sign: '4 (४)', desc: '4 fingers upright, thumb in (चार)', category: 'Number', type: 'Single-Hand' },
  { sign: '5 (५)', desc: '5 fingers spread open (पाँच)', category: 'Number', type: 'Single-Hand' },
];

function playConfirmTone() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

type PipelinePreset = 'responsive' | 'balanced' | 'precision' | 'custom';

export default function Translate({ onAuthClick }: TranslateProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Stability hold state
  const lastCandidateRef = useRef<string | null>(null);
  const candidateFramesRef = useRef(0);
  const committedSignRef = useRef<string | null>(null);
  const listeningRef = useRef(true);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState('');
  
  // Pipeline Tuning Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_PIPELINE_CONFIG.confidenceThreshold);
  const [frameWindowSize, setFrameWindowSize] = useState(DEFAULT_PIPELINE_CONFIG.frameWindowSize);
  const [enableLandmarkSmoothing, setEnableLandmarkSmoothing] = useState(DEFAULT_PIPELINE_CONFIG.enableLandmarkSmoothing);
  const [pipelinePreset, setPipelinePreset] = useState<PipelinePreset>('balanced');
  const [showTuning, setShowTuning] = useState(false);

  const [result, setResult] = useState<RecognitionResult>({
    letter: null,
    label: 'Camera not started',
    category: 'letter',
    confidence: 0,
    rawConfidence: 0,
    threshold: DEFAULT_PIPELINE_CONFIG.confidenceThreshold,
    isAboveThreshold: false,
    consistencyRatio: 0,
    landmarks: null,
  });

  const [holdProgress, setHoldProgress] = useState(0);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [lastCommitted, setLastCommitted] = useState<string | null>(null);
  const [targetPracticeLetter, setTargetPracticeLetter] = useState<ISLAlphabetEntry | null>(null);

  const { user } = useAuth();
  const REQUIRED_STABLE_FRAMES = 7; // ~220ms hold

  // Sync pipeline config changes
  useEffect(() => {
    setPipelineConfig({
      confidenceThreshold,
      frameWindowSize,
      enableLandmarkSmoothing,
    });
  }, [confidenceThreshold, frameWindowSize, enableLandmarkSmoothing]);

  const applyPreset = (preset: PipelinePreset) => {
    setPipelinePreset(preset);
    if (preset === 'responsive') {
      setConfidenceThreshold(0.55);
      setFrameWindowSize(3);
      setEnableLandmarkSmoothing(true);
    } else if (preset === 'balanced') {
      setConfidenceThreshold(0.68);
      setFrameWindowSize(6);
      setEnableLandmarkSmoothing(true);
    } else if (preset === 'precision') {
      setConfidenceThreshold(0.80);
      setFrameWindowSize(9);
      setEnableLandmarkSmoothing(true);
    }
  };

  const [modelLoading, setModelLoading] = useState(false);

  const initModel = useCallback(async () => {
    setError('');
    setModelLoading(true);
    try {
      await getHandLandmarker();
      setModelReady(true);
      setError('');
    } catch (err: unknown) {
      console.error('Model initialization error:', err);
      setModelReady(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load the ISL gesture model. Please check your internet connection and refresh.'
      );
    } finally {
      setModelLoading(false);
    }
  }, []);

  // Preload the model on mount so the camera starts instantly
  useEffect(() => {
    void initModel();
  }, [initModel]);

  // Keep ref in sync with state for use inside the loop
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const drawLandmarks = useCallback(
    (
      allLandmarks: RecognitionResult['allLandmarks'] | null | undefined,
      fallbackLandmarks: RecognitionResult['landmarks'],
      currentLetter: string | null,
      mode?: string
    ) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hands =
        allLandmarks && allLandmarks.length > 0
          ? allLandmarks
          : fallbackLandmarks
            ? [fallbackLandmarks]
            : [];
      if (hands.length === 0) return;

      hands.forEach((landmarks, handIdx) => {
        // Draw connection bones
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        HAND_CONNECTIONS.forEach(([a, b]) => {
          const p1 = landmarks[a];
          const p2 = landmarks[b];
          if (!p1 || !p2) return;

          // Color code bone based on finger
          let color = FINGER_COLORS.palm;
          if (a <= 4 && b <= 4) color = FINGER_COLORS.thumb;
          else if (a >= 5 && a <= 8 && b >= 5 && b <= 8) color = FINGER_COLORS.index;
          else if (a >= 9 && a <= 12 && b >= 9 && b <= 12) color = FINGER_COLORS.middle;
          else if (a >= 13 && a <= 16 && b >= 13 && b <= 16) color = FINGER_COLORS.ring;
          else if (a >= 17 && a <= 20 && b >= 17 && b <= 20) color = FINGER_COLORS.pinky;

          // Secondary hand styling
          if (handIdx > 0) {
            color = '#38bdf8';
          }

          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
          ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
          ctx.stroke();
        });

        // Draw joint nodes
        const tipIndices = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
        landmarks.forEach((point, idx) => {
          const isTip = tipIndices.includes(idx);
          const isWrist = idx === WRIST;
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;

          // Outer glow circle
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 6.5 : isWrist ? 7 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isTip ? '#38bdf8' : isWrist ? '#2dd4bf' : '#ffffff';
          ctx.fill();

          // Core white dot
          ctx.beginPath();
          ctx.arc(x, y, isTip ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      });

      // Floating detected letter tag above primary hand
      if (currentLetter && hands.length > 0) {
        const primaryHand = hands[0];
        const topLandmark = primaryHand.reduce((min, p) => (p.y < min.y ? p : min), primaryHand[0]);
        const tagX = topLandmark.x * canvas.width;
        const tagY = Math.max(topLandmark.y * canvas.height - 28, 24);

        ctx.save();
        // Tag pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.5;
        const tagText = mode === 'Two-Handed ISL' ? `ISL: ${currentLetter} (Dual)` : `ISL: ${currentLetter}`;
        const tagWidth = tagText.length * 9 + 28;
        const tagHeight = 30;
        ctx.beginPath();
        ctx.roundRect(tagX - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight, 15);
        ctx.fill();
        ctx.stroke();

        // Tag Text
        ctx.fillStyle = '#2dd4bf';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, tagX, tagY);
        ctx.restore();
      }
    },
    []
  );

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !active || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const pipelineConfig: Partial<PipelineConfig> = {
        confidenceThreshold,
        frameWindowSize,
        enableLandmarkSmoothing,
      };

      const frame = await recognizeFrame(video, performance.now(), pipelineConfig);
      setResult(frame);
      drawLandmarks(frame.allLandmarks, frame.landmarks, frame.letter, frame.mode);

      if (frame.letter && frame.isAboveThreshold) {
        if (frame.letter === lastCandidateRef.current) {
          candidateFramesRef.current += 1;
        } else {
          lastCandidateRef.current = frame.letter;
          candidateFramesRef.current = 1;
        }

        const progress = Math.min(candidateFramesRef.current / REQUIRED_STABLE_FRAMES, 1);
        setHoldProgress(progress);

        // Auto commit if listening and reached required stable frames
        if (
          listeningRef.current &&
          candidateFramesRef.current >= REQUIRED_STABLE_FRAMES &&
          committedSignRef.current !== frame.letter
        ) {
          committedSignRef.current = frame.letter;
          playConfirmTone();
          setLastCommitted(frame.label);

          setText((prev) => {
            if (frame.letter === '👍') return prev ? `${prev} (Good / अच्छा 👍)` : 'Good / अच्छा 👍';
            if (frame.letter === '👎') return prev ? `${prev} (Disagree 👎)` : 'Disagree 👎';
            if (frame.letter === '🙏') return prev ? `${prev} Namaste 🙏` : 'Namaste 🙏';
            if (frame.letter === '🆘') return prev ? `${prev} Help 🆘` : 'Help 🆘';
            if (frame.letter === '🤟') return prev ? `${prev} I Love You 🤟` : 'I Love You 🤟';
            if (frame.letter === '💧') return prev ? `${prev} Water 💧` : 'Water 💧';
            if (frame.letter === '☕') return prev ? `${prev} Chai ☕` : 'Chai ☕';
            if (frame.letter === '🍛') return prev ? `${prev} Food 🍛` : 'Food 🍛';
            return prev ? `${prev}${frame.letter}` : frame.letter || '';
          });

          // Save gesture detection event to Supabase if authenticated
          if (user) {
            void supabase.from('translations').insert({
              user_id: user.id,
              gesture: frame.letter,
              confidence: frame.confidence,
              mode: frame.mode || 'realtime_isl',
            });
          }
        }
      } else {
        lastCandidateRef.current = null;
        candidateFramesRef.current = 0;
        committedSignRef.current = null;
        setHoldProgress(0);
      }
    } catch {
      // Ignore individual frame recognition dropped errors
    } finally {
      isProcessingRef.current = false;
      if (active) {
        frameRef.current = requestAnimationFrame(() => void loop());
      }
    }
  }, [active, drawLandmarks, user, confidenceThreshold, frameWindowSize, enableLandmarkSmoothing]);

  const startCamera = async () => {
    setError('');
    setLoading(true);

    try {
      if (!modelReady) {
        await getHandLandmarker();
        setModelReady(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setActive(true);
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isPermissionDenied) {
        setError('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not start ISL camera. Please verify device permissions and internet connection.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setActive(false);
    stopSpeaking();
    setResult({
      letter: null,
      label: 'Camera stopped',
      category: 'letter',
      confidence: 0,
      rawConfidence: 0,
      threshold: confidenceThreshold,
      isAboveThreshold: false,
      consistencyRatio: 0,
      landmarks: null,
    });
    setHoldProgress(0);
  };

  // Start/restart animation loop when active state changes
  useEffect(() => {
    if (active) {
      frameRef.current = requestAnimationFrame(() => void loop());
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, loop]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopSpeaking();
    };
  }, []);

  const addCurrentSignManual = () => {
    if (!result.letter) return;
    playConfirmTone();
    setLastCommitted(result.label);
    setText((prev) => (prev ? `${prev}${result.letter}` : result.letter || ''));
  };

  const addSpace = () => {
    setText((prev) => (prev ? `${prev} ` : ''));
  };

  const backspace = () => {
    setText((prev) => prev.slice(0, -1));
  };

  const clearText = () => {
    setText('');
    setLastCommitted(null);
    stopSpeaking();
  };

  const speakText = async () => {
    if (!text || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speak(text);
    } catch {
      // Ignore audio synthesis cancel
    } finally {
      setIsSpeaking(false);
    }

    if (user) {
      await supabase
        .from('translation_history')
        .insert({ gesture_label: 'sequence', translated_text: text });
    }
  };

  const fingerStates = result.fingerStates;
  const isTargetMatched = targetPracticeLetter && result.letter === targetPracticeLetter.letter;

  return (
    <section id="translate" className="bg-slate-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          light
          eyebrow="Real-Time ISL Vision AI"
          title="Accurate Indian Sign Language detection in your browser."
          description="Position one or both hands in front of your camera. Kiri uses adaptive landmark stabilization, multi-frame averaging, and confidence thresholding to accurately detect Two-Handed ISL Alphabets (A–Z) and Indian signs with zero jitter."
        />

        {/* Quick Letter Practice Selector Bar */}
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Quick Letter Practice (A–Z):
              </span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[70%] scrollbar-none">
              <button
                onClick={() => setTargetPracticeLetter(null)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                  !targetPracticeLetter
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                Free Mode (Any)
              </button>
              {ISL_ALPHABET_DATASET.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setTargetPracticeLetter(entry)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shrink-0 ${
                    targetPracticeLetter?.letter === entry.letter
                      ? 'bg-teal-400 text-slate-950 shadow-sm ring-2 ring-teal-300'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={`${entry.letter} (${entry.hindiName}) - ${entry.type}`}
                >
                  {entry.letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Practice Letter Helper Banner */}
        {targetPracticeLetter && (
          <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-teal-500/30 bg-teal-950/40 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400 text-slate-950 font-display text-2xl font-bold shadow-md">
                  {targetPracticeLetter.letter}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-white">
                      Target: Letter {targetPracticeLetter.letter} ({targetPracticeLetter.hindiName})
                    </span>
                    <span className="rounded-md bg-teal-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-300">
                      {targetPracticeLetter.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {targetPracticeLetter.summary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isTargetMatched ? (
                  <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Perfect Match! (सही संकेत)
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Form shape in camera to verify...
                  </div>
                )}
                <button
                  onClick={() => setTargetPracticeLetter(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Close target helper"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto mt-4 max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
            {/* Top Toolbar with Pipeline Mode & Tuning Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    active ? 'animate-pulse bg-teal-400 shadow-[0_0_8px_#2dd4bf]' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-300">
                  {active ? (
                    <span className="flex items-center gap-1.5">
                      <span>ISL Vision Engine Active</span>
                      {result.mode && (
                        <span className="rounded bg-teal-400/20 px-1.5 py-0.5 text-[10px] text-teal-300 font-mono">
                          {result.mode}
                        </span>
                      )}
                    </span>
                  ) : (
                    'Translator Paused'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* Pipeline Accuracy Preset Selector */}
                <div className="flex items-center rounded-xl bg-slate-950/70 p-1 border border-white/10 text-[11px]">
                  <button
                    onClick={() => applyPreset('responsive')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                      pipelinePreset === 'responsive'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Faster recognition with lower confidence threshold (55%, 3 frames)"
                  >
                    <Zap size={12} /> Fast
                  </button>
                  <button
                    onClick={() => applyPreset('balanced')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                      pipelinePreset === 'balanced'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Optimal balance of speed and precision (68%, 6 frames)"
                  >
                    <Activity size={12} /> Balanced
                  </button>
                  <button
                    onClick={() => applyPreset('precision')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition ${
                      pipelinePreset === 'precision'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Strict noise filtering and high threshold (80%, 9 frames)"
                  >
                    <ShieldCheck size={12} /> Studio Precision
                  </button>
                </div>

                <button
                  onClick={() => setShowTuning(!showTuning)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                    showTuning
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  title="Tune confidence threshold and frame averaging parameters"
                >
                  <SlidersHorizontal size={14} /> Accuracy Engine
                </button>

                <span className="h-4 w-px bg-white/10" />

                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                    showGuide
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <BookOpen size={14} /> Guide
                </button>

                <button
                  onClick={() => setListening(!listening)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition ${
                    listening
                      ? 'bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/30'
                      : 'text-slate-500 hover:bg-white/5'
                  }`}
                  title={listening ? 'Auto-commit when sign is held stable' : 'Manual entry only'}
                >
                  {listening ? <Mic2 size={14} /> : <MicOff size={14} />}
                  Auto-commit: {listening ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Pipeline Configuration Drawer */}
            {showTuning && (
              <div className="border-b border-white/10 bg-slate-950/95 p-4 backdrop-blur transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-teal-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Video Pipeline & Thresholding Parameters
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Adjust confidence cutoff, sliding frame averaging window, and landmark smoothing
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:w-auto text-xs">
                    {/* Confidence Threshold Slider */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-300">Confidence Threshold</span>
                        <span className="font-mono text-teal-400">{Math.round(confidenceThreshold * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.40"
                        max="0.92"
                        step="0.02"
                        value={confidenceThreshold}
                        onChange={(e) => {
                          setConfidenceThreshold(parseFloat(e.target.value));
                          setPipelinePreset('custom');
                        }}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-teal-400"
                      />
                      <span className="text-[9px] text-slate-500">Gestures below this confidence are filtered</span>
                    </div>

                    {/* Frame Averaging Window */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-300">Frame Averaging Window</span>
                        <span className="font-mono text-teal-400">{frameWindowSize} frames (~{Math.round(frameWindowSize * 33)}ms)</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        step="1"
                        value={frameWindowSize}
                        onChange={(e) => {
                          setFrameWindowSize(parseInt(e.target.value, 10));
                          setPipelinePreset('custom');
                        }}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-teal-400"
                      />
                      <span className="text-[9px] text-slate-500">Temporal sliding window for candidate voting</span>
                    </div>

                    {/* Landmark Coordinate EMA Toggle */}
                    <div className="flex items-center justify-between sm:justify-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-300">
                        <input
                          type="checkbox"
                          checked={enableLandmarkSmoothing}
                          onChange={(e) => setEnableLandmarkSmoothing(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-400"
                        />
                        <span>Adaptive Landmark EMA Filter</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Stage */}
            <div className="grid lg:grid-cols-[1.35fr_0.65fr] lg:h-[490px]">
              {/* Video and Canvas Area */}
              <div className="relative aspect-video overflow-hidden bg-slate-950 lg:aspect-auto lg:h-full">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${active ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transform: 'scaleX(-1)' }}
                />

                {!active && (
                  <div className="absolute inset-0 flex h-full min-h-[300px] flex-col items-center justify-center px-6 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-400 ring-1 ring-white/10">
                      <Hand size={30} className="text-teal-400" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      Ready to Translate ISL Signs & Alphabets
                    </h3>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
                      Supports full Two-Handed Indian Sign Language (A–Z), single-hand formations, Namaste 🙏, Help 🆘, and numbers (१-१०). Runs 100% on-device.
                    </p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Real-time Detection HUD Card with Live Confidence Gauge */}
                {active && result.letter && (
                  <div className="absolute left-4 top-4 rounded-2xl border border-white/15 bg-slate-950/85 p-3.5 shadow-xl backdrop-blur max-w-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                            Detected ISL Sign
                          </p>
                          {result.mode && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              • {result.mode}
                            </span>
                          )}
                        </div>
                        <p className="font-display text-3xl font-bold tracking-tight text-white">
                          {result.letter}
                        </p>
                        {result.hindiLabel && (
                          <p className="text-xs font-semibold text-teal-300/90">
                            {result.hindiLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="rounded-md bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                          {result.category}
                        </span>
                        <div className="mt-1 flex items-center gap-1 justify-end">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-xs text-slate-300 font-mono font-bold">
                            {Math.round(result.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Threshold & Temporal Gauge */}
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Smoothed Confidence</span>
                        <span className="font-mono text-teal-300 font-semibold">
                          {Math.round(result.confidence * 100)}% (Req: {Math.round(confidenceThreshold * 100)}%)
                        </span>
                      </div>
                      
                      {/* Multi-layer confidence bar with threshold notch */}
                      <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        {/* Threshold vertical line indicator */}
                        <div
                          className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-400/80 shadow-[0_0_4px_#f59e0b]"
                          style={{ left: `${confidenceThreshold * 100}%` }}
                          title={`Threshold: ${Math.round(confidenceThreshold * 100)}%`}
                        />
                        {/* Frame-averaged confidence fill */}
                        <div
                          className={`h-full rounded-full transition-all duration-100 ease-out ${
                            result.confidence >= confidenceThreshold ? 'bg-teal-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min(result.confidence * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Hold Progress Bar */}
                    {listening && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Hold steady to commit</span>
                          <span className="font-mono text-teal-400">
                            {Math.round(holdProgress * 100)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-teal-400 transition-all duration-75 ease-out"
                            style={{ width: `${holdProgress * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-threshold / Stabilizing Feedback Banner */}
                {active && !result.letter && result.rawConfidence > 0.35 && (
                  <div className="absolute left-4 top-4 rounded-xl border border-amber-500/30 bg-slate-950/85 p-3 shadow-xl backdrop-blur max-w-xs">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="animate-pulse text-amber-400" />
                      <span className="text-[11px] font-semibold text-amber-200">
                        {result.label}
                      </span>
                    </div>
                    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-400"
                        style={{ left: `${confidenceThreshold * 100}%` }}
                      />
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-75"
                        style={{ width: `${Math.min(result.confidence * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Hand Guidance Target if No Hand */}
                {active && !result.letter && result.rawConfidence <= 0.35 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-teal-400/40 bg-slate-950/50 px-5 py-4 backdrop-blur-sm">
                      <Hand size={28} className="animate-pulse text-teal-400/70" />
                      <p className="mt-2 text-xs font-medium text-slate-200">
                        Raise one or both hands into camera view
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Try Namaste 🙏 or ISL Alphabet A, B, C, D...
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Finger Tracker HUD (bottom left) */}
                {active && fingerStates && (
                  <div className="absolute bottom-4 left-4 hidden gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-2 backdrop-blur sm:flex">
                    {[
                      { label: 'Th', active: fingerStates.thumb, color: 'bg-teal-400' },
                      { label: 'In', active: fingerStates.index, color: 'bg-sky-400' },
                      { label: 'Mid', active: fingerStates.middle, color: 'bg-indigo-400' },
                      { label: 'Ring', active: fingerStates.ring, color: 'bg-purple-400' },
                      { label: 'Pk', active: fingerStates.pinky, color: 'bg-pink-400' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex flex-col items-center justify-center rounded px-1.5 py-1 text-[9px] font-bold ${
                          item.active
                            ? `${item.color} text-slate-950 shadow-sm`
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary Camera Toggle Button */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {active ? (
                    <button
                      onClick={stopCamera}
                      className="flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-950/50 backdrop-blur transition hover:bg-red-500"
                    >
                      <CircleStop size={15} /> Stop camera
                    </button>
                  ) : (
                    <button
                      onClick={() => void startCamera()}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:bg-teal-400 disabled:opacity-60"
                    >
                      {loading || modelLoading ? (
                        <Loader2 className="animate-spin text-slate-950" size={15} />
                      ) : (
                        <Camera size={15} />
                      )}
                      {loading
                        ? 'Starting camera...'
                        : modelLoading
                          ? 'Loading ISL AI...'
                          : 'Start ISL camera'}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Builder & Controls */}
              <div className="flex flex-col bg-slate-900 p-5 sm:p-6 lg:h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Translated ISL Message
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Live Indian Sign transcription</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={addSpace}
                      className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      title="Insert space"
                    >
                      Space
                    </button>
                    <button
                      onClick={backspace}
                      className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      title="Backspace"
                    >
                      ⌫
                    </button>
                    <button
                      onClick={clearText}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                      aria-label="Clear message"
                      title="Clear message"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                {/* Message Display Box */}
                <div className="mt-4 flex min-h-[140px] flex-1 flex-col justify-between overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p
                    className={`font-display text-2xl font-semibold leading-relaxed tracking-wide break-words ${
                      text ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {text || 'Sign ISL letters or gestures to construct message...'}
                  </p>

                  {lastCommitted && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-teal-400">
                      <CheckCircle2 size={12} /> Recognized: &ldquo;{lastCommitted}&rdquo;
                    </div>
                  )}
                </div>

                {/* Manual Add Sign Button (Optional) */}
                {active && result.letter && (
                  <button
                    onClick={addCurrentSignManual}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-teal-300 transition hover:bg-white/10"
                  >
                    <Plus size={14} /> Add &ldquo;{result.letter}&rdquo; now
                  </button>
                )}

                {/* Speak Action Button */}
                <button
                  onClick={() => void speakText()}
                  disabled={!text || !isSpeechSupported()}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSpeaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  {isSpeaking ? 'Speaking message...' : 'Speak message (आवाज़)'}
                </button>
              </div>
            </div>

            {/* Expandable ISL Guide Cheat Sheet */}
            {showGuide && (
              <div className="border-t border-white/10 bg-slate-950/90 p-5 backdrop-blur">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Sparkles size={14} className="text-teal-400" /> Supported Indian Sign Language (ISL) Vocabulary
                  </div>
                  <span className="text-[11px] text-slate-500">Hold steady for ~0.25s to confirm</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {ISL_VOCAB_GUIDE.map((item) => (
                    <div
                      key={item.sign}
                      className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:border-teal-400/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-base font-bold text-white">
                          {item.sign}
                        </span>
                        <span className="text-[9px] font-semibold uppercase text-teal-400">
                          {item.type}
                        </span>
                      </div>
                      <span className="mt-1 text-[11px] leading-tight text-slate-400">
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-auto mt-4 max-w-5xl flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <Info size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => void initModel()}
                disabled={modelLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-400/30 px-3 py-1.5 font-semibold text-red-200 hover:bg-red-500/30 transition disabled:opacity-50"
              >
                <RotateCcw size={13} className={modelLoading ? 'animate-spin' : ''} />
                {modelLoading ? 'Retrying...' : 'Retry loading model'}
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-slate-400">
              <Sparkles size={14} className="mr-1 inline text-teal-400" /> Powered by MediaPipe vision tracking with adaptive landmark EMA smoothing, multi-frame averaging, and confidence thresholding.
            </p>
            {!user && (
              <button
                onClick={onAuthClick}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300"
              >
                Sign in to save your ISL translations →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

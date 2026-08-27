import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  CircleStop,
  Hand,
  Info,
  Loader2,
  Mic2,
  MicOff,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  recognizeFrame,
  getHandLandmarker,
  resetLandmarkerTimestamp,
  HAND_CONNECTIONS,
  FINGER_COLORS,
  WRIST,
  THUMB_TIP,
  INDEX_TIP,
  MIDDLE_TIP,
  RING_TIP,
  PINKY_TIP,
  type RecognitionResult,
} from '@/lib/gestureRecognition';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import SectionHeading from '@/components/SectionHeading';

type TranslateProps = { onAuthClick: () => void };

const ASL_SIGNS = [
  { sign: 'A', desc: 'Fist, thumb up on side', category: 'Letter' },
  { sign: 'B', desc: '4 fingers up, thumb in', category: 'Letter' },
  { sign: 'C', desc: 'Curved cup shape', category: 'Letter' },
  { sign: 'D', desc: 'Index up, thumb on middle', category: 'Letter' },
  { sign: 'E', desc: 'Fingers curled over thumb', category: 'Letter' },
  { sign: 'F', desc: 'Index & thumb pinch, 3 up', category: 'Letter' },
  { sign: 'I', desc: 'Pinky finger up only', category: 'Letter' },
  { sign: 'K', desc: 'Index up, middle forward', category: 'Letter' },
  { sign: 'L', desc: 'L shape with thumb & index', category: 'Letter' },
  { sign: 'O', desc: 'All tips touch thumb (circle)', category: 'Letter' },
  { sign: 'R', desc: 'Index & middle crossed', category: 'Letter' },
  { sign: 'S', desc: 'Fist, thumb across front', category: 'Letter' },
  { sign: 'U', desc: 'Index & middle up together', category: 'Letter' },
  { sign: 'V', desc: 'Peace sign (2 up spread)', category: 'Letter' },
  { sign: 'W', desc: '3 fingers up spread', category: 'Letter' },
  { sign: 'X', desc: 'Index hooked knuckle', category: 'Letter' },
  { sign: 'Y', desc: 'Thumb & pinky (hang loose)', category: 'Letter' },
  { sign: '🤟', desc: 'I Love You (Thumb+Index+Pinky)', category: 'Phrase' },
  { sign: '👍', desc: 'Thumbs Up (Good / Agree)', category: 'Sign' },
  { sign: '5', desc: 'Open hand (5 spread)', category: 'Number' },
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
  const [result, setResult] = useState<RecognitionResult>({
    letter: null,
    label: 'Camera not started',
    category: 'letter',
    confidence: 0,
    landmarks: null,
  });

  const [holdProgress, setHoldProgress] = useState(0);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [lastCommitted, setLastCommitted] = useState<string | null>(null);

  const { user } = useAuth();
  const REQUIRED_STABLE_FRAMES = 8; // ~250-300ms hold

  // Preload the model on mount so the camera starts instantly
  useEffect(() => {
    let cancelled = false;
    getHandLandmarker()
      .then(() => {
        if (!cancelled) setModelReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load the gesture model. Please check your internet connection.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep ref in sync with state for use inside the loop
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const drawLandmarks = useCallback((landmarks: RecognitionResult['landmarks'], currentLetter: string | null) => {
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
    if (!landmarks || landmarks.length === 0) return;

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

    // Floating detected letter tag above hand
    if (currentLetter) {
      const topLandmark = landmarks.reduce((min, p) => (p.y < min.y ? p : min), landmarks[0]);
      const tagX = topLandmark.x * canvas.width;
      const tagY = Math.max(topLandmark.y * canvas.height - 24, 20);

      ctx.save();
      // Tag pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.5;
      const tagWidth = 60;
      const tagHeight = 26;
      ctx.beginPath();
      ctx.roundRect(tagX - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight, 13);
      ctx.fill();
      ctx.stroke();

      // Tag Text
      ctx.fillStyle = '#2dd4bf';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentLetter, tagX, tagY);
      ctx.restore();
    }
  }, []);

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !active || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const frame = await recognizeFrame(video, performance.now());
      setResult(frame);
      drawLandmarks(frame.landmarks, frame.letter);

      if (frame.letter) {
        if (frame.letter === lastCandidateRef.current) {
          candidateFramesRef.current += 1;
        } else {
          lastCandidateRef.current = frame.letter;
          candidateFramesRef.current = 1;
          // If changed sign, unlock committed state
          if (committedSignRef.current !== frame.letter) {
            committedSignRef.current = null;
          }
        }

        const progress = Math.min(
          1,
          candidateFramesRef.current / REQUIRED_STABLE_FRAMES
        );
        setHoldProgress(progress);

        // Commit candidate if stable and not already committed in this hold
        if (
          candidateFramesRef.current >= REQUIRED_STABLE_FRAMES &&
          committedSignRef.current !== frame.letter &&
          listeningRef.current
        ) {
          committedSignRef.current = frame.letter;
          setLastCommitted(frame.letter);
          playConfirmTone();

          if (frame.letter === 'ILY') {
            setText((prev) => (prev ? prev + ' I Love You ' : 'I Love You '));
          } else if (frame.letter === '👍') {
            setText((prev) => (prev ? prev + ' Yes ' : 'Yes '));
          } else {
            setText((prev) => prev + frame.letter);
          }
        }
      } else {
        // No hand or no recognized sign -> reset stability counter
        lastCandidateRef.current = null;
        candidateFramesRef.current = 0;
        committedSignRef.current = null;
        setHoldProgress(0);
      }
    } catch {
      // Ignore intermediate frame errors
    } finally {
      isProcessingRef.current = false;
    }

    frameRef.current = requestAnimationFrame(() => {
      void loop();
    });
  }, [active, drawLandmarks]);

  useEffect(() => {
    if (active) {
      frameRef.current = requestAnimationFrame(() => {
        void loop();
      });
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, loop]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopSpeaking();
      resetLandmarkerTimestamp();
    },
    []
  );

  const startCamera = async () => {
    setLoading(true);
    setError('');
    resetLandmarkerTimestamp();
    try {
      await getHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError(
        'Camera access was blocked. Please allow camera permissions in your browser address bar and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    setActive(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    resetLandmarkerTimestamp();
    setResult({
      letter: null,
      label: 'Camera paused',
      category: 'letter',
      confidence: 0,
      landmarks: null,
    });
    setHoldProgress(0);
    lastCandidateRef.current = null;
    candidateFramesRef.current = 0;
    committedSignRef.current = null;
  };

  const addCurrentSignManual = () => {
    if (!result.letter) return;
    playConfirmTone();
    setLastCommitted(result.letter);
    if (result.letter === 'ILY') {
      setText((prev) => (prev ? prev + ' I Love You ' : 'I Love You '));
    } else if (result.letter === '👍') {
      setText((prev) => (prev ? prev + ' Yes ' : 'Yes '));
    } else {
      setText((prev) => prev + result.letter);
    }
  };

  const clearText = () => {
    setText('');
    lastCandidateRef.current = null;
    candidateFramesRef.current = 0;
    committedSignRef.current = null;
    setHoldProgress(0);
    setLastCommitted(null);
  };

  const addSpace = () => {
    setText((prev) => (prev ? prev + ' ' : prev));
  };

  const backspace = () => {
    setText((prev) => prev.slice(0, -1));
  };

  const speakText = async () => {
    if (!text || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await speak(text);
    } catch (err) {
      console.error('Speech error:', err);
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

  return (
    <section id="translate" className="bg-slate-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          light
          eyebrow="Real-Time Vision Translator"
          title="Your hands. Their words."
          description="Position your hand within the frame. SignSpeak uses on-device computer vision to recognize ASL fingerspelling and signs in real time."
        />

        <div className="mx-auto mt-12 max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/90 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    active ? 'animate-pulse bg-teal-400 shadow-[0_0_8px_#2dd4bf]' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-300">
                  {active ? 'Vision Engine Active' : 'Translator Paused'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                    showGuide
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <BookOpen size={14} /> ASL Guide
                </button>
                <span className="h-4 w-px bg-white/10" />
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
                      Ready to Translate
                    </h3>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
                      Video stream runs 100% locally in your browser. No camera frames are stored or transmitted.
                    </p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Floating Sign Detection HUD Card */}
                {active && result.letter && (
                  <div className="absolute left-4 top-4 rounded-2xl border border-white/15 bg-slate-950/85 p-3.5 shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                          Detected Sign
                        </p>
                        <p className="font-display text-3xl font-bold tracking-tight text-white">
                          {result.letter}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-md bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                          {result.category}
                        </span>
                        <p className="mt-1 text-xs text-slate-400">
                          {Math.round(result.confidence * 100)}% match
                        </p>
                      </div>
                    </div>

                    {/* Hold Progress Bar */}
                    {listening && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Hold to commit</span>
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

                {/* Hand Guidance Target if No Hand */}
                {active && !result.letter && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-teal-400/40 bg-slate-950/40 px-5 py-4 backdrop-blur-sm">
                      <Hand size={28} className="animate-pulse text-teal-400/70" />
                      <p className="mt-2 text-xs font-medium text-slate-300">
                        Raise hand facing camera
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
                      disabled={loading || !modelReady}
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-950/40 transition hover:bg-brand-500 disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <Camera size={15} />
                      )}
                      {loading
                        ? 'Starting camera...'
                        : !modelReady
                          ? 'Loading vision AI...'
                          : 'Start camera'}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Builder & Controls */}
              <div className="flex flex-col bg-slate-900 p-5 sm:p-6 lg:h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Translated Message
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Form words and sentences</p>
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
                    {text || 'Sign in front of camera to begin...'}
                  </p>

                  {lastCommitted && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-teal-400">
                      <CheckCircle2 size={12} /> Added: &ldquo;{lastCommitted}&rdquo;
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
                  {isSpeaking ? 'Speaking message...' : 'Speak message'}
                </button>
              </div>
            </div>

            {/* Expandable ASL Guide Cheat Sheet */}
            {showGuide && (
              <div className="border-t border-white/10 bg-slate-950/90 p-5 backdrop-blur">
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Sparkles size={14} className="text-teal-400" /> Supported ASL Vocabulary & Quick Guide
                  </div>
                  <span className="text-[11px] text-slate-500">Hold steady for ~0.3s to confirm</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {ASL_SIGNS.map((item) => (
                    <div
                      key={item.sign}
                      className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-2.5 transition hover:border-teal-400/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-bold text-white">
                          {item.sign}
                        </span>
                        <span className="text-[9px] font-semibold uppercase text-teal-400">
                          {item.category}
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
            <div className="mx-auto mt-4 max-w-5xl flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              <Info size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-slate-400">
              <Sparkles size={14} className="mr-1 inline text-teal-400" /> Powered by MediaPipe 21-point hand landmark tracking with adaptive distance scaling.
            </p>
            {!user && (
              <button
                onClick={onAuthClick}
                className="text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                Sign in to save your translations →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


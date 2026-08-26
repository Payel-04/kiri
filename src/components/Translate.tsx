import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CircleStop,
  Loader2,
  Mic2,
  MicOff,
  RotateCcw,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import {
  recognizeFrame,
  getHandLandmarker,
  HAND_CONNECTIONS,
  type RecognitionResult,
} from '@/lib/gestureRecognition';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import SectionHeading from '@/components/SectionHeading';

type TranslateProps = { onAuthClick: () => void };

export default function Translate({ onAuthClick }: TranslateProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastLetterRef = useRef('');
  const stableCountRef = useRef(0);
  const listeningRef = useRef(true);
  const isProcessingRef = useRef(false);

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RecognitionResult>({
    letter: null,
    confidence: 0,
    landmarks: null,
  });
  const [text, setText] = useState('');
  const [listening, setListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { user } = useAuth();

  // Preload the model on mount so the camera starts instantly
  useEffect(() => {
    let cancelled = false;
    getHandLandmarker()
      .then(() => {
        if (!cancelled) setModelReady(true);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the gesture model. Check your connection and reload.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep ref in sync with state for use inside the rAF loop
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const drawLandmarks = useCallback((landmarks: RecognitionResult['landmarks']) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    ctx.strokeStyle = '#6eb2ff';
    ctx.lineWidth = 3;
    HAND_CONNECTIONS.forEach(([a, b]) => {
      const one = landmarks[a];
      const two = landmarks[b];
      if (!one || !two) return;
      ctx.beginPath();
      ctx.moveTo(one.x * canvas.width, one.y * canvas.height);
      ctx.lineTo(two.x * canvas.width, two.y * canvas.height);
      ctx.stroke();
    });
    ctx.fillStyle = '#ffffff';
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !active || isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const frame = await recognizeFrame(video, performance.now());
      setResult(frame);
      drawLandmarks(frame.landmarks);
      if (frame.letter && frame.letter === lastLetterRef.current) {
        stableCountRef.current += 1;
      } else {
        lastLetterRef.current = frame.letter ?? '';
        stableCountRef.current = 0;
      }
      if (frame.letter && stableCountRef.current === 10 && listeningRef.current) {
        setText((prev) => prev + frame.letter);
        stableCountRef.current = 0;
      }
    } catch {
      // Ignore frame errors in loop
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
    },
    []
  );

  const startCamera = async () => {
    setLoading(true);
    setError('');
    try {
      await getHandLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
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
        'Camera access was blocked. Please allow camera access in your browser settings and try again.'
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
    setResult({ letter: null, confidence: 0, landmarks: null });
  };

  const clearText = () => {
    setText('');
    lastLetterRef.current = '';
    stableCountRef.current = 0;
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

  return (
    <section id="translate" className="bg-slate-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          light
          eyebrow="The translator"
          title="Your hands. Their words."
          description="Allow camera access and start signing. SignSpeak will recognize your gestures and build your message letter by letter."
        />
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${active ? 'animate-pulse bg-teal-400' : 'bg-slate-600'}`}
                />
                <span className="text-xs font-semibold text-slate-300">
                  {active ? 'Camera is ready' : 'Translator paused'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>English · ASL</span>
                <span className="h-4 w-px bg-white/10" />
                <button
                  onClick={() => setListening(!listening)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${listening ? 'text-teal-300' : 'text-slate-500'}`}
                >
                  {listening ? <Mic2 size={14} /> : <MicOff size={14} />} Auto-add
                </button>
              </div>
            </div>
            <div className="grid lg:grid-cols-[1.3fr_0.7fr] lg:h-[460px]">
              <div className="relative aspect-video overflow-hidden bg-slate-800 lg:aspect-auto lg:h-full">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${active ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!active && (
                  <div className="absolute inset-0 flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                      <Camera size={29} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      Ready when you are
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                      Your video stays on this device and is never recorded or uploaded.
                    </p>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {active && result.letter && (
                  <div className="absolute left-5 top-5 rounded-xl bg-slate-950/70 px-3 py-2 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                      Detected sign
                    </p>
                    <p className="font-display text-2xl font-bold text-white">{result.letter}</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {active ? (
                    <button
                      onClick={stopCamera}
                      className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-600"
                    >
                      <CircleStop size={16} /> Stop camera
                    </button>
                  ) : (
                    <button
                      onClick={() => void startCamera()}
                      disabled={loading || !modelReady}
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-950/30 transition hover:bg-brand-500 disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Camera size={16} />
                      )}{' '}
                      {loading
                        ? 'Waking camera...'
                        : !modelReady
                          ? 'Loading model...'
                          : 'Start camera'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col bg-slate-900 p-5 sm:p-6 lg:h-full lg:overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                      Your message
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Build a phrase with signs</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={addSpace}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                      title="Add space"
                    >
                      Space
                    </button>
                    <button
                      onClick={backspace}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                      title="Delete character"
                    >
                      Delete
                    </button>
                    <button
                      onClick={clearText}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                      aria-label="Clear message"
                      title="Clear message"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex min-h-[140px] flex-1 items-start overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p
                    className={`font-display text-2xl font-semibold leading-relaxed break-all ${text ? 'text-white' : 'text-slate-600'}`}
                  >
                    {text || 'Your signs will appear here...'}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                  <span className="text-xs text-slate-500">
                    {result.letter
                      ? `Recognizing ${result.letter}`
                      : 'Show your hand to begin'}
                  </span>
                  <span className="text-xs font-semibold text-teal-400">
                    {result.letter ? `${Math.round(result.confidence * 100)}%` : '—'}
                  </span>
                </div>
                <button
                  onClick={() => void speakText()}
                  disabled={!text || !isSpeechSupported()}
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSpeaking ? <VolumeX size={17} /> : <Volume2 size={17} />}{' '}
                  {isSpeaking ? 'Speaking...' : 'Speak message'}
                </button>
              </div>
            </div>
          </div>
          {error && (
            <p className="mx-auto mt-4 max-w-5xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-slate-500">
              <Wand2 size={14} className="mr-1 inline text-accent-400" /> Heuristic recognition is
              ready for common ASL letters.
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

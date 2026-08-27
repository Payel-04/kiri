import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Volume2,
  X,
  CheckCircle2,
  Video,
  ArrowRight,
  FlipHorizontal,
  HelpCircle,
} from 'lucide-react';
import {
  ASL_DICTIONARY,
  ASL_CATEGORIES,
  type ASLSign,
} from '@/data/aslDictionary';
import { speak } from '@/lib/speech';
import SectionHeading from '@/components/SectionHeading';

const FAVORITES_KEY = 'signspeak_saved_signs';

export default function Dictionary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyCameraReady, setOnlyCameraReady] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedSign, setSelectedSign] = useState<ASLSign | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : ['hello', 'thank-you', 'i-love-you'];
    } catch {
      return ['hello', 'thank-you', 'i-love-you'];
    }
  });

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // storage ignored
      }
      return next;
    });
  };

  // Filtered signs
  const filteredSigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ASL_DICTIONARY.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (onlyCameraReady && !item.recognizedInCamera) {
        return false;
      }
      if (onlyFavorites && !favorites.includes(item.id)) {
        return false;
      }
      if (!query) return true;

      return (
        item.word.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.handshape.toLowerCase().includes(query) ||
        item.synonyms.some((s) => s.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, selectedCategory, onlyCameraReady, onlyFavorites, favorites]);

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    speak(text);
  };

  const jumpToCamera = () => {
    setSelectedSign(null);
    const elem = document.getElementById('translate');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="dictionary" className="relative bg-slate-900 py-20 sm:py-28 text-white">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          light
          eyebrow="Interactive ASL Dictionary"
          title="Search, watch, and master everyday signs"
          description="Browse common American Sign Language gestures with slow-motion video demonstrations, detailed handshape mechanics, and memory tips."
        />

        {/* Search & Filter Bar */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            {/* Main Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search signs by word (e.g. 'Hello', 'Water', 'Thank You', 'A-Z')..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-10 text-sm font-medium text-white placeholder-slate-400 transition focus:border-teal-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ASL_CATEGORIES.map((cat) => {
                const count =
                  cat === 'All'
                    ? ASL_DICTIONARY.length
                    : ASL_DICTIONARY.filter((i) => i.category === cat).length;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                        : 'border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? 'bg-slate-950/20 text-slate-900' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Filter Toggles */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setOnlyCameraReady(!onlyCameraReady)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                    onlyCameraReady
                      ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Live Camera Verified</span>
                </button>

                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                    onlyFavorites
                      ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Bookmark size={13} />
                  <span>Saved Signs ({favorites.length})</span>
                </button>
              </div>

              <div className="text-slate-400">
                Showing <span className="font-semibold text-teal-300">{filteredSigns.length}</span> signs
              </div>
            </div>
          </div>
        </div>

        {/* Dictionary Grid */}
        <div className="mx-auto mt-10 max-w-6xl">
          {filteredSigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
                <Search size={28} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">No signs found</h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                Try adjusting your search query or switching categories to discover other ASL vocabulary.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setOnlyCameraReady(false);
                  setOnlyFavorites(false);
                }}
                className="mt-5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSigns.map((sign) => {
                const isFav = favorites.includes(sign.id);

                return (
                  <div
                    key={sign.id}
                    onClick={() => setSelectedSign(sign)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-teal-400/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-teal-950/30 cursor-pointer"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl font-bold transition group-hover:scale-110 group-hover:bg-teal-500/10">
                            {sign.emoji}
                          </span>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                              {sign.category}
                            </span>
                            <h3 className="font-display text-base font-bold text-white group-hover:text-teal-200">
                              {sign.word}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleSpeak(sign.word, e)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                            title="Hear pronunciation"
                          >
                            <Volume2 size={15} />
                          </button>
                          <button
                            onClick={(e) => toggleFavorite(sign.id, e)}
                            className={`rounded-lg p-1.5 transition ${
                              isFav
                                ? 'text-amber-400 hover:bg-amber-400/10'
                                : 'text-slate-500 hover:bg-white/10 hover:text-slate-300'
                            }`}
                            title={isFav ? 'Remove from saved' : 'Save sign'}
                          >
                            {isFav ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">
                        {sign.summary}
                      </p>

                      {/* Mechanics Snippet */}
                      <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Handshape: </span>
                        <span className="line-clamp-1">{sign.handshape}</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                      {sign.recognizedInCamera ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-brand-300">
                          <Sparkles size={12} className="text-teal-400" />
                          <span>Live Camera Ready</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">{sign.difficulty}</span>
                      )}

                      <span className="flex items-center gap-1 text-xs font-semibold text-teal-400 group-hover:translate-x-0.5 transition">
                        <span>Demonstration</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pro Tip Banner */}
        <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <HelpCircle size={20} />
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                <strong className="text-white">Sign Language Learning Tip:</strong> Always practice with your dominant hand as the active mover, while non-dominant hand acts as the steady base in two-handed signs.
              </p>
            </div>
            <a
              href="#translate"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-teal-400/20 transition hover:bg-teal-300"
            >
              <Video size={14} /> Practice in Camera
            </a>
          </div>
        </div>
      </div>

      {/* Video Demonstration & Deep Dive Modal */}
      {selectedSign && (
        <SignDetailModal
          sign={selectedSign}
          isFavorite={favorites.includes(selectedSign.id)}
          onToggleFavorite={() => toggleFavorite(selectedSign.id)}
          onClose={() => setSelectedSign(null)}
          onPractice={jumpToCamera}
        />
      )}
    </section>
  );
}

// ---------------- Detailed Modal Subcomponent ----------------

type ModalProps = {
  sign: ASLSign;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onPractice: (word: string) => void;
};

function SignDetailModal({
  sign,
  isFavorite,
  onToggleFavorite,
  onClose,
  onPractice,
}: ModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    void videoRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md sm:p-6">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{sign.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-white">{sign.word}</h2>
                <span className="rounded-md bg-teal-400/20 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                  {sign.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">ASL Visual Demonstration & Guide</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => speak(sign.word)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Hear word"
            >
              <Volume2 size={16} />
            </button>
            <button
              onClick={onToggleFavorite}
              className={`rounded-xl border border-white/10 bg-white/5 p-2 transition ${
                isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
              title={isFavorite ? 'Saved' : 'Save sign'}
            >
              {isFavorite ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 scrollbar-thin">
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            {/* Video Demonstration Player */}
            <div>
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                {sign.videoUrl && !videoError ? (
                  <video
                    ref={videoRef}
                    src={sign.videoUrl}
                    loop
                    autoPlay
                    muted
                    playsInline
                    onError={() => setVideoError(true)}
                    className={`h-full w-full object-cover transition-transform ${
                      isMirrored ? 'scale-x-[-1]' : ''
                    }`}
                  />
                ) : (
                  /* High quality animated visual illustration if video isn't available or errored */
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-teal-500/10 ring-1 ring-teal-400/30">
                      <span className="text-5xl animate-bounce">{sign.emoji}</span>
                    </div>
                    <p className="mt-4 font-display text-sm font-bold text-white">{sign.word}</p>
                    <p className="mt-1 text-xs text-slate-400 max-w-xs">{sign.summary}</p>
                  </div>
                )}

                {/* Floating Video Overlay Controls */}
                {sign.videoUrl && !videoError && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlay}
                        className="rounded-lg p-1 text-white hover:bg-white/10"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={restartVideo}
                        className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                        title="Replay"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Playback speed selector */}
                      <div className="flex items-center rounded-lg bg-white/5 p-0.5 text-[10px] font-bold">
                        {[0.5, 0.75, 1].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setPlaybackRate(rate)}
                            className={`rounded px-1.5 py-0.5 transition ${
                              playbackRate === rate
                                ? 'bg-teal-400 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>

                      {/* Mirror flip button */}
                      <button
                        onClick={() => setIsMirrored(!isMirrored)}
                        className={`rounded-lg p-1 text-xs transition ${
                          isMirrored ? 'bg-teal-400/20 text-teal-300' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Mirror video (flip view for dominant hand matching)"
                      >
                        <FlipHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Callout */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => onPractice(sign.word)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:bg-teal-300"
                >
                  <Video size={16} />
                  Practice &quot;{sign.word}&quot; in Live Camera
                </button>
              </div>
            </div>

            {/* Mechanics & 4 Pillars Breakdown */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  ASL Sign Mechanics
                </h4>

                <div className="mt-3 space-y-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-white">✋ Handshape: </span>
                    <span className="text-slate-300">{sign.handshape}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">🔄 Movement: </span>
                    <span className="text-slate-300">{sign.movement}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">🧭 Palm Orientation: </span>
                    <span className="text-slate-300">{sign.palmOrientation}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">📍 Location: </span>
                    <span className="text-slate-300">{sign.location}</span>
                  </div>
                </div>
              </div>

              {/* Memory Tips */}
              {sign.tips.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Pro Tips & Memory Aid
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                    {sign.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-400" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Synonyms */}
              {sign.synonyms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Related words:</span>
                  {sign.synonyms.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

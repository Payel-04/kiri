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
  Folder,
  ExternalLink,
  Database,
  Grid,
  Hand,
  Layers,
} from 'lucide-react';
import {
  ISL_DICTIONARY,
  ISL_CATEGORIES,
  type ISLSign,
} from '@/data/islDictionary';
import {
  DATASET_FOLDERS,
  DATASET_SIGNS,
  type DatasetItem,
} from '@/data/driveDataset';
import {
  ISL_ALPHABET_DATASET,
  type ISLAlphabetEntry,
} from '@/data/alphabetDataset';
import { speak } from '@/lib/speech';
import SectionHeading from '@/components/SectionHeading';

const FAVORITES_KEY = 'kiri_isl_saved_signs';

type ViewMode = 'curated' | 'alphabet' | 'dataset' | 'folders';

export default function Dictionary() {
  const [viewMode, setViewMode] = useState<ViewMode>('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [alphabetHandFilter, setAlphabetHandFilter] = useState<'All' | 'Single-Hand' | 'Two-Handed'>('All');
  const [onlyCameraReady, setOnlyCameraReady] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedSign, setSelectedSign] = useState<ISLSign | null>(null);
  const [selectedDatasetSign, setSelectedDatasetSign] = useState<DatasetItem | null>(null);
  const [selectedAlphabetSign, setSelectedAlphabetSign] = useState<ISLAlphabetEntry | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY) || localStorage.getItem('kiri_saved_signs');
      return stored ? JSON.parse(stored) : ['namaste', 'thank-you-isl', 'love-isl', 'water-isl', 'chai-isl'];
    } catch {
      return ['namaste', 'thank-you-isl', 'love-isl', 'water-isl', 'chai-isl'];
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

  // Filtered curated ISL signs
  const filteredSigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ISL_DICTIONARY.filter((item) => {
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

      const hindi = item.hindiWord || '';
      return (
        item.word.toLowerCase().includes(query) ||
        hindi.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.handshape.toLowerCase().includes(query) ||
        item.synonyms.some((s) => s.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, selectedCategory, onlyCameraReady, onlyFavorites, favorites]);

  // Filtered Alphabet dataset entries
  const filteredAlphabetSigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ISL_ALPHABET_DATASET.filter((entry) => {
      if (alphabetHandFilter !== 'All' && entry.type !== alphabetHandFilter) {
        return false;
      }
      if (!query) return true;

      return (
        entry.letter.toLowerCase() === query ||
        entry.letter.toLowerCase().includes(query) ||
        entry.hindiName.toLowerCase().includes(query) ||
        entry.devanagariPhonetic.toLowerCase().includes(query) ||
        entry.summary.toLowerCase().includes(query) ||
        entry.mnemonic.toLowerCase().includes(query) ||
        entry.dominantHand.handshape.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, alphabetHandFilter]);

  // Filtered dataset signs
  const filteredDatasetSigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return DATASET_SIGNS.filter((item) => {
      if (selectedFolder !== 'All' && item.folder !== selectedFolder) {
        return false;
      }
      if (!query) return true;

      return (
        item.title.toLowerCase().includes(query) ||
        item.folder.toLowerCase().includes(query) ||
        item.filename.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, selectedFolder]);

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    speak(text);
  };

  const jumpToCamera = () => {
    setSelectedSign(null);
    setSelectedDatasetSign(null);
    setSelectedAlphabetSign(null);
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
          eyebrow="Indian Sign Language (ISL) Dictionary & Dataset"
          title="Search, practice, and master Indian Sign Language"
          description="Browse curated Indian Sign Language (भारतीय सांकेतिक भाषा) gestures with Hindi translations, two-handed mechanics breakdowns, alphabet dataset references, and video recordings."
        />

        {/* View Mode Tabs */}
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-1.5 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setViewMode('curated')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              viewMode === 'curated'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid size={15} />
            <span>ISL Guides ({ISL_DICTIONARY.length})</span>
          </button>
          <button
            onClick={() => setViewMode('alphabet')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              viewMode === 'alphabet'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hand size={15} />
            <span>Alphabet A–Z ({ISL_ALPHABET_DATASET.length})</span>
          </button>
          <button
            onClick={() => setViewMode('dataset')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              viewMode === 'dataset'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database size={15} />
            <span>Dataset Library ({DATASET_SIGNS.length})</span>
          </button>
          <button
            onClick={() => setViewMode('folders')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              viewMode === 'folders'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Folder size={15} />
            <span>Drive Folders ({DATASET_FOLDERS.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {viewMode !== 'folders' && (
          <div className="mx-auto mt-8 max-w-5xl">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
              {/* Main Search Input */}
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    viewMode === 'curated'
                      ? "Search ISL signs (e.g. 'Namaste', 'नमस्ते', 'Water', 'Chai')..."
                      : viewMode === 'alphabet'
                      ? "Search ISL letters (e.g. 'A', 'बी', 'M', 'Single-Hand', 'Two-Handed')..."
                      : "Search 970+ dataset signs by word, letter, or number..."
                  }
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

              {/* Curated Category Pills */}
              {viewMode === 'curated' && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {ISL_CATEGORIES.map((cat) => {
                    const count =
                      cat === 'All'
                        ? ISL_DICTIONARY.length
                        : ISL_DICTIONARY.filter((i) => i.category === cat).length;
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
              )}

              {/* Alphabet Dataset Hand Filter Pills */}
              {viewMode === 'alphabet' && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {(['All', 'Two-Handed', 'Single-Hand'] as const).map((type) => {
                    const count =
                      type === 'All'
                        ? ISL_ALPHABET_DATASET.length
                        : ISL_ALPHABET_DATASET.filter((i) => i.type === type).length;
                    const isSelected = alphabetHandFilter === type;

                    return (
                      <button
                        key={type}
                        onClick={() => setAlphabetHandFilter(type)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                            : 'border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{type === 'All' ? 'All Letters (A–Z)' : type === 'Two-Handed' ? 'Two-Handed ISL (दो हाथ)' : 'Single-Hand (एक हाथ)'}</span>
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
              )}

              {/* Dataset Folder Pills */}
              {viewMode === 'dataset' && (
                <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedFolder('All')}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedFolder === 'All'
                        ? 'bg-teal-400 text-slate-950'
                        : 'border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>All Folders</span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                      {DATASET_SIGNS.length}
                    </span>
                  </button>

                  {DATASET_FOLDERS.map((folder) => {
                    const isSelected = selectedFolder === folder.name;
                    return (
                      <button
                        key={folder.name}
                        onClick={() => setSelectedFolder(folder.name)}
                        className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-teal-400 text-slate-950 shadow-md'
                            : 'border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{folder.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isSelected ? 'bg-slate-950/20 text-slate-900' : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {folder.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Filter Toggles for Curated */}
              {viewMode === 'curated' && (
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
                    Showing <span className="font-semibold text-teal-300">{filteredSigns.length}</span> ISL signs
                  </div>
                </div>
              )}

              {viewMode === 'alphabet' && (
                <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
                    <span>Based on 26 Indian Sign Language manual letter references (A.jpg – Z.jpg)</span>
                  </div>
                  <div>
                    Showing <span className="font-semibold text-teal-300">{filteredAlphabetSigns.length}</span> / 26 letters
                  </div>
                </div>
              )}

              {viewMode === 'dataset' && (
                <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-slate-400">
                  <span>Filtered Dataset Videos</span>
                  <div>
                    Showing <span className="font-semibold text-teal-300">{filteredDatasetSigns.length}</span> signs
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Mode 1: Curated ISL Signs Grid */}
        {viewMode === 'curated' && (
          <div className="mx-auto mt-10 max-w-6xl">
            {filteredSigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
                  <Search size={28} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">No signs found</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Try adjusting your search query or switching to the Alphabet A-Z or Dataset Library view.
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
                  const hindi = sign.hindiWord || '';

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
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                                  {sign.category}
                                </span>
                              </div>
                              <h3 className="font-display text-base font-bold text-white group-hover:text-teal-200">
                                {sign.word} {hindi && <span className="text-xs font-normal text-slate-400">({hindi})</span>}
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
                                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                              title={isFav ? 'Remove from saved' : 'Save sign'}
                            >
                              {isFav ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">
                          {sign.summary}
                        </p>

                        {/* Mechanics preview tag */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 font-medium text-slate-300">
                            ✋ {sign.handshape.split(' ')[0]}
                          </span>
                          <span className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 font-medium text-slate-300">
                            📍 {sign.location.split(',')[0]}
                          </span>
                          {sign.recognizedInCamera && (
                            <span className="flex items-center gap-1 rounded-md border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                              <Sparkles size={10} /> Camera Ready
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom CTA */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                        <span className="flex items-center gap-1.5">
                          <Video size={14} />
                          <span>View ISL Guide</span>
                        </span>
                        <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Authentic ISL Alphabet Dataset (A to Z) */}
        {viewMode === 'alphabet' && (
          <div className="mx-auto mt-10 max-w-6xl">
            {filteredAlphabetSigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 p-12 text-center">
                <Search size={28} className="text-slate-400" />
                <h3 className="mt-4 font-display text-lg font-semibold text-white">No alphabet entries found</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Try searching for a single letter like &quot;A&quot;, &quot;B&quot;, &quot;M&quot; or resetting the handedness filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setAlphabetHandFilter('All');
                  }}
                  className="mt-5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Reset Alphabet Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAlphabetSigns.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedAlphabetSign(entry)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-teal-400/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-teal-950/30 cursor-pointer"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-brand-500/20 text-2xl font-black text-teal-300 ring-1 ring-white/10 group-hover:scale-105 group-hover:from-teal-400 group-hover:to-teal-200 group-hover:text-slate-950 transition">
                            {entry.letter}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                  entry.type === 'Two-Handed'
                                    ? 'bg-indigo-500/20 text-indigo-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {entry.type}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400">
                                {entry.referenceImage}
                              </span>
                            </div>
                            <h3 className="mt-0.5 font-display text-base font-bold text-white group-hover:text-teal-200">
                              Letter {entry.letter}{' '}
                              <span className="text-sm font-normal text-slate-300">
                                ({entry.hindiName} / {entry.devanagariPhonetic})
                              </span>
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleSpeak(`Letter ${entry.letter}. Sound: ${entry.hindiName}`, e)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Speak letter sound"
                        >
                          <Volume2 size={15} />
                        </button>
                      </div>

                      {/* Summary */}
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">
                        {entry.summary}
                      </p>

                      {/* Quick Contact & Mnemonic tags */}
                      <div className="mt-3 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="font-semibold text-slate-300">Touch:</span>
                          <span className="truncate text-slate-400">{entry.contactPoint}</span>
                        </div>
                        <div className="flex items-center gap-1 text-teal-300/90 italic truncate text-[10.5px]">
                          <span>💡 &quot;{entry.mnemonic}&quot;</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} />
                        <span>Inspect Reference</span>
                      </span>
                      <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Mode 3: 970+ Dataset Signs Library */}
        {viewMode === 'dataset' && (
          <div className="mx-auto mt-10 max-w-6xl">
            {filteredDatasetSigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 p-12 text-center">
                <Search size={28} className="text-slate-400" />
                <h3 className="mt-4 font-display text-lg font-semibold text-white">No dataset items match</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Try clearing your search query or selecting &quot;All Folders&quot;.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDatasetSigns.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDatasetSign(item)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-teal-400/50 hover:bg-slate-900 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                          Folder {item.folder}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.filename.split('_').slice(-2).join('_')}
                        </span>
                      </div>
                      <h4 className="mt-2 font-display text-sm font-bold text-white group-hover:text-teal-200">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                        {item.filename}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] font-semibold text-teal-400">
                      <span className="flex items-center gap-1">
                        <Video size={12} /> Video Demo
                      </span>
                      <ArrowRight size={12} className="transition group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View Mode 4: Drive Folders Browser */}
        {viewMode === 'folders' && (
          <div className="mx-auto mt-10 max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {DATASET_FOLDERS.map((folder) => (
                <div
                  key={folder.name}
                  onClick={() => {
                    setSelectedFolder(folder.name);
                    setViewMode('dataset');
                  }}
                  className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-teal-400/50 hover:bg-slate-900 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 transition group-hover:bg-teal-400 group-hover:text-slate-950">
                        <Folder size={20} />
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {folder.count} videos
                      </span>
                    </div>

                    <h4 className="mt-4 font-display text-base font-bold text-white group-hover:text-teal-200">
                      Folder {folder.name}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Sign video demonstrations & gesture clips
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-400">
                    <span>Explore folder</span>
                    <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ISL Curated Sign Detail Modal */}
      {selectedSign && (
        <SignDetailModal
          sign={selectedSign}
          onClose={() => setSelectedSign(null)}
          onPractice={jumpToCamera}
          isFavorite={favorites.includes(selectedSign.id)}
          onToggleFavorite={() => toggleFavorite(selectedSign.id)}
          onSpeak={(t) => handleSpeak(t)}
        />
      )}

      {/* ISL Alphabet Reference Modal */}
      {selectedAlphabetSign && (
        <AlphabetDetailModal
          entry={selectedAlphabetSign}
          onClose={() => setSelectedAlphabetSign(null)}
          onPractice={jumpToCamera}
          onSpeak={(t) => handleSpeak(t)}
        />
      )}

      {/* Dataset Sign Modal */}
      {selectedDatasetSign && (
        <DatasetSignModal
          item={selectedDatasetSign}
          onClose={() => setSelectedDatasetSign(null)}
          onPractice={jumpToCamera}
          onSpeak={(t) => handleSpeak(t)}
        />
      )}
    </section>
  );
}

function AlphabetDetailModal({
  entry,
  onClose,
  onPractice,
  onSpeak,
}: {
  entry: ISLAlphabetEntry;
  onClose: () => void;
  onPractice: () => void;
  onSpeak: (t: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Close modal"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-400 text-3xl font-black text-slate-950 shadow-lg shadow-teal-500/20">
              {entry.letter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    entry.type === 'Two-Handed'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {entry.type} ISL
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  Ref: {entry.referenceImage}
                </span>
                {entry.cameraRecognitionSupported && (
                  <span className="flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                    <Sparkles size={10} /> Camera Ready
                  </span>
                )}
              </div>
              <h3 className="mt-1 font-display text-2xl font-bold text-white">
                Letter {entry.letter}{' '}
                <span className="text-lg font-medium text-teal-300">
                  ({entry.hindiName} / {entry.devanagariPhonetic})
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => onSpeak(`Letter ${entry.letter}, ${entry.hindiName}`)}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Hear pronunciation"
          >
            <Volume2 size={18} />
          </button>
        </div>

        {/* Summary Description */}
        <p className="mt-4 text-sm leading-relaxed text-slate-200">{entry.summary}</p>

        {/* Mnemonic Banner */}
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <span className="font-bold text-amber-300">💡 Memory Trick: </span>
          {entry.mnemonic}
        </div>

        {/* Hand Mechanics Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Dominant Hand */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Dominant Hand (मुख्य हाथ)
            </h4>
            <div className="mt-2.5 space-y-2 text-xs text-slate-300">
              <div>
                <span className="font-semibold text-white">Shape: </span>
                {entry.dominantHand.handshape}
              </div>
              <div>
                <span className="font-semibold text-white">Palm: </span>
                {entry.dominantHand.palmFacing}
              </div>
              <div>
                <span className="font-semibold text-white">Fingers: </span>
                {entry.dominantHand.fingerPositions}
              </div>
            </div>
          </div>

          {/* Non-Dominant Hand or Single-hand notice */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {entry.nonDominantHand ? 'Non-Dominant Hand (सहायक हाथ)' : 'Single-Hand Formation'}
            </h4>
            {entry.nonDominantHand ? (
              <div className="mt-2.5 space-y-2 text-xs text-slate-300">
                <div>
                  <span className="font-semibold text-white">Shape: </span>
                  {entry.nonDominantHand.handshape}
                </div>
                <div>
                  <span className="font-semibold text-white">Palm: </span>
                  {entry.nonDominantHand.palmFacing}
                </div>
                <div>
                  <span className="font-semibold text-white">Fingers: </span>
                  {entry.nonDominantHand.fingerPositions}
                </div>
              </div>
            ) : (
              <p className="mt-2.5 text-xs text-slate-400">
                This letter is signed purely with the dominant hand in open space, leaving the other hand relaxed.
              </p>
            )}
          </div>
        </div>

        {/* Contact Point & Step instructions */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
            Touch & Contact Point
          </h4>
          <p className="mt-1 text-xs text-slate-300">{entry.contactPoint}</p>

          <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-300">
            Step-by-Step Execution
          </h4>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
            {entry.executionSteps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* 3D Hand Coordinate Positions & Recognition Constraints */}
        <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Spatial Hand Coordinates (21 MediaPipe Landmarks)
            </h4>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-200">
              Tolerance: ±{(entry.coordinateConstraints.tolerance * 100).toFixed(0)}%
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            {entry.coordinateConstraints.description}
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Dominant Hand Keypoints */}
            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 font-mono text-[11px]">
              <div className="font-sans font-bold text-teal-300 mb-1.5">Dominant Hand Keypoints (X, Y, Z):</div>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Wrist (0):</span>
                  <span>[{entry.keyJoints.dominant.wrist.x.toFixed(2)}, {entry.keyJoints.dominant.wrist.y.toFixed(2)}, {entry.keyJoints.dominant.wrist.z.toFixed(2)}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thumb Tip (4):</span>
                  <span>[{entry.keyJoints.dominant.thumbTip.x.toFixed(2)}, {entry.keyJoints.dominant.thumbTip.y.toFixed(2)}, {entry.keyJoints.dominant.thumbTip.z.toFixed(2)}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Index Tip (8):</span>
                  <span>[{entry.keyJoints.dominant.indexTip.x.toFixed(2)}, {entry.keyJoints.dominant.indexTip.y.toFixed(2)}, {entry.keyJoints.dominant.indexTip.z.toFixed(2)}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Middle Tip (12):</span>
                  <span>[{entry.keyJoints.dominant.middleTip.x.toFixed(2)}, {entry.keyJoints.dominant.middleTip.y.toFixed(2)}, {entry.keyJoints.dominant.middleTip.z.toFixed(2)}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pinky Tip (20):</span>
                  <span>[{entry.keyJoints.dominant.pinkyTip.x.toFixed(2)}, {entry.keyJoints.dominant.pinkyTip.y.toFixed(2)}, {entry.keyJoints.dominant.pinkyTip.z.toFixed(2)}]</span>
                </div>
              </div>
            </div>

            {/* Non-Dominant or Vectors */}
            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 font-mono text-[11px]">
              <div className="font-sans font-bold text-indigo-300 mb-1.5">
                {entry.keyJoints.nonDominant ? 'Non-Dominant Hand Keypoints:' : 'Orientation Vectors:'}
              </div>
              {entry.keyJoints.nonDominant ? (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wrist (0):</span>
                    <span>[{entry.keyJoints.nonDominant.wrist.x.toFixed(2)}, {entry.keyJoints.nonDominant.wrist.y.toFixed(2)}, {entry.keyJoints.nonDominant.wrist.z.toFixed(2)}]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Index Tip (8):</span>
                    <span>[{entry.keyJoints.nonDominant.indexTip.x.toFixed(2)}, {entry.keyJoints.nonDominant.indexTip.y.toFixed(2)}, {entry.keyJoints.nonDominant.indexTip.z.toFixed(2)}]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thumb Tip (4):</span>
                    <span>[{entry.keyJoints.nonDominant.thumbTip.x.toFixed(2)}, {entry.keyJoints.nonDominant.thumbTip.y.toFixed(2)}, {entry.keyJoints.nonDominant.thumbTip.z.toFixed(2)}]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pinky Tip (20):</span>
                    <span>[{entry.keyJoints.nonDominant.pinkyTip.x.toFixed(2)}, {entry.keyJoints.nonDominant.pinkyTip.y.toFixed(2)}, {entry.keyJoints.nonDominant.pinkyTip.z.toFixed(2)}]</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pointing Vector:</span>
                    <span>[{entry.coordinateConstraints.vectors.pointingDirection.join(', ')}]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Palm Normal:</span>
                    <span>[{entry.coordinateConstraints.vectors.palmNormal.join(', ')}]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thumb-Index Dist:</span>
                    <span>
                      {entry.coordinateConstraints.relativeDistances.thumbToIndexTip
                        ? `${entry.coordinateConstraints.relativeDistances.thumbToIndexTip.min} - ${entry.coordinateConstraints.relativeDistances.thumbToIndexTip.max}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Landmark Logic */}
        <div className="mt-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 text-[11px] text-teal-200">
          <span className="font-bold text-teal-300">MediaPipe Vision Recognition Logic: </span>
          {entry.landmarksHint}
        </div>

        {/* Action Button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onPractice}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-teal-300"
          >
            <Video size={16} />
            Practice Letter &quot;{entry.letter}&quot; in Live Camera
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DatasetSignModal({
  item,
  onClose,
  onPractice,
  onSpeak,
}: {
  item: DatasetItem;
  onClose: () => void;
  onPractice: () => void;
  onSpeak: (t: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-400">
            Dataset Folder {item.folder}
          </span>
          <button
            onClick={() => onSpeak(item.title)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Pronounce"
          >
            <Volume2 size={16} />
          </button>
        </div>

        <h3 className="mt-3 font-display text-2xl font-bold text-white">{item.title}</h3>
        <p className="mt-1 text-xs text-slate-400 font-mono">{item.filename}</p>

        {/* Video demonstration info */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-6 text-center">
          <Video className="mx-auto h-12 w-12 text-teal-400" />
          <h4 className="mt-3 text-sm font-bold text-white">Google Drive Dataset Video</h4>
          <p className="mt-1 text-xs text-slate-400">
            This sign is part of the Kiri dataset for gesture accuracy training and verification.
          </p>
          <a
            href={item.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            <ExternalLink size={14} />
            Open in Google Drive
          </a>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onPractice}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-xs font-bold text-slate-950 transition hover:bg-teal-300"
          >
            <Video size={16} />
            Practice in Live Camera
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type SignDetailModalProps = {
  sign: ISLSign;
  onClose: () => void;
  onPractice: (word: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSpeak: (text: string) => void;
};

function SignDetailModal({
  sign,
  onClose,
  onPractice,
  isFavorite,
  onToggleFavorite,
  onSpeak,
}: SignDetailModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const hindi = sign.hindiWord || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Close modal"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-2xl font-bold">
              {sign.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  {sign.category}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  {sign.difficulty}
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                {sign.word} {hindi && <span className="text-lg font-medium text-teal-300">({hindi})</span>}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onSpeak(sign.word)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Hear sign name spoken"
            >
              <Volume2 size={18} />
            </button>
            <button
              onClick={onToggleFavorite}
              className={`rounded-xl p-2 transition ${
                isFavorite
                  ? 'text-amber-400 hover:bg-amber-400/10'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from saved' : 'Save sign'}
            >
              {isFavorite ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>
        </div>

        {/* Summary */}
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{sign.summary}</p>

        {/* Video & Mechanics 2-Column Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Video Player Column */}
          <div>
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner">
              {!videoError && sign.videoUrl ? (
                <video
                  ref={videoRef}
                  src={sign.videoUrl}
                  loop
                  autoPlay
                  muted
                  playsInline
                  onError={() => {
                    if (sign.fallbackVideoUrl) {
                      if (videoRef.current) {
                        videoRef.current.src = sign.fallbackVideoUrl;
                      }
                    } else {
                      setVideoError(true);
                    }
                  }}
                  className={`h-full w-full object-cover transition-transform duration-300 ${
                    isMirrored ? '-scale-x-100' : ''
                  }`}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
                    <Video size={24} />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-white">ISL Visual Gesture Guide</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Follow the mechanical breakdown steps on the right.
                  </p>
                </div>
              )}

              {/* Video Overlay Controls */}
              {!videoError && sign.videoUrl && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={togglePlay}
                      className="rounded-lg p-1.5 text-white transition hover:bg-white/20"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button
                      onClick={restartVideo}
                      className="rounded-lg p-1.5 text-white transition hover:bg-white/20"
                      title="Replay from start"
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

          {/* Mechanics & Steps Breakdown */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                ISL Sign Mechanics
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
                <span>Related terms:</span>
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
  );
}

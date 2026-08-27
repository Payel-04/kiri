import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lightbulb, Play, RotateCcw } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';

const lessons = [
  {
    id: 'hello',
    sign: '👋',
    title: 'Hello & Welcome',
    description: 'An open hand facing forward with all five fingers spread.',
    color: 'bg-brand-100 text-brand-700',
  },
  {
    id: 'love',
    sign: '🤟',
    title: 'I Love You (ILY)',
    description: 'Extend the thumb, index finger, and pinky while keeping the middle two fingers curled.',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'peace',
    sign: '✌️',
    title: 'Peace / Victory (V)',
    description: 'Extend the index and middle fingers upward in a V shape.',
    color: 'bg-accent-100 text-accent-700',
  },
  {
    id: 'good',
    sign: '👍',
    title: 'Yes / Good / Thumbs Up',
    description: 'Form a closed fist and point your thumb straight up.',
    color: 'bg-slate-100 text-slate-700',
  },
];

export default function Learn() {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('signspeak_completed');
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const lesson = lessons[current];

  useEffect(() => {
    try {
      sessionStorage.setItem('signspeak_completed', JSON.stringify(completed));
    } catch (err) {
      console.error('Could not save lesson progress:', err);
    }
  }, [completed]);

  const mark = () =>
    setCompleted((prev) => (prev.includes(lesson.id) ? prev : [...prev, lesson.id]));

  return (
    <section id="learn" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="Learn together"
          title="One sign at a time"
          description="Small moments of learning add up to a world with fewer barriers. Explore a lesson, practice the motion, and make it yours."
        />
        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <Lightbulb size={17} className="text-accent-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mini lesson
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {current + 1} / {lessons.length}
            </span>
          </div>
          <div className="grid md:grid-cols-[0.8fr_1.2fr]">
            <div className={`flex min-h-[260px] items-center justify-center ${lesson.color}`}>
              <div className="text-center">
                <div className="font-display text-8xl font-bold leading-none">{lesson.sign}</div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] opacity-60">
                  The sign for
                </p>
                <p className="mt-1 font-display text-xl font-bold">{lesson.title}</p>
              </div>
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
                Lesson {String(current + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">{lesson.title}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                {lesson.description} Watch the motion, then try it yourself in the translator.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={mark}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    completed.includes(lesson.id)
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700'
                  }`}
                >
                  {completed.includes(lesson.id) ? (
                    <Check size={17} />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                  {completed.includes(lesson.id) ? 'Lesson complete' : 'Mark as learned'}
                </button>
                <a
                  href="#translate"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700"
                >
                  Practice it <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
            <button
              onClick={() => setCurrent((current - 1 + lessons.length) % lessons.length)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <div className="flex gap-1.5">
              {lessons.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrent(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === current ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300'
                  }`}
                  aria-label={`Go to lesson ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((current + 1) % lessons.length)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="mx-auto mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
          <RotateCcw size={13} /> Your progress is saved for this session
        </div>
      </div>
    </section>
  );
}

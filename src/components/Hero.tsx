import { ArrowDown, ArrowRight, CheckCircle2, Play, Users, Waves } from 'lucide-react';
import VisualHand from '@/components/VisualHand';

type HeroProps = { onAuthClick: () => void };

export default function Hero({ onAuthClick }: HeroProps) {
  return (
    <section id="home" className="relative min-h-[640px] overflow-hidden bg-slate-50 pt-28 sm:pt-32 lg:min-h-[760px]">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute -right-40 -top-40 h-[360px] w-[360px] rounded-full bg-brand-100/70 blur-3xl sm:h-[520px] sm:w-[520px]" />
      <div className="absolute -bottom-48 left-0 h-[300px] w-[300px] rounded-full bg-teal-100/50 blur-3xl sm:h-[420px] sm:w-[420px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28">
        <div className="animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-sm"><span className="flex h-2 w-2 animate-pulse rounded-full bg-teal-500" /> Live gesture translation is here</div>
          <h1 className="max-w-2xl font-display text-5xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">Every sign has a <span className="text-brand-600">story.</span><br />We help it be heard.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600"> kiri turns hand gestures into spoken words in real time, making every conversation feel natural, simple, and human.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#translate" className="group flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-brand-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700">Start translating <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></a><button onClick={onAuthClick} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"><Users size={17} /> Join the community</button></div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-600" /> Free to get started</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-600" /> Works in your browser</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-600" /> Privacy first</span></div>
        </div>
        <div className="relative flex min-h-[380px] items-center justify-center animate-fade-in lg:min-h-[500px]">
          <div className="absolute right-2 top-0 flex animate-float items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-900/10 sm:right-10"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Waves size={21} /></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Detected</p><p className="font-display text-sm font-bold text-slate-800">Hello there!</p></div></div>
          <VisualHand />
          <div className="absolute bottom-3 left-0 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-900/10 sm:left-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Play size={18} fill="currentColor" /></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Speaking</p><p className="font-display text-sm font-bold text-slate-800">Clear & natural</p></div></div>
          <div className="absolute bottom-24 right-2 h-10 w-10 rounded-full border border-brand-200 bg-white/70 sm:right-0" /><div className="absolute left-4 top-20 h-3 w-3 rounded-full bg-accent-400 sm:left-10" />
        </div>
      </div>
      <a href="#about" className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-slate-400 transition hover:text-brand-600"><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Explore</span><ArrowDown size={16} className="animate-bounce" /></a>
    </section>
  );
}

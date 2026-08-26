import { Hand, Sparkles } from 'lucide-react';

type VisualHandProps = { compact?: boolean };

export default function VisualHand({ compact = false }: VisualHandProps) {
  return (
    <div aria-hidden="true" className={`relative flex items-center justify-center ${compact ? 'h-32 w-32' : 'h-64 w-64'}`}>
      <div className={`absolute rounded-full bg-brand-500/10 ${compact ? 'inset-3' : 'inset-0'} animate-pulse-ring`} />
      <div className={`absolute rounded-full border border-brand-200/60 ${compact ? 'inset-2' : 'inset-[-10px]'}`} />
      <div className={`relative flex items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-2xl shadow-brand-600/30 ${compact ? 'h-20 w-20 rounded-3xl' : 'h-40 w-40'}`}>
        <Hand className="animate-wave" size={compact ? 42 : 78} strokeWidth={1.4} />
        <Sparkles className="absolute right-3 top-3 text-accent-300" size={compact ? 15 : 24} />
      </div>
      {!compact && <><span className="absolute left-0 top-16 h-2 w-2 rounded-full bg-accent-400" /><span className="absolute bottom-12 right-0 h-3 w-3 rounded-full bg-teal-400" /></>}
    </div>
  );
}

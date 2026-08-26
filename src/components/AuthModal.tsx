import { useEffect, useState } from 'react';
import { X, Mail, Lock, UserRound, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AuthModalProps = { onClose: () => void };

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNotice(''); setSubmitting(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, name);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    if (mode === 'signup') {
      setNotice('Account created. Welcome to SignSpeak!');
      setTimeout(onClose, 900);
    } else onClose();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/20">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={20} /></button>
        <div className="bg-brand-600 px-7 pb-8 pt-7 text-white">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Sparkles size={21} /></div>
          <h2 className="font-display text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Join the movement'}</h2>
          <p className="mt-1.5 text-sm text-brand-100">{mode === 'signin' ? 'Pick up where you left off.' : 'Make communication more accessible for everyone.'}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-7">
          {mode === 'signup' && <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Your name</span><div className="relative"><UserRound className="absolute left-3 top-3.5 text-slate-400" size={17} /><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" placeholder="Alex Morgan" /></div></label>}
          <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</span><div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-400" size={17} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" placeholder="you@example.com" /></div></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</span><div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-400" size={17} /><input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>}
          {notice && <p className="rounded-xl bg-teal-50 px-3 py-2.5 text-xs font-medium text-teal-700">{notice}</p>}
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'} {!submitting && <ArrowRight size={17} />}</button>
          <p className="text-center text-sm text-slate-500">{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }} className="font-semibold text-brand-600 hover:text-brand-700">{mode === 'signin' ? 'Create one' : 'Sign in'}</button></p>
        </form>
      </div>
    </div>
  );
}

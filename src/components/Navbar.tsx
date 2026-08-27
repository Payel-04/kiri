import { useEffect, useState } from 'react';
import { Menu, X, Hand, LogIn, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type NavbarProps = { onAuthClick: () => void };

export default function Navbar({ onAuthClick }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const links = [
    { label: 'How it works', href: '#about' },
    { label: 'Translator', href: '#translate' },
    { label: 'Dictionary', href: '#dictionary' },
    { label: 'Community', href: '#community' },
    { label: 'Learn', href: '#learn' },
  ];

  const close = () => setOpen(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSignOut = async () => {
    try {
      await signOut();
      close();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:px-6">
        <a href="#home" className="flex items-center gap-2.5" onClick={close}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
            <Hand size={20} strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">Sign<span className="text-brand-600">Speak</span></span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700"><UserRound size={16} /></span>
                <span className="max-w-[110px] truncate font-medium">{profile?.display_name ?? user.email?.split('@')[0]}</span>
              </div>
              <button onClick={() => void handleSignOut()} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Sign out"><LogOut size={18} /></button>
            </div>
          ) : (
            <button onClick={onAuthClick} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700"><LogIn size={16} /> Sign in</button>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => <a key={link.href} href={link.href} onClick={close} className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">{link.label}</a>)}
            <div className="mt-2 border-t border-slate-100 pt-3">
              {user ? (
                <button onClick={() => void handleSignOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"><LogOut size={17} /> Sign out</button>
              ) : (
                <button onClick={() => { onAuthClick(); close(); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white"><LogIn size={17} /> Sign in</button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

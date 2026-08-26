import { Hand, Heart, Github, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 sm:flex-row lg:px-8">
        <a href="#home" className="flex items-center gap-2 font-display font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Hand size={16} /></span>Sign<span className="text-brand-600">Speak</span></a>
        <p className="flex items-center gap-1 text-xs text-slate-500">Built with <Heart size={13} className="fill-red-400 text-red-400" /> for a more connected world</p>
        <div className="flex items-center gap-4 text-slate-400">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository" className="transition-colors hover:text-slate-600">
            <Github size={17} />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter Page" className="transition-colors hover:text-slate-600">
            <Twitter size={17} />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram Profile" className="transition-colors hover:text-slate-600">
            <Instagram size={17} />
          </a>
        </div>
      </div>
    </footer>
  );
}

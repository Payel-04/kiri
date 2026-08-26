type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
};

export default function SectionHeading({ eyebrow, title, description, light = false }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={`mb-4 text-xs font-bold uppercase tracking-[0.2em] ${light ? 'text-brand-200' : 'text-brand-600'}`}>{eyebrow}</p>
      <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {description && <p className={`mt-4 text-base leading-7 ${light ? 'text-slate-300' : 'text-slate-600'}`}>{description}</p>}
    </div>
  );
}

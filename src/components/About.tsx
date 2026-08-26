import { Camera, MessageCircle, Sparkles, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';

const steps = [{ icon: Camera, number: '01', title: 'Show your sign', text: 'Position your hand in front of your camera. Our technology sees the details, not your identity.' }, { icon: Sparkles, number: '02', title: 'We understand', text: 'Smart gesture recognition interprets your sign and turns it into language in a heartbeat.' }, { icon: MessageCircle, number: '03', title: 'Connect naturally', text: 'Read the words or hear them spoken aloud. Conversation continues without the pause.' }];
const values = [{ icon: Zap, title: 'Made for now', text: 'Fast enough to feel like a real conversation.' }, { icon: ShieldCheck, title: 'Private by design', text: 'Your camera feed stays on your device.' }, { icon: HeartHandshake, title: 'Built together', text: 'Created with and for the signing community.' }];

export default function About() {
  return (
    <section id="about" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Technology that gets out of the way"
          description="SignSpeak is designed to make communication feel effortless. No complicated setup, no awkward pauses — just a bridge between two people."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-3xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-1 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-xl hover:shadow-brand-900/5"
            >
              <span className="font-display text-5xl font-bold text-slate-200 transition-colors group-hover:text-brand-100">
                {step.number}
              </span>
              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <step.icon size={22} />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-20 grid gap-4 border-t border-slate-200 pt-10 sm:grid-cols-3">
          {values.map((value) => (
            <div key={value.title} className="flex items-start gap-3 rounded-2xl p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <value.icon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{value.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{value.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

let voicesCache: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      voicesCache = existing;
      resolve(existing);
      return;
    }
    const handler = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };
    window.speechSynthesis.onvoiceschanged = handler;
    setTimeout(() => {
      if (!voicesCache || voicesCache.length === 0) {
        voicesCache = window.speechSynthesis.getVoices();
      }
      resolve(voicesCache ?? []);
    }, 1000);
  });
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export async function speak(
  text: string,
  opts?: { rate?: number; pitch?: number; lang?: string }
): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return;

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    loadVoices().then((voices) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = opts?.rate ?? 0.95;
      utterance.pitch = opts?.pitch ?? 1;
      utterance.lang = opts?.lang ?? 'en-US';

      const preferred =
        voices.find((v) => v.lang === utterance.lang && v.name.toLowerCase().includes('google')) ??
        voices.find((v) => v.lang === utterance.lang) ??
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  });
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

if (isSpeechSupported()) {
  void loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

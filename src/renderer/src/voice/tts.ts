let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, onEnd?: () => void): void {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Samantha'))
    ?? voices.find((v) => v.lang.startsWith('en-US'))
    ?? voices[0];
  if (preferred) utterance.voice = preferred;

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

export function isSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}

export type VoiceProfile = 'feminine' | 'masculine' | 'robot';

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakAnnouncement(
  text: string,
  options?: { 
    profile?: VoiceProfile; 
    rate?: number; 
    onEnd?: () => void; 
    onError?: () => void; 
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this browser.');
    options?.onEnd?.();
    return;
  }

  // Cancel any active speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  // Set defaults
  utterance.rate = options?.rate ?? 0.92;
  utterance.pitch = 1.0;
  utterance.lang = 'en-PH'; // Philipines English / Taglish feel

  const profile = options?.profile || 'feminine';

  // Attempt to select voice or apply characteristics based on profile
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    
    if (profile === 'feminine') {
      utterance.pitch = 1.15;
      if (!options?.rate) utterance.rate = 0.95;
      const femVoice = voices.find(v => 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('zira') || 
         v.name.toLowerCase().includes('google uk english female') ||
         v.name.toLowerCase().includes('susan') ||
         v.name.toLowerCase().includes('karen') ||
         v.name.toLowerCase().includes('tessa') ||
         v.name.toLowerCase().includes('samantha')) &&
        v.lang.startsWith('en')
      );
      if (femVoice) utterance.voice = femVoice;
    } else if (profile === 'masculine') {
      utterance.pitch = 0.85;
      if (!options?.rate) utterance.rate = 0.90;
      const maleVoice = voices.find(v => 
        (v.name.toLowerCase().includes('male') || 
         v.name.toLowerCase().includes('david') || 
         v.name.toLowerCase().includes('google us english male') ||
         v.name.toLowerCase().includes('george') ||
         v.name.toLowerCase().includes('ravi') ||
         v.name.toLowerCase().includes('daniel')) &&
        v.lang.startsWith('en')
      );
      if (maleVoice) utterance.voice = maleVoice;
    } else if (profile === 'robot') {
      utterance.pitch = 0.55;
      if (!options?.rate) utterance.rate = 1.10;
      const robotVoice = voices.find(v => v.lang.startsWith('en'));
      if (robotVoice) utterance.voice = robotVoice;
    }
  }

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    if (options?.onError) {
      options.onError();
    } else {
      options?.onEnd?.();
    }
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

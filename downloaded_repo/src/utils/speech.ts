/**
 * Local AI Voice Text-To-Speech (TTS) & PA Chime Utility
 * Optimized to run 100% offline using pure client-side Web Audio API and Web Speech API.
 */

// Synthesize a beautiful physical terminal PA dual-tone chime ("Ding-Dong") using Web Audio API
export const playTerminalChime = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }
      
      const ctx = new AudioContextClass();
      const destination = ctx.destination;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      
      osc1.connect(gain1);
      gain1.connect(destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.5);

      // Note 2: C5 (523.25 Hz) starting slightly after
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.22);
      
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.22);
      gain2.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.27);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      
      osc2.connect(gain2);
      gain2.connect(destination);
      osc2.start(ctx.currentTime + 0.22);
      osc2.stop(ctx.currentTime + 0.8);

      setTimeout(() => {
        ctx.close();
        resolve();
      }, 800);
    } catch (e) {
      console.warn("Audio Context chime failed:", e);
      resolve();
    }
  });
};

export type VoiceProfile = 'feminine' | 'masculine' | 'robotic';

export interface TTSOptions {
  profile?: VoiceProfile;
  rate?: number; // 0.5 to 2
  pitch?: number; // 0.5 to 2
  volume?: number; // 0 to 1
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Global cancellation method
export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Check speaking status
export const isCurrentlySpeaking = (): boolean => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};

// Speak a text using customized Web Speech synthesis profile
export const speakAnnouncement = async (text: string, options: TTSOptions = {}) => {
  const {
    profile = 'feminine',
    rate = 0.9, // Slightly slower for crisp public address acoustic clarity
    pitch = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError
  } = options;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError(new Error("Web Speech API not supported in the active web browser."));
    return;
  }

  // Cancel any active speech broadcasts
  window.speechSynthesis.cancel();

  // Play natural terminal chime warning first to grab users' attention!
  await playTerminalChime();

  // Parse text message to voice
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.volume = volume;

  // Retrieve available voices on runtime
  const voices = window.speechSynthesis.getVoices();

  // Define custom pitch and profile mappings
  if (profile === 'robotic') {
    utterance.pitch = 0.4; // deep resonance
    utterance.rate = rate * 0.85; // slower mechanical cadence
    // Try to find a synthetic/neutral voice
    const synthVoice = voices.find(v => v.name.toLowerCase().includes('robot') || v.name.toLowerCase().includes('synth') || v.name.toLowerCase().includes('zira'));
    if (synthVoice) utterance.voice = synthVoice;
  } else if (profile === 'masculine') {
    utterance.pitch = pitch * 0.85; // solid low tone
    // Find masculine-sounding local voice
    const maleVoice = voices.find(v => 
      (v.lang.startsWith('en') || v.lang.startsWith('fil') || v.lang.startsWith('tl')) && 
      (v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('google uk english male'))
    );
    if (maleVoice) utterance.voice = maleVoice;
  } else {
    // Elegant Female Voice/Feminine Profile
    utterance.pitch = pitch * 1.15; // smooth clear tone
    const femaleVoice = voices.find(v => 
      (v.lang.startsWith('en') || v.lang.startsWith('fil') || v.lang.startsWith('tl')) && 
      (v.name.toLowerCase().includes('google uk english female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;
  }

  // Assign Event Listeners
  if (onStart) {
    utterance.onstart = () => onStart();
  }
  
  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (err) => {
    if (onError) onError(err);
  };

  // Dispatch speech
  window.speechSynthesis.speak(utterance);
};

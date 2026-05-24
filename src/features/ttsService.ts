import { toast } from 'sonner';

export class TTSEngine {
  private synth: SpeechSynthesis | null = null;
  private isPremium = false; // Set to true if ElevenLabs is configured

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  // Basic Browser TTS (Offline-capable)
  speak(text: string, options: { rate?: number; pitch?: number; lang?: string } = {}) {
    if (!this.synth) {
      toast.error("Text-to-Speech not supported on this device");
      return;
    }

    // Cancel any current speaking
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 1;
    utterance.lang = options.lang || 'en-PH'; // Philippine English

    // Choose primary natural voice if available
    const voices = this.synth.getVoices();
    const preferred = voices.find(v => 
      v.lang.includes('PH') || 
      v.name.includes('Filipino') || 
      v.name.includes('Google UK English Female') || 
      v.lang.startsWith('en')
    );
    if (preferred) utterance.voice = preferred;

    this.synth.speak(utterance);
  }

  // Stop current speech
  stop() {
    this.synth?.cancel();
  }
}

export const tts = new TTSEngine();
export default tts;

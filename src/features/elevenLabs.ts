import { tts } from './ttsService';

const ELEVEN_LABS_API_KEY = (import.meta as any).env?.VITE_ELEVEN_LABS_API_KEY;

export const speakWithElevenLabs = async (text: string, voiceId: string = "EXAVITQu4vr4xnSDxMaL") => { // Rachel voice
  if (!ELEVEN_LABS_API_KEY) {
    console.info("VITE_ELEVEN_LABS_API_KEY not configured. Falling back to Browser TTS.");
    tts.speak(text);
    return null;
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.75, similarity_boost: 0.85 }
      })
    });

    if (!response.ok) throw new Error("ElevenLabs API failed");

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    return audio;
  } catch (err) {
    console.error("ElevenLabs error:", err);
    // Fallback to browser TTS
    tts.speak(text);
    return null;
  }
};

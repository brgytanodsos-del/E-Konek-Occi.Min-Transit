import { toast } from 'sonner';
import { tts } from './ttsService';

export const startVoiceCommand = (onTriggerBooking?: () => void, onCheckStatus?: () => void) => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast.error("Voice input/recognition not supported on this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-PH';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  toast.info("🎙️ Listening for commands in Philippine English/Taglish...", { duration: 3000 });
  tts.speak("Listening. Say: Book ferry, book van, or status");

  recognition.onresult = (event: any) => {
    const command = event.results[0][0].transcript.toLowerCase();
    toast.success(`Heard command: "${command}"`);

    if (command.includes("book") || command.includes("booking") || command.includes("reserve")) {
      tts.speak("Opening public booking portal");
      if (onTriggerBooking) {
        onTriggerBooking();
      }
    } else if (command.includes("status") || command.includes("time") || command.includes("schedule")) {
      tts.speak("All trips are currently on schedule. No delays reported at Mamburao Terminal.");
      if (onCheckStatus) {
        onCheckStatus();
      }
    } else {
      tts.speak(`Heard command: ${command}. Try saying Book or Status.`);
    }
  };

  recognition.onerror = (e: any) => {
    console.warn("Speech recognition error:", e);
    toast.error("Speech recognition could not understand. Try speaking closer to the microphone.");
  };

  recognition.start();
};

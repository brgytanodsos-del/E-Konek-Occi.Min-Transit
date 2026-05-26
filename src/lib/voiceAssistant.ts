import { offlineQueue } from './offlineQueue';

// Sample mock user for demonstration
const currentUser = {
  uid: 'user-123',
  role: 'passenger',
};

export const voiceAssistant = {
  async speak(message: string, lang: 'en' | 'tl' = 'tl') {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = lang === 'tl' ? 'tl-PH' : 'en-US';
    speechSynthesis.speak(utterance);
  },

  async handleOfflineCommand(command: string, parsedData: any = {}) {
    if (command.includes("book") || command.includes("reserve")) {
      // Queue voice-initiated booking
      await offlineQueue.add({
        type: 'booking',
        collection: 'bookings',
        payload: { voiceInitiated: true, ...parsedData, status: 'pending' },
        userId: currentUser.uid,
        role: currentUser.role,
      });
      this.speak("Booking queued for when you're back online", 'tl');
    }
  }
};

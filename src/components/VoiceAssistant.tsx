import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceAssistantPanel } from './VoiceAssistantPanel';

export const VoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className="fixed bottom-6 right-6 bg-gradient-to-br from-emerald-600 to-teal-500 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center border-4 border-slate-900 z-50 cursor-pointer hover:scale-105"
        title="Voice Assistant Operations"
        id="staff-voice-fab"
      >
        <Mic className="w-6 h-6 animate-pulse" />
      </button>

      <VoiceAssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

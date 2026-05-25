import React from 'react';
import { X, Mic, BookOpen, Clock, CloudSun, HelpCircle } from 'lucide-react';

interface VoiceInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceInstructionsModal: React.FC<VoiceInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const commands = [
    { icon: <BookOpen className="w-5 h-5" />, title: "Book a Ferry", desc: "Speak: 'Book a ferry' or 'Buy ticket'" },
    { icon: <BookOpen className="w-5 h-5" />, title: "Book a Van/Bus", desc: "Speak: 'Book a van' or 'Book a bus'" },
    { icon: <Clock className="w-5 h-5" />, title: "Check Status", desc: "Speak: 'Check status' or 'Schedule'" },
    { icon: <CloudSun className="w-5 h-5" />, title: "Check Weather", desc: "Speak: 'Check weather' or 'Is it raining?'" },
    { icon: <HelpCircle className="w-5 h-5" />, title: "General Help", desc: "Speak: 'Help' or 'What can I say?'" },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Mic className="text-orange w-5 h-5" /> Voice Commands
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {commands.map((cmd, i) => (
            <div key={i} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">{cmd.icon}</div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{cmd.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cmd.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Speak clearly after tapping the microphone.</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Mic, Volume2, X, HelpCircle, VolumeX, Languages, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { startVoiceCommand } from '../features/voiceCommands';
import { tts } from '../features/ttsService';
import { speakWithElevenLabs } from '../features/elevenLabs';
import { toast } from 'sonner';

interface VoiceAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantPanel: React.FC<VoiceAssistantPanelProps> = ({ isOpen, onClose }) => {
  const { isOnline, ships, trips, abraWeather, mamburaoWeather } = useApp();
  const [listening, setListening] = useState(false);
  const [voiceModel, setVoiceModel] = useState<'browser' | 'elevenlabs'>('browser');
  const [language, setLanguage] = useState<'en' | 'tl'>('en');

  // Cancel speech on close
  useEffect(() => {
    return () => {
      tts.stop();
    };
  }, []);

  const handleSpeak = async (textEn: string, textTl: string) => {
    const text = language === 'en' ? textEn : textTl;
    if (voiceModel === 'elevenlabs') {
      toast.info("Synthesizing premium voice...");
      await speakWithElevenLabs(text);
    } else {
      tts.speak(text, { lang: language === 'en' ? 'en-PH' : 'tl-PH' });
    }
  };

  const startListening = () => {
    setListening(true);
    
    // Callback handlers for voice recognitions
    const onTriggerBooking = () => {
      setListening(false);
      onClose();
      // Dispatch an event to notify booking components to open
      window.dispatchEvent(new CustomEvent('open-public-booking'));
    };

    const onCheckStatus = () => {
      setListening(false);
    };

    // Modified helper starts recognition
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Browser speech recognition not supported.");
        setListening(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === 'en' ? 'en-PH' : 'tl-PH';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      const welcomeText = language === 'en' 
        ? "Listening. Say Book Ferry, Book Van, or Status." 
        : "Nakinig po. Sabihin ang Book Ferry, Book Van, o Kalagayan.";
      
      tts.speak(welcomeText, { lang: language === 'en' ? 'en-PH' : 'tl-PH' });
      toast.info(language === 'en' ? "🎙️ Recording English/Taglish command..." : "🎙️ Nakikinig sa Tagalog command...");

      recognition.onresult = (event: any) => {
        setListening(false);
        const command = event.results[0][0].transcript.toLowerCase().trim();
        toast.success(`Recognized: "${command}"`);

        // Handle commands within context
        if (command.includes("book") || command.includes("reserve") || command.includes("maka-book") || command.includes("buy")) {
          const respEn = "Opening the public transit booking gateway.";
          const respTl = "Binubuksan ang pinto para sa reservation.";
          handleSpeak(respEn, respTl);
          onTriggerBooking();
        } else if (command.includes("status") || command.includes("check") || command.includes("kalagayan") || command.includes("oras") || command.includes("orasan")) {
          // Compute quick status summary
          const boardingTrips = trips.filter(t => t.status === 'Boarding').length;
          const departedTrips = trips.filter(t => t.status === 'Departed').length;
          const statusMsgEn = `There are currently ${boardingTrips} trips boarding and ${departedTrips} departed. Terminal operations are running normal.`;
          const statusMsgTl = `Mayroon pong ${boardingTrips} na biyahe na nag-bo-board at ${departedTrips} na lumarga na. Normal po ang operasyon ng terminal natin.`;
          handleSpeak(statusMsgEn, statusMsgTl);
          onCheckStatus();
        } else if (command.includes("weather") || command.includes("panahon") || command.includes("ulan") || command.includes("wind")) {
          const abraWind = abraWeather?.windSpeed ?? 14.5;
          const mamTemp = mamburaoWeather?.temp ?? 31.0;
          const weatherEn = `Weather update. Mamburao terminal is at ${mamTemp.toFixed(1)} degrees celsius. Abra port windspeed is ${abraWind.toFixed(1)} kilometers per hour.`;
          const weatherTl = `Impormasyon sa panahon. Ang temperatura sa Mamburao ay ${mamTemp.toFixed(1)} degrees celsius. Ang bilis ng hangin sa Abra port ay ${abraWind.toFixed(1)} kilometro bawat oras.`;
          handleSpeak(weatherEn, weatherTl);
          setListening(false);
        } else if (command.includes("magandang umaga") || command.includes("good morning")) {
          handleSpeak("Good morning! Welcome to Mindoro Transit Hub.", "Magandang umaga po! Maligayang pagdating sa Mindoro Transit Hub.");
          setListening(false);
        } else if (command.includes("salamat") || command.includes("thank you")) {
          handleSpeak("You're welcome! Thank you for using Mindoro Transit.", "Walang anuman po! Salamat sa paggamit ng Mindoro Transit.");
          setListening(false);
        } else {
          // default
          const fallbackEn = `Heard: "${command}". Try speaking: Book, Status, or Weather.`;
          const fallbackTl = `Narinig: "${command}". Subukan sabihin: Book, Kalagayan, o Panahon.`;
          handleSpeak(fallbackEn, fallbackTl);
          setListening(false);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Recognition error:", e);
        toast.error("Could not capture speech. Please speak clearly.");
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();

    } catch (err) {
      console.error(err);
      toast.error("Failed to start speech microphone.");
      setListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in" id="voice-assistant-modal">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl p-6 relative border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange/10 dark:bg-orange/20 p-2 rounded-xl text-orange">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Voice Assistant Pro</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Mindoro Transit Copilot</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition select-none"
            type="button"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Configuration settings (exclusive premium enhancements) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Preferred Language</span>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setLanguage('en')}
                type="button"
                className={`flex-1 py-1 px-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition ${
                  language === 'en' ? 'bg-[#003580] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => setLanguage('tl')}
                type="button"
                className={`flex-1 py-1 px-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition ${
                  language === 'tl' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
                }`}
              >
                🇵🇭 TL
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Synth engine</span>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setVoiceModel('browser')}
                type="button"
                className={`flex-1 py-1 px-1 text-xs font-extrabold rounded-lg cursor-pointer transition flex items-center justify-center gap-1 ${
                  voiceModel === 'browser' ? 'bg-[#003580] text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
                }`}
              >
                <span>🌐</span> Native
              </button>
              <button
                onClick={() => {
                  setVoiceModel('elevenlabs');
                  toast.success("ElevenLabs selected! Fallback active if API Key unavailable.");
                }}
                type="button"
                className={`flex-1 py-1 px-1 text-xs font-extrabold rounded-lg cursor-pointer transition flex items-center justify-center gap-1 ${
                  voiceModel === 'elevenlabs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> AI Voice
              </button>
            </div>
          </div>
        </div>

        {/* Huge Interactive Voice Push Button */}
        <button
          onClick={startListening}
          disabled={listening}
          type="button"
          className={`w-full py-8 rounded-[24px] flex flex-col items-center justify-center cursor-pointer transition-all ${
            listening 
              ? 'bg-red-500 text-white ring-8 ring-red-500/20 scale-95 shadow-lg' 
              : 'bg-[#003580] hover:bg-[#002560] text-white shadow-lg active:scale-98'
          }`}
        >
          <div className={`relative p-4 bg-white/10 rounded-full mb-3 ${listening ? 'animate-ping' : ''}`}>
            <Mic className="w-10 h-10" />
          </div>
          <span className="text-base font-extrabold tracking-wide">
            {listening ? (language === 'en' ? "Listening now..." : "Nakikinig po...") : (language === 'en' ? "Tap to Speak" : "Tapikin para Magsalita")}
          </span>
          <p className="text-[10px] opacity-75 font-semibold mt-1 uppercase tracking-widest">
            {language === 'en' ? "Say: Book Ferry, Trip Status, or Weather" : "Sabihin: Book Ferry, Kalagayan, o Panahon"}
          </p>
        </button>

        {/* Interactive Prompt Assist List */}
        <div className="mt-6">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-3">Quick Tap Assist & Commands</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: language === 'en' ? "Check Status" : "Tingnan ang Biyahe",
                desc: language === 'en' ? "Get info on active trips" : "Hanapin ang mga biyahe",
                command: "status",
                actEn: "All transit trips are currently on schedule. No major delays reported at Mamburao Grand Terminal.",
                actTl: "Ang lahat po ng biyahe ay kasalukuyang on schedule ngayon sa Mamburao Grand Terminal."
              },
              {
                label: language === 'en' ? "Weather Advisory" : "Ulat Panahon",
                desc: language === 'en' ? "Abra Port wind & advisory" : "Katayuan ng Abra Port",
                command: "weather",
                actEn: "Abra Port is currently safe. Wind speed is within normal maritime service guidelines.",
                actTl: "Ligtas po ang Abra Port ngayon. Ang bilis ng hangin ay nasa normal na antas pa lamang po."
              },
              {
                label: language === 'en' ? "Magandang Umaga" : "Batiin ang Assistant",
                desc: language === 'en' ? "Friendly greeting test" : "Mag-Tagalog greetings",
                command: "morning",
                actEn: "Magandang umaga po! Welcome to Occidental Mindoro's smart transit router.",
                actTl: "Magandang umaga rin po sa iyo! Maligayang pagdating sa transit hub natin."
              },
              {
                label: language === 'en' ? "Voice Help" : "Tulong sa Boses",
                desc: language === 'en' ? "List instructions" : "I-explain ang assistant",
                command: "help",
                actEn: "You can say: Book ticket, check status, or check weather reports.",
                actTl: "Maaari mo pong sabihin: Book ferry, kalagayan ng biyahe, o ulat sa panahon ngayon."
              }
            ].map((item, index) => (
              <button
                key={index}
                onClick={() => handleSpeak(item.actEn, item.actTl)}
                type="button"
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-left rounded-2xl cursor-pointer border border-slate-100 dark:border-slate-800 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-white">{item.label}</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Speech control utilities */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
          <span>Active Session is online</span>
          <button 
            onClick={() => {
              tts.stop();
              toast.info("Speech playback stopped.");
            }}
            type="button"
            className="text-red-500 hover:text-red-600 font-extrabold flex items-center gap-1 cursor-pointer select-none"
          >
            <VolumeX className="w-3.5 h-3.5" /> Stop Speech
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantPanel;

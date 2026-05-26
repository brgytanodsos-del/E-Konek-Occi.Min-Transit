import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/Button';
import { SurfaceCard } from './ui';
import { Megaphone, Send, Clock, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Announcement } from '../types/dataTypes';

export const CreateAnnouncement: React.FC = () => {
  const { currentUser, persistAnnouncement, setAnnouncements } = useApp();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Announcement body cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAnn: Announcement = {
        id: 'ann-' + Math.random().toString(36).substring(2, 11),
        text: text.trim(),
        date: new Date().toISOString(),
        author: currentUser?.fullName || 'Transit Administration'
      };

      await persistAnnouncement(newAnn);
      
      // Clear out the input on success
      setText('');
      toast.success('📢 Announcement published live across E-Konek portals!');
    } catch (err) {
      toast.error('Failed to publish announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SurfaceCard className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
          <Megaphone className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h3 className="text-base font-black text-white font-sans">Megaphone Broadcaster</h3>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Publish live status updates, typhoon suspensions, and schedule halts.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            maxLength={350}
            rows={3}
            className="w-full bg-slate-950/80 border border-slate-800/80 focus:border-indigo-500 rounded-2xl p-4 text-xs text-white placeholder-slate-550 focus:outline-none transition-all resize-none font-sans font-medium"
            placeholder="Type batch announcements here (e.g., 'Montenegro Ferry Voyage cancelled due to Signal #1 typhoon warning in Batangas Bay...')"
          />
          <div className="absolute bottom-3 right-3 text-[10px] font-bold font-mono text-slate-500">
            {text.length}/350 chars
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 px-4 py-3 rounded-xl text-[11px] text-slate-400 font-bold">
          <div className="flex items-center gap-1.5 truncate">
            <User size={13} className="text-indigo-400 shrink-0" />
            <span className="truncate">Author: {currentUser?.fullName || 'System Admin'}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock size={13} className="text-slate-500" />
            <span>Real-time Sync</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 rounded-xl group hover:shadow-indigo-500/10 hover:shadow-lg active:scale-97 border-none bg-none"
        >
          Publish Circular <Send size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Button>
      </form>
    </SurfaceCard>
  );
};

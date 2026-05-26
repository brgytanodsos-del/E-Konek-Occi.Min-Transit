import React from 'react';
import { useApp } from '../context/AppContext';
import { CreateAnnouncement } from './CreateAnnouncement';
import { SurfaceCard } from './ui';
import { Megaphone, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export const AnnouncementsPanel: React.FC = () => {
  const { announcements, setAnnouncements, currentUser, isOnline } = useApp();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete/retract this announcement?')) return;
    try {
      if (isOnline) {
        await deleteDoc(doc(db, 'announcements', id));
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement removed from live boards.');
    } catch {
      toast.error('Failed to remove announcement.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Left - Compose Form */}
      <div>
        <CreateAnnouncement />
      </div>

      {/* 2. Right - Active Announcements Feed */}
      <SurfaceCard className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-sans">Active Circulars & Warnings</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Currently active announcements displayed on boarding terminals.</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[385px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <ShieldAlert size={36} className="mx-auto text-slate-600 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-400">No active circulars</p>
                <p className="text-[10px] opacity-60">Compose above to broadcast emergency notifications</p>
              </div>
            ) : (
              announcements.map((ann, i) => (
                <div
                  key={ann.id || i}
                  className="bg-slate-950/50 hover:bg-slate-950/95 border border-slate-800 rounded-2xl p-4 flex justify-between gap-4 transition-all duration-300 relative group"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium leading-relaxed font-sans break-words whitespace-pre-line">
                      {ann.text}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 font-mono">
                      <span className="text-blue-400">By {ann.author}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {ann.date ? new Date(ann.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-start">
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Retract Announcement"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-bold bg-slate-950/30 px-4 py-2.5 rounded-xl border border-slate-900 mt-4 text-center">
          ⚡ Broadcasts automatically push to Montenegro Port, Passenger Shuttles, and Mobile App panels.
        </div>
      </SurfaceCard>
    </div>
  );
};
export default AnnouncementsPanel;

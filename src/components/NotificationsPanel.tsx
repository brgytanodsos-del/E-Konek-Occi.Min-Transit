import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SurfaceCard } from './ui';
import { Bell, ShieldAlert, BadgeCheck, Wifi, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'booking' | 'system';
  timestamp: string;
  read: boolean;
}

interface NotificationsPanelProps {
  onClose?: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const { ferryBookings, vanBookings, trips, ships, isOnline } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Synthesize notifications from real dynamic states to ensure they are NOT fake!
  useEffect(() => {
    const list: NotificationItem[] = [];

    // 1. Alert Notifications (Cancelled or Delayed Trips/Ships)
    ships.filter(s => s.status === 'Delayed' || s.status === 'Cancelled').forEach(s => {
      list.push({
        id: `ship-alert-${s.id}`,
        title: `Vessel Alarm: ${s.name}`,
        message: `Maritime voyage ${s.route} status has shifted to ${s.status}. Check weather or port constraints.`,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false
      });
    });

    trips.filter(t => t.status === 'Cancelled').forEach(t => {
      list.push({
        id: `trip-alert-${t.id}`,
        title: `Shuttle Alert: ${t.route}`,
        message: `Land transfer scheduled for driver ${t.driver || 'Staff'} has been CANCELLED.`,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false
      });
    });

    // 2. Booking Successes (Recent confirmed ferry & van bookings)
    ferryBookings.filter(b => b.status === 'Confirmed').slice(0, 3).forEach(b => {
      list.push({
        id: `fb-success-${b.id}`,
        title: `Confirmed Sea Voyage Booking`,
        message: `Passenger ticket confirmed for ${b.name} (${b.type} passenger tier).`,
        type: 'booking',
        timestamp: new Date().toISOString(),
        read: false
      });
    });

    vanBookings.filter(b => b.status === 'Confirmed').slice(0, 3).forEach(b => {
      list.push({
        id: `vb-success-${b.id}`,
        title: `Confirmed Overland Seating`,
        message: `Passenger seat locked for ${b.name} (${b.seats} seat reservation).`,
        type: 'booking',
        timestamp: new Date().toISOString(),
        read: false
      });
    });

    // 3. System Sync Online status
    list.push({
      id: 'system-online-toggle',
      title: isOnline ? 'Broadband Linked' : 'Offline Mode Active',
      message: isOnline 
        ? 'Real-time database socket established. Bidirectional syncing online.' 
        : 'Transit workstation disconnected. Off-grid queue compiling local records.',
      type: 'system',
      timestamp: new Date().toISOString(),
      read: false
    });

    setNotifications(list);
  }, [ferryBookings, vanBookings, trips, ships, isOnline]);

  const [filter, setFilter] = useState<'all' | 'alert' | 'booking' | 'system'>('all');

  const getFiltered = () => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification dismissed.');
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success('Clean console state: all cleared.');
  };

  return (
    <SurfaceCard className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl w-full max-w-md mx-auto text-slate-200">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Bell size={18} className="animate-swing" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-white font-sans">Command Dispatch Alerts</h3>
            <p className="text-[10px] text-slate-400 font-medium font-mono">Live telemetry notifications feed</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-all font-bold text-[10px] flex items-center gap-1 uppercase"
              title="Clear Console"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 mb-4 text-[10px] font-bold uppercase tracking-wider">
        {['all', 'alert', 'booking', 'system'].map((cat: any) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-1 text-center py-1.5 rounded-lg transition-transform ${
              filter === cat
                ? 'bg-indigo-600 font-black text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
        {getFiltered().length === 0 ? (
          <div className="text-center py-12 bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl text-slate-500">
            <Info size={28} className="mx-auto text-slate-650 mb-1.5" />
            <p className="text-xs font-bold text-slate-400">All silent on dispatch waves</p>
            <p className="text-[9px] opacity-60">No pending announcements or system alerts</p>
          </div>
        ) : (
          getFiltered().map(notif => (
            <div
              key={notif.id}
              className={`p-3.5 border rounded-2xl flex items-start gap-3 transition-all duration-300 relative group text-slate-300 ${
                notif.type === 'alert'
                  ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-100'
                  : notif.type === 'booking'
                  ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-100'
                  : 'bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/20 text-indigo-100'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {notif.type === 'alert' ? (
                  <ShieldAlert size={14} className="text-rose-450 animate-bounce" />
                ) : notif.type === 'booking' ? (
                  <BadgeCheck size={14} className="text-emerald-450" />
                ) : (
                  <Wifi size={14} className="text-indigo-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-black text-white truncate">{notif.title}</p>
                <p className="text-[10px] text-slate-350 leading-normal mt-1 break-words">{notif.message}</p>
              </div>

              <button
                onClick={() => handleDismiss(notif.id)}
                className="absolute top-3 right-3 p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Dismiss Alert"
              >
                <X size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
};

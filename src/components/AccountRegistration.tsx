/**
 * AccountRegistration.tsx
 * Full registration flow for Passengers and Van/Bus Drivers.
 * Collects: Full Name, Mobile Number, GPS-pinpointed Address, Face Selfie.
 * Persists account to Firestore `userAccounts` collection.
 * Stores session in localStorage under 'ekonek_account'.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fsAdd, fsSet, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface UserAccount {
  id: string;
  accountType: 'passenger' | 'driver';
  fullName: string;
  mobileNumber: string;
  address: string;
  addressCoords: { lat: number; lng: number } | null;
  selfieDataUrl: string;   // base64 image stored in Firestore
  createdAt: string;
  bookingIds: string[];    // saved booking references
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const ACCOUNT_KEY = 'ekonek_account';

export function loadAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAccount(account: UserAccount) {
  try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); } catch { /* noop */ }
}

export function clearAccount() {
  try { localStorage.removeItem(ACCOUNT_KEY); } catch { /* noop */ }
}

// ─── Steps ───────────────────────────────────────────────────────────────────
type Step = 'type' | 'details' | 'gps' | 'selfie' | 'review' | 'done';

interface Props {
  onComplete: (account: UserAccount) => void;
  onBack: () => void;
  prefillType?: 'passenger' | 'driver';
}

export const AccountRegistration: React.FC<Props> = ({ onComplete, onBack, prefillType }) => {
  const [step,          setStep]          = useState<Step>(prefillType ? 'details' : 'type');
  const [accountType,   setAccountType]   = useState<'passenger' | 'driver'>(prefillType || 'passenger');
  const [fullName,      setFullName]      = useState('');
  const [mobileNumber,  setMobileNumber]  = useState('');
  const [address,       setAddress]       = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState('');
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const [gpsError,      setGpsError]      = useState('');
  const [cameraActive,  setCameraActive]  = useState(false);
  const [cameraError,   setCameraError]   = useState('');
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');
  const [mobileError,   setMobileError]   = useState('');

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  // ── Clean up camera on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  // ── Validate Philippine mobile ─────────────────────────────────────────
  const validateMobile = (v: string) => /^(09|\+639)\d{9}$/.test(v.replace(/\s/g, ''));

  // ── GPS ─────────────────────────────────────────────────────────────────
  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this device.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setAddressCoords({ lat, lng });

        // Reverse-geocode via Nominatim (free, no key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow access and try again, or type your address manually.'); break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location unavailable. Try again or type manually.'); break;
          default:
            setGpsError('Location timed out. Try again or type manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera access.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const size   = Math.min(video.videoWidth, video.videoHeight);
    canvas.width  = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;
    // Center-crop to square
    const sx = (video.videoWidth  - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelfieDataUrl(dataUrl);
    stopCamera();
  };

  const retakeSelfie = () => {
    setSelfieDataUrl('');
    startCamera();
  };

  // ── Check duplicate mobile ──────────────────────────────────────────────
  const checkDuplicateMobile = async (mobile: string): Promise<boolean> => {
    try {
      const q = query(collection(db, 'userAccounts'), where('mobileNumber', '==', mobile));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch { return false; }
  };

  // ── Submit registration ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const isDupe = await checkDuplicateMobile(mobileNumber.replace(/\s/g, ''));
      if (isDupe) {
        setSaveError('This mobile number is already registered. Please log in instead.');
        setSaving(false);
        return;
      }

      const account: UserAccount = {
        id:            'acc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        accountType,
        fullName:      fullName.trim(),
        mobileNumber:  mobileNumber.replace(/\s/g, ''),
        address:       address.trim(),
        addressCoords,
        selfieDataUrl,
        createdAt:     new Date().toISOString(),
        bookingIds:    [],
      };

      await fsSet('userAccounts', account.id, account);
      saveAccount(account);
      setStep('done');
      setTimeout(() => onComplete(account), 1200);
    } catch (err: any) {
      setSaveError('Registration failed: ' + (err?.message || 'Unknown error. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Step validation guards ──────────────────────────────────────────────
  const canProceedDetails = fullName.trim().length >= 3 && validateMobile(mobileNumber);
  const canProceedGPS     = address.trim().length >= 5;
  const canProceedSelfie  = !!selfieDataUrl;

  const STEP_ORDER: Step[] = ['type', 'details', 'gps', 'selfie', 'review', 'done'];
  const stepIndex = STEP_ORDER.indexOf(step);
  const progressPct = prefillType
    ? ((stepIndex - 1) / 4) * 100   // skip 'type' step
    : (stepIndex / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001030] to-slate-900 flex flex-col items-center justify-start p-4 pt-8 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#003087]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#FF8800]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <button onClick={onBack}
          className="text-white/60 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
          <i className="fa-solid fa-arrow-left" /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-sm tracking-tight">Create Account</p>
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">E-Konek Occi.Mindo</p>
        </div>
        <div className="w-12" />
      </div>

      {/* Progress bar */}
      {step !== 'done' && (
        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-[9px] text-white/40 font-bold uppercase tracking-widest mb-2">
            {(prefillType ? ['Details','Address','Selfie','Review'] : ['Type','Details','Address','Selfie','Review']).map((label, i) => (
              <span key={label} className={
                (prefillType ? i + 1 : i) <= stepIndex ? 'text-[#FF8800]' : ''
              }>{label}</span>
            ))}
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-[#003087] to-[#FF8800] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, progressPct)}%` }} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >

          {/* ── STEP: Account Type ── */}
          {step === 'type' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="text-4xl">🪪</div>
                <h2 className="text-white font-black text-xl">I am registering as a…</h2>
                <p className="text-white/50 text-xs">Choose your account type. Drivers can manage dispatch trips.</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { type: 'passenger' as const, icon: '👤', label: 'Passenger', desc: 'Book ferry & shuttle seats, save tickets to your account, track rides.' },
                  { type: 'driver'    as const, icon: '🚐', label: 'Van / Bus Driver', desc: 'Register as a driver, manage dispatch trips, receive passenger bookings.' },
                ].map(opt => (
                  <motion.button key={opt.type} whileTap={{ scale: 0.97 }}
                    onClick={() => { setAccountType(opt.type); setStep('details'); }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FF8800]/40 rounded-2xl p-5 flex items-center gap-4 text-left transition-all cursor-pointer">
                    <span className="text-4xl bg-white/5 p-3 rounded-2xl">{opt.icon}</span>
                    <div>
                      <p className="text-white font-black text-sm">{opt.label}</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{opt.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: Personal Details ── */}
          {step === 'details' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl">{accountType === 'passenger' ? '👤' : '🚐'}</div>
                <h2 className="text-white font-black text-lg">Personal Information</h2>
                <p className="text-white/50 text-xs">Enter your legal name and a reachable mobile number.</p>
              </div>

              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                <div>
                  <label className="block text-[10px] text-white/50 font-black uppercase tracking-widest mb-2">Full Legal Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-white/30 text-sm"><i className="fa-solid fa-user" /></span>
                    <input type="text" placeholder="e.g. Maria Santos dela Cruz"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-sm font-semibold placeholder-white/25 focus:outline-none focus:border-[#FF8800]/60 transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-white/50 font-black uppercase tracking-widest mb-2">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-white/30 text-sm"><i className="fa-solid fa-mobile-screen" /></span>
                    <input type="tel" placeholder="e.g. 09171234567"
                      value={mobileNumber}
                      onChange={e => {
                        setMobileNumber(e.target.value);
                        setMobileError(validateMobile(e.target.value) || e.target.value === '' ? '' : 'Enter a valid PH mobile number (e.g. 09171234567)');
                      }}
                      className={`w-full bg-white/10 border rounded-2xl pl-11 pr-4 py-3 text-white text-sm font-semibold placeholder-white/25 focus:outline-none transition ${mobileError ? 'border-rose-500/60' : 'border-white/10 focus:border-[#FF8800]/60'}`} />
                  </div>
                  {mobileError && <p className="text-rose-400 text-[10px] mt-1.5 font-semibold">{mobileError}</p>}
                </div>
              </div>

              <button disabled={!canProceedDetails}
                onClick={() => setStep('gps')}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer
                  bg-gradient-to-r from-[#003087] to-[#0050cc] text-white shadow-lg
                  disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95">
                Continue to Address <i className="fa-solid fa-arrow-right ml-1" />
              </button>
            </div>
          )}

          {/* ── STEP: GPS Address ── */}
          {step === 'gps' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl">📍</div>
                <h2 className="text-white font-black text-lg">Your Location Address</h2>
                <p className="text-white/50 text-xs">Use GPS for an accurate pin or type your address manually.</p>
              </div>

              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                {/* GPS button */}
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={handleGPSLocate} disabled={gpsLoading}
                  className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:brightness-110 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg transition disabled:opacity-60 cursor-pointer">
                  {gpsLoading
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Locating…</>
                    : <><i className="fa-solid fa-location-crosshairs text-yellow-300 text-sm" /> Auto-Locate via GPS</>
                  }
                </motion.button>

                {addressCoords && (
                  <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-[10px] text-emerald-300 font-bold flex items-center gap-2">
                    <i className="fa-solid fa-circle-check" />
                    GPS locked: {addressCoords.lat.toFixed(5)}, {addressCoords.lng.toFixed(5)}
                  </div>
                )}

                {gpsError && (
                  <div className="bg-rose-900/30 border border-rose-500/30 rounded-2xl px-4 py-3 text-[10px] text-rose-300 font-semibold flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation mt-0.5" /> {gpsError}
                  </div>
                )}

                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 text-white/30 text-sm">
                    <i className="fa-solid fa-map-location-dot" />
                  </div>
                  <textarea
                    placeholder="Your full address (barangay, municipality, province)…"
                    value={address} onChange={e => setAddress(e.target.value)}
                    rows={3}
                    className="w-full bg-white/10 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-xs font-semibold placeholder-white/25 focus:outline-none focus:border-[#FF8800]/60 transition resize-none" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('details')}
                  className="flex-none px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-white/10 text-white border border-white/10 hover:bg-white/15 transition cursor-pointer">
                  <i className="fa-solid fa-arrow-left" />
                </button>
                <button disabled={!canProceedGPS}
                  onClick={() => setStep('selfie')}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer
                    bg-gradient-to-r from-[#003087] to-[#0050cc] text-white shadow-lg
                    disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95">
                  Continue to Selfie <i className="fa-solid fa-camera ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Face Selfie ── */}
          {step === 'selfie' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl">🤳</div>
                <h2 className="text-white font-black text-lg">Face Verification Selfie</h2>
                <p className="text-white/50 text-xs">A clear, well-lit photo of your face. Used for identity verification.</p>
              </div>

              <div className="bg-white/5 rounded-3xl p-5 border border-white/10 space-y-4">
                {/* Preview / Camera */}
                {selfieDataUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <img src={selfieDataUrl} alt="Selfie"
                        className="w-48 h-48 rounded-3xl object-cover border-4 border-[#FF8800] shadow-xl mx-auto" />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs font-black px-2 py-1 rounded-full shadow">
                        <i className="fa-solid fa-check mr-1" />Captured
                      </div>
                    </div>
                    <button onClick={retakeSelfie}
                      className="text-[#FF8800] font-black text-xs uppercase tracking-widest hover:underline cursor-pointer flex items-center gap-1.5">
                      <i className="fa-solid fa-rotate-right" /> Retake Selfie
                    </button>
                  </div>
                ) : cameraActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden border-2 border-[#FF8800]/50 shadow-2xl">
                      <video ref={videoRef} autoPlay playsInline muted
                        className="w-full h-full object-cover scale-x-[-1]" />
                      {/* Face guide overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-48 rounded-full border-2 border-[#FF8800]/60 border-dashed" />
                      </div>
                    </div>
                    <p className="text-white/40 text-[10px] text-center font-semibold">
                      Center your face in the oval guide then tap Capture
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => { stopCamera(); }}
                        className="px-4 py-2.5 bg-white/10 text-white font-black text-xs rounded-2xl border border-white/10 cursor-pointer hover:bg-white/15">
                        Cancel
                      </button>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={captureSelfie}
                        className="px-8 py-2.5 bg-[#FF8800] text-white font-black text-xs rounded-2xl uppercase tracking-widest shadow-lg cursor-pointer flex items-center gap-2 hover:brightness-110">
                        <i className="fa-solid fa-camera" /> Capture
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    {cameraError && (
                      <div className="bg-rose-900/30 border border-rose-500/30 rounded-2xl px-4 py-3 text-[10px] text-rose-300 font-semibold text-center">
                        <i className="fa-solid fa-triangle-exclamation mr-1" /> {cameraError}
                      </div>
                    )}
                    <motion.button whileTap={{ scale: 0.95 }} onClick={startCamera}
                      className="bg-gradient-to-r from-[#FF8800] to-orange-600 text-white font-black py-3.5 px-8 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl cursor-pointer hover:brightness-110">
                      <i className="fa-solid fa-camera text-yellow-200" /> Open Camera
                    </motion.button>

                    {/* File upload fallback */}
                    <label className="text-white/40 text-[10px] font-semibold cursor-pointer hover:text-white/60 transition flex items-center gap-1.5">
                      <i className="fa-solid fa-image" /> Or upload a photo instead
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setSelfieDataUrl(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }} />
                    </label>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { stopCamera(); setStep('gps'); }}
                  className="flex-none px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-white/10 text-white border border-white/10 hover:bg-white/15 transition cursor-pointer">
                  <i className="fa-solid fa-arrow-left" />
                </button>
                <button disabled={!canProceedSelfie}
                  onClick={() => { stopCamera(); setStep('review'); }}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer
                    bg-gradient-to-r from-[#003087] to-[#0050cc] text-white shadow-lg
                    disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95">
                  Review & Register <i className="fa-solid fa-arrow-right ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Review ── */}
          {step === 'review' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="text-3xl">✅</div>
                <h2 className="text-white font-black text-lg">Review Your Details</h2>
                <p className="text-white/50 text-xs">Confirm everything is correct before submitting.</p>
              </div>

              <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                {/* Selfie strip */}
                <div className="bg-gradient-to-r from-[#003087]/40 to-[#FF8800]/20 p-5 flex items-center gap-4 border-b border-white/5">
                  <img src={selfieDataUrl} alt="Selfie"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#FF8800] shadow" />
                  <div>
                    <p className="text-white font-black text-base leading-tight">{fullName}</p>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full mt-1 inline-block ${
                      accountType === 'passenger' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/30'
                        : 'bg-orange-900/50 text-orange-300 border border-orange-700/30'
                    }`}>
                      {accountType === 'passenger' ? '👤 Passenger' : '🚐 Van/Bus Driver'}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="divide-y divide-white/5">
                  {[
                    { icon: 'fa-mobile-screen', label: 'Mobile Number', value: mobileNumber },
                    { icon: 'fa-map-location-dot', label: 'Address', value: address },
                    addressCoords && { icon: 'fa-crosshairs', label: 'GPS Coordinates', value: `${addressCoords.lat.toFixed(5)}, ${addressCoords.lng.toFixed(5)}` },
                  ].filter(Boolean).map((item: any) => (
                    <div key={item.label} className="px-5 py-3.5 flex items-start gap-3">
                      <span className="text-white/30 text-sm mt-0.5 w-4 flex-shrink-0"><i className={`fa-solid ${item.icon}`} /></span>
                      <div>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{item.label}</p>
                        <p className="text-white/90 text-xs font-semibold mt-0.5 break-words">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="bg-rose-900/30 border border-rose-500/30 rounded-2xl px-4 py-3 text-xs text-rose-300 font-semibold">
                  <i className="fa-solid fa-circle-exclamation mr-1.5" /> {saveError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('selfie')}
                  className="flex-none px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-white/10 text-white border border-white/10 hover:bg-white/15 transition cursor-pointer">
                  <i className="fa-solid fa-arrow-left" />
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5
                    bg-gradient-to-r from-[#00A651] to-emerald-600 hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Registering…</>
                    : <><i className="fa-solid fa-user-plus" /> Create My Account</>
                  }
                </motion.button>
              </div>
            </div>
          )}

          {/* ── STEP: Done ── */}
          {step === 'done' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-5 py-8">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.5 }}
                className="text-7xl">🎉</motion.div>
              <div>
                <h2 className="text-white font-black text-2xl">Account Created!</h2>
                <p className="text-white/60 text-sm mt-1">Welcome, {fullName.split(' ')[0]}. Redirecting you now…</p>
              </div>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-3 border-[#FF8800]/30 border-t-[#FF8800] rounded-full animate-spin" />
              </div>
            </motion.div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

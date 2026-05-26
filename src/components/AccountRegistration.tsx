import React, { useState, useRef } from 'react';
import { UserRound, Smartphone, MapPin, Camera, ArrowLeft, Mail, Lock, CheckCircle, Upload } from 'lucide-react';
import { 
  auth, 
  db, 
  storage, 
  createUserWithEmailAndPassword, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface AccountRegistrationProps {
  onBack: () => void;
  onComplete: (acc: any) => void;
}

export const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  onBack,
  onComplete,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Selfie States
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // GPS States
  const [gps, setGps] = useState<{ lat: number; lng: number; formattedAddress: string } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [loading, setLoading] = useState(false);

  // Camera Handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (err: any) {
      toast.error('Could not access camera. Please upload a file instead.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            setSelfieFile(file);
            setSelfiePreview(URL.createObjectURL(file));
            stopCamera();
            toast.success('Selfie captured!');
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
      toast.success('Selfie uploaded!');
    }
  };

  // GPS Pinpoint Handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (!response.ok) throw new Error('Failed to reverse geocode');
          const data = await response.json();
          const addressStr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setGps({
            lat: latitude,
            lng: longitude,
            formattedAddress: addressStr
          });
          toast.success('Location locked successfully!');
        } catch (err: any) {
          console.error(err);
          setGps({
            lat: latitude,
            lng: longitude,
            formattedAddress: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (Mamburao Area)`
          });
          toast.warning('Location set, but address name lookup failed.');
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        console.error(err);
        toast.error('Could not retrieve location. Please allow GPS permission.');
        setFetchingGps(false);
      },
      { timeout: 10000 }
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobileNumber || !email || !password) {
      toast.error('Please fill up all required fields.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    if (!selfieFile) {
      toast.error('Please capture or upload a facial selfie.');
      return;
    }

    if (!gps) {
      toast.error('Please lock your GPS Pinpoint location.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Upload Selfie to Storage
      const selfieRef = ref(storage, `selfies/passengers/${uid}.jpg`);
      await uploadBytes(selfieRef, selfieFile);
      const selfieUrl = await getDownloadURL(selfieRef);

      // 3. Document payload
      const account = {
        id: uid,
        accountType: 'passenger' as const,
        fullName,
        mobileNumber,
        selfieUrl,
        gpsLocation: {
          lat: gps.lat,
          lng: gps.lng,
          formattedAddress: gps.formattedAddress,
        },
        email,
        createdAt: new Date().toISOString(),
        bookingIds: [],
        status: 'active' as const
      };

      // 4. Save to Firestore
      await setDoc(doc(db, 'userAccounts', uid), account);

      toast.success('Passenger Registration Successful!');
      onComplete(account);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Failed to register passenger. Try again.';
      if (errMsg.includes('auth/')) {
         if (err.code === 'auth/email-already-in-use') errMsg = 'This email is already registered. Please sign in instead.';
         else if (err.code === 'auth/weak-password') errMsg = 'Password is too weak. Please use a stronger password.';
         else errMsg = 'Failed to register account. Please check your details.';
      }
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 animate-fade-in mx-auto my-4">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => {
            stopCamera();
            onBack();
          }} 
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition select-none"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="font-extrabold text-[#003580] dark:text-[#38bdf8] tracking-tight text-lg">
          Passenger Registration
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              required
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              required
              placeholder="0917XXXXXXX"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        {/* Dynamic Facial Selfie Camera/Upload */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2 pl-1">
            Facial Selfie <span className="text-red-500">*</span>
          </label>

          {useCamera ? (
            <div className="space-y-2">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-300">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-[#003087] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                  >
                    📸 Take Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selfiePreview ? (
                <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <img src={selfiePreview} alt="Selfie Preview" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Selfie Attached
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelfiePreview('');
                        setSelfieFile(null);
                      }}
                      className="text-[10px] uppercase font-black text-slate-400 hover:text-red-500 mt-1 cursor-pointer"
                    >
                      Remove & Redo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#003580] rounded-2xl text-center cursor-pointer transition bg-slate-50 hover:bg-slate-100/50"
                  >
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">Use Camera</span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#003580] rounded-2xl text-center cursor-pointer transition bg-slate-50 hover:bg-slate-100/50">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GPS Pinpoint Address */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            GPS Pinpoint Address <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                readOnly
                placeholder="Lock Location with button below..."
                value={gps ? gps.formattedAddress : ''}
                className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-hidden select-none"
              />
            </div>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={fetchingGps}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {fetchingGps ? 'Locking GPS Coordinates...' : '📍 Get My Location'}
            </button>
          </div>
        </div>

        {/* Email & Password */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              required
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50 uppercase tracking-wider pl-1"
        >
          {loading ? 'Creating Account & Uploading Selfie...' : 'Confirm Sign Up'}
        </button>
      </form>
    </div>
  );
};
export default AccountRegistration;

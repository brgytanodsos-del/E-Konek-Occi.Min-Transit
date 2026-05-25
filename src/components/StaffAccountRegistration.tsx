import React, { useState, useRef } from 'react';
import { ShieldAlert, ArrowLeft, Camera, Upload, CheckCircle, Mail, Lock, User, Smartphone, IdCard } from 'lucide-react';
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

interface StaffAccountRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

export const StaffAccountRegistration: React.FC<StaffAccountRegistrationProps> = ({
  onBack,
  onComplete,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState<'port' | 'terminal' | 'driver'>('port');
  const [workId, setWorkId] = useState('');
  const [terminalMemberId, setTerminalMemberId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Selfie state
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loading, setLoading] = useState(false);

  // Camera Capture logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (err: any) {
      toast.error('Could not access camera. Please upload an image file instead.');
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
            const file = new File([blob], 'staff_selfie.jpg', { type: 'image/jpeg' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobileNumber || !email || !password) {
      toast.error('Please fill up all required fields.');
      return;
    }

    if (role === 'port' && !workId) {
      toast.error('Port Staff Work ID is required.');
      return;
    }

    if ((role === 'terminal' || role === 'driver') && !terminalMemberId) {
      toast.error('Grand Terminal Member ID is required.');
      return;
    }

    if (!selfieFile) {
      toast.error('Please take or upload a facial selfie.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password should be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Upload selfie to Firebase Storage under dynamic generatedId
      const generatedId = Math.random().toString(36).substring(2, 11);
      const selfieRef = ref(storage, `selfies/staff/${generatedId}.jpg`);
      await uploadBytes(selfieRef, selfieFile);
      const selfieUrl = await getDownloadURL(selfieRef);

      // 3. Document Payload
      const data = {
        id: uid,
        fullName,
        mobileNumber,
        role,
        workId: role === 'port' ? workId : null,
        terminalMemberId: (role === 'terminal' || role === 'driver') ? terminalMemberId : null,
        selfieUrl,
        email,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        lastLogin: ''
      };

      // 4. Set Firestore document in adminAccounts/{uid}
      await setDoc(doc(db, 'adminAccounts', uid), data);

      toast.success('Your application has been submitted and is pending Super Admin approval.', {
        duration: 6000,
      });
      onComplete();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit staff application. Please try again.');
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
          Staff Registration
        </span>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Your staff account application will be set as <span className="font-black underline uppercase">pending</span> and must be approved by the Super Admin before accessing the dispatch terminals.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              required
              placeholder="Officer Juan Dela Cruz"
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

        {/* Station Assignment */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Station / Role Assignment <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
          >
            <option value="port">🚢 Port Staff (Abra Port Station)</option>
            <option value="terminal">🚐 Terminal Staff (Mamburao Terminal)</option>
            <option value="driver">🚐 Shuttle Driver (Grand Terminal Member)</option>
          </select>
        </div>

        {/* Dynamic ID Inputs */}
        {role === 'port' && (
          <div>
            <label className="block text-[#003580] text-xs font-black uppercase tracking-wider mb-1.5 pl-1">
              Port Staff Work ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#003580]" />
              <input
                type="text"
                required
                placeholder="PRO-PORT-2026-XXXX"
                value={workId}
                onChange={(e) => setWorkId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-blue-50/50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
              />
            </div>
          </div>
        )}

        {(role === 'terminal' || role === 'driver') && (
          <div>
            <label className="block text-[#FF6B00] text-xs font-black uppercase tracking-wider mb-1.5 pl-1">
              Grand Terminal Member ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FF6B00]" />
              <input
                type="text"
                required
                placeholder="GT-MEMBER-XXXXX"
                value={terminalMemberId}
                onChange={(e) => setTerminalMemberId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-orange-50/50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-orange-500"
              />
            </div>
          </div>
        )}

        {/* Dynamic Facial Selfie Camera/Upload */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-2 pl-1">
            Facial Selfie Capture <span className="text-red-500">*</span>
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
                    📸 Snapping Selfie
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Close
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
                      Delete selfie & capture again
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
                    <span className="text-[10px] font-bold text-slate-600">Camera Snapper</span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#003580] rounded-2xl text-center cursor-pointer transition bg-slate-50 hover:bg-slate-100/50">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600">Upload File</span>
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

        {/* Email & Password */}
        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Work Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              required
              placeholder="name@min-transit.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5 pl-1">
            Security Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-hidden focus:border-[#003580]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50 uppercase tracking-widest pl-1"
        >
          {loading ? 'Submitting & Uploading Selfie...' : 'Apply for Access Credentials'}
        </button>
      </form>
    </div>
  );
};
export default StaffAccountRegistration;

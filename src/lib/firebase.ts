import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check (Optional but recommended extra layer of security)
// Ensure you have generated a ReCaptcha V3 Site Key from the Google Cloud Console.
// Uncomment the lines below to enforce App Check.

/*
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}
*/

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Re-export Auth & Storage methods as requested
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  ref,
  uploadBytes,
  getDownloadURL
};

export async function fsSet(collectionName: string, docId: string, data: any) {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data, { merge: true });
  return { success: true };
}

export async function fsUpdate(collectionName: string, docId: string, data: any) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
  return { success: true };
}

export async function fsDelete(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
  return { success: true };
}

export async function fsAdd(collectionName: string, data: any) {
  const id = Math.random().toString(36).substring(2, 11);
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, { ...data, id });
  return { id, success: true };
}

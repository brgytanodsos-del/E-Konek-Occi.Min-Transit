import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyAAKNYFKegpsJH4NOHQTsp0vRNbKP6NMU4",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0184019680.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0184019680",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0184019680.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "282629591129",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:282629591129:web:83c1cf3be4ea50b004e148"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "ai-studio-d31b7f09-688d-43bc-86f1-6bbb3e88699e");
export const auth = getAuth(app);
export const storage = getStorage(app);

// Re-export Auth & Storage methods as requested
export {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getStorage,
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

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

const firebaseConfig = {
  apiKey: "AIzaSyAAKNYFKegpsJH4NOHQTsp0vRNbKP6NMU4",
  authDomain: "gen-lang-client-0184019680.firebaseapp.com",
  projectId: "gen-lang-client-0184019680",
  storageBucket: "gen-lang-client-0184019680.firebasestorage.app",
  messagingSenderId: "282629591129",
  appId: "1:282629591129:web:83c1cf3be4ea50b004e148"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-d31b7f09-688d-43bc-86f1-6bbb3e88699e");

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

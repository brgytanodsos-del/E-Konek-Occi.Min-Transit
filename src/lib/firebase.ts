import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// ─── Firestore collection names ───────────────────────────────────────────────
export const COLLECTIONS = {
  ships:        'vessels',
  trips:        'trips',
  ferryBookings:'ferryBookings',
  vanBookings:  'vanBookings',
  announcements:'announcements',
  transactions: 'transactions',
  auditLog:     'auditLog',
  payoutHistory:'payoutHistory',
  userAccounts: 'userAccounts',
  adminAccounts:'adminAccounts',
} as const;

// ─── Generic real-time listener ───────────────────────────────────────────────
export function subscribeCollection<T>(
  collectionName: string,
  onData: (docs: T[]) => void,
  orderByField?: string
): Unsubscribe {
  const ref = orderByField
    ? query(collection(db, collectionName), orderBy(orderByField, 'desc'))
    : collection(db, collectionName);

  return onSnapshot(ref, (snapshot) => {
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
    onData(docs);
  });
}

// ─── Generic write helpers ────────────────────────────────────────────────────
export async function fsSet(collectionName: string, id: string, data: object) {
  await setDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fsAdd(collectionName: string, data: object): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function fsUpdate(collectionName: string, id: string, data: object) {
  await updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function fsDelete(collectionName: string, id: string) {
  await deleteDoc(doc(db, collectionName, id));
}

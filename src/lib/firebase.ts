import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
    authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
    // Add fallback for database ID if provided in env
    firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID
};

export const app = !getApps().length ? initializeApp(config) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (config as any).firestoreDatabaseId);

import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let adminApp: admin.app.App | null = null;

try {
  adminApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
} catch (error: any) {
  console.warn("⚠️ Firebase Admin initialization failed (usually expected in sandbox/dev env):", error.message);
  // Optional: fallback to dummy initialization if needed, or keep as null
}

export default admin;


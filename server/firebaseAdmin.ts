import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Load config to get databaseId
let databaseId = "(default)";
let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0184019680";

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.projectId) projectId = config.projectId;
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json, using defaults.");
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });
    console.log(`✅ Firebase Admin initialized. Project: ${projectId}, Database: ${databaseId}`);
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      console.log('Firebase Admin already initialized (duplicate-app).');
    } else {
      console.warn("⚠️ Firebase Admin initialization failed:", error.message);
    }
  }
}

// Export the initialized firestore instance with the correct database ID
export const db = getFirestore(databaseId === "(default)" ? undefined : databaseId);

export let isAdminSDKAuthorized = false;

// Test the database connection to catch errors early via REST API
// Bypassing gRPC Admin SDK test prevents gRPC PERMISSION_DENIED Error 7 traces in sandboxed environments
const apiKey = process.env.VITE_FIREBASE_API_KEY;
if (apiKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId === "(default)" ? "(default)" : databaseId}/documents:runQuery?key=${apiKey}`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'health' }],
        limit: 1
      }
    })
  })
    .then((res) => {
      if (res.ok) {
        console.log(`✅ Firestore connection successfully verified via REST API.`);
      } else {
        console.warn(`🚨 Firestore connection REST health check returned status: ${res.status}`);
      }
    })
    .catch((err) => {
      console.warn(`🚨 Firestore connection REST health check encountered error: ${err.message}`);
    });
} else {
  console.log(`ℹ️ Skipping Firestore connection check because VITE_FIREBASE_API_KEY is not set.`);
}

export default admin;


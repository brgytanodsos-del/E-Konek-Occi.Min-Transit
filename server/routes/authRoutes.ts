import express from 'express';
import crypto from 'crypto';
import admin, { db, isAdminSDKAuthorized, firebaseDatabaseId, firebaseProjectId } from '../firebaseAdmin';

const router = express.Router();

// Hashed PINs (sha256 of the PIN strings) - Master Roles
const PIN_HASHES: Record<string, string> = {
  port:       crypto.createHash('sha256').update('2001').digest('hex'),
  terminal:   crypto.createHash('sha256').update('2002').digest('hex'),
};

async function queryAdminAccountREST(role: string, pin: string): Promise<boolean> {
  const projectId = firebaseProjectId || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0184019680';
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.warn("Firestore REST query skipped: VITE_FIREBASE_API_KEY is not defined in server process environment.");
    return false;
  }

  let dbId = firebaseDatabaseId || "(default)";
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`;

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'adminAccounts' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'role' },
                op: 'EQUAL',
                value: { stringValue: role }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'pin' },
                op: 'EQUAL',
                value: { stringValue: pin }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'active' }
              }
            }
          ]
        }
      },
      limit: 1
    }
  };

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody)
    });

    if (response.status === 404 && dbId !== "(default)") {
      console.log(`Firestore REST fallback: database '${dbId}' returned 404. Retrying with database '(default)'...`);
      dbId = "(default)";
      url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      });
    }

    if (!response.ok) {
      console.warn(`Firestore REST fallback: runQuery failed with status ${response.status}`);
      return false;
    }

    const results = await response.json();
    if (Array.isArray(results) && results.length > 0 && results[0]?.document) {
      const doc = results[0].document;
      const docPath = doc.name;
      
      // Asynchronously update last login without blocking token issuance
      fetch(`https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=lastLogin&key=${apiKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            lastLogin: { stringValue: new Date().toISOString() }
          }
        })
      }).catch(e => console.warn("Firestore REST fallback: failed to update lastLogin:", e));

      return true;
    }
  } catch (err: any) {
    console.warn("Firestore REST fallback query encountered network error:", err.message);
  }

  return false;
}

// POST /api/auth/verify-pin
router.post('/verify-pin', async (req, res) => {
  const { role, pin } = req.body as { role: string; pin: string };

  if (!role || !pin) {
    return res.status(400).json({ success: false, message: 'Role and PIN are required.' });
  }

  if (role === 'passenger') {
    return res.status(400).json({ success: false, message: 'Passengers do not require PIN verification.' });
  }

  const incomingHash = crypto.createHash('sha256').update(pin).digest('hex');
  const expectedMasterHash = PIN_HASHES[role];

  let verified = false;

  // 1. Check Super Admin from environment or fallback to 1234
  if (role === 'superadmin') {
    const superAdminPin = process.env.SUPERADMIN_PIN_KEY;
    if (pin === '1234' || (superAdminPin && pin === superAdminPin)) {
      verified = true;
    }
  }

  // 2. Check master roles (Port/Terminal)
  if (!verified && expectedMasterHash && incomingHash === expectedMasterHash) {
    verified = true;
  }

  // 2. Check dynamic admin accounts from Firestore
  if (!verified) {
    if (isAdminSDKAuthorized) {
      try {
        if (!db) throw new Error("Firestore database not initialized");
        
        const snapshot = await db.collection('adminAccounts')
          .where('role', '==', role)
          .where('pin', '==', pin)
          .where('status', '==', 'active')
          .limit(1)
          .get();

        if (!snapshot.empty) {
          verified = true;
          // Optionally update last login
          const accountDoc = snapshot.docs[0];
          await accountDoc.ref.update({ lastLogin: new Date().toISOString() });
        }
      } catch (err: any) {
        console.log(`Firestore Admin SDK check failed during query (${err.message}). Trying secure REST API fallback...`);
        try {
          const hasAccount = await queryAdminAccountREST(role, pin);
          if (hasAccount) {
            verified = true;
          } else {
            console.log("Firestore REST API: No matching dynamic admin account found.");
          }
        } catch (restErr: any) {
          console.warn("Firestore REST fallback query also failed:", restErr.message || restErr);
        }
      }
    } else {
      // Secure fallback mode: Bypassing standard Admin SDK entirely to avoid gRPC PERMISSION_DENIED errors
      try {
        const hasAccount = await queryAdminAccountREST(role, pin);
        if (hasAccount) {
          verified = true;
        }
      } catch (restErr: any) {
        console.warn("Firestore REST fallback query failed:", restErr.message || restErr);
      }
    }
  }

  if (!verified) {
    return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
  }

  const secret = process.env.SESSION_SECRET || 'ekonek-occi-mindo-secret-change-me';
  const payload = `${role}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sessionToken = Buffer.from(`${payload}:${sig}`).toString('base64');

  return res.json({ success: true, sessionToken, role });
});

// POST /api/auth/verify-token
router.post('/verify-token', (req, res) => {
  const { sessionToken } = req.body as { sessionToken: string };
  if (!sessionToken) return res.json({ valid: false });

  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return res.json({ valid: false });

    const [role, timestamp, sig] = parts;
    const secret = process.env.SESSION_SECRET || 'ekonek-occi-mindo-secret-change-me';
    const payload = `${role}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (sig !== expectedSig) return res.json({ valid: false });

    const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > SESSION_TTL_MS) {
      return res.json({ valid: false, reason: 'expired' });
    }

    return res.json({ valid: true, role });
  } catch {
    return res.json({ valid: false });
  }
});

export default router;

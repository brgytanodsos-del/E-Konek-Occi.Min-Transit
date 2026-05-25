/**
 * authRoutes.ts — FIXED
 *
 * Changes vs original:
 * 1. Removed ALL hardcoded plaintext PINs from server code.
 * 2. Removed the `pin === '1234'` super-admin backdoor.
 * 3. Firestore is queried by role + status only; PIN comparison is done
 *    server-side after fetching the bcrypt hash — the raw PIN never travels
 *    to the database layer.
 * 4. Rate-limiter (already in server/index.ts) is respected; no extra bypass.
 * 5. Session token now uses a random 32-byte opaque ID stored in a server-side
 *    Map (simple in-process store — swap for Redis in production).
 * 6. Token TTL: 12 h (unchanged). Tokens are invalidated on logout.
 */

import express from 'express';
import crypto from 'crypto';
import { scrypt, timingSafeEqual, randomBytes } from 'crypto';
import { promisify } from 'util';
import admin, { db, isAdminSDKAuthorized, firebaseDatabaseId, firebaseProjectId } from '../firebaseAdmin';

const router = express.Router();
const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// In-process session store  (replace with Redis for multi-instance deploys)
// ---------------------------------------------------------------------------
interface SessionEntry {
  role: string;
  createdAt: number;
}
const SESSION_STORE = new Map<string, SessionEntry>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

// Purge expired sessions every hour so memory doesn't grow unboundedly
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of SESSION_STORE) {
    if (now - entry.createdAt > SESSION_TTL_MS) SESSION_STORE.delete(token);
  }
}, 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/**
 * Hash a PIN with scrypt for storage.
 * Format:  scrypt:<salt_hex>:<hash_hex>
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(pin, salt, 32)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

/**
 * Verify a plain PIN against a stored hash.
 * Supports both the new `scrypt:…` format and the old SHA-256 format so that
 * existing accounts continue to work until their PIN is reset.
 */
async function verifyPin(plain: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('scrypt:')) {
      const [, saltHex, hashHex] = stored.split(':');
      const hash = (await scryptAsync(plain, saltHex, 32)) as Buffer;
      const storedHash = Buffer.from(hashHex, 'hex');
      return timingSafeEqual(hash, storedHash);
    }

    // Legacy SHA-256 fallback (for accounts not yet migrated)
    const incoming = crypto.createHash('sha256').update(plain).digest('hex');
    const storedBuf = Buffer.from(stored, 'hex');
    const incomingBuf = Buffer.from(incoming, 'hex');
    if (storedBuf.length !== incomingBuf.length) return false;
    return timingSafeEqual(storedBuf, incomingBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Firestore helper — fetch admin account for a given role
// ---------------------------------------------------------------------------

interface AdminDoc {
  ref: FirebaseFirestore.DocumentReference;
  pin: string;
  status: string;
}

async function fetchAdminAccountForRole(role: string): Promise<AdminDoc | null> {
  // Prefer Admin SDK; fall back to REST when SDK isn't authorised
  if (isAdminSDKAuthorized && db) {
    try {
      const snap = await db
        .collection('adminAccounts')
        .where('role', '==', role)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0];
        return { ref: d.ref, pin: d.data().pin as string, status: d.data().status };
      }
      return null;
    } catch (err: any) {
      console.warn('Admin SDK query failed, trying REST:', err.message);
    }
  }

  // REST fallback
  const projectId =
    firebaseProjectId ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    '';
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || !projectId) return null;

  const dbId = firebaseDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'adminAccounts' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: role } } },
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
          ],
        },
      },
      limit: 1,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const results = await res.json();
    if (Array.isArray(results) && results[0]?.document) {
      const doc = results[0].document;
      const pinField = doc.fields?.pin?.stringValue;
      const docPath = doc.name as string;
      // Return a minimal ref-like object for the REST path
      return {
        ref: { path: docPath } as any,
        pin: pinField ?? '',
        status: 'active',
      };
    }
  } catch (err: any) {
    console.warn('Firestore REST query failed:', err.message);
  }
  return null;
}

async function updateLastLogin(ref: FirebaseFirestore.DocumentReference | { path: string }) {
  const ts = new Date().toISOString();
  if ('update' in ref) {
    // Real DocumentReference
    await (ref as FirebaseFirestore.DocumentReference)
      .update({ lastLogin: ts })
      .catch((e: any) => console.warn('lastLogin update failed:', e.message));
  } else {
    // REST path
    const projectId =
      firebaseProjectId ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      '';
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return;
    const url = `https://firestore.googleapis.com/v1/${(ref as any).path}?updateMask.fieldPaths=lastLogin&key=${apiKey}`;
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { lastLogin: { stringValue: ts } } }),
    }).catch((e: any) => console.warn('REST lastLogin update failed:', e.message));
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-pin
// ---------------------------------------------------------------------------
router.post('/verify-pin', async (req, res) => {
  const { role, pin } = req.body as { role?: string; pin?: string };

  if (!role || !pin) {
    return res.status(400).json({ success: false, message: 'Role and PIN are required.' });
  }

  if (role === 'passenger') {
    // Passengers don't use PIN; they hit the public portal directly
    return res.status(400).json({ success: false, message: 'Passengers use the public portal — no PIN required.' });
  }

  // Only allow known roles
  const ALLOWED_ROLES = ['port', 'terminal', 'superadmin'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Unknown role.' });
  }

  // Fetch the admin document (contains the hashed PIN)
  const account = await fetchAdminAccountForRole(role);
  if (!account) {
    return res.status(401).json({ success: false, message: 'No active account found for this role.' });
  }

  // Compare the provided PIN against the stored hash
  const ok = await verifyPin(pin, account.pin);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
  }

  // Issue opaque session token
  const sessionToken = randomBytes(32).toString('hex');
  SESSION_STORE.set(sessionToken, { role, createdAt: Date.now() });

  // Update lastLogin in background
  updateLastLogin(account.ref);

  return res.json({ success: true, sessionToken, role });
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-token
// ---------------------------------------------------------------------------
router.post('/verify-token', (req, res) => {
  const { sessionToken } = req.body as { sessionToken?: string };
  if (!sessionToken) return res.json({ valid: false });

  const entry = SESSION_STORE.get(sessionToken);
  if (!entry) return res.json({ valid: false });

  if (Date.now() - entry.createdAt > SESSION_TTL_MS) {
    SESSION_STORE.delete(sessionToken);
    return res.json({ valid: false, reason: 'expired' });
  }

  return res.json({ valid: true, role: entry.role });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  const { sessionToken } = req.body as { sessionToken?: string };
  if (sessionToken) SESSION_STORE.delete(sessionToken);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/auth/hash-pin   (Super-admin utility — call once per account setup)
// Accepts { pin } in request body and returns { hash } — use this to generate
// the hashed PIN values to store in Firestore adminAccounts.
// IMPORTANT: Protect this route behind a server-side secret header before
// exposing it in production, or remove it entirely after initial setup.
// ---------------------------------------------------------------------------
router.post('/hash-pin', async (req, res) => {
  const setupKey = process.env.SETUP_SECRET;
  const provided = req.headers['x-setup-secret'];

  if (!setupKey || provided !== setupKey) {
    return res.status(403).json({ error: 'Forbidden — set SETUP_SECRET env var and pass X-Setup-Secret header.' });
  }

  const { pin } = req.body as { pin?: string };
  if (!pin || !/^\d{4,8}$/.test(pin)) {
    return res.status(400).json({ error: 'pin must be 4–8 digits.' });
  }

  const hash = await hashPin(pin);
  return res.json({ hash });
});

export default router;

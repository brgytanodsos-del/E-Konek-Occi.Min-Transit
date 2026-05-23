import express from 'express';
import crypto from 'crypto';
import admin, { db } from '../firebaseAdmin';

const router = express.Router();

// Hashed PINs (sha256 of the PIN strings) - Master Roles
const PIN_HASHES: Record<string, string> = {
  port:       crypto.createHash('sha256').update('2001').digest('hex'),
  terminal:   crypto.createHash('sha256').update('2002').digest('hex'),
};

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

  // 1. Check Super Admin from environment (6 digits)
  if (role === 'superadmin') {
    const superAdminPin = process.env.SUPERADMIN_PIN_KEY;
    if (!superAdminPin) {
      console.error("FATAL: SUPERADMIN_PIN_KEY not set in environment");
      return res.status(500).json({ success: false, message: 'System security configuration missing.' });
    }
    if (pin === superAdminPin) {
      verified = true;
    }
  }

  // 2. Check master roles (Port/Terminal)
  if (!verified && expectedMasterHash && incomingHash === expectedMasterHash) {
    verified = true;
  }

  // 2. Check dynamic admin accounts from Firestore
  if (!verified) {
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
    } catch (err) {
      console.warn("Firestore check failed, falling back to master only:", err);
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

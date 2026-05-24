import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Hashed PINs (sha256 of the PIN strings)
// These replace the plain-text PINs that were previously in the client bundle.
// To regenerate: node -e "const c=require('crypto');['2001','2002','1234'].forEach(p=>console.log(p,c.createHash('sha256').update(p).digest('hex')))"
const PIN_HASHES: Record<string, string> = {
  port:       crypto.createHash('sha256').update('2001').digest('hex'),
  terminal:   crypto.createHash('sha256').update('2002').digest('hex'),
  superadmin: crypto.createHash('sha256').update('1234').digest('hex'),
};

// POST /api/auth/verify-pin
// Body: { role: string, pin: string }
// Returns: { success: boolean, sessionToken?: string }
router.post('/verify-pin', (req, res) => {
  const { role, pin } = req.body as { role: string; pin: string };

  if (!role || !pin) {
    return res.status(400).json({ success: false, message: 'Role and PIN are required.' });
  }

  // Passenger has no PIN — never call this endpoint for passenger
  if (role === 'passenger') {
    return res.status(400).json({ success: false, message: 'Passengers do not require PIN verification.' });
  }

  const expectedHash = PIN_HASHES[role];
  if (!expectedHash) {
    return res.status(400).json({ success: false, message: 'Unknown role.' });
  }

  const incomingHash = crypto.createHash('sha256').update(pin).digest('hex');

  if (incomingHash !== expectedHash) {
    return res.status(401).json({ success: false, message: 'Incorrect PIN.' });
  }

  // Issue a simple signed session token (HMAC) — no JWT dependency needed.
  // In production, swap this for Firebase Custom Tokens or a proper JWT library.
  const secret = process.env.SESSION_SECRET || 'ekonek-occi-mindo-secret-change-me';
  const payload = `${role}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sessionToken = Buffer.from(`${payload}:${sig}`).toString('base64');

  return res.json({ success: true, sessionToken, role });
});

// POST /api/auth/verify-token
// Body: { sessionToken: string }
// Returns: { valid: boolean, role?: string }
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

    // Sessions expire after 12 hours
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

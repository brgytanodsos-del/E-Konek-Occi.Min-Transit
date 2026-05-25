import express from 'express';
import admin, { db } from '../firebaseAdmin';

const router = express.Router();

// POST /api/auth/approve-account
// Body: { uid: string, role: 'port' | 'terminal' | 'driver' }
// Sets Firebase custom claim and updates Firestore status to 'active'
router.post('/approve-account', async (req, res) => {
  const { uid, role } = req.body as { uid?: string; role?: 'port' | 'terminal' | 'driver' };

  if (!uid || !role) {
    return res.status(400).json({ success: false, message: 'UID and role are required.' });
  }

  const ALLOWED_ROLES = ['port', 'terminal', 'driver'];
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  try {
    // 1. Set Custom User Claims on Firebase Auth
    await admin.auth().setCustomUserClaims(uid, { role });

    // 2. Set Firestore adminAccounts/{uid} status to active
    await db.collection('adminAccounts').doc(uid).update({ status: 'active' });

    console.log(`✅ Successfully approved staff account: ${uid} with role: ${role}`);
    return res.json({ 
      success: true, 
      message: `Staff account approved and role claim '${role}' updated successfully.` 
    });
  } catch (err: any) {
    console.error('Error in approve-account:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to approve manager account.' 
    });
  }
});

// Dummy endpoint for health or other updates
router.get('/config-check', (req, res) => {
  res.json({ 
    superAdminConfigured: !!process.env.SUPERADMIN_USER,
  });
});

export default router;

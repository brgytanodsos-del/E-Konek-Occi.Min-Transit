import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import shipRoutes from './routes/shipRoutes';
import authRoutes from './routes/authRoutes';
import admin from './firebaseAdmin';

dotenv.config();

async function bootstrapSuperAdmin() {
  const email = process.env.SUPERADMIN_USER;
  const password = process.env.SUPERADMIN_PASS;
  
  if (!email || !password) {
    console.warn("⚠️ SUPERADMIN_USER or SUPERADMIN_PASS environment variables are not set. Skipping bootstrap.");
    return;
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log("➡️ Super Admin user already exists:", user.uid);
    // Refresh claims
    await admin.auth().setCustomUserClaims(user.uid, { role: 'superadmin' });
    console.log("➡️ Custom claims for Super Admin ensured.");
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: true,
        displayName: "Super Admin"
      });
      await admin.auth().setCustomUserClaims(newUser.uid, { role: 'superadmin' });
      console.log("❇️ Super Admin user bootstrapped successfully. UID:", newUser.uid);
    } else {
      console.error("❌ Error checking/bootstrapping Super Admin:", err.message);
    }
  }
}

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run the Super Admin bootstrap task
  await bootstrapSuperAdmin();

  // Trust proxy for accurate rate limiting behind reverse proxies
  app.set('trust proxy', 1);

  // Rate limit auth endpoint: max 20 requests per IP per 15 min for modern login
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Too many authentication attempts. Please wait 15 minutes." }
  });

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/ships', shipRoutes);
  
  console.log('NODE_ENV is set to:', process.env.NODE_ENV);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'development') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

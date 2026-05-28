import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import shipRoutes from './routes/shipRoutes';
import authRoutes from './routes/authRoutes';
import admin, { db } from './firebaseAdmin';

dotenv.config();

async function bootstrapRoles() {
  const usersToSeed = [
    {
      email: 'admin_new@mindorotransit.com',
      password: 'NewAdminPassword1234!',
      displayName: 'New Super Admin',
      role: 'superadmin',
      isStaff: false,
    },
    {
      email: 'brgytanodsos@gmail.com',
      password: 'SUPER_ADMIN_PASSWORD_1234',
      displayName: 'System Super Admin',
      role: 'superadmin',
      isStaff: false,
    },
    {
      email: 'admin@mindorotransit.com',
      password: 'SUPER_ADMIN_PASSWORD_1234',
      displayName: 'MindoroTransit Admin',
      role: 'superadmin',
      isStaff: false,
    },
    {
      email: 'port@mindorotransit.com',
      password: 'PORT_STAFF_PASSWORD_2001',
      displayName: 'Abra Port Operator',
      role: 'port',
      isStaff: true,
      staffFields: {
        fullName: 'Abra Port Operator',
        role: 'port',
        status: 'active',
        mobileNumber: '09171232001',
        workId: 'PORT-2001',
      }
    },
    {
      email: 'terminal@mindorotransit.com',
      password: 'TERMINAL_STAFF_PASSWORD_2002',
      displayName: 'Mamburao Terminal Dispatcher',
      role: 'terminal',
      isStaff: true,
      staffFields: {
        fullName: 'Mamburao Terminal Dispatcher',
        role: 'terminal',
        status: 'active',
        mobileNumber: '09171232002',
        memberId: 'TERM-2002',
      }
    },
    {
      email: 'passenger@mindorotransit.com',
      password: 'PASSENGER_PASSWORD_0000',
      displayName: 'Mindoro Passenger',
      role: 'passenger',
      isPassenger: true,
      passengerFields: {
        fullName: 'Mindoro Passenger',
        mobileNumber: '09170000000',
        accountType: 'passenger',
        email: 'passenger@mindorotransit.com',
        bookingIds: [],
        status: 'active',
        gps: {
          lat: 13.2083,
          lng: 120.5911,
          formattedAddress: 'Mamburao, Occidental Mindoro, Philippines'
        }
      }
    }
  ];

  console.log('🏁 Starting E-Konek MindoroTransit account bootstrapping...');

  for (const item of usersToSeed) {
    try {
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(item.email);
        console.log(`➡️ Account already exists: ${item.email} (UID: ${userRecord.uid})`);
        
        // Force update password for admin accounts
        if (item.role === 'superadmin') {
            await admin.auth().updateUser(userRecord.uid, { password: item.password });
            console.log(`🔄 Force-updated password for admin: ${item.email}`);
        }
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          try {
            userRecord = await admin.auth().createUser({
              email: item.email,
              password: item.password,
              displayName: item.displayName,
              emailVerified: true,
            });
            console.log(`❇️ Created Auth account: ${item.email} (UID: ${userRecord.uid})`);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
               userRecord = await admin.auth().getUserByEmail(item.email);
               console.log(`⚠️ Account already in use (caught during creation): ${item.email} (UID: ${userRecord.uid})`);
            } else {
              throw createErr;
            }
          }
        } else {
          throw err;
        }
      }

      // Ensure custom claims are set
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: item.role });
      console.log(`🛡️ Set custom role claim '${item.role}' for UID: ${userRecord.uid}`);

      // Ensure corresponding Firestore records exist
      if (item.isStaff && item.staffFields) {
        const staffDocRef = db.collection('adminAccounts').doc(userRecord.uid);
        const docSnap = await staffDocRef.get();
        if (!docSnap.exists) {
          await staffDocRef.set({
            id: userRecord.uid,
            ...item.staffFields,
            createdAt: new Date().toISOString(),
          });
          console.log(`📄 Initialized Firestore adminAccounts/${userRecord.uid}`);
        }
      } else if (item.isPassenger && item.passengerFields) {
        const passDocRef = db.collection('userAccounts').doc(userRecord.uid);
        const docSnap = await passDocRef.get();
        if (!docSnap.exists) {
          await passDocRef.set({
            id: userRecord.uid,
            ...item.passengerFields,
            createdAt: new Date().toISOString(),
          });
          console.log(`📄 Initialized Firestore userAccounts/${userRecord.uid}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error bootstrapping user ${item.email}:`, error.message);
    }
  }
}

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run the Super Admin & roles bootstrap task
  try {
    await bootstrapRoles();
  } catch (err: any) {
    console.error('⚠️ Skipping mandatory roles bootstrapping due to potential permission issues:', err.message);
  }

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

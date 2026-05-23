import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import shipRoutes from './routes/shipRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for accurate rate limiting behind reverse proxies
  app.set('trust proxy', 1);

  // Rate limit auth endpoint: max 10 requests per IP per 15 min
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many PIN attempts. Please wait 15 minutes." }
  });

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/ships', shipRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

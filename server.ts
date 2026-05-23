import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import FirecrawlApp from "@mendable/firecrawl-js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(cors());
  app.use(express.json());

  // Wait 1.5 seconds helper
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  app.post("/api/sync-ships", async (req, res) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        // Return mock data for UI safety when key is missing but sleep a bit to simulate fetching
        await delay(3000);
        return res.json({
          status: 'success',
          source: 'mock',
          message: 'FIRECRAWL_API_KEY not found. Returning standard offline data.',
          ships: [
            { id: "s1", name: "Maria Josefa", route: "Abra → Batangas", depTime: "2026-05-23T14:00:00.000Z", arrTime: "2026-05-23T16:30:00.000Z", type: "RORO", status: "Scheduled", capacity: 800, available: 450 },
            { id: "s2", name: "Reina Genoveva", route: "Batangas → Abra", depTime: "2026-05-23T11:00:00.000Z", arrTime: "2026-05-23T13:30:00.000Z", type: "RORO", status: "Boarding", capacity: 600, available: 12 },
          ]
        });
      }

      // Initialize Firecrawl
      const firecrawlApp = new FirecrawlApp({ apiKey });

      // In a real scenario, we might scrape a specific shipping site
      const scrapeResult = await firecrawlApp.scrapeUrl('https://montenegroshipping.com/schedules', {
        formats: ['markdown']
      });

      if (!scrapeResult.success) {
        throw new Error("Failed to scrape data");
      }

      res.json({
        status: 'success',
        source: 'firecrawl',
        message: 'Successfully scraped shipping data',
        markdown: scrapeResult.markdown
      });

    } catch (error) {
      console.error('Firecrawl error:', error);
      res.status(500).json({ error: 'Failed to sync shipping data' });
    }
  });

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

startServer();

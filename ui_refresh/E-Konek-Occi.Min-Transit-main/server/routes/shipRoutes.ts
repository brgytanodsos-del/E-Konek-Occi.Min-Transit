import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import FirecrawlApp from "@mendable/firecrawl-js";

const router = express.Router();

// Wait 1.5 seconds helper
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

router.post("/sync", requireAuth, requireRole('superadmin', 'dispatcher'), async (req, res) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
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

      const firecrawlApp = new FirecrawlApp({ apiKey });

      const scrapeResult = await (firecrawlApp as any).scrapeUrl('https://montenegroshipping.com/schedules', {
        formats: ['markdown']
      } as any);

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

export default router;

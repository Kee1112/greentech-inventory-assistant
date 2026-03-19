import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { InventoryItem } from '../db';
import { generateAIInsights, categorizeItemWithAI } from '../services/aiService';
import { generateFallbackInsights } from '../services/fallbackService';

export function createAIRouter(db: Database): Router {
  const router = Router();

  // POST /insights/:id — get AI insights for a specific item
  router.post('/insights/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
      if (!item) {
        return res.status(404).json({ error: `Item with ID ${id} not found` });
      }

      const allItems = db.prepare('SELECT * FROM inventory').all() as InventoryItem[];
      const insights = await generateAIInsights(item, allItems);
      return res.json(insights);
    } catch (error) {
      console.error('POST /ai/insights/:id error:', error);
      return res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  // POST /bulk-insights — get fallback insights for all items
  router.post('/bulk-insights', (_req: Request, res: Response) => {
    try {
      const allItems = db.prepare('SELECT * FROM inventory').all() as InventoryItem[];
      const results = allItems.map(item => {
        const insight = generateFallbackInsights(item);
        return {
          item,
          insight,
        };
      });
      return res.json(results);
    } catch (error) {
      console.error('POST /ai/bulk-insights error:', error);
      return res.status(500).json({ error: 'Failed to generate bulk insights' });
    }
  });

  // POST /categorize — suggest a category for an item using AI
  router.post('/categorize', async (req: Request, res: Response) => {
    try {
      const { name, notes } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Item name is required for categorization' });
      }

      const category = await categorizeItemWithAI(
        name.trim(),
        typeof notes === 'string' ? notes.trim() : ''
      );

      return res.json({ category });
    } catch (error) {
      console.error('POST /ai/categorize error:', error);
      return res.status(500).json({ error: 'Failed to categorize item', category: 'Office Supplies' });
    }
  });

  return router;
}

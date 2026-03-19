import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { InventoryItem } from '../db';

export function createInventoryRouter(db: Database): Router {
  const router = Router();

  // GET / — list all items with optional filters
  router.get('/', (req: Request, res: Response) => {
    try {
      const { search, category, lowStock } = req.query;

      let query = 'SELECT * FROM inventory WHERE 1=1';
      const params: (string | number)[] = [];

      if (search && typeof search === 'string' && search.trim()) {
        query += ' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)';
        const searchTerm = `%${search.toLowerCase()}%`;
        params.push(searchTerm, searchTerm);
      }

      if (category && typeof category === 'string' && category.trim()) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (lowStock === 'true') {
        query += ' AND quantity <= reorderThreshold';
      }

      query += ' ORDER BY updatedAt DESC';

      const items = db.prepare(query).all(...params) as InventoryItem[];
      res.json(items);
    } catch (error) {
      console.error('GET /inventory error:', error);
      res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
  });

  // GET /:id — get single item
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
      if (!item) {
        return res.status(404).json({ error: `Item with ID ${id} not found` });
      }

      return res.json(item);
    } catch (error) {
      console.error('GET /inventory/:id error:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  });

  // POST / — create item
  router.post('/', (req: Request, res: Response) => {
    try {
      const {
        name,
        category,
        quantity,
        unit,
        reorderThreshold,
        expiryDate,
        lastRestocked,
        dailyUsageRate,
        supplier,
        sustainabilityScore,
        notes,
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be a non-negative number' });
      }
      if (!dailyUsageRate || typeof dailyUsageRate !== 'number' || dailyUsageRate <= 0) {
        return res.status(400).json({ error: 'Daily usage rate must be a positive number' });
      }
      if (!category || typeof category !== 'string' || category.trim() === '') {
        return res.status(400).json({ error: 'Category is required' });
      }
      if (!unit || typeof unit !== 'string' || unit.trim() === '') {
        return res.status(400).json({ error: 'Unit is required' });
      }
      if (!supplier || typeof supplier !== 'string' || supplier.trim() === '') {
        return res.status(400).json({ error: 'Supplier is required' });
      }
      if (!lastRestocked || typeof lastRestocked !== 'string') {
        return res.status(400).json({ error: 'Last restocked date is required' });
      }
      if (
        sustainabilityScore !== undefined &&
        (typeof sustainabilityScore !== 'number' || sustainabilityScore < 1 || sustainabilityScore > 10)
      ) {
        return res.status(400).json({ error: 'Sustainability score must be between 1 and 10' });
      }

      const now = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO inventory (name, category, quantity, unit, reorderThreshold, expiryDate, lastRestocked, dailyUsageRate, supplier, sustainabilityScore, notes, createdAt, updatedAt)
        VALUES (@name, @category, @quantity, @unit, @reorderThreshold, @expiryDate, @lastRestocked, @dailyUsageRate, @supplier, @sustainabilityScore, @notes, @createdAt, @updatedAt)
      `).run({
        name: name.trim(),
        category: category.trim(),
        quantity,
        unit: unit.trim(),
        reorderThreshold: reorderThreshold ?? 0,
        expiryDate: expiryDate ?? null,
        lastRestocked,
        dailyUsageRate,
        supplier: supplier.trim(),
        sustainabilityScore: sustainabilityScore ?? 5,
        notes: notes ?? '',
        createdAt: now,
        updatedAt: now,
      });

      const newItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(result.lastInsertRowid) as InventoryItem;
      return res.status(201).json(newItem);
    } catch (error) {
      console.error('POST /inventory error:', error);
      return res.status(500).json({ error: 'Failed to create inventory item' });
    }
  });

  // PUT /:id — update item
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
      if (!existing) {
        return res.status(404).json({ error: `Item with ID ${id} not found` });
      }

      const {
        name,
        category,
        quantity,
        unit,
        reorderThreshold,
        expiryDate,
        lastRestocked,
        dailyUsageRate,
        supplier,
        sustainabilityScore,
        notes,
      } = req.body;

      // Validation for provided fields
      if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
        return res.status(400).json({ error: 'Quantity must be a non-negative number' });
      }
      if (dailyUsageRate !== undefined && (typeof dailyUsageRate !== 'number' || dailyUsageRate <= 0)) {
        return res.status(400).json({ error: 'Daily usage rate must be a positive number' });
      }
      if (
        sustainabilityScore !== undefined &&
        (typeof sustainabilityScore !== 'number' || sustainabilityScore < 1 || sustainabilityScore > 10)
      ) {
        return res.status(400).json({ error: 'Sustainability score must be between 1 and 10' });
      }

      const now = new Date().toISOString();
      const updated = {
        name: name !== undefined ? name.trim() : existing.name,
        category: category !== undefined ? category.trim() : existing.category,
        quantity: quantity !== undefined ? quantity : existing.quantity,
        unit: unit !== undefined ? unit.trim() : existing.unit,
        reorderThreshold: reorderThreshold !== undefined ? reorderThreshold : existing.reorderThreshold,
        expiryDate: expiryDate !== undefined ? expiryDate : existing.expiryDate,
        lastRestocked: lastRestocked !== undefined ? lastRestocked : existing.lastRestocked,
        dailyUsageRate: dailyUsageRate !== undefined ? dailyUsageRate : existing.dailyUsageRate,
        supplier: supplier !== undefined ? supplier.trim() : existing.supplier,
        sustainabilityScore: sustainabilityScore !== undefined ? sustainabilityScore : existing.sustainabilityScore,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: now,
        id,
      };

      db.prepare(`
        UPDATE inventory SET
          name = @name,
          category = @category,
          quantity = @quantity,
          unit = @unit,
          reorderThreshold = @reorderThreshold,
          expiryDate = @expiryDate,
          lastRestocked = @lastRestocked,
          dailyUsageRate = @dailyUsageRate,
          supplier = @supplier,
          sustainabilityScore = @sustainabilityScore,
          notes = @notes,
          updatedAt = @updatedAt
        WHERE id = @id
      `).run(updated);

      const updatedItem = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem;
      return res.json(updatedItem);
    } catch (error) {
      console.error('PUT /inventory/:id error:', error);
      return res.status(500).json({ error: 'Failed to update inventory item' });
    }
  });

  // DELETE /:id — delete item
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryItem | undefined;
      if (!existing) {
        return res.status(404).json({ error: `Item with ID ${id} not found` });
      }

      db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
      return res.status(204).send();
    } catch (error) {
      console.error('DELETE /inventory/:id error:', error);
      return res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  });

  return router;
}

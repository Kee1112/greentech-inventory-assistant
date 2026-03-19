import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderThreshold: number;
  expiryDate: string | null;
  lastRestocked: string;
  dailyUsageRate: number;
  supplier: string;
  sustainabilityScore: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'inventory.db');

export function createDb(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      reorderThreshold REAL NOT NULL DEFAULT 0,
      expiryDate TEXT,
      lastRestocked TEXT NOT NULL,
      dailyUsageRate REAL NOT NULL DEFAULT 0,
      supplier TEXT NOT NULL,
      sustainabilityScore INTEGER NOT NULL DEFAULT 5,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  const count = (db.prepare('SELECT COUNT(*) as count FROM inventory').get() as { count: number }).count;

  if (count === 0) {
    const sampleDataPath = path.join(__dirname, '..', '..', 'data', 'sample_inventory.json');
    if (fs.existsSync(sampleDataPath)) {
      const sampleData: Omit<InventoryItem, 'createdAt' | 'updatedAt'>[] = JSON.parse(
        fs.readFileSync(sampleDataPath, 'utf-8')
      );
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO inventory (name, category, quantity, unit, reorderThreshold, expiryDate, lastRestocked, dailyUsageRate, supplier, sustainabilityScore, notes, createdAt, updatedAt)
        VALUES (@name, @category, @quantity, @unit, @reorderThreshold, @expiryDate, @lastRestocked, @dailyUsageRate, @supplier, @sustainabilityScore, @notes, @createdAt, @updatedAt)
      `);
      const insertMany = db.transaction((items: Omit<InventoryItem, 'createdAt' | 'updatedAt'>[]) => {
        for (const item of items) {
          insert.run({ ...item, createdAt: now, updatedAt: now });
        }
      });
      insertMany(sampleData);
    }
  }

  return db;
}

export const db = createDb();

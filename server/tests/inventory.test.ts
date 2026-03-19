import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { createDb } from '../src/db';
import { createApp } from '../src/index';

const TEST_DB_PATH = path.join(__dirname, 'test_inventory.db');

let testDb: Database.Database;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  // Remove any leftover test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Set env so db.ts uses test path
  process.env.DB_PATH = TEST_DB_PATH;
  testDb = createDb(TEST_DB_PATH);
  app = createApp(testDb);
});

afterAll(() => {
  testDb.close();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('GET /api/inventory', () => {
  it('should return 200 and an array of inventory items', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should have seeded data from sample_inventory.json
    expect(res.body.length).toBeGreaterThan(0);

    const firstItem = res.body[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('name');
    expect(firstItem).toHaveProperty('category');
    expect(firstItem).toHaveProperty('quantity');
    expect(firstItem).toHaveProperty('sustainabilityScore');
  });

  it('should filter by category query param', async () => {
    const res = await request(app).get('/api/inventory?category=Office Supplies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((item: { category: string }) => {
      expect(item.category).toBe('Office Supplies');
    });
  });

  it('should filter by lowStock=true', async () => {
    const res = await request(app).get('/api/inventory?lowStock=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((item: { quantity: number; reorderThreshold: number }) => {
      expect(item.quantity).toBeLessThanOrEqual(item.reorderThreshold);
    });
  });
});

describe('POST /api/inventory', () => {
  it('should create a new item with valid data and return 201', async () => {
    const newItem = {
      name: 'Test Eco Notebook',
      category: 'Office Supplies',
      quantity: 20,
      unit: 'notebooks',
      reorderThreshold: 5,
      expiryDate: null,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.5,
      supplier: 'EcoWrite Ltd',
      sustainabilityScore: 8,
      notes: 'Recycled paper, spiral bound',
    };

    const res = await request(app).post('/api/inventory').send(newItem);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Eco Notebook');
    expect(res.body.quantity).toBe(20);
    expect(res.body.sustainabilityScore).toBe(8);
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('should return 400 when name is missing', async () => {
    const badItem = {
      category: 'Office Supplies',
      quantity: 10,
      unit: 'boxes',
      reorderThreshold: 2,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.3,
      supplier: 'Test Supplier',
      sustainabilityScore: 5,
      notes: '',
    };

    const res = await request(app).post('/api/inventory').send(badItem);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Name');
  });

  it('should return 400 when quantity is negative', async () => {
    const badItem = {
      name: 'Negative Quantity Item',
      category: 'Office Supplies',
      quantity: -5,
      unit: 'boxes',
      reorderThreshold: 2,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.3,
      supplier: 'Test Supplier',
      sustainabilityScore: 5,
      notes: '',
    };

    const res = await request(app).post('/api/inventory').send(badItem);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Quantity');
  });

  it('should return 400 when dailyUsageRate is zero or negative', async () => {
    const badItem = {
      name: 'Zero Usage Item',
      category: 'Electronics',
      quantity: 5,
      unit: 'units',
      reorderThreshold: 1,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0,
      supplier: 'Tech Supplier',
      sustainabilityScore: 5,
      notes: '',
    };

    const res = await request(app).post('/api/inventory').send(badItem);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('usage rate');
  });
});

describe('GET /api/inventory/:id', () => {
  it('should return 404 for non-existent item ID', async () => {
    const res = await request(app).get('/api/inventory/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('999999');
  });

  it('should return the item when it exists', async () => {
    // First create an item
    const createRes = await request(app).post('/api/inventory').send({
      name: 'Findable Item',
      category: 'Lab Equipment',
      quantity: 3,
      unit: 'units',
      reorderThreshold: 1,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.1,
      supplier: 'Lab Co.',
      sustainabilityScore: 6,
      notes: 'For testing retrieval',
    });

    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;

    const getRes = await request(app).get(`/api/inventory/${itemId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(itemId);
    expect(getRes.body.name).toBe('Findable Item');
  });
});

describe('PUT /api/inventory/:id', () => {
  it('should update an existing item', async () => {
    const createRes = await request(app).post('/api/inventory').send({
      name: 'Updatable Item',
      category: 'Cleaning Supplies',
      quantity: 10,
      unit: 'bottles',
      reorderThreshold: 3,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.5,
      supplier: 'Clean Co.',
      sustainabilityScore: 7,
      notes: '',
    });

    const itemId = createRes.body.id;

    const updateRes = await request(app).put(`/api/inventory/${itemId}`).send({
      quantity: 25,
      sustainabilityScore: 9,
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.quantity).toBe(25);
    expect(updateRes.body.sustainabilityScore).toBe(9);
    expect(updateRes.body.name).toBe('Updatable Item');
  });

  it('should return 404 when updating non-existent item', async () => {
    const res = await request(app).put('/api/inventory/999999').send({ quantity: 10 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/inventory/:id', () => {
  it('should delete an existing item and return 204', async () => {
    const createRes = await request(app).post('/api/inventory').send({
      name: 'Deletable Item',
      category: 'Office Supplies',
      quantity: 5,
      unit: 'pcs',
      reorderThreshold: 1,
      lastRestocked: new Date().toISOString(),
      dailyUsageRate: 0.2,
      supplier: 'Supply Co.',
      sustainabilityScore: 5,
      notes: '',
    });

    const itemId = createRes.body.id;

    const deleteRes = await request(app).delete(`/api/inventory/${itemId}`);
    expect(deleteRes.status).toBe(204);

    // Verify it's gone
    const getRes = await request(app).get(`/api/inventory/${itemId}`);
    expect(getRes.status).toBe(404);
  });

  it('should return 404 when deleting non-existent item', async () => {
    const res = await request(app).delete('/api/inventory/999999');
    expect(res.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

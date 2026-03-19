import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import { createInventoryRouter } from './routes/inventory';
import { createAIRouter } from './routes/ai';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached, please wait a moment.' },
});

export function createApp(database = db) {
  const app = express();

  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api', apiLimiter);
  app.use('/api/inventory', createInventoryRouter(database));
  app.use('/api/ai', aiLimiter, createAIRouter(database));

  return app;
}

const PORT = parseInt(process.env.PORT || '3001', 10);

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`GreenTrack server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`AI key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No (fallback mode)'}`);
  });
}

export default createApp();

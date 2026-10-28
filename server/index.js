import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.js';
import foodsRouter from './routes/foods.js';
import logsRouter from './routes/logs.js';
import nutritionRouter from './routes/nutrition.js';
import analyticsRouter from './routes/analytics.js';
import healthRouter from './routes/health.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & seeds
initDatabase();

const app = express();
const PORT = process.env.PORT || 4228;
const HOST = process.env.HOST || '0.0.0.0';

// Crucial for running behind reverse proxies (Nginx, Caddy, Cloudflare, Traefik)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for reverse proxy diagnostics
app.use((req, res, next) => {
  const forwardedFor = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Client IP: ${forwardedFor}`);
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/foods', foodsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/nutrition', nutritionRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/health', healthRouter);
app.use('/api/settings', settingsRouter);

// System health check endpoint
app.get('/api/healthcheck', (req, res) => {
  res.json({
    status: 'ok',
    app: 'HealthyMe',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    reverseProxyIp: req.ip
  });
});

// Serve frontend static build if available
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  console.log(`Serving static files from ${DIST_DIR}`);
  app.use(express.static(DIST_DIR));
  
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 HealthyMe Server running on http://${HOST}:${PORT}`);
  console.log(`🔒 Reverse Proxy Mode: Enabled (trust proxy: 1)`);
  console.log(`📦 Database: SQLite initialized`);
  console.log(`=================================================`);
});

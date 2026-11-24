import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { waitForDatabase, pool } from './db/pool.js';
import { initDatabaseSchema } from './db/init.js';
import { authRouter } from './routes/auth.js';
import { workspaceRouter } from './routes/workspace.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));

// Health check endpoint (verifies API + PostgreSQL connectivity)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/admin', adminRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[Unhandled Express Error]', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
  }
);

async function start() {
  await waitForDatabase();
  await initDatabaseSchema();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Mermaid Studio API] Running on http://0.0.0.0:${config.port}`);
  });
}

start().catch((err) => {
  console.error('[Fatal Startup Error]', err);
  process.exit(1);
});

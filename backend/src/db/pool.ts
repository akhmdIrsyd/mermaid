import { Pool } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected idle client error:', err.message);
});

export async function waitForDatabase(maxAttempts = 20, delayMs = 1500): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('[PostgreSQL] Connected successfully.');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[PostgreSQL] Waiting for database (${attempt}/${maxAttempts}): ${message}`);
      if (attempt === maxAttempts) {
        throw new Error(`Could not connect to PostgreSQL after ${maxAttempts} attempts.`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

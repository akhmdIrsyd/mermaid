import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { config } from '../config.js';
import { seedStarterWorkspaceForUser } from '../data/seedWorkspace.js';

export async function initDatabaseSchema(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
      active_diagram_id TEXT,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Safe idempotent migrations for existing installations
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (user_id, id)
    );

    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id TEXT NOT NULL,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      locked BOOLEAN NOT NULL DEFAULT FALSE,
      placement_mode TEXT NOT NULL DEFAULT 'auto',
      manual_offsets JSONB NOT NULL DEFAULT '{}'::jsonb,
      edge_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
      sticky_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
      versions JSONB NOT NULL DEFAULT '[]'::jsonb,
      comments JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (user_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_diagrams_user_updated ON diagrams(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_diagrams_user_folder ON diagrams(user_id, folder_id);
  `);

  await ensureSuperAdminAccount();
  console.log('[PostgreSQL] Database schema & Super Admin verified.');
}

async function ensureSuperAdminAccount(): Promise<void> {
  const { superAdminEmail, superAdminPassword, superAdminName } = config;
  if (!superAdminEmail || !superAdminPassword) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string; role: string }>(
      'SELECT id, role FROM users WHERE email = $1',
      [superAdminEmail]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      await client.query(
        `UPDATE users SET role = 'super_admin', is_active = TRUE, updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id]
      );
    } else {
      const hash = await bcrypt.hash(superAdminPassword, 10);
      const created = await client.query<{ id: string }>(
        `INSERT INTO users (email, name, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'super_admin', TRUE)
         RETURNING id`,
        [superAdminEmail, superAdminName, hash]
      );
      await seedStarterWorkspaceForUser(client, created.rows[0].id);
      console.log(`[Super Admin] Created default Super Admin account: ${superAdminEmail}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Super Admin Seed Error]', err);
    throw err;
  } finally {
    client.release();
  }
}

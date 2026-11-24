import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import {
  requireAuth,
  signToken,
  type AuthenticatedRequest,
  type UserRole,
} from '../middleware/auth.js';
import { seedStarterWorkspaceForUser } from '../data/seedWorkspace.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(6, 'Password minimal 6 karakter').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Password wajib diisi'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').max(128).optional(),
});

interface DbUserRow {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  role: string;
  is_active: boolean;
  dark_mode: boolean;
  created_at: string;
}

function formatUser(row: DbUserRow) {
  const role: UserRole = row.role === 'super_admin' ? 'super_admin' : 'user';
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role,
    isActive: Boolean(row.is_active),
    darkMode: Boolean(row.dark_mode),
    createdAt: row.created_at,
  };
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Input tidak valid.' });
    return;
  }

  const { name, email, password } = parsed.data;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await client.query<DbUserRow>(
      `INSERT INTO users (email, name, password_hash, role, is_active, last_login_at)
       VALUES ($1, $2, $3, 'user', TRUE, NOW())
       RETURNING id, email, name, role, is_active, dark_mode, created_at`,
      [email, name, passwordHash]
    );

    const row = inserted.rows[0];
    await seedStarterWorkspaceForUser(client, row.id);
    await client.query('COMMIT');

    const user = formatUser(row);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth Register Error]', err);
    res.status(500).json({ error: 'Gagal membuat akun. Silakan coba lagi.' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Input tidak valid.' });
    return;
  }

  const { email, password } = parsed.data;
  try {
    const result = await pool.query<DbUserRow>(
      `SELECT id, email, name, password_hash, role, is_active, dark_mode, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const row = result.rows[0];
    const valid = await bcrypt.compare(password, row.password_hash || '');
    if (!valid) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    if (!row.is_active) {
      res.status(403).json({
        error: 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin untuk mengaktifkan kembali.',
      });
      return;
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);

    const user = formatUser(row);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ token, user });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Gagal login. Silakan coba lagi.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query<DbUserRow>(
      `SELECT id, email, name, role, is_active, dark_mode, created_at
       FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    res.json({ user: formatUser(result.rows[0]) });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    res.status(500).json({ error: 'Gagal memuat profil pengguna.' });
  }
});

// PATCH /api/auth/profile
authRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Input tidak valid.' });
    return;
  }

  const { name, currentPassword, newPassword } = parsed.data;
  const userId = req.user!.userId;

  try {
    const userRes = await pool.query<DbUserRow>(
      `SELECT id, email, name, password_hash, role, is_active, dark_mode, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    const row = userRes.rows[0];
    let nextPasswordHash = row.password_hash || '';

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Masukkan password saat ini untuk mengganti password.' });
        return;
      }
      const ok = await bcrypt.compare(currentPassword, nextPasswordHash);
      if (!ok) {
        res.status(400).json({ error: 'Password saat ini tidak cocok.' });
        return;
      }
      nextPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    const nextName = name || row.name;
    const updated = await pool.query<DbUserRow>(
      `UPDATE users
       SET name = $1, password_hash = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, is_active, dark_mode, created_at`,
      [nextName, nextPasswordHash, userId]
    );

    res.json({ user: formatUser(updated.rows[0]) });
  } catch (err) {
    console.error('[Profile Update Error]', err);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

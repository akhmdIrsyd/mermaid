import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import {
  invalidateAuthCache,
  requireAuth,
  requireSuperAdmin,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { seedStarterWorkspaceForUser } from '../data/seedWorkspace.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperAdmin);

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(6, 'Password minimal 6 karakter').max(128),
  role: z.enum(['user', 'super_admin']).default('user'),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['user', 'super_admin']).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').max(128).optional(),
});

function parsePagination(query: Record<string, unknown>, defaultLimit = 10, maxLimit = 100) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(maxLimit, Math.floor(rawLimit))
      : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// GET /api/admin/stats
adminRouter.get('/stats', async (_req, res) => {
  try {
    const [usersStat, diagramsStat, foldersStat] = await Promise.all([
      pool.query<{
        total_users: string;
        active_users: string;
        suspended_users: string;
        super_admins: string;
      }>(`
        SELECT
          COUNT(*)::text AS total_users,
          COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active_users,
          COUNT(*) FILTER (WHERE is_active = FALSE)::text AS suspended_users,
          COUNT(*) FILTER (WHERE role = 'super_admin')::text AS super_admins
        FROM users
      `),
      pool.query<{ total_diagrams: string }>(
        'SELECT COUNT(*)::text AS total_diagrams FROM diagrams'
      ),
      pool.query<{ total_folders: string }>(
        'SELECT COUNT(*)::text AS total_folders FROM folders'
      ),
    ]);

    const u = usersStat.rows[0];
    res.json({
      stats: {
        totalUsers: Number(u.total_users),
        activeUsers: Number(u.active_users),
        suspendedUsers: Number(u.suspended_users),
        superAdmins: Number(u.super_admins),
        totalDiagrams: Number(diagramsStat.rows[0].total_diagrams),
        totalFolders: Number(foldersStat.rows[0].total_folders),
      },
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    res.status(500).json({ error: 'Gagal mengambil statistik platform.' });
  }
});

// GET /api/admin/users?search=&role=all&page=1&limit=10
// Optimized with LIMIT/OFFSET first, counting diagrams/folders ONLY for the fetched page!
adminRouter.get('/users', async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const roleFilter = String(req.query.role || 'all').trim();
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>, 10, 100);

  try {
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM users u
         WHERE ($1 = '' OR LOWER(u.name) LIKE '%' || $1 || '%' OR LOWER(u.email) LIKE '%' || $1 || '%')
           AND ($2 = 'all' OR u.role = $2)`,
        [search, roleFilter]
      ),
      pool.query<{
        id: string;
        email: string;
        name: string;
        role: string;
        is_active: boolean;
        created_at: string;
        last_login_at: string | null;
        diagram_count: string;
        folder_count: string;
      }>(
        `WITH paged_users AS (
           SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.last_login_at
           FROM users u
           WHERE ($1 = '' OR LOWER(u.name) LIKE '%' || $1 || '%' OR LOWER(u.email) LIKE '%' || $1 || '%')
             AND ($2 = 'all' OR u.role = $2)
           ORDER BY
             CASE WHEN u.role = 'super_admin' THEN 0 ELSE 1 END,
             u.created_at DESC
           LIMIT $3 OFFSET $4
         )
         SELECT
           pu.*,
           (SELECT COUNT(*) FROM diagrams d WHERE d.user_id = pu.id)::text AS diagram_count,
           (SELECT COUNT(*) FROM folders f WHERE f.user_id = pu.id)::text AS folder_count
         FROM paged_users pu`,
        [search, roleFilter, limit, offset]
      ),
    ]);

    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      users: rowsRes.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role === 'super_admin' ? 'super_admin' : 'user',
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        lastLoginAt: r.last_login_at,
        diagramCount: Number(r.diagram_count),
        folderCount: Number(r.folder_count),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('[Admin List Users Error]', err);
    res.status(500).json({ error: 'Gagal memuat daftar user.' });
  }
});

// POST /api/admin/users
adminRouter.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Input tidak valid.' });
    return;
  }

  const { name, email, password, role } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'Email sudah digunakan oleh akun lain.' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const inserted = await client.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      is_active: boolean;
      created_at: string;
    }>(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, name, hash, role]
    );

    await seedStarterWorkspaceForUser(client, inserted.rows[0].id);
    await client.query('COMMIT');

    const r = inserted.rows[0];
    res.status(201).json({
      user: {
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role === 'super_admin' ? 'super_admin' : 'user',
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        lastLoginAt: null,
        diagramCount: 3,
        folderCount: 3,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin Create User Error]', err);
    res.status(500).json({ error: 'Gagal membuat akun baru.' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/users/:id
adminRouter.patch('/users/:id', async (req: AuthenticatedRequest, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Input tidak valid.' });
    return;
  }

  const targetId = String(req.params.id);
  const { name, role, isActive, newPassword } = parsed.data;

  if (targetId === req.user!.userId) {
    if (role === 'user') {
      res.status(400).json({ error: 'Anda tidak dapat menurunkan role Super Admin diri sendiri.' });
      return;
    }
    if (isActive === false) {
      res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun diri sendiri.' });
      return;
    }
  }

  try {
    const existing = await pool.query<{
      id: string;
      name: string;
      role: string;
      is_active: boolean;
      password_hash: string;
    }>('SELECT id, name, role, is_active, password_hash FROM users WHERE id = $1', [targetId]);

    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Akun user tidak ditemukan.' });
      return;
    }

    const row = existing.rows[0];
    const nextHash = newPassword ? await bcrypt.hash(newPassword, 10) : row.password_hash;

    const updated = await pool.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      is_active: boolean;
      created_at: string;
      last_login_at: string | null;
    }>(
      `UPDATE users
       SET name = $1,
           role = $2,
           is_active = $3,
           password_hash = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, role, is_active, created_at, last_login_at`,
      [name ?? row.name, role ?? row.role, isActive ?? row.is_active, nextHash, targetId]
    );

    const u = updated.rows[0];
    invalidateAuthCache(targetId);
    res.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role === 'super_admin' ? 'super_admin' : 'user',
        isActive: Boolean(u.is_active),
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      },
    });
  } catch (err) {
    console.error('[Admin Update User Error]', err);
    res.status(500).json({ error: 'Gagal memperbarui user.' });
  }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
  const targetId = String(req.params.id);
  if (targetId === req.user!.userId) {
    res.status(400).json({ error: 'Anda tidak dapat menghapus akun Super Admin Anda sendiri.' });
    return;
  }

  try {
    const del = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
    if (del.rowCount === 0) {
      res.status(404).json({ error: 'Akun user tidak ditemukan.' });
      return;
    }
    invalidateAuthCache(targetId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Delete User Error]', err);
    res.status(500).json({ error: 'Gagal menghapus user.' });
  }
});

// GET /api/admin/diagrams?search=&userId=&page=1&limit=10
// Lightweight projection (omits heavy `code` text from list so large datasets stay ultra-fast!)
adminRouter.get('/diagrams', async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const userId = String(req.query.userId || '').trim();
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>, 10, 100);

  try {
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM diagrams d
         JOIN users u ON u.id = d.user_id
         WHERE ($1 = '' OR LOWER(d.title) LIKE '%' || $1 || '%' OR LOWER(u.email) LIKE '%' || $1 || '%' OR LOWER(u.name) LIKE '%' || $1 || '%')
           AND ($2 = '' OR d.user_id::text = $2)`,
        [search, userId]
      ),
      pool.query<{
        id: string;
        user_id: string;
        owner_name: string;
        owner_email: string;
        folder_id: string;
        title: string;
        code_length: string;
        favorite: boolean;
        locked: boolean;
        updated_at: string;
        created_at: string;
      }>(
        `SELECT
           d.id,
           d.user_id,
           u.name AS owner_name,
           u.email AS owner_email,
           d.folder_id,
           d.title,
           LENGTH(d.code)::text AS code_length,
           d.favorite,
           d.locked,
           d.updated_at,
           d.created_at
         FROM diagrams d
         JOIN users u ON u.id = d.user_id
         WHERE ($1 = '' OR LOWER(d.title) LIKE '%' || $1 || '%' OR LOWER(u.email) LIKE '%' || $1 || '%' OR LOWER(u.name) LIKE '%' || $1 || '%')
           AND ($2 = '' OR d.user_id::text = $2)
         ORDER BY d.updated_at DESC
         LIMIT $3 OFFSET $4`,
        [search, userId, limit, offset]
      ),
    ]);

    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      diagrams: rowsRes.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        ownerName: r.owner_name,
        ownerEmail: r.owner_email,
        folderId: r.folder_id,
        title: r.title,
        codeLength: Number(r.code_length),
        favorite: Boolean(r.favorite),
        locked: Boolean(r.locked),
        updatedAt: Number(r.updated_at),
        createdAt: Number(r.created_at),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('[Admin List Diagrams Error]', err);
    res.status(500).json({ error: 'Gagal memuat daftar diagram.' });
  }
});

// GET /api/admin/diagrams/:userId/:diagramId — Lazy-fetch full diagram code on demand
adminRouter.get('/diagrams/:userId/:diagramId', async (req, res) => {
  const userId = String(req.params.userId);
  const diagramId = String(req.params.diagramId);

  try {
    const result = await pool.query<{
      id: string;
      user_id: string;
      title: string;
      code: string;
      notes: string;
      updated_at: string;
    }>(
      `SELECT id, user_id, title, code, notes, updated_at
       FROM diagrams WHERE user_id = $1 AND id = $2`,
      [userId, diagramId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Diagram tidak ditemukan.' });
      return;
    }

    const r = result.rows[0];
    res.json({
      diagram: {
        id: r.id,
        userId: r.user_id,
        title: r.title,
        code: r.code,
        notes: r.notes,
        updatedAt: Number(r.updated_at),
      },
    });
  } catch (err) {
    console.error('[Admin Get Diagram Error]', err);
    res.status(500).json({ error: 'Gagal memuat detail diagram.' });
  }
});

// DELETE /api/admin/diagrams/:userId/:diagramId
adminRouter.delete('/diagrams/:userId/:diagramId', async (req, res) => {
  const userId = String(req.params.userId);
  const diagramId = String(req.params.diagramId);

  try {
    await pool.query('DELETE FROM diagrams WHERE user_id = $1 AND id = $2', [userId, diagramId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Admin Delete Diagram Error]', err);
    res.status(500).json({ error: 'Gagal menghapus diagram.' });
  }
});

import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { seedStarterWorkspaceForUser } from '../data/seedWorkspace.js';

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

const folderSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  createdAt: z.number().optional(),
});

const diagramSchema = z.object({
  id: z.string().min(1).max(120),
  folderId: z.string().min(1).max(120).default('personal'),
  title: z.string().min(1).max(200),
  code: z.string(),
  notes: z.string().default(''),
  favorite: z.boolean().default(false),
  locked: z.boolean().default(false),
  placementMode: z.enum(['auto', 'manual']).default('auto'),
  manualOffsets: z.record(z.any()).default({}),
  edgeAdjustments: z.record(z.any()).default({}),
  stickyNotes: z.array(z.any()).default([]),
  versions: z.array(z.any()).default([]),
  comments: z.array(z.any()).default([]),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

const preferencesSchema = z.object({
  darkMode: z.boolean().optional(),
  activeDiagramId: z.string().nullable().optional(),
});

const importWorkspaceSchema = z.object({
  folders: z.array(folderSchema).min(1),
  diagrams: z.array(diagramSchema).min(1),
  darkMode: z.boolean().optional(),
});

function mapDiagramRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    folderId: String(row.folder_id),
    title: String(row.title),
    code: String(row.code),
    notes: String(row.notes || ''),
    favorite: Boolean(row.favorite),
    locked: Boolean(row.locked),
    placementMode: row.placement_mode === 'manual' ? 'manual' : 'auto',
    manualOffsets: row.manual_offsets || {},
    edgeAdjustments: row.edge_adjustments || {},
    stickyNotes: Array.isArray(row.sticky_notes) ? row.sticky_notes : [],
    versions: Array.isArray(row.versions) ? row.versions : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

// GET /api/workspace — Fetch user's entire workspace from PostgreSQL
workspaceRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  try {
    const [userRes, foldersRes, diagramsRes] = await Promise.all([
      pool.query<{ dark_mode: boolean; active_diagram_id: string | null }>(
        'SELECT dark_mode, active_diagram_id FROM users WHERE id = $1',
        [userId]
      ),
      pool.query(
        'SELECT id, name, created_at FROM folders WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      ),
      pool.query(
        'SELECT * FROM diagrams WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      ),
    ]);

    let folders = foldersRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      createdAt: Number(r.created_at),
    }));
    let diagrams = diagramsRes.rows.map(mapDiagramRow);
    let activeDiagramId = userRes.rows[0]?.active_diagram_id || null;

    // Auto-seed if user somehow has zero diagrams
    if (diagrams.length === 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        activeDiagramId = await seedStarterWorkspaceForUser(client, userId);
        await client.query('COMMIT');
      } finally {
        client.release();
      }
      const [f2, d2] = await Promise.all([
        pool.query(
          'SELECT id, name, created_at FROM folders WHERE user_id = $1 ORDER BY created_at ASC',
          [userId]
        ),
        pool.query('SELECT * FROM diagrams WHERE user_id = $1 ORDER BY updated_at DESC', [userId]),
      ]);
      folders = f2.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        createdAt: Number(r.created_at),
      }));
      diagrams = d2.rows.map(mapDiagramRow);
    }

    const validActive =
      activeDiagramId && diagrams.some((d) => d.id === activeDiagramId)
        ? activeDiagramId
        : diagrams[0].id;

    res.json({
      folders,
      diagrams,
      activeDiagramId: validActive,
      darkMode: Boolean(userRes.rows[0]?.dark_mode),
    });
  } catch (err) {
    console.error('[Workspace GET Error]', err);
    res.status(500).json({ error: 'Gagal memuat workspace dari database.' });
  }
});

// PATCH /api/workspace/preferences
workspaceRouter.patch('/preferences', async (req: AuthenticatedRequest, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Preferensi tidak valid.' });
    return;
  }

  const userId = req.user!.userId;
  const { darkMode, activeDiagramId } = parsed.data;

  try {
    await pool.query(
      `UPDATE users
       SET dark_mode = COALESCE($1, dark_mode),
           active_diagram_id = COALESCE($2, active_diagram_id),
           updated_at = NOW()
       WHERE id = $3`,
      [darkMode ?? null, activeDiagramId ?? null, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[Preferences Update Error]', err);
    res.status(500).json({ error: 'Gagal menyimpan preferensi.' });
  }
});

// POST /api/workspace/folders
workspaceRouter.post('/folders', async (req: AuthenticatedRequest, res) => {
  const parsed = folderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Nama folder tidak valid.' });
    return;
  }

  const userId = req.user!.userId;
  const { id, name, createdAt } = parsed.data;
  const ts = createdAt || Date.now();

  try {
    await pool.query(
      `INSERT INTO folders (id, user_id, name, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, id) DO UPDATE SET name = EXCLUDED.name`,
      [id, userId, name, ts]
    );
    res.status(201).json({ folder: { id, name, createdAt: ts } });
  } catch (err) {
    console.error('[Folder Create Error]', err);
    res.status(500).json({ error: 'Gagal membuat folder.' });
  }
});

// DELETE /api/workspace/folders/:id
workspaceRouter.delete('/folders/:id', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const folderId = String(req.params.id);
  if (folderId === 'personal') {
    res.status(400).json({ error: 'Folder default Personal files tidak dapat dihapus.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE diagrams SET folder_id = 'personal' WHERE user_id = $1 AND folder_id = $2`,
      [userId, folderId]
    );
    await client.query(`DELETE FROM folders WHERE user_id = $1 AND id = $2`, [userId, folderId]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Folder Delete Error]', err);
    res.status(500).json({ error: 'Gagal menghapus folder.' });
  } finally {
    client.release();
  }
});

// PUT /api/workspace/diagrams/:id — Upsert diagram cleanly
workspaceRouter.put('/diagrams/:id', async (req: AuthenticatedRequest, res) => {
  const parsed = diagramSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Data diagram tidak valid.' });
    return;
  }

  const userId = req.user!.userId;
  const d = parsed.data;
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO diagrams (
         id, user_id, folder_id, title, code, notes, favorite, locked,
         placement_mode, manual_offsets, edge_adjustments, sticky_notes,
         versions, comments, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16)
       ON CONFLICT (user_id, id) DO UPDATE SET
         folder_id = EXCLUDED.folder_id,
         title = EXCLUDED.title,
         code = EXCLUDED.code,
         notes = EXCLUDED.notes,
         favorite = EXCLUDED.favorite,
         locked = EXCLUDED.locked,
         placement_mode = EXCLUDED.placement_mode,
         manual_offsets = EXCLUDED.manual_offsets,
         edge_adjustments = EXCLUDED.edge_adjustments,
         sticky_notes = EXCLUDED.sticky_notes,
         versions = EXCLUDED.versions,
         comments = EXCLUDED.comments,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        d.id,
        userId,
        d.folderId,
        d.title,
        d.code,
        d.notes,
        d.favorite,
        d.locked,
        d.placementMode,
        JSON.stringify(d.manualOffsets),
        JSON.stringify(d.edgeAdjustments),
        JSON.stringify(d.stickyNotes),
        JSON.stringify(d.versions),
        JSON.stringify(d.comments),
        d.createdAt || now,
        d.updatedAt || now,
      ]
    );

    res.json({ diagram: mapDiagramRow(result.rows[0]) });
  } catch (err) {
    console.error('[Diagram Upsert Error]', err);
    res.status(500).json({ error: 'Gagal menyimpan diagram ke database.' });
  }
});

// DELETE /api/workspace/diagrams/:id
workspaceRouter.delete('/diagrams/:id', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const diagramId = String(req.params.id);

  try {
    await pool.query('DELETE FROM diagrams WHERE user_id = $1 AND id = $2', [userId, diagramId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Diagram Delete Error]', err);
    res.status(500).json({ error: 'Gagal menghapus diagram.' });
  }
});

// POST /api/workspace/import — Restore workspace backup JSON into PostgreSQL
workspaceRouter.post('/import', async (req: AuthenticatedRequest, res) => {
  const parsed = importWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Format JSON backup tidak valid.' });
    return;
  }

  const userId = req.user!.userId;
  const { folders, diagrams, darkMode } = parsed.data;
  const now = Date.now();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM diagrams WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM folders WHERE user_id = $1', [userId]);

    for (const f of folders) {
      await client.query(
        `INSERT INTO folders (id, user_id, name, created_at) VALUES ($1, $2, $3, $4)`,
        [f.id, userId, f.name, f.createdAt || now]
      );
    }

    for (const d of diagrams) {
      await client.query(
        `INSERT INTO diagrams (
           id, user_id, folder_id, title, code, notes, favorite, locked,
           placement_mode, manual_offsets, edge_adjustments, sticky_notes,
           versions, comments, created_at, updated_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16)`,
        [
          d.id,
          userId,
          d.folderId,
          d.title,
          d.code,
          d.notes,
          d.favorite,
          d.locked,
          d.placementMode,
          JSON.stringify(d.manualOffsets),
          JSON.stringify(d.edgeAdjustments),
          JSON.stringify(d.stickyNotes),
          JSON.stringify(d.versions),
          JSON.stringify(d.comments),
          d.createdAt || now,
          d.updatedAt || now,
        ]
      );
    }

    await client.query(
      `UPDATE users SET active_diagram_id = $1, dark_mode = COALESCE($2, dark_mode), updated_at = NOW() WHERE id = $3`,
      [diagrams[0].id, darkMode ?? null, userId]
    );

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Workspace Import Error]', err);
    res.status(500).json({ error: 'Gagal mengimpor backup workspace.' });
  } finally {
    client.release();
  }
});

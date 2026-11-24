import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

export type UserRole = 'user' | 'super_admin';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

export function signToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// Short-TTL in-memory cache for live role/isActive checks (invalidated immediately on admin mutations)
const userStatusCache = new Map<
  string,
  { email: string; role: UserRole; isActive: boolean; expiresAt: number }
>();
const CACHE_TTL_MS = 10_000;

export function invalidateAuthCache(userId: string): void {
  userStatusCache.delete(userId);
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Silakan login.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthJwtPayload;
    if (!decoded?.userId) {
      res.status(401).json({ error: 'Token tidak valid.' });
      return;
    }

    const now = Date.now();
    const cached = userStatusCache.get(decoded.userId);
    if (cached && cached.expiresAt > now) {
      if (!cached.isActive) {
        res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Super Admin.' });
        return;
      }
      req.user = {
        userId: decoded.userId,
        email: cached.email,
        role: cached.role,
      };
      next();
      return;
    }

    // Verify live account status & role in DB so suspensions / role changes apply immediately
    const userRes = await pool.query<{ id: string; email: string; role: string; is_active: boolean }>(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (userRes.rowCount === 0) {
      res.status(401).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    const dbUser = userRes.rows[0];
    const role: UserRole = dbUser.role === 'super_admin' ? 'super_admin' : 'user';
    userStatusCache.set(dbUser.id, {
      email: dbUser.email,
      role,
      isActive: Boolean(dbUser.is_active),
      expiresAt: now + CACHE_TTL_MS,
    });

    if (!dbUser.is_active) {
      res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Super Admin.' });
      return;
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Sesi berakhir atau token tidak valid. Silakan login ulang.' });
  }
}

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Akses ditolak. Hanya Super Admin yang diizinkan.' });
    return;
  }
  next();
}

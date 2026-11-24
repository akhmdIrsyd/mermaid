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
    if (!dbUser.is_active) {
      res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Super Admin.' });
      return;
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role === 'super_admin' ? 'super_admin' : 'user',
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

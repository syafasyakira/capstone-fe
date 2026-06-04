// JWT Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JWTPayload, UserRole } from '../models/types.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware: Verify JWT token and attach user info to request
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error('❌ Token Verification Error:', error.message);

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token sudah expired. Silakan login kembali.' });
    } else {
      res.status(403).json({ error: 'Token tidak valid.' });
    }
  }
};

/**
 * Middleware: Check if user has specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Tidak terautentikasi.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Anda tidak memiliki akses. Hanya ${roles.join(', ')} yang dapat mengakses.`,
      });
      return;
    }

    next();
  };
};

/**
 * Generate JWT token
 */
export const generateToken = (userId: string, email: string, role: UserRole): string => {
  return jwt.sign(
    {
      sub: userId,
      email,
      role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

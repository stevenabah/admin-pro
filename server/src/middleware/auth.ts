import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'admin-pro-secret-key-2024'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
    roleId: string
  }
}

export function generateToken(payload: { userId: string; username: string; roleId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; username: string; roleId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; username: string; roleId: string }
  } catch {
    return null
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未授权，请先登录' })
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ code: 401, message: 'token 已过期，请重新登录' })
  }

  req.user = decoded
  next()
}
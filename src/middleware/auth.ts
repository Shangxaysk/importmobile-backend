import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Недействительный токен' });
  }
};

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User')).default;
    const user = await User.findById(req.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

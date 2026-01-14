import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = express.Router();

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// Регистрация
router.post(
  '/register',
  [
    body('phone').trim().isMobilePhone('any').withMessage('Неверный формат телефона'),
    body('password').isLength({ min: 5 }).withMessage('Пароль должен содержать минимум 5 символов'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password } = req.body;

      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'Пользователь с таким телефоном уже существует' });
      }

      const user = new User({ phone, password });
      await user.save();

      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          id: user._id,
          phone: user.phone,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Ошибка регистрации' });
    }
  }
);

// Вход
router.post(
  '/login',
  [
    body('phone').trim().isMobilePhone('any').withMessage('Неверный формат телефона'),
    body('password').notEmpty().withMessage('Пароль обязателен'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password } = req.body;

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(401).json({ message: 'Неверный телефон или пароль' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Неверный телефон или пароль' });
      }

      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id,
          phone: user.phone,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Ошибка входа' });
    }
  }
);

// Получить текущего пользователя
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      user: {
        id: user._id,
        phone: user.phone,
        isAdmin: user.isAdmin,
        telegramUsername: user.telegramUsername,
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Недействительный токен' });
  }
});

export default router;

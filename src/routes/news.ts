import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import News from '../models/News';

const router = express.Router();

// Получить все новости
router.get('/', async (req, res: Response) => {
  try {
    const news = await News.find()
      .populate('author', 'phone')
      .sort({ createdAt: -1 });
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить одну новость
router.get('/:id', async (req, res: Response) => {
  try {
    const news = await News.findById(req.params.id).populate('author', 'phone');
    if (!news) {
      return res.status(404).json({ message: 'Новость не найдена' });
    }
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Создать новость (только админ)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('title').trim().notEmpty().withMessage('Заголовок обязателен'),
    body('content').trim().notEmpty().withMessage('Содержание обязательно'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const news = new News({
        ...req.body,
        author: req.userId,
      });
      await news.save();
      await news.populate('author', 'phone');
      res.status(201).json(news);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Обновить новость (только админ)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const news = await News.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate('author', 'phone');

      if (!news) {
        return res.status(404).json({ message: 'Новость не найдена' });
      }

      res.json(news);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Удалить новость (только админ)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Новость не найдена' });
    }
    res.json({ message: 'Новость удалена' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

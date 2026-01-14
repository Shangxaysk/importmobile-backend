import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import Product from '../models/Product';

const router = express.Router();

// Получить все товары
router.get('/', async (req, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить один товар
router.get('/:id', async (req, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Создать товар (только админ)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Название обязательно'),
    body('description').trim().notEmpty().withMessage('Описание обязательно'),
    body('price').isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Обновить товар (только админ)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Удалить товар (только админ)
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' });
    }
    res.json({ message: 'Товар удалён' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

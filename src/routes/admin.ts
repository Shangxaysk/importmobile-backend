import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';
import { requestPassportData as telegramRequestPassport } from '../services/telegram';

const router = express.Router();

// Получить настройки (процент предоплаты)
router.get('/settings', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // В будущем можно вынести в отдельную модель Settings
    res.json({
      prepaymentPercentage: 50, // По умолчанию 50%
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить настройки
router.put(
  '/settings',
  authMiddleware,
  adminMiddleware,
  [body('prepaymentPercentage').isFloat({ min: 0, max: 100 }).withMessage('Процент должен быть от 0 до 100')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // В будущем можно сохранить в модель Settings
      res.json({
        prepaymentPercentage: req.body.prepaymentPercentage,
        message: 'Настройки обновлены',
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Запросить паспортные данные через Telegram
router.post(
  '/orders/:id/request-passport',
  authMiddleware,
  adminMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await Order.findById(req.params.id).populate('user', 'telegramId phone');

      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }

      if (order.status !== OrderStatus.PAYMENT_VERIFIED) {
        return res.status(400).json({ message: 'Заказ должен быть с подтверждённым платежом' });
      }

      // Обновить статус
      order.status = OrderStatus.PASSPORT_REQUESTED;
      await order.save();

      // Отправить запрос через Telegram бота
      if (order.user && (order.user as any).telegramId) {
        await telegramRequestPassport((order.user as any).telegramId, order._id.toString());
      }

      res.json({
        message: 'Запрос на паспортные данные отправлен',
        order,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

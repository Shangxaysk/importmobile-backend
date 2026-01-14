import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import Order, { OrderStatus } from '../models/Order';
import Product from '../models/Product';
import { notifyAdminNewOrder, notifyUserOrderStatus } from '../services/telegram';

const router = express.Router();

// Получить все заказы пользователя
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate('products.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить все заказы (админ)
router.get('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find()
      .populate('products.product')
      .populate('user', 'phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Получить один заказ
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('products.product')
      .populate('user', 'phone');

    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    // Проверка прав доступа
    if (!req.user?.isAdmin && order.user._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Создать заказ
router.post(
  '/',
  authMiddleware,
  [
    body('products').isArray({ min: 1 }).withMessage('Товары обязательны'),
    body('deliveryAddress').trim().notEmpty().withMessage('Адрес доставки обязателен'),
    body('contactPhone').trim().notEmpty().withMessage('Контактный телефон обязателен'),
    body('prepaymentPercentage').isFloat({ min: 0, max: 100 }).withMessage('Процент предоплаты должен быть от 0 до 100'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { products, deliveryAddress, contactPhone, additionalPhone, telegramUsername, paymentScreenshot, prepaymentPercentage } = req.body;

      // Проверка товаров и расчёт суммы
      let totalAmount = 0;
      const orderProducts = [];

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Товар ${item.productId} не найден` });
        }
        if (!product.inStock) {
          return res.status(400).json({ message: `Товар ${product.name} отсутствует в наличии` });
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const prepaymentAmount = (totalAmount * (prepaymentPercentage || 50)) / 100;

      const order = new Order({
        user: req.userId,
        products: orderProducts,
        deliveryAddress,
        contactPhone,
        additionalPhone,
        telegramUsername,
        paymentScreenshot,
        prepaymentAmount,
        prepaymentPercentage: prepaymentPercentage || 50,
        status: OrderStatus.PENDING_PAYMENT,
      });

      await order.save();

      // Уведомление админу через Telegram
      await notifyAdminNewOrder(order);

      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Обновить статус заказа (админ)
router.patch(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  [body('status').isIn(Object.values(OrderStatus)).withMessage('Неверный статус')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('user', 'phone telegramId');

      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }

      // Уведомление пользователю через Telegram
      await notifyUserOrderStatus(order, status);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Добавить паспортные данные (админ)
router.patch(
  '/:id/passport',
  authMiddleware,
  adminMiddleware,
  [body('passportData').trim().notEmpty().withMessage('Паспортные данные обязательны')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { passportData } = req.body;
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { passportData, status: OrderStatus.PASSPORT_VERIFIED },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

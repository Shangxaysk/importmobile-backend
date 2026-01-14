import TelegramBot from 'node-telegram-bot-api';
import Order from '../models/Order';
import User from '../models/User';

let bot: TelegramBot | null = null;

export const initializeTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не установлен. Telegram уведомления отключены.');
    return;
  }

  bot = new TelegramBot(token, { polling: false });

  // Webhook для продакшена
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    bot.setWebHook(`${process.env.TELEGRAM_WEBHOOK_URL}/webhook/telegram`);
  }

  return bot;
};

export const notifyAdminNewOrder = async (order: any) => {
  if (!bot) return;

  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!adminChatId) return;

  const orderDetails = await Order.findById(order._id)
    .populate('products.product')
    .populate('user', 'phone telegramId');

  if (!orderDetails) return;

  const productsList = orderDetails.products
    .map((item: any) => `- ${item.product.name} x${item.quantity} (${item.price} сум)`)
    .join('\n');

  // Kasting orqali user property’larini olish
  const user = orderDetails.user as any;

  const message = `
🆕 Новый заказ #${orderDetails._id}

👤 Пользователь: ${user.phone}
📦 Товары:
${productsList}
📍 Адрес: ${orderDetails.deliveryAddress}
📞 Телефон: ${orderDetails.contactPhone}
💳 Предоплата: ${orderDetails.prepaymentAmount} сум (${orderDetails.prepaymentPercentage}%)

Статус: ${orderDetails.status}
  `.trim();

  await bot.sendMessage(adminChatId, message);

  if (orderDetails.paymentScreenshot) {
    await bot.sendPhoto(adminChatId, orderDetails.paymentScreenshot, {
      caption: 'Скриншот платежа',
    });
  }
};

export const notifyUserOrderStatus = async (order: any, status: string) => {
  if (!bot) return;

  const orderDetails = await Order.findById(order._id).populate('user', 'telegramId phone');
  if (!orderDetails) return;

  const user = orderDetails.user as any;
  if (!user.telegramId) return;

  let message = '';

  switch (status) {
    case 'payment_verified':
      message = `✅ Ваш платёж подтверждён! Заказ #${orderDetails._id} принят в обработку.`;
      break;
    case 'passport_requested':
      message = `📋 Для оформления заказа #${orderDetails._id} необходимы ваши паспортные данные. Пожалуйста, отправьте их боту.`;
      break;
    case 'confirmed':
      message = `🎉 Ваш заказ #${orderDetails._id} успешно оформлен! Мы свяжемся с вами для доставки.`;
      break;
    case 'rejected':
      message = `❌ Заказ #${orderDetails._id} отклонён. Свяжитесь с поддержкой для уточнения деталей.`;
      break;
    default:
      return;
  }

  await bot.sendMessage(user.telegramId, message);
};

export const requestPassportData = async (telegramId: string, orderId: string) => {
  if (!bot) return;

  const message = `📋 Для оформления заказа #${orderId} необходимы ваши паспортные данные.\n\nПожалуйста, отправьте:\n- Серия и номер паспорта\n- Дата выдачи\n- Кем выдан`;

  await bot.sendMessage(telegramId, message);
};

export const getBot = () => bot;

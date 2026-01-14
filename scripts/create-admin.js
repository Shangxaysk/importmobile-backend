/**
 * Скрипт для создания админ-пользователя
 * Использование: node scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  phone: String,
  password: String,
  isAdmin: Boolean,
  createdAt: Date,
});

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/importmobile');
    console.log('✅ Подключено к MongoDB');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('Введите номер телефона: ', async (phone) => {
      readline.question('Введите пароль (минимум 5 символов): ', async (password) => {
        if (password.length < 5) {
          console.error('❌ Пароль должен содержать минимум 5 символов');
          readline.close();
          await mongoose.connection.close();
          process.exit(1);
        }

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
          console.error('❌ Пользователь с таким телефоном уже существует');
          readline.close();
          await mongoose.connection.close();
          process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new User({
          phone,
          password: hashedPassword,
          isAdmin: true,
          createdAt: new Date(),
        });

        await admin.save();
        console.log('✅ Админ-пользователь создан успешно!');
        console.log(`   Телефон: ${phone}`);
        console.log(`   Админ: ${admin.isAdmin}`);

        readline.close();
        await mongoose.connection.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

createAdmin();

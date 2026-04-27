import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Admin } from './src/models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram');
    console.log('Подключено к MongoDB');

    const email = 'admin@telegram.local';
    const password = 'admin123';
    const name = 'Super Admin';
    const role = 'superadmin';

    const existing = await Admin.findOne({ email });
    
    if (existing) {
      console.log('Админ уже существует');
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      const admin = new Admin({
        email,
        password: hashedPassword,
        name,
        role,
        isActive: true,
      });
      await admin.save();
      console.log('Админ создан:', admin.email);
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
};

seedAdmin();
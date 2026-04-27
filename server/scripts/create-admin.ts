import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  await mongoose.connect('mongodb://localhost:27017/telegram');
  console.log('Подключено к MongoDB');

  const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'moderator'], default: 'admin' },
    isActive: { type: Boolean, default: true },
  }, { timestamps: true }));

  const password = await bcrypt.hash('admin123', 12);
  
  try {
    const admin = new Admin({
      email: 'admin@telegram.local',
      password,
      name: 'Super Admin',
      role: 'superadmin',
    });

    await admin.save();
    console.log('Админ создан!');
    console.log('Email: admin@telegram.local');
    console.log('Пароль: admin123');
  } catch (e: any) {
    if (e.code === 11000) {
      console.log('Админ уже существует');
    } else {
      console.error(e.message);
    }
  }

  process.exit(0);
}

createAdmin();
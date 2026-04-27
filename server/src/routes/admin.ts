import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Админ вход
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'Аккаунт отключен' });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание админа (только superadmin может создавать)
router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentAdmin = (req as any).admin;
    
    if (currentAdmin.role !== 'superadmin') {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const { email, password, name, role } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email уже используется' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = new Admin({
      email,
      password: hashedPassword,
      name,
      role: role || 'admin',
    });

    await admin.save();

    res.status(201).json({
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Ошибка создания:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка токена
router.get('/verify', authMiddleware, async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  res.json({
    admin: {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
});

export default router;
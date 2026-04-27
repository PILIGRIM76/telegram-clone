import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Регистрация
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, displayName, password } = req.body;

    // Проверка существующего пользователя
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Пользователь с таким email или username уже существует',
      });
    }

    // Создание пользователя
    const user = new User({
      email,
      username,
      displayName,
      password,
    });

    await user.save();

    // Генерация токена
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Неверный email или пароль',
      });
    }

    // Обновление статуса онлайн
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRS_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();

    res.json({ message: 'Вышли успешно' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка токена
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user as any;
  res.json({
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
  });
});

export default router;
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

// Поиск пользователей
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('-password').limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Все пользователи (для админа)
router.get('/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Статистика пользователей
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const total = await User.countDocuments();
    const online = await User.countDocuments({ isOnline: true });
    
    res.json({
      total,
      online,
      offline: total - online,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
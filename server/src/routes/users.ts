import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Получение списка пользователей
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение пользователя по ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление профиля
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;
    const { displayName, avatarUrl, bio } = req.body;

    if (displayName) user.displayName = displayName;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
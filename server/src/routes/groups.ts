import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Group } from '../models/Group.js';

const router = Router();

// Создание группы
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, memberIds } = req.body;
    const user = req.user as any;

    const group = new Group({
      name,
      description,
      ownerId: user._id,
      adminIds: [user._id],
      memberIds: [user._id, ...memberIds],
      invitedLink: uuidv4(),
    });

    await group.save();
    await group.populate('memberIds', 'username displayName avatarUrl');

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение группы
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('memberIds', 'username displayName avatarUrl isOnline')
      .populate('adminIds', 'username displayName avatarUrl')
      .populate('ownerId', 'username displayName avatarUrl');

    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление группы
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, avatarUrl } = req.body;
    const user = req.user as any;

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    if (group.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Нет прав' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatarUrl) group.avatarUrl = avatarUrl;

    await group.save();

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавление участника
router.post('/:id/members', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { memberIds: userId } },
      { new: true }
    ).populate('memberIds', 'username displayName avatarUrl');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление участника
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { memberIds: req.params.userId } },
      { new: true }
    ).populate('memberIds', 'username displayName avatarUrl');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход из группы
router.delete('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { memberIds: user._id, adminIds: user._id } },
      { new: true }
    );

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
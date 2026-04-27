import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Chat } from '../models/Chat.js';

const router = Router();

// Получение списка чатов
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;
    
    const chats = await Chat.find({
      participants: user._id,
    })
    .populate('participants', 'username displayName avatarUrl isOnline')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание чата
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId } = req.body;
    const user = req.user as any;

    // Поиск существующего чата
    let chat = await Chat.findOne({
      type: 'direct',
      participants: { $all: [user._id, participantId] },
    });

    if (!chat) {
      chat = new Chat({
        type: 'direct',
        participants: [user._id, participantId],
      });
      await chat.save();
    }

    await chat.populate('participants', 'username displayName avatarUrl isOnline');

    res.status(201).json({ chat });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение чата по ID
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'username displayName avatarUrl isOnline');

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
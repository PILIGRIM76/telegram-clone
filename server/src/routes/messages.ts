import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

const router = Router();

// Получение сообщений чата
router.get('/:chatId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;

    const query: any = { chatId, isDeleted: false };

    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправка сообщения (HTTP fallback)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content, type = 'text', mediaUrl } = req.body;
    const user = req.user as any;

    const message = new Message({
      chatId,
      senderId: user._id,
      content,
      type,
      mediaUrl,
    });

    await message.save();
    await message.populate('senderId', 'username displayName avatarUrl');

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редактирование сообщения
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const user = req.user as any;

    const message = await Message.findOne({
      _id: req.params.id,
      senderId: user._id,
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление сообщения
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;

    const message = await Message.findOne({
      _id: req.params.id,
      senderId: user._id,
    });

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    message.isDeleted = true;
    message.content = '';
    await message.save();

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
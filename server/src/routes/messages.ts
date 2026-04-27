import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

const router = Router();

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

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content, type = 'text', mediaUrl, replyTo } = req.body;
    const user = req.user as any;

    const message = new Message({
      chatId,
      senderId: user._id,
      content,
      type,
      mediaUrl,
      replyTo,
    });

    await message.save();
    await message.populate('senderId', 'username displayName avatarUrl');

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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

router.post('/:id/reaction', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { emoji } = req.body;
    const user = req.user as any;
    const userId = user._id;

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    const existingIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, userId, createdAt: new Date() });
    }

    await message.save();

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id/reactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('reactions.userId', 'username displayName avatarUrl');

    if (!message) {
      return res.status(404).json({ error: 'Сообщ��ние не найдено' });
    }

    res.json({ reactions: message.reactions });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
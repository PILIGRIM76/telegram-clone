import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// Загрузка файлов (base64 в данной версии)
// В продакшене использовать S3 или локальное хранилище
router.post('/upload', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { file, filename, type } = req.body;
    const user = req.user as any;

    // В реальном проекте здесь будет загрузка в S3/Cloudinary
    // Пока возвращаем заглушку
    const mediaUrl = `/uploads/${filename}`;

    res.json({
      url: mediaUrl,
      filename,
      type,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// Скачивание файла
router.get('/:filename', async (req: Response) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.download(filepath);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
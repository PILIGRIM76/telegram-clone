// server/routes/admin.routes.js
// Админские роуты CipherLink v4.0.
// Все эндпоинты защищены middleware adminGuard (только роль 'admin').
// Админ видит только метаданные пользователей и жалоб — не содержимое сообщений.

const express = require('express');
const router = express.Router();
const { adminGuard } = require('../middleware/adminGuard');
const sqlDb = require('../databaseService');

// Применяем adminGuard ко всем маршрутам этого роутера
router.use(adminGuard);

// GET /api/admin/stats — статистика для дашборда
router.get('/stats', (_req, res) => {
  try {
    const stats = sqlDb.getAdminStats();
    res.json({ ok: true, stats });
  } catch (err) {
    console.error('[ADMIN] stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users?page=1&limit=20&search=<query>
// Пагинированный список пользователей (без хешей паролей и приватных ключей)
router.get('/users', (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid page or limit' });
    }

    const users = sqlDb.getUsersPaginated({ page, limit, search });
    const total = sqlDb.getUsersCount(search);

    res.json({
      ok: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[ADMIN] users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users/:id/ban — блокировка пользователя (role = 'banned')
router.post('/users/:id/ban', (req, res) => {
  try {
    const { id } = req.params;

    // Запрет банить самого себя
    if (req.user && req.user.uid === id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const success = sqlDb.banUserAccount(id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true, message: `User ${id} banned` });
  } catch (err) {
    console.error('[ADMIN] ban user error:', err);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// GET /api/admin/reports — список активных жалоб (статус 'pending')
router.get('/reports', (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const reports = sqlDb.getReports(status);
    res.json({ ok: true, reports });
  } catch (err) {
    console.error('[ADMIN] reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/admin/reports/:id/resolve — отметить жалобу как разрешённую
router.post('/reports/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const success = sqlDb.updateReportStatus(Number(id), 'resolved');
    if (!success) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ ok: true, message: 'Report resolved' });
  } catch (err) {
    console.error('[ADMIN] resolve report error:', err);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// POST /api/admin/reports/:id/dismiss — отклонить жалобу
router.post('/reports/:id/dismiss', (req, res) => {
  try {
    const { id } = req.params;
    const success = sqlDb.updateReportStatus(Number(id), 'dismissed');
    if (!success) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ ok: true, message: 'Report dismissed' });
  } catch (err) {
    console.error('[ADMIN] dismiss report error:', err);
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
});

module.exports = router;

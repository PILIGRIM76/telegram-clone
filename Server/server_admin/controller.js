
const path = require('path');

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

module.exports = function(app, { пользователи, группы, офлайнСообщения, systemLogs, trafficStats, logEvent }) {
    
    // Middleware авторизации
    const adminAuth = (req, res, next) => {
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

        if (login && password && login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
            return next();
        }

        res.set('WWW-Authenticate', 'Basic realm="CipherLink Admin"');
        res.status(401).send('Требуется авторизация администратора');
    };

    // Раздача HTML файла
    app.get('/admin', adminAuth, (req, res) => {
        res.sendFile(path.join(__dirname, 'panel.html'));
    });

    // API: Статистика
    app.get('/api/admin/stats', adminAuth, (req, res) => {
        let onlineUsers = 0;
        let publicStores = 0;
        let totalBoards = 0;

        for (const u of пользователи.values()) {
            if (u.ws && u.ws.readyState === 1) onlineUsers++; // 1 = OPEN
            if (u.магазин && u.магазин.тип === 'публичный') publicStores++;
            if (u.доски) totalBoards += u.доски.length;
        }
        
        const uptimeSeconds = Math.floor((Date.now() - trafficStats.startTime) / 1000);

        res.json({
            totalUsers: пользователи.size,
            onlineUsers,
            totalGroups: группы.size,
            publicStores,
            totalBoards,
            offlineMessagesStored: офлайнСообщения.size,
            traffic: {
                messages: trafficStats.totalMessages,
                bytes: trafficStats.totalBytes,
                uptime: uptimeSeconds
            }
        });
    });

    // API: Логи
    app.get('/api/admin/logs', adminAuth, (req, res) => {
        // Отдаем копию массива в обратном порядке (новые сверху)
        res.json([...systemLogs].reverse());
    });

    // API: Список пользователей (Расширенный)
    app.get('/api/admin/users', adminAuth, (req, res) => {
        const userList = [];
        for (const [uid, u] of пользователи.entries()) {
            const isOnline = u.ws && u.ws.readyState === 1;
            let connectionDuration = 0;
            if (isOnline && u.connectedAt) {
                connectionDuration = Math.floor((Date.now() - u.connectedAt) / 1000); // секунды
            }

            userList.push({
                uid,
                ip: u.ip || 'N/A',
                isOnline,
                connectionDuration: isOnline ? `${Math.floor(connectionDuration/60)}m ${connectionDuration%60}s` : '-',
                hasStore: !!u.магазин,
                boardsCount: u.доски ? u.доски.length : 0,
                registeredAt: u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'N/A'
            });
        }
        res.json(userList.slice(-100)); // Возвращаем последние 100
    });

    // API: Кикнуть пользователя (разорвать соединение)
    app.post('/api/admin/kick', adminAuth, (req, res) => {
        const { uid } = req.body;
        const user = пользователи.get(uid);
        if (user && user.ws) {
            user.ws.close();
            user.ws = null;
            logEvent('WARN', `Администратор отключил (KICK) пользователя: ${uid}`);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Пользователь не в сети или не найден' });
        }
    });

    // API: Бан пользователя
    app.post('/api/admin/ban', adminAuth, (req, res) => {
        const { uid } = req.body;
        const user = пользователи.get(uid);
        if (user) {
            if (user.ws) user.ws.close();
            пользователи.delete(uid);
            // Удаляем из групп
            for (const g of группы.values()) {
                g.участники = g.участники.filter(u => u !== uid);
            }
            logEvent('WARN', `Администратор забанил пользователя: ${uid}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    });

    // API: Список магазинов
    app.get('/api/admin/stores', adminAuth, (req, res) => {
        const stores = [];
        for (const [uid, u] of пользователи.entries()) {
            if (u.магазин) {
                stores.push({
                    uid,
                    ...u.магазин
                });
            }
        }
        res.json(stores);
    });

    // API: Удаление магазина
    app.delete('/api/admin/stores/:uid', adminAuth, (req, res) => {
        const { uid } = req.params;
        const user = пользователи.get(uid);
        if (user && user.магазин) {
            delete user.магазин;
            logEvent('WARN', `Администратор удалил магазин пользователя: ${uid}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Магазин не найден' });
        }
    });

    // API: Глобальная рассылка
    app.post('/api/admin/broadcast', adminAuth, (req, res) => {
        const { message } = req.body;
        let count = 0;
        const systemMsg = JSON.stringify({
            ot: 'system',
            tip: 'системное',
            содержимое: message,
            временнаяМетка: new Date().toISOString(),
            тип: 'системное'
        });

        for (const u of пользователи.values()) {
            if (u.ws && u.ws.readyState === 1) {
                u.ws.send(systemMsg);
                count++;
            }
        }
        logEvent('INFO', `Рассылка отправлена ${count} пользователям: ${message}`);
        res.json({ sentTo: count });
    });
};

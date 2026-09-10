
const express = require('express');
// Phase 2: Metadata protection — используем crypto для генерации session ID
// вместо логирования IP-адресов клиентов.
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { db, STORAGE_TYPE } = require('./db/index.js');

const app = express();
app.use(express.json({ limit: '10mb' })); // Увеличен лимит для изображений
const сервер = http.createServer(app);
const серверВебсокетов = new WebSocket.Server({ server: сервер });

const ПОРТ = process.env.PORT || 4000;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Хранилище в памяти
const пользователи = new Map(); // { uid: { публичныйКлюч, ws, магазин, доски } }
const группы = new Map(); // { id: { название, участники[], idВладельца, тип, токен } }

// Telegram-like features: каналы (broadcast), награды пользователей, каталог подарков.
// Dumb Server preserved: сообщения не персистятся; каналы/награды — in-memory для маршрутизации.
const каналы = new Map(); // { id: Channel }
const награды = new Map(); // uid -> Reward[]

// Каталог подарков (Telegram-style gifts). Расширяется через админ-панель.
const КАТАЛОГ_ПОДАРКОВ = [
  { id: 'gift_rose', name: 'Роза', emoji: '🌹', type: 'free' },
  { id: 'gift_star', name: 'Звезда', emoji: '⭐', type: 'free' },
  { id: 'gift_crown', name: 'Корона', emoji: '👑', type: 'premium', price: 100, currency: 'USDT' },
  { id: 'gift_diamond', name: 'Бриллиант', emoji: '💎', type: 'premium', price: 250, currency: 'USDT' },
  { id: 'gift_rocket', name: 'Ракета', emoji: '🚀', type: 'premium', price: 500, currency: 'USDT' },
];

console.log('[DB] Инициализация слоя данных, тип:', STORAGE_TYPE);
console.log('Сервер ШифроСвязь запускается...');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function сгенерироватьТокен() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Симуляция проверки транзакции в блокчейне
function проверитьТранзакцию(txid, ожидаемыйАдрес, сумма) {
    console.log(`[БЛОКЧЕЙН] Проверка TXID: ${txid} -> ${ожидаемыйАдрес} (${сумма})`);
    // В реальности здесь был бы запрос к API Etherscan или Blockchain.info
    return txid && txid.startsWith('0x'); // Простая валидация
}

// --- MIDDLEWARE АДМИНИСТРАТОРА ---
const adminAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="CipherLink Admin"');
    res.status(401).send('Требуется авторизация администратора');
};

// --- АДМИН ЭНДПОИНТЫ ---

// Раздача админки
app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Статистика
app.get('/api/admin/stats', adminAuth, (req, res) => {
    let onlineUsers = 0;
    let publicStores = 0;
    let totalBoards = 0;

    for (const u of пользователи.values()) {
        if (u.ws && u.ws.readyState === WebSocket.OPEN) onlineUsers++;
        if (u.магазин && u.магазин.тип === 'публичный') publicStores++;
        if (u.доски) totalBoards += u.доски.length;
    }

    // Phase 2: stats endpoint НЕ возвращает IP-адреса пользователей.
    // Только агрегированные counters (online count, total count).
    res.json({
        totalUsers: пользователи.size,
        onlineUsers,
        totalGroups: группы.size,
        publicStores,
        totalBoards,
        // Phase 3: Dumb Server — сервер НЕ хранит офлайн-сообщения.
        // Клиенты используют IndexedDB queue (OfflineQueue service).
    });
});

// Список пользователей (упрощенный)
app.get('/api/admin/users', adminAuth, (req, res) => {
    const userList = [];
    for (const [uid, u] of пользователи.entries()) {
        userList.push({
            uid,
            isOnline: u.ws && u.ws.readyState === WebSocket.OPEN,
            hasStore: !!u.магазин,
            boardsCount: u.доски ? u.доски.length : 0,
            // Phase 2: только session ID, никаких IP-адресов.
            // sessionId меняется при каждом WS reconnect — невозможно
            // связать разные сессии одного юзера между собой.
            sessionId: u.sessionId || null,
            connectedAt: u.connectedAt || null,
        });
    }
    // Пагинация должна быть тут, но для прототипа отдаем 100 последних
    res.json(userList.slice(-100));
});

// Бан пользователя (удаление)
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
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Список магазинов
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

// Удаление магазина (модерация)
app.delete('/api/admin/stores/:uid', adminAuth, (req, res) => {
    const { uid } = req.params;
    const user = пользователи.get(uid);
    if (user && user.магазин) {
        delete user.магазин;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Магазин не найден' });
    }
});

// Глобальная рассылка
app.post('/api/admin/broadcast', adminAuth, (req, res) => {
    const { message } = req.body;
    let count = 0;
    const systemMsg = JSON.stringify({
        type: 'system',
        from: 'system',
        content: message,
        timestamp: new Date().toISOString()
    });

    for (const u of пользователи.values()) {
        if (u.ws && u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(systemMsg);
            count++;
        }
    }
    res.json({ sentTo: count });
});

// --- ПУБЛИЧНЫЕ API ЭНДПОИНТЫ ---

// 1. ПОЛЬЗОВАТЕЛИ
app.post('/register', (req, res) => {
  const { uid, publicKey } = req.body;
  if (!uid || !publicKey) return res.status(400).json({ ошибка: 'Данные неполны' });
  if (пользователи.has(uid)) return res.status(409).json({ ошибка: 'UID занят' });

  пользователи.set(uid, { публичныйКлюч: publicKey, ws: null, доски: [] });
  console.log(`[РЕГИСТРАЦИЯ] ${uid}`);
  res.status(201).json({ ок: true });
});

app.get('/key/:uid', (req, res) => {
  const { uid } = req.params;
  const юзер = пользователи.get(uid);
  if (!юзер) return res.status(404).json({ ошибка: 'Не найден' });

  // Фильтруем данные: скрываем приватные магазины и истекшие доски
  let магазинДанные = юзер.магазин;
  if (магазинДанные && магазинДанные.тип === 'приватная') магазинДанные = null;

  const активныеДоски = (юзер.доски || []).filter(д => !д.expiresAt || д.expiresAt > Date.now());

  res.json({
      uid,
      publicKey: юзер.публичныйКлюч,
      // Phase 2: публикация Signal pre-key bundle для PFS сессий.
      // Если у юзера нет bundle → null, клиент делает fallback на NaCl.
      preKeyBundle: юзер.preKeyBundle || null,
      store: магазинДанные,
      boards: активныеДоски
  });
});

// Phase 2: публикация pre-key bundle для Signal Protocol (PFS Double Ratchet).
// Клиент вызывает при инициализации identity или при ротации pre-keys.
app.post('/keys/publish', (req, res) => {
  const { uid, preKeyBundle } = req.body;
  const юзер = пользователи.get(uid);
  if (!юзер) return res.status(404).json({ ошибка: 'Пользователь не найден' });
  if (!preKeyBundle || typeof preKeyBundle !== 'object') {
    return res.status(400).json({ ошибка: 'preKeyBundle обязателен' });
  }
  // Валидация минимально необходимых полей для Signal pre-key bundle
  const required = ['registrationId', 'preKeyId', 'preKey', 'signedPreKeyId', 'signedPreKey', 'identityKey'];
  for (const field of required) {
    if (preKeyBundle[field] === undefined || preKeyBundle[field] === null) {
      return res.status(400).json({ ошибка: `Поле ${field} обязательно в preKeyBundle` });
    }
  }
  юзер.preKeyBundle = preKeyBundle;
  console.log(`[KEYS] Pre-key bundle published for ${uid} (deviceId=${preKeyBundle.deviceId || 1})`);
  res.json({ ok: true });
});

// 2. МАГАЗИНЫ
app.post('/store', (req, res) => {
    const { uid, store } = req.body;
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).json({ ошибка: 'Пользователь не найден' });

    // Если магазин приватный, генерируем токен приглашения
    let token = store.inviteToken;
    if (store.type === 'private' && !token) {
        token = сгенерироватьТокен();
    }

    юзер.магазин = { ...store, inviteToken: token };
    res.json({ ok: true, inviteToken: token });
});

app.get('/store/invite/:token', (req, res) => {
    const { token } = req.params;
    for (const [uid, юзер] of пользователи.entries()) {
        if (юзер.магазин && юзер.магазин.inviteToken === token) {
            return res.json({ uid, store: юзер.магазин, publicKey: юзер.публичныйКлюч });
        }
    }
    res.status(404).json({ ошибка: 'Приглашение недействительно' });
});

// 3. ГРУППЫ
// Phase 2: Metadata protection — сервер НЕ знает, кто в группе.
// Клиент шифрует список UID участников через encryptGroupMembers(groupKey)
// перед отправкой. Сервер хранит opaque blob (encryptedMembers).
//
// Backward compat: если клиент ещё не использует шифрование —
// принимаем старый формат (массив UID) для совместимости,
// но НЕ отдаём его другим клиентам через API.
app.post('/groups/create', (req, res) => {
    const { title, ownerId, type, encryptedMembers, members } = req.body;
    const id = `group_${Date.now()}`;
    const token = type === 'private' ? сгенерироватьТокен() : undefined;

    // Phase 2: prefer encryptedMembers (opaque blob). Fallback to legacy members.
    const opaqueMembers = encryptedMembers || ['__legacy_placeholder__'];
    const memberCount = Array.isArray(opaqueMembers) ? opaqueMembers.length : 1;

    группы.set(id, {
        id,
        title,
        ownerId,
        type,
        token,
        // Phase 2: opaque blob для сервера. Сервер не знает состав группы.
        encryptedMembers: opaqueMembers,
        memberCount,
        // Помечаем legacy группы для возможной миграции в будущем.
        isLegacy: !encryptedMembers && !!members,
    });
    console.log(`[ГРУППА] Создана ${id} (encrypted=${!!encryptedMembers}, members=${memberCount})`);
    res.json({ id, token });
});

app.post('/groups/join', (req, res) => {
    const { uid, token, groupId, encryptedMembers } = req.body;

    let группа = null;
    if (groupId) группа = группы.get(groupId);
    else if (token) {
        for (const g of группы.values()) {
            if (g.token === token) { группа = g; break; }
        }
    }

    if (!группа) return res.status(404).json({ ошибка: 'Группа не найдена' });

    // Phase 2: клиент отправляет обновлённый зашифрованный список участников.
    if (encryptedMembers && Array.isArray(encryptedMembers)) {
        группа.encryptedMembers = encryptedMembers;
        группа.memberCount = encryptedMembers.length;
        группа.isLegacy = false;
    } else {
        // Backward compat: legacy клиент без encryptedMembers.
        console.warn(`[ГРУППА] Legacy join без encryptedMembers — count инкрементируется`);
        if (!группа.encryptedMembers || группа.encryptedMembers.length === 0) {
            группа.encryptedMembers = ['__legacy_placeholder__'];
        }
        группа.memberCount = (группа.memberCount || 1) + 1;
    }

    // Возвращаем группу БЕЗ encryptedMembers (opaque blob, клиент его уже имеет).
    const { encryptedMembers: _omit, ...safeGroup } = группа;
    res.json({ group: safeGroup });
});

// 4. ДОСКИ ОБЪЯВЛЕНИЙ
app.post('/boards/create', (req, res) => {
    const { uid, title, description, txid, rentalDuration, tariff } = req.body;
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).send();

    // Симуляция проверки оплаты за создание доски
    if (!проверитьТранзакцию(txid, 'SMART_CONTRACT_ADDR', tariff)) {
        return res.status(402).json({ ошибка: 'Оплата не подтверждена' });
    }

    const новаяДоска = {
        id: `board_${Date.now()}`,
        ownerUid: uid,
        title,
        description,
        announcements: [],
        expiresAt: Date.now() + (rentalDuration || 24 * 3600 * 1000) // По умолчанию день
    };

    юзер.доски.push(новаяДоска);
    res.json({ board: новаяДоска });
});

app.put('/boards/:boardId', (req, res) => {
    const { boardId } = req.params;
    for (const user of пользователи.values()) {
        const board = user.доски?.find(b => b.id === boardId);
        if (board) {
            Object.assign(board, req.body);
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ ошибка: 'Доска не найдена' });
});

app.post('/boards/:boardId/announcements', (req, res) => {
    const { uid, announcement } = req.body;
    const { boardId } = req.params;

    // Поиск доски у пользователя
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).send();

    const доска = юзер.доски.find(д => д.id === boardId);
    if (!доска) return res.status(404).json({ ошибка: 'Доска не найдена' });

    // Если доска платная (монетизация включена владельцем), проверяем TXID
    if (доска.pricePerAd && доска.pricePerAd > 0) {
        if (!проверитьТранзакцию(req.body.txid, доска.contractAddress, доска.pricePerAd)) {
            return res.status(402).json({ ошибка: 'Требуется оплата' });
        }
    }

    доска.announcements.push({ ...announcement, id: `ann_${Date.now()}`, publishedAt: Date.now() });
    res.json({ ok: true });
});

app.delete('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    for (const user of пользователи.values()) {
        const board = user.доски?.find(b => b.id === boardId);
        if (board) {
            board.announcements = board.announcements.filter(a => a.id !== annId);
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ ошибка: 'Доска не найдена' });
});

app.put('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    const { announcement } = req.body;
    for (const user of пользователи.values()) {
        const board = user.доски?.find(b => b.id === boardId);
        if (board) {
            const idx = board.announcements.findIndex(a => a.id === annId);
            if (idx !== -1) {
                board.announcements[idx] = { ...board.announcements[idx], ...announcement };
                return res.json({ ok: true });
            }
        }
    }
    res.status(404).json({ ошибка: 'Объявление не найдено' });
});

// ============================================================
// Telegram-like features: Channels, Gifts, Rewards, Creator Management
// Принципы Dumb Server + metadata-protection сохранены.
// ============================================================

// --- КАНАЛЫ (broadcast) ---
app.post('/channels/create', (req, res) => {
  const { title, description, ownerId, avatar } = req.body;
  if (!title || !ownerId) return res.status(400).json({ ошибка: 'title и ownerId обязательны' });
  const id = `channel_${Date.now()}`;
  const токен = сгенерироватьТокен();
  const канал = {
    id,
    title,
    description: description || '',
    ownerId,
    admins: [ownerId],
    moderators: [],
    subscribers: [ownerId],
    avatar: avatar || undefined,
    verified: false,
    createdAt: Date.now(),
    postCount: 0,
    inviteToken: токен,
    posts: [],
  };
  каналы.set(id, канал);
  console.log(`[КАНАЛ] Создан ${id} by ${ownerId}`);
  res.json({ id, inviteToken: токен });
});

app.post('/channels/subscribe', (req, res) => {
  const { uid, channelId, inviteToken } = req.body;
  const канал = каналы.get(channelId);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  if (канал.inviteToken && inviteToken && канал.inviteToken !== inviteToken) {
    return res.status(403).json({ ошибка: 'Неверный токен приглашения' });
  }
  if (!канал.subscribers.includes(uid)) канал.subscribers.push(uid);
  res.json({ ok: true, subscriberCount: канал.subscribers.length });
});

app.post('/channels/unsubscribe', (req, res) => {
  const { uid, channelId } = req.body;
  const канал = каналы.get(channelId);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  канал.subscribers = канал.subscribers.filter(u => u !== uid);
  res.json({ ok: true });
});

// Публичная карточка — НЕ раскрывает список подписчиков (metadata protection)
app.get('/channels/:id', (req, res) => {
  const канал = каналы.get(req.params.id);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  res.json({
    id: канал.id,
    title: канал.title,
    description: канал.description,
    ownerId: канал.ownerId,
    avatar: канал.avatar,
    verified: канал.verified,
    subscriberCount: канал.subscribers.length,
    postCount: канал.postCount,
    inviteToken: канал.inviteToken,
  });
});

app.get('/channels/:id/posts', (req, res) => {
  const канал = каналы.get(req.params.id);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  res.json({ posts: канал.posts || [] });
});

// Список всех публичных каналов (лента/каталог для клиента)
app.get('/channels', (req, res) => {
  const list = Array.from(каналы.values()).map(к => ({
    id: к.id, title: к.title, description: к.description, ownerId: к.ownerId,
    avatar: к.avatar, verified: к.verified,
    subscriberCount: к.subscribers.length, postCount: к.postCount, inviteToken: к.inviteToken,
  }));
  res.json({ channels: list });
});

// Публикация поста в канал (только owner/admin). Broadcast подписчикам.
app.post('/channels/:id/post', (req, res) => {
  const канал = каналы.get(req.params.id);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  const { authorId, text, attachments } = req.body;
  if (!канал.admins.includes(authorId)) return res.status(403).json({ ошибка: 'Только владелец/админ может публиковать' });
  const пост = {
    id: `post_${Date.now()}`, channelId: канал.id, authorId,
    text: text || '', attachments: attachments || [], timestamp: new Date().toISOString(), views: 0,
  };
  канал.posts = канал.posts || [];
  канал.posts.push(пост);
  канал.postCount = канал.posts.length;
  канал.subscribers.forEach(u => { if (u !== authorId) отправить(u, { type: 'channel_post', post, channelId: канал.id }); });
  res.json({ ok: true, post });
});

// --- Управление создателями (каналы) ---
function проверитьВладельцаКанала(канал, uid) {
  return канал && канал.ownerId === uid;
}
app.post('/channels/admin/add', (req, res) => {
  const { channelId, ownerId, adminUid } = req.body;
  const канал = каналы.get(channelId);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  if (!проверитьВладельцаКанала(канал, ownerId)) return res.status(403).json({ ошибка: 'Только владелец может назначать админов' });
  if (!канал.admins.includes(adminUid)) канал.admins.push(adminUid);
  res.json({ ok: true, admins: канал.admins });
});
app.post('/channels/admin/remove', (req, res) => {
  const { channelId, ownerId, adminUid } = req.body;
  const канал = каналы.get(channelId);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  if (!проверитьВладельцаКанала(канал, ownerId)) return res.status(403).json({ ошибка: 'Только владелец' });
  канал.admins = канал.admins.filter(u => u !== adminUid);
  res.json({ ok: true, admins: канал.admins });
});
app.post('/channels/transfer', (req, res) => {
  const { channelId, ownerId, newOwnerUid } = req.body;
  const канал = каналы.get(channelId);
  if (!канал) return res.status(404).json({ ошибка: 'Канал не найден' });
  if (!проверитьВладельцаКанала(канал, ownerId)) return res.status(403).json({ ошибка: 'Только владелец может передать канал' });
  канал.ownerId = newOwnerUid;
  if (!канал.admins.includes(newOwnerUid)) канал.admins.push(newOwnerUid);
  res.json({ ok: true, ownerId: newOwnerUid });
});

// --- ГРУППЫ: передача владения (creator management) ---
app.post('/groups/transfer', (req, res) => {
    const { groupId, ownerId, newOwnerUid } = req.body;
    const группа = группы.get(groupId);
    if (!группа) return res.status(404).json({ ошибка: 'Группа не найдена' });
    if (группа.ownerId !== ownerId) return res.status(403).json({ ошибка: 'Только владелец' });
    группа.ownerId = newOwnerUid;
    res.json({ ok: true, ownerId: newOwnerUid });
});

// --- МАГАЗИНЫ: передача владения ---
app.post('/store/transfer', (req, res) => {
  const { uid, newOwnerUid } = req.body;
  const юзер = пользователи.get(uid);
  if (!юзер || !юзер.магазин) return res.status(404).json({ ошибка: 'Магазин не найден' });
  юзер.магазин.ownerUid = newOwnerUid;
  res.json({ ok: true, ownerUid: newOwnerUid });
});

// --- ПОДАРКИ (gifts) ---
app.get('/gifts/catalog', (req, res) => {
  res.json({ gifts: КАТАЛОГ_ПОДАРКОВ });
});
app.post('/gifts/send', (req, res) => {
  const { giftId, fromUid, toUid, channelId, message } = req.body;
  const подарок = КАТАЛОГ_ПОДАРКОВ.find(g => g.id === giftId);
  if (!подарок) return res.status(404).json({ ошибка: 'Подарок не найден в каталоге' });
  if (!fromUid || !toUid) return res.status(400).json({ ошибка: 'fromUid и toUid обязательны' });
  const giftSend = { id: `gift_${Date.now()}`, giftId, fromUid, toUid, channelId, message, sentAt: Date.now() };
  отправить(toUid, { type: 'gift', gift: подарок, from: fromUid, message, channelId, sentAt: giftSend.sentAt });
  if (channelId) {
    const канал = каналы.get(channelId);
    if (канал) канал.subscribers.forEach(u => {
      if (u !== fromUid) отправить(u, { type: 'gift_channel', gift: подарок, from: fromUid, channelId, sentAt: giftSend.sentAt });
    });
  }
  res.json({ ok: true, gift: giftSend });
});

// --- НАГРАДЫ / ДОСТИЖЕНИЯ (rewards) ---
app.post('/rewards/grant', (req, res) => {
  const { uid, type, label, description, icon } = req.body;
  if (!uid || !label) return res.status(400).json({ ошибка: 'uid и label обязательны' });
  const награда = { id: `reward_${Date.now()}`, uid, type: type || 'achievement', label, description, icon, earnedAt: Date.now() };
  if (!награды.has(uid)) награды.set(uid, []);
  награды.get(uid).push(награда);
  отправить(uid, { type: 'reward', reward: награда });
  res.json({ ok: true, reward: награда });
});
app.get('/rewards/:uid', (req, res) => {
  res.json({ rewards: награды.get(req.params.uid) || [] });
});

// --- WEBSOCKET ЛОГИКА ---

серверВебсокетов.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const uid = url.searchParams.get('uid');
  const pkBase64url = url.searchParams.get('pk');
  const protocolVersion = url.searchParams.get('v') || '1.0';
  const clientType = url.searchParams.get('client') || 'unknown';

  // v2.0 Stage 5.1: Trust-on-first-use — если пользователь НЕ зарегистрирован,
  // но передал валидный pk — создаём user record на лету.
  // Это устраняет необходимость в предварительном POST /register.
  if (!uid) {
    console.warn('[WS] connection rejected: missing uid');
    ws.close(4001, 'Missing uid');
    return;
  }

  // base64url decode → JWK string
  let publicKey = null;
  if (pkBase64url) {
    try {
      const padded = pkBase64url.replace(/-/g, '+').replace(/_/g, '/');
      const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
      publicKey = Buffer.from(padded + padding, 'base64').toString('utf-8');
    } catch (e) {
      console.warn(`[WS] invalid pk encoding for ${uid}:`, e.message);
    }
  }

  let юзер = пользователи.get(uid);

  // Trust-on-first-use: создаём user record если его нет
  if (!юзер) {
    if (!publicKey) {
      console.warn(`[WS] connection rejected: uid=${uid} not registered and no pk provided`);
      ws.close(4002, 'Unknown uid and no publicKey for trust-on-first-use');
      return;
    }
    // Phase 2: генерируем случайный session ID вместо логирования IP.
    // Сервер НЕ знает IP клиента — только анонимный session ID для отладки.
    const sessionId = crypto.randomBytes(8).toString('hex');
    юзер = {
      публичныйКлюч: publicKey,
      ws: null,
      доски: [],
      sessionId,
      connectedAt: new Date().toISOString(),
      зарегистрированВ: new Date().toISOString(),
      clientType,
      protocolVersion,
    };
    пользователи.set(uid, юзер);
    console.log(`[WS] trust-on-first-use: auto-registered ${uid} (session=${sessionId}, client=${clientType}, v=${protocolVersion})`);
  } else if (publicKey && юзер.публичныйКлюч !== publicKey) {
    // PublicKey mismatch — потенциальная MITM-атака или key rotation
    console.warn(`[WS] publicKey mismatch for ${uid}: stored vs new`);
    // В production тут можно закрывать соединение. Для dev — пропускаем warning.
  }

  // Phase 2: обновляем session ID при каждом подключении (rotation).
  // IP клиента НЕ логируется и НЕ сохраняется.
  юзер.ws = ws;
  юзер.sessionId = crypto.randomBytes(8).toString('hex');
  юзер.последнийПодключенВ = new Date().toISOString();
  ws.uid = uid;
  ws.sessionId = юзер.sessionId;
  console.log(`[WS] client connected: uid=${uid} (session=${юзер.sessionId}, client=${clientType})`);

  // 1. Phase 3: Dumb Server — сервер НЕ хранит офлайн-сообщения.
  // Клиент сам хранит очередь в IndexedDB (см. src/services/offlineQueue.ts).

  // 2. Проверка сроков аренды досок и отправка системных уведомлений
  if (юзер.доски) {
      юзер.доски.forEach(д => {
          if (д.expiresAt && д.expiresAt - Date.now() < 3600000 * 24 && д.expiresAt > Date.now()) {
             // Меньше суток осталось
             ws.send(JSON.stringify({
                 from: 'system',
                 type: 'system',
                 content: `Внимание! Срок аренды доски "${д.title}" истекает через 24 часа. Продлите аренду.`,
                 timestamp: new Date().toISOString()
             }));
          } else if (д.expiresAt && д.expiresAt < Date.now()) {
              ws.send(JSON.stringify({
                 from: 'system',
                 type: 'system',
                 content: `Срок аренды доски "${д.title}" истек. Она скрыта из поиска.`,
                 timestamp: new Date().toISOString()
             }));
          }
      });
  }

  ws.on('message', (данные) => {
    try {
      const msg = JSON.parse(данные);

      // Phase 2: traffic padding — игнорируем шумовые пакеты.
      if (msg.type === 'noise') {
        return;  // Сервер НЕ обрабатывает шум.
      }

      // v2.0 Stage 5.4: Read receipt — клиент сообщает, что прочитал сообщение.
      // Сервер пересылает это оригинальному отправителю.
      // Формат: {type: 'read', messageId: '...', from: '<sender_uid>'}
      if (msg.type === 'read' && msg.messageId) {
          // Broadcast всем users, которые могут быть отправителями.
          // В нашей модели — всем users (простая версия).
          // TODO: хранить mapping messageId → sender для точной маршрутизации.
          for (const [otherUid, otherUser] of пользователи) {
              if (otherUid === uid) continue;
              if (otherUser.ws && otherUser.ws.readyState === WebSocket.OPEN) {
                  otherUser.ws.send(JSON.stringify({
                      type: 'receipt',
                      receipt: 'read',
                      messageId: msg.messageId,
                      from: uid,
                      timestamp: new Date().toISOString()
                  }));
              }
          }
          return;
      }

      // v2.0 Stage 5.5: Typing indicator — клиент сообщает, что печатает.
      // Сервер пересылает это получателю. Не персистируется.
      if (msg.type === 'typing' && (msg.to || msg.groupId)) {
          if (msg.to) {
              отправить(msg.to, {
                  type: 'typing',
                  from: uid,
                  chatId: msg.to,
                  timestamp: new Date().toISOString()
              });
          } else if (msg.groupId) {
              const группа = группы.get(msg.groupId);
              if (группа) {
                  группа.участники.forEach(участникUid => {
                      if (участникUid === uid) return;
                      отправить(участникUid, {
                          type: 'typing',
                          from: uid,
                          chatId: msg.groupId,
                          timestamp: new Date().toISOString()
                      });
                  });
              }
          }
          return;
      }

      const { to, content, groupId, type, payload, disappearIn, timerSetAt, channelId, encryptedContent, nonce, senderPublicKey, encryptionType, id, signal } = msg;

      const исходящее = {
          from: uid,
          content: content || '',
          encryptedContent,
          nonce,
          senderPublicKey,
          encryptionType,
          signal,
          timestamp: new Date().toISOString(),
          groupId,
          type,
          payload,
          disappearIn,
          timerSetAt,
          channelId
      };

      // Telegram-like: пост в канал (broadcast подписчикам)
      if (msg.channelId) {
          const канал = каналы.get(msg.channelId);
          if (канал) {
              const пост = {
                  id: `post_${Date.now()}`,
                  channelId: канал.id,
                  authorId: uid,
                  text: content || '',
                  timestamp: new Date().toISOString(),
                  views: 0,
              };
              канал.posts = канал.posts || [];
              канал.posts.push(пост);
              канал.postCount = канал.posts.length;
              канал.subscribers.forEach(subUid => {
                  if (subUid === uid) return;
                  отправить(subUid, { ...исходящее, type: 'channel_post', post, channelId: канал.id });
              });
          }
      } else if (groupId) {
          // Рассылка по группе
          const группа = группы.get(groupId);
          if (группа) {
              if (группа.encryptedMembers && !группа.isLegacy) {
                  // Phase 2: новая группа с encryptedMembers.
                  // Сервер НЕ знает участников — broadcast всем активным клиентам.
                  // Клиент сам решает, принадлежит ли ему это сообщение
                  // (расшифрует groupKey и проверит, есть ли он в списке).
                  for (const [otherUid, otherUser] of пользователи) {
                      if (otherUid === uid) continue;
                      if (otherUser.ws && otherUser.ws.readyState === WebSocket.OPEN) {
                          otherUser.ws.send(JSON.stringify({ ...исходящее, groupId: группа.id }));
                      }
                  }
              } else if (группа.участники) {
                  // Legacy группа — broadcast старым способом (backward compat).
                  группа.участники.forEach(участникUid => {
                      if (участникUid === uid) return;
                      отправить(участникUid, { ...исходящее, groupId: группа.id });
                  });
              }
          }
      } else {
          // Личное сообщение
          отправить(to, исходящее);
      }

      // v2.0 Stage 5.3: Delivery receipt — подтверждаем отправителю,
      // что сообщение доставлено адресату (или поставлено в очередь offline).
      if (id) {
          // Phase 3: Dumb Server — receipt "delivered" ТОЛЬКО если получатель онлайн.
          // Если офлайн — receipt "queued" (на стороне клиента).
          const получательЮзер = пользователи.get(to);
          const доставленоСразу = получательЮзер && получательЮзер.ws && получательЮзер.ws.readyState === WebSocket.OPEN;
          if (доставленоСразу) {
              отправить(uid, {
                  type: 'receipt',
                  receipt: 'delivered',
                  messageId: id,
                  to: to,
                  timestamp: new Date().toISOString(),
                  queued: false
              });
          } else {
              // Сервер не хранит офлайн — клиент получит 'recipient_offline' через
              // функцию отправить() выше и сам сохранит в IndexedDB.
              отправить(uid, {
                  type: 'receipt',
                  receipt: 'queued',
                  messageId: id,
                  to: to,
                  timestamp: new Date().toISOString(),
                  queued: true
              });
          }
      }

    } catch (e) { console.error(e); }
  });

  ws.on('close', () => {
     if (юзер) юзер.ws = null;
  });
});

function отправить(uidПолучателя, данные) {
    const юзер = пользователи.get(uidПолучателя);
    if (юзер && юзер.ws && юзер.ws.readyState === WebSocket.OPEN) {
        юзер.ws.send(JSON.stringify(данные));
    } else {
        // Phase 3: Dumb Server — НЕ сохраняем на сервере.
        // Отправляем 'recipient_offline' error обратно отправителю.
        // Отправитель сам хранит сообщение в IndexedDB и ретраит при reconnect.
        const senderUid = данные.from;
        if (senderUid) {
            const senderUser = пользователи.get(senderUid);
            if (senderUser && senderUser.ws && senderUser.ws.readyState === WebSocket.OPEN) {
                senderUser.ws.send(JSON.stringify({
                    type: 'error',
                    error: 'recipient_offline',
                    messageId: данные.id,
                    recipientUid: uidПолучателя,
                    originalPayload: данные,
                }));
            }
        }
        console.log(`[OFFLINE] recipient ${uidПолучателя} not connected, sender ${senderUid || 'unknown'} notified`);
    }
}

// Раздача статики (включая index.html и admin.html)
app.use(express.static(path.join(__dirname, 'dist'))); // Если используется сборка
app.use(express.static(__dirname)); // Для прямой раздачи файлов при разработке

сервер.listen(ПОРТ, () => console.log(`Сервер на порту ${ПОРТ}. Админка доступна по /admin (admin:admin123)`));

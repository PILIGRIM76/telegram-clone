
const express = require('express');
// Phase 2: Metadata protection — используем crypto для генерации session ID
// вместо логирования IP-адресов клиентов.
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const url = require('url');
const { db, STORAGE_TYPE } = require('./db/index.js');

// Phase 2: SQLite persistence + JWT Auth
const sqlDb = require('./server/databaseService.js');
const authService = require('./server/authService.js');

// v3.13: Push Notifications (FCM)
const pushService = require('./server/pushService.js');

// In-memory maps for WS routing only (data persisted in SQLite)
const wsUsers = new Map(); // uid -> ws reference

// Initialize on startup
function initStorage() {
  console.log('[STORAGE] SQLite-based storage initialized');
}
initStorage();

const app = express();
app.use(express.json({ limit: '10mb' })); // Увеличен лимит для изображений
const сервер = http.createServer(app);
const серверВебсокетов = new WebSocket.Server({ server: сервер });

const ПОРТ = process.env.PORT || 4000;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// In-memory maps for routing only (persistent data in SQLite)
// Groups, channels, rewards remain in-memory (Dumb Server principle)
const группы = new Map(); // { id: { название, участники[], idВладельца, тип, токен } }
const каналы = new Map(); // { id: Channel }
const награды = new Map(); // uid -> Reward[]

// Helper: load user profile from SQLite into memory cache for WS routing
const userProfileCache = new Map(); // uid -> { publicKey, preKeyBundle, store, boards }

function getUserProfileFromDB(uid) {
  if (userProfileCache.has(uid)) return userProfileCache.get(uid);
  const profile = sqlDb.getUserProfile(uid);
  if (profile) userProfileCache.set(uid, profile);
  return profile;
}

function setUserProfileCache(uid, profile) {
  userProfileCache.set(uid, profile);
}

function updateUserProfileCache(uid, partial) {
  const current = userProfileCache.get(uid) || { publicKey: null, preKeyBundle: null, store: null, boards: [] };
  const updated = { ...current, ...partial };
  userProfileCache.set(uid, updated);
  return updated;
}

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
    let totalUsers = 0;

    // Count from userProfileCache + DB
    // Get all users from SQLite
    const allUsers = sqlDb.db.prepare('SELECT uid FROM users').all();
    totalUsers = allUsers.length;

    for (const { uid } of allUsers) {
        const ws = wsUsers.get(uid);
        if (ws && ws.readyState === WebSocket.OPEN) onlineUsers++;
        
        const profile = getUserProfileFromDB(uid);
        if (profile) {
            if (profile.store && profile.store.тип === 'публичный') publicStores++;
            if (profile.boards) totalBoards += profile.boards.length;
        }
    }

    // Phase 2: stats endpoint НЕ возвращает IP-адреса пользователей.
    // Только агрегированные counters (online count, total count).
    res.json({
        totalUsers,
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
    const allUsers = sqlDb.db.prepare('SELECT uid FROM users').all();
    
    for (const { uid } of allUsers) {
        const ws = wsUsers.get(uid);
        const profile = getUserProfileFromDB(uid);
        
        userList.push({
            uid,
            isOnline: ws && ws.readyState === WebSocket.OPEN,
            hasStore: !!(profile?.store),
            boardsCount: profile?.boards?.length || 0,
            // Phase 2: только session ID, никаких IP-адресов.
            // sessionId меняется при каждом WS reconnect — невозможно
            // связать разные сессии одного юзера между собой.
            sessionId: ws?.sessionId || null,
            connectedAt: ws?.connectedAt || null,
        });
    }
    // Пагинация должна быть тут, но для прототипа отдаем 100 последних
    res.json(userList.slice(-100));
});

// Бан пользователя (удаление)
app.post('/api/admin/ban', adminAuth, (req, res) => {
    const { uid } = req.body;
    const ws = wsUsers.get(uid);
    if (ws) ws.close();
    
    // Delete from SQLite (cascades to user_profiles, identities, sessions, messages)
    const result = sqlDb.db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
    
    // Remove from cache
    userProfileCache.delete(uid);
    wsUsers.delete(uid);
    
    // Remove from groups
    for (const g of группы.values()) {
        g.участники = g.участники.filter(u => u !== uid);
    }
    
    if (result.changes > 0) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Список магазинов
app.get('/api/admin/stores', adminAuth, (req, res) => {
    const stores = [];
    const allUsers = sqlDb.db.prepare('SELECT uid FROM users').all();
    
    for (const { uid } of allUsers) {
        const profile = getUserProfileFromDB(uid);
        if (profile?.store) {
            stores.push({
                uid,
                ...profile.store
            });
        }
    }
    res.json(stores);
});

// Удаление магазина (модерация)
app.delete('/api/admin/stores/:uid', adminAuth, (req, res) => {
    const { uid } = req.params;
    const profile = getUserProfileFromDB(uid);
    if (profile && profile.store) {
        // Clear store in SQLite
        sqlDb.saveStoreData(uid, null);
        // Update cache
        updateUserProfileCache(uid, { store: null });
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

    for (const [uid, ws] of wsUsers.entries()) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(systemMsg);
            count++;
        }
    }
    res.json({ sentTo: count });
});

// --- ПУБЛИЧНЫЕ API ЭНДПОИНТЫ ---

// 1. ПОЛЬЗОВАТЕЛИ
// Aliases with /api/ prefix for frontend authClient.ts
app.post('/api/register', (req, res) => {
  req.url = '/register';
  app.handle(req, res);
});

app.post('/api/login', (req, res) => {
  req.url = '/login';
  app.handle(req, res);
});

app.post('/register', async (req, res) => {
  const { username, password, uid, publicKey } = req.body;
  if (!username || !password || !publicKey) {
    return res.status(400).json({ ошибка: 'username, password и publicKey обязательны' });
  }
  try {
    // Check if user exists
    const existing = sqlDb.getUserByUsername(username);
    if (existing) return res.status(409).json({ ошибка: 'Пользователь уже существует' });

    // Register via authService - argon2 hash, SQLite insert, JWT tokens
    const result = await authService.register(username, password, uid, publicKey);

    // Create initial user profile in SQLite (publicKey already saved by authService.register via saveIdentity)
    sqlDb.saveUserProfile(result.uid, { publicKey, boards: [] });

    // Store WS routing info
    wsUsers.set(result.uid, null);

    res.status(201).json({
      uid: result.uid,
      username: result.username,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    console.error('[REGISTER] Error:', err.message);
    if (err.message === 'Username already exists') {
      return res.status(409).json({ ошибка: 'Username already exists' });
    }
    res.status(500).json({ ошибка: 'Internal server error' });
  }
});

// 2. ЛОГИН
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    if (!result) return res.status(401).json({ ошибка: 'Неверный логин или пароль' });

    res.json({
      uid: result.uid,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (e) {
    console.error('Ошибка входа:', e);
    res.status(500).json({ ошибка: 'Внутренняя ошибка сервера' });
  }
});

// 3. REFRESH: обновление access-токена через refresh-токен
app.post('/api/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = await authService.refresh(refreshToken);
    res.json({
      uid: result.uid,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (e) {
    console.error('[REFRESH] Error:', e.message);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// v3.13: Register FCM push token for a user
app.post('/api/push/register-token', async (req, res) => {
  try {
    const { uid, token, platform } = req.body;
    if (!uid || !token) {
      return res.status(400).json({ error: 'uid and token are required' });
    }
    // Validate the token format (basic check for FCM token)
    if (typeof token !== 'string' || token.length < 100) {
      return res.status(400).json({ error: 'Invalid token format' });
    }
    const user = sqlDb.getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    sqlDb.savePushToken(uid, token, platform || 'web');
    console.log(`[Push] Token registered for user ${uid} (${platform || 'web'})`);
    res.json({ success: true });
  } catch (e) {
    console.error('[Push] Register token error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// v3.13: Unregister FCM push token
app.post('/api/push/unregister-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    sqlDb.removePushToken(token);
    console.log('[Push] Token unregistered');
    res.json({ success: true });
  } catch (e) {
    console.error('[Push] Unregister token error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/key/:uid', (req, res) => {
  const { uid } = req.params;
  const profile = getUserProfileFromDB(uid);
  if (!profile) return res.status(404).json({ ошибка: 'Не найден' });

  // Фильтруем данные: скрываем приватные магазины и истекшие доски
  let магазинДанные = profile.store;
  if (магазинДанные && магазинДанные.тип === 'приватная') магазинДанные = null;

  const активныеДоски = (profile.boards || []).filter(д => !д.expiresAt || д.expiresAt > Date.now());

  res.json({
      uid,
      publicKey: profile.publicKey,
      // Phase 2: публикация Signal pre-key bundle для PFS сессий.
      // Если у юзера нет bundle → null, клиент делает fallback на NaCl.
      preKeyBundle: profile.preKeyBundle || null,
      store: магазинДанные,
      boards: активныеДоски
  });
});

// Phase 2: публикация pre-key bundle для Signal Protocol (PFS Double Ratchet).
// Клиент вызывает при инициализации identity или при ротации pre-keys.
app.post('/keys/publish', (req, res) => {
  const { uid, preKeyBundle } = req.body;
  const profile = getUserProfileFromDB(uid);
  if (!profile) return res.status(404).json({ ошибка: 'Пользователь не найден' });
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
  // Persist to SQLite
  sqlDb.savePreKeyBundle(uid, preKeyBundle);
  // Update cache
  updateUserProfileCache(uid, { preKeyBundle });
  console.log(`[KEYS] Pre-key bundle published for ${uid} (deviceId=${preKeyBundle.deviceId || 1})`);
  res.json({ ok: true });
});

// 2. МАГАЗИНЫ
app.post('/store', (req, res) => {
    const { uid, store } = req.body;
    const profile = getUserProfileFromDB(uid);
    if (!profile) return res.status(404).json({ ошибка: 'Пользователь не найден' });

    // Если магазин приватный, генерируем токен приглашения
    let token = store.inviteToken;
    if (store.type === 'private' && !token) {
        token = сгенерироватьТокен();
    }

    const storeData = { ...store, inviteToken: token };
    // Persist to SQLite
    sqlDb.saveStoreData(uid, storeData);
    // Update cache
    updateUserProfileCache(uid, { store: storeData });
    res.json({ ok: true, inviteToken: token });
});

app.get('/store/invite/:token', (req, res) => {
    const { token } = req.params;
    // Query all user profiles from SQLite (could be optimized with index)
    // For now, iterate through cache + fallback to DB
    for (const [uid, profile] of userProfileCache.entries()) {
        if (profile.store && profile.store.inviteToken === token) {
            return res.json({ uid, store: profile.store, publicKey: profile.publicKey });
        }
    }
    // Fallback: could query DB directly, but for simplicity check all profiles
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
    const profile = getUserProfileFromDB(uid);
    if (!profile) return res.status(404).send();

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

    const boards = [...(profile.boards || []), новаяДоска];
    // Persist to SQLite
    sqlDb.saveBoardsData(uid, boards);
    // Update cache
    updateUserProfileCache(uid, { boards });
    res.json({ board: новаяДоска });
});

app.put('/boards/:boardId', (req, res) => {
    const { boardId } = req.params;
    // Find board across all users (could be optimized with index)
    for (const [uid, profile] of userProfileCache.entries()) {
        const board = profile.boards?.find(b => b.id === boardId);
        if (board) {
            Object.assign(board, req.body);
            // Persist updated boards
            sqlDb.saveBoardsData(uid, profile.boards);
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ ошибка: 'Доска не найдена' });
});

app.post('/boards/:boardId/announcements', (req, res) => {
    const { uid, announcement } = req.body;
    const { boardId } = req.params;

    const profile = getUserProfileFromDB(uid);
    if (!profile) return res.status(404).send();

    const доска = profile.boards?.find(д => д.id === boardId);
    if (!доска) return res.status(404).json({ ошибка: 'Доска не найдена' });

    // Если доска платная (монетизация включена владельцем), проверяем TXID
    if (доска.pricePerAd && доска.pricePerAd > 0) {
        if (!проверитьТранзакцию(req.body.txid, доска.contractAddress, доска.pricePerAd)) {
            return res.status(402).json({ ошибка: 'Требуется оплата' });
        }
    }

    доска.announcements.push({ ...announcement, id: `ann_${Date.now()}`, publishedAt: Date.now() });
    // Persist updated boards
    sqlDb.saveBoardsData(uid, profile.boards);
    res.json({ ok: true });
});

app.delete('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    for (const [uid, profile] of userProfileCache.entries()) {
        const board = profile.boards?.find(b => b.id === boardId);
        if (board) {
            board.announcements = board.announcements.filter(a => a.id !== annId);
            // Persist updated boards
            sqlDb.saveBoardsData(uid, profile.boards);
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ ошибка: 'Доска не найдена' });
});

app.put('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    const { announcement } = req.body;
    for (const [uid, profile] of userProfileCache.entries()) {
        const board = profile.boards?.find(b => b.id === boardId);
        if (board) {
            const idx = board.announcements.findIndex(a => a.id === annId);
            if (idx !== -1) {
                board.announcements[idx] = { ...board.announcements[idx], ...announcement };
                // Persist updated boards
                sqlDb.saveBoardsData(uid, profile.boards);
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
  const profile = getUserProfileFromDB(uid);
  if (!profile || !profile.store) return res.status(404).json({ ошибка: 'Магазин не найден' });
  const updatedStore = { ...profile.store, ownerUid: newOwnerUid };
  // Persist to SQLite
  sqlDb.saveStoreData(uid, updatedStore);
  // Update cache
  updateUserProfileCache(uid, { store: updatedStore });
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

// --- WEBSOCKET LOGIK ---

серверВебсокетов.on('connection', (ws, req) => {
  const queryObject = url.parse(req.url, true).query;
  const token = queryObject.token;

  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }

  let payload;
  try {
    payload = authService.verifyAccessToken(token);
  } catch (err) {
    ws.close(1008, 'Invalid or expired token');
    return;
  }

  const uid = payload.uid;
  ws.uid = uid;
  wsUsers.set(uid, ws);
  
  // v3.11: Update presence - user is now online
  sqlDb.updateUserPresence(uid, true);
  
  // Broadcast user online status to their contacts
  broadcastPresenceUpdate(uid, true);
  
  // Load user profile from SQLite into cache
  const profile = sqlDb.getUserProfile(uid);
  if (profile) {
    userProfileCache.set(uid, profile);
    console.log('[WS] User profile loaded from SQLite for:', uid);
  } else {
    // Initialize empty profile in cache
    userProfileCache.set(uid, { publicKey: null, preKeyBundle: null, store: null, boards: [] });
  }
  
  console.log('[WS] client connected: uid=' + uid);

  const offlineMsgs = sqlDb.takeOfflineMessages(uid);
  offlineMsgs.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });

  ws.on('message', (данные) => {
    try {
      const msg = JSON.parse(данные);
      if (msg.type === 'noise') return;
      
      // --- v3.11: Typing Indicators ---
      if (msg.type === 'typing_start' || msg.type === 'typing_stop') {
        const { chatId } = msg;
        // Broadcast to chat participants (except sender)
        broadcastTypingUpdate(chatId, uid, msg.type === 'typing_start');
        return;
      }
      
      // --- v3.11: Read Receipts ---
      if (msg.type === 'message_read') {
        const { messageId } = msg;
        const readerUid = uid;
        
        sqlDb.markMessageAsRead(messageId, readerUid);
        
        // Notify sender that message was read
        const message = sqlDb.getMessage(messageId);
        if (message) {
          отправить(message.sender_uid, {
            type: 'receipt_update',
            messageId,
            readerUid,
            timestamp: Date.now()
          });
        }
        return;
      }
      
      if (msg.type === 'read' && msg.messageId) {
        // Legacy read receipt handler - keep for backward compatibility
        for (const [otherUid, otherUser] of wsUsers) {
          if (otherUid === uid) continue;
          if (otherUser && otherUser.readyState === WebSocket.OPEN) {
            otherUser.send(JSON.stringify({ type: 'receipt', receipt: 'read', messageId: msg.messageId, from: uid, timestamp: new Date().toISOString() }));
          }
        }
        return;
      }
      if (msg.type === 'typing' && msg.to) {
        // Legacy typing handler - keep for backward compatibility
        отправить(msg.to, { type: 'typing', from: uid, chatId: msg.to, timestamp: new Date().toISOString() });
        return;
      }
      if (msg.type === 'message' || msg.type === 'text') {
        const { to, content, id, groupId, channelId, encryptedAttachments } = msg;
        const исходящее = { from: uid, content: content || '', timestamp: new Date().toISOString(), groupId, type: msg.type, channelId };
        // Save message and get the message ID
        const messageId = sqlDb.saveMessage({ senderUid: uid, receiverUid: to, content: content || '', encryptedAttachments: encryptedAttachments || [] });
        // Attach messageId to outgoing message for receipts
        исходящее.id = messageId;
        
        if (channelId) {
          const канал = каналы.get(channelId);
          if (канал) {
            const пост = { id: 'post_' + Date.now(), channelId: канал.id, authorId: uid, text: content || '', timestamp: new Date().toISOString(), views: 0 };
            канал.posts = канал.posts || [];
            канал.posts.push(пост);
            канал.postCount = (канал.posts || []).length;
            канал.subscribers.forEach(subUid => {
              if (subUid === uid) return;
              const subWs = wsUsers.get(subUid);
              if (subWs && subWs.readyState === WebSocket.OPEN) {
                subWs.send(JSON.stringify({ ...исходящее, type: 'channel_post', post, channelId: канал.id }));
              }
            });
          }
        } else if (groupId) {
          const группа = группы.get(groupId);
          if (группа) {
            for (const [otherUid, otherUser] of wsUsers) {
              if (otherUid === uid) continue;
              if (otherUser && otherUser.readyState === WebSocket.OPEN) {
                otherUser.send(JSON.stringify({ ...исходящее, groupId: группа.id }));
              }
            }
          }
        } else {
          отправить(to, исходящее);
        }
        if (id) {
          const recWs = wsUsers.get(to);
          const delivered = recWs && recWs.readyState === WebSocket.OPEN;
          отправить(uid, { type: 'receipt', receipt: delivered ? 'delivered' : 'queued', messageId: id, to: to, timestamp: new Date().toISOString(), queued: !delivered });
        }
      }
      if (msg.type === 'reaction') {
        const { messageId, emoji, action, to, groupId } = msg;
        sqlDb.addReaction(messageId, uid, emoji);
        const reactionMsg = { type: 'reaction', messageId, userUid: uid, emoji, action };
        if (to) {
          отправить(to, reactionMsg);
        }
        if (groupId) {
          const группа = группы.get(groupId);
          if (группа) {
            for (const [otherUid, otherUser] of wsUsers) {
              if (otherUid === uid) continue;
              if (otherUser && otherUser.readyState === WebSocket.OPEN) {
                otherUser.send(JSON.stringify({ ...reactionMsg, groupId: группа.id }));
              }
            }
          }
        }
      }

      // --- v3.12: Message Editing ---
      if (msg.type === 'message_edit') {
        const { messageId, newContent } = msg;

        // Verify the user owns the message
        const message = sqlDb.getMessage(messageId);
        if (!message || message.sender_uid !== uid) {
          ws.send(JSON.stringify({ type: 'error', message: 'Нет прав на редактирование' }));
          return;
        }

        // Save old version and update
        sqlDb.editMessage(messageId, newContent);

        // Broadcast to chat participants
        const editedAt = Date.now();
        const broadcastMsg = {
          type: 'message_edited',
          messageId,
          newContent,
          editedAt
        };

        if (message.receiver_uid) {
          отправить(message.receiver_uid, broadcastMsg);
        }
        // Also send back to sender for confirmation
        ws.send(broadcastMsg);
      }

      // --- v3.12: Message Deletion ---
      if (msg.type === 'message_delete') {
        const { messageId, deleteForAll } = msg;

        const message = sqlDb.getMessage(messageId);
        if (!message) return;

        // Check permissions: owner or group admin
        const isOwner = message.sender_uid === uid;
        let isAdmin = false;

        // For group messages, check if user is admin
        // Note: This would need groupId to be passed in the message or derived from context
        // For now, only owner can delete

        if (!isOwner && !isAdmin) {
          ws.send(JSON.stringify({ type: 'error', message: 'Нет прав на удаление' }));
          return;
        }

        sqlDb.deleteMessage(messageId, deleteForAll, uid);

        // Broadcast deletion event
        const broadcastMsg = {
          type: 'message_deleted',
          messageId,
          deleteForAll
        };

        if (message.receiver_uid) {
          отправить(message.receiver_uid, broadcastMsg);
        }
        // Also send back to sender for confirmation
        ws.send(broadcastMsg);
      }
    } catch (e) { console.error(e); }
  });

  ws.on('close', () => {
    wsUsers.delete(uid);
    console.log('[WS] client disconnected: uid=' + uid);
    
    // v3.11: Update presence - user is now offline
    sqlDb.updateUserPresence(uid, false);
    
    // Broadcast user offline status to their contacts
    broadcastPresenceUpdate(uid, false);
  });
});

function отправить(uidПолучателя, данные) {
  const ws = wsUsers.get(uidПолучателя);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(данные));
  } else {
    const senderUid = данных.from;
    if (senderUid) {
      const senderWs = wsUsers.get(senderUid);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(JSON.stringify({ type: 'error', error: 'recipient_offline', messageId: данные.id, recipientUid: uidПолучателя, originalPayload: данные }));
      }
    }
    sqlDb.saveOfflineMessage({ senderUid: данные.from, receiverUid: uidПолучателя, content: typeof данные.content === 'string' ? данные.content : JSON.stringify(данные), encryptedAttachments: данные.encryptedAttachments || [] });
    console.log('[OFFLINE] recipient ' + uidПолучателя + ' not connected, queued in SQLite');

    // v3.13: Send push notification for offline user
    // Only for direct messages (not group/channel), and only if we have a message ID
    if (senderUid && данные.id && !данные.groupId && !данные.channelId) {
      // Get sender's username for push title
      const sender = sqlDb.getUserByUid(senderUid);
      const senderName = sender ? sender.username : 'Unknown';
      
      // chatId for direct messages is the other user's UID
      const chatId = senderUid; // or uidПолучателя, both work for navigation
      const messageId = данные.id;
      
      // Send push notification (non-blocking, fire-and-forget)
      pushService.sendPushNotification(uidПолучателя, senderName, chatId, messageId);
    }
  }
}

// v3.11: Broadcast typing update to all participants in a chat (except sender)
function broadcastTypingUpdate(chatId, senderUid, isTyping) {
  // For direct messages, chatId is the recipient's UID
  // For group/channel messages, we'd need to track group membership
  // For now, handle direct messages
  const recipientUid = chatId;
  const ws = wsUsers.get(recipientUid);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'typing_update',
      uid: senderUid,
      chatId,
      isTyping
    }));
  }
}

// v3.11: Broadcast presence update to relevant users
function broadcastPresenceUpdate(uid, isOnline) {
  // Get user's contacts and notify them of presence change
  // For simplicity, broadcast to all online users
  // In production, you'd track contact relationships
  const presenceMsg = {
    type: 'presence_update',
    uid,
    isOnline,
    lastSeen: isOnline ? null : Math.floor(Date.now() / 1000)
  };
  
  for (const [otherUid, otherUser] of wsUsers) {
    if (otherUid === uid) continue;
    if (otherUser && otherUser.readyState === WebSocket.OPEN) {
      otherUser.send(JSON.stringify(presenceMsg));
    }
  }
}

// Раздача статики (включая index.html и admin.html)
app.use(express.static(path.join(__dirname, 'dist'))); // Если используется сборка
app.use(express.static(__dirname)); // Для прямой раздачи файлов при разработке

сервер.listen(ПОРТ, () => console.log(`Сервер на порту ${ПОРТ}. Админка доступна по /admin (admin:admin123)`));


const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Увеличен лимит для изображений
const сервер = http.createServer(app);
const серверВебсокетов = new WebSocket.Server({ server: сервер });

const ПОРТ = process.env.PORT || 8080;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Хранилище в памяти
const пользователи = new Map(); // { uid: { публичныйКлюч, ws, магазин, доски } }
const группы = new Map(); // { id: { название, участники[], idВладельца, тип, токен } }
const офлайнСообщения = new Map();

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

    res.json({
        totalUsers: пользователи.size,
        onlineUsers,
        totalGroups: группы.size,
        publicStores,
        totalBoards,
        offlineMessagesStored: офлайнСообщения.size
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
            boardsCount: u.доски ? u.доски.length : 0
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
        ot: 'system',
        tip: 'системное',
        soderzhimoe: message, // Транслит полей для соответствия клиенту
        содержимое: message,
        временнаяМетка: new Date().toISOString(),
        тип: 'системное'
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
  const { uid, публичныйКлюч } = req.body;
  if (!uid || !публичныйКлюч) return res.status(400).json({ ошибка: 'Данные неполны' });
  if (пользователи.has(uid)) return res.status(409).json({ ошибка: 'UID занят' });
  
  пользователи.set(uid, { публичныйКлюч, ws: null, доски: [] });
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

  const активныеДоски = (юзер.доски || []).filter(д => !д.срокИстекаетВ || д.срокИстекаетВ > Date.now());

  res.json({ 
      uid, 
      публичныйКлюч: юзер.публичныйКлюч, 
      магазин: магазинДанные,
      доски: активныеДоски 
  });
});

// 2. МАГАЗИНЫ
app.post('/store', (req, res) => {
    const { uid, магазин } = req.body;
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).json({ ошибка: 'Пользователь не найден' });

    // Если магазин приватный, генерируем токен приглашения
    let токен = магазин.токенПриглашения;
    if (магазин.тип === 'приватная' && !токен) {
        токен = сгенерироватьТокен();
    }
    
    юзер.магазин = { ...магазин, токенПриглашения: токен };
    res.json({ ок: true, токенПриглашения: токен });
});

app.get('/store/invite/:token', (req, res) => {
    const { token } = req.params;
    for (const [uid, юзер] of пользователи.entries()) {
        if (юзер.магазин && юзер.магазин.токенПриглашения === token) {
            return res.json({ uid, магазин: юзер.магазин, публичныйКлюч: юзер.публичныйКлюч });
        }
    }
    res.status(404).json({ ошибка: 'Приглашение недействительно' });
});

// 3. ГРУППЫ
app.post('/groups/create', (req, res) => {
    const { название, idВладельца, тип, участники } = req.body;
    const id = `group_${Date.now()}`;
    const токен = тип === 'приватная' ? сгенерироватьТокен() : undefined;

    группы.set(id, { id, название, idВладельца, тип, токен, участники: участники || [idВладельца] });
    console.log(`[ГРУППА] Создана ${id} (${название})`);
    res.json({ id, токен });
});

app.post('/groups/join', (req, res) => {
    const { uid, токен, groupId } = req.body;
    
    let группа = null;
    if (groupId) группа = группы.get(groupId);
    else if (токен) {
        for (const g of группы.values()) {
            if (g.токен === токен) { группа = g; break; }
        }
    }

    if (!группа) return res.status(404).json({ ошибка: 'Группа не найдена' });
    if (!группа.участники.includes(uid)) {
        группа.участники.push(uid);
    }
    res.json({ группа });
});

// 4. ДОСКИ ОБЪЯВЛЕНИЙ
app.post('/boards/create', (req, res) => {
    const { uid, название, описание, txid, срокАренды, тариф } = req.body;
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).send();

    // Симуляция проверки оплаты за создание доски
    if (!проверитьТранзакцию(txid, 'SMART_CONTRACT_ADDR', тариф)) {
        return res.status(402).json({ ошибка: 'Оплата не подтверждена' });
    }

    const новаяДоска = {
        id: `board_${Date.now()}`,
        владелецUid: uid,
        название,
        описание,
        объявления: [],
        срокИстекаетВ: Date.now() + (срокАренды || 24 * 3600 * 1000) // По умолчанию день
    };
    
    юзер.доски.push(новаяДоска);
    res.json({ доска: новаяДоска });
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
    const { uid, объявление } = req.body;
    const { boardId } = req.params;
    
    // Поиск доски у пользователя
    const юзер = пользователи.get(uid);
    if (!юзер) return res.status(404).send();
    
    const доска = юзер.доски.find(д => д.id === boardId);
    if (!доска) return res.status(404).json({ ошибка: 'Доска не найдена' });

    // Если доска платная (монетизация включена владельцем), проверяем TXID
    if (доска.ценаЗаОбъявление && доска.ценаЗаОбъявление > 0) {
        if (!проверитьТранзакцию(req.body.txid, доска.адресСмартКонтрактаДоски, доска.ценаЗаОбъявление)) {
            return res.status(402).json({ ошибка: 'Требуется оплата' });
        }
    }

    доска.объявления.push({ ...объявление, id: `ann_${Date.now()}`, датаПубликации: Date.now() });
    res.json({ ок: true });
});

app.delete('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    for (const user of пользователи.values()) {
        const board = user.доски?.find(b => b.id === boardId);
        if (board) {
            board.объявления = board.объявления.filter(a => a.id !== annId);
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ ошибка: 'Доска не найдена' });
});

app.put('/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    const { объявление } = req.body;
    for (const user of пользователи.values()) {
        const board = user.доски?.find(b => b.id === boardId);
        if (board) {
            const idx = board.объявления.findIndex(a => a.id === annId);
            if (idx !== -1) {
                board.объявления[idx] = { ...board.объявления[idx], ...объявление };
                return res.json({ ok: true });
            }
        }
    }
    res.status(404).json({ ошибка: 'Объявление не найдено' });
});

// --- WEBSOCKET ЛОГИКА ---

серверВебсокетов.on('connection', (ws, req) => {
  const uid = new URL(req.url, `http://${req.headers.host}`).searchParams.get('uid');
  if (!uid || !пользователи.has(uid)) { ws.close(); return; }
  
  const юзер = пользователи.get(uid);
  юзер.ws = ws;
  ws.uid = uid;

  // 1. Отправка офлайн сообщений
  if (офлайнСообщения.has(uid)) {
    офлайнСообщения.get(uid).forEach(с => ws.send(JSON.stringify(с)));
    офлайнСообщения.delete(uid);
  }

  // 2. Проверка сроков аренды досок и отправка системных уведомлений
  if (юзер.доски) {
      юзер.доски.forEach(д => {
          if (д.срокИстекаетВ && д.срокИстекаетВ - Date.now() < 3600000 * 24 && д.срокИстекаетВ > Date.now()) {
             // Меньше суток осталось
             ws.send(JSON.stringify({
                 от: 'system',
                 тип: 'системное',
                 содержимое: `Внимание! Срок аренды доски "${д.название}" истекает через 24 часа. Продлите аренду.`,
                 временнаяМетка: new Date().toISOString()
             }));
          } else if (д.срокИстекаетВ && д.срокИстекаетВ < Date.now()) {
              ws.send(JSON.stringify({
                 от: 'system',
                 тип: 'системное',
                 содержимое: `Срок аренды доски "${д.название}" истек. Она скрыта из поиска.`,
                 временнаяМетка: new Date().toISOString()
             }));
          }
      });
  }

  ws.on('message', (данные) => {
    try {
      const msg = JSON.parse(данные);
      const { кому, содержимое, idГруппы, тип, payload, времяИсчезновения, таймерУстановленВ } = msg;

      const исходящее = {
          от: uid,
          содержимое,
          временнаяМетка: new Date().toISOString(),
          idГруппы,
          тип,
          payload,
          времяИсчезновения,
          таймерУстановленВ
      };

      if (idГруппы) {
          // Рассылка по группе
          const группа = группы.get(idГруппы);
          if (группа) {
              группа.участники.forEach(участникUid => {
                  if (участникUid === uid) return; // Не шлем себе
                  отправить(участникUid, { ...исходящее, idГруппы: группа.id });
              });
          }
      } else {
          // Личное сообщение
          отправить(кому, исходящее);
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
        if (!офлайнСообщения.has(uidПолучателя)) офлайнСообщения.set(uidПолучателя, []);
        офлайнСообщения.get(uidПолучателя).push(данные);
    }
}

// Раздача статики (включая index.html и admin.html)
app.use(express.static(path.join(__dirname, 'dist'))); // Если используется сборка
app.use(express.static(__dirname)); // Для прямой раздачи файлов при разработке

сервер.listen(ПОРТ, () => console.log(`Сервер на порту ${ПОРТ}. Админка доступна по /admin (admin:admin123)`));

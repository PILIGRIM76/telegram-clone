
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

app.use(cors()); 
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'database.json');
const PROJECT_ROOT = path.join(__dirname, '..'); 
const PACKAGE_JSON = path.join(__dirname, 'package.json');

// --- DATABASE MANAGEMENT ---
let users = new Map(); 
let groups = new Map(); 
let offlineMessages = new Map();

// Load data
function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            if (data.users) users = new Map(data.users.map(u => [u.uid, { ...u, ws: null }]));
            if (data.groups) groups = new Map(data.groups.map(g => [g.id, g]));
            if (data.offlineMessages) offlineMessages = new Map(Object.entries(data.offlineMessages));
            console.log('[DB] Database loaded successfully.');
        } catch (e) {
            console.error('[DB] Error loading database:', e);
        }
    }
}

// Save data
function saveDatabase() {
    try {
        const data = {
            users: Array.from(users.values()).map(u => {
                const { ws, ...rest } = u; 
                return rest;
            }),
            groups: Array.from(groups.values()),
            offlineMessages: Object.fromEntries(offlineMessages)
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[DB] Error saving database:', e);
    }
}

loadDatabase();
setInterval(saveDatabase, 30000);

// --- MONITORING SYSTEM ---
const systemLogs = []; 
const MAX_LOGS = 200;
const trafficStats = { totalMessages: 0, totalBytes: 0, startTime: Date.now() };

function logEvent(type, details) {
    const entry = { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), type, details };
    systemLogs.push(entry);
    if (systemLogs.length > MAX_LOGS) systemLogs.shift();
    console.log(`[${type}] ${details}`);
}

logEvent('INFO', 'CipherLink Server Starting...');

try {
    const initAdminPanel = require('./server_admin/controller');
    initAdminPanel(app, { пользователи: users, группы: groups, офлайнСообщения: offlineMessages, systemLogs, trafficStats, logEvent });
} catch (e) { console.warn('Admin module issue:', e.message); }

function generateToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function verifyTransaction(txid, expectedAddress, amount) {
    return txid && txid.startsWith('0x'); 
}

// --- SYSTEM UPDATE ENDPOINTS ---
app.get('/api/system/check', (req, res) => {
    let currentVersion = '1.0.0';
    try {
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
        currentVersion = pkg.version;
    } catch(e) {}

    exec('git remote update && git status -uno', { cwd: PROJECT_ROOT }, (err, stdout, stderr) => {
        if (err) return res.json({ version: currentVersion, hasUpdate: false, message: 'Git check failed' });
        const isBehind = stdout.includes('behind') || stdout.includes('позади');
        res.json({ version: currentVersion, hasUpdate: isBehind, message: isBehind ? 'New version available' : 'Up to date' });
    });
});

app.post('/api/system/update', (req, res) => {
    logEvent('WARN', 'System update requested via API');
    exec('git pull', { cwd: PROJECT_ROOT }, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: 'Update failed', details: stderr });
        const logMsg = `Git Pull: ${stdout}`;
        logEvent('INFO', logMsg);
        res.json({ success: true, message: 'Updated successfully.', details: stdout });
    });
});

// --- API ENDPOINTS (API prefixed with /api) ---

app.post('/api/register', (req, res) => {
  const { uid, publicKey } = req.body;
  if (!uid || !publicKey) return res.status(400).json({ error: 'Incomplete data' });
  if (users.has(uid) && users.get(uid).publicKey !== publicKey) {
      return res.status(409).json({ error: 'UID taken' });
  }
  users.set(uid, { uid, publicKey, ws: null, boards: [], registeredAt: Date.now() });
  saveDatabase();
  logEvent('AUTH', `New user registered: ${uid}`);
  res.status(201).json({ ok: true });
});

app.get('/api/key/:uid', (req, res) => {
  const { uid } = req.params;
  const user = users.get(uid);
  if (!user) return res.status(404).json({ error: 'Not found' });
  let storeData = user.store;
  if (storeData && storeData.type === 'private') storeData = null;
  const activeBoards = (user.boards || []).filter(b => !b.expiresAt || b.expiresAt > Date.now());
  res.json({ uid, publicKey: user.publicKey, store: storeData, boards: activeBoards });
});

app.post('/api/store', (req, res) => {
    const { uid, store } = req.body;
    const user = users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    let token = store.inviteToken;
    if (store.type === 'private' && !token) token = generateToken();
    user.store = { ...store, inviteToken: token };
    saveDatabase();
    res.json({ ok: true, inviteToken: token });
});

app.get('/api/store/invite/:token', (req, res) => {
    const { token } = req.params;
    for (const [uid, user] of users.entries()) {
        if (user.store && user.store.inviteToken === token) {
            return res.json({ uid, store: user.store, publicKey: user.publicKey });
        }
    }
    res.status(404).json({ error: 'Invalid invitation' });
});

app.post('/api/groups/create', (req, res) => {
    const { name, ownerId, type, members } = req.body;
    const id = `group_${Date.now()}`;
    const token = type === 'private' ? generateToken() : undefined;
    groups.set(id, { id, name, ownerId, type, token, members: members || [ownerId] });
    saveDatabase();
    res.json({ id, token });
});

app.post('/api/groups/join', (req, res) => {
    const { uid, token, groupId } = req.body;
    let group = null;
    if (groupId) group = groups.get(groupId);
    else if (token) {
        for (const g of groups.values()) { if (g.token === token) { group = g; break; } }
    }
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.members.includes(uid)) {
        group.members.push(uid);
        saveDatabase();
    }
    res.json({ group });
});

app.post('/api/boards/create', (req, res) => {
    const { uid, name, description, txid, leaseDuration, tariff } = req.body;
    const user = users.get(uid);
    if (!user) return res.status(404).send();
    if (!verifyTransaction(txid, 'SMART_CONTRACT_ADDR', tariff)) return res.status(402).json({ error: 'Payment required' });

    const newBoard = {
        id: `board_${Date.now()}`,
        ownerUid: uid,
        name,
        description,
        announcements: [],
        expiresAt: Date.now() + (leaseDuration || 86400000)
    };
    if (!user.boards) user.boards = [];
    user.boards.push(newBoard);
    saveDatabase();
    res.json({ board: newBoard });
});

app.put('/api/boards/:boardId', (req, res) => {
    const { boardId } = req.params;
    for (const user of users.values()) {
        const board = user.boards?.find(b => b.id === boardId);
        if (board) { Object.assign(board, req.body); saveDatabase(); return res.json({ ok: true }); }
    }
    res.status(404).json({ error: 'Board not found' });
});

app.post('/api/boards/:boardId/announcements', (req, res) => {
    const { uid, announcement } = req.body;
    const { boardId } = req.params;
    const user = users.get(uid);
    let board = null;
    for (const u of users.values()) {
        const b = u.boards?.find(b => b.id === boardId);
        if (b) { board = b; break; }
    }
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.pricePerAd && board.pricePerAd > 0 && board.ownerUid !== uid) {
        if (!verifyTransaction(req.body.txid, board.contractAddress, board.pricePerAd)) return res.status(402).json({ error: 'Payment required' });
    }
    board.announcements.push({ ...announcement, id: `ann_${Date.now()}`, publishedAt: Date.now() });
    saveDatabase();
    res.json({ ok: true });
});

app.delete('/api/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    for (const user of users.values()) {
        const board = user.boards?.find(b => b.id === boardId);
        if (board) {
            board.announcements = board.announcements.filter(a => a.id !== annId);
            saveDatabase();
            return res.json({ ok: true });
        }
    }
    res.status(404).json({ error: 'Board not found' });
});

app.put('/api/boards/:boardId/announcements/:annId', (req, res) => {
    const { boardId, annId } = req.params;
    const { announcement } = req.body;
    for (const user of users.values()) {
        const board = user.boards?.find(b => b.id === boardId);
        if (board) {
            const idx = board.announcements.findIndex(a => a.id === annId);
            if (idx !== -1) {
                board.announcements[idx] = { ...board.announcements[idx], ...announcement };
                saveDatabase();
                return res.json({ ok: true });
            }
        }
    }
    res.status(404).json({ error: 'Announcement not found' });
});

// --- WEBSOCKET ---
wss.on('connection', (ws, req) => {
  const uid = new URL(req.url, `http://${req.headers.host}`).searchParams.get('uid');
  if (!uid || !users.has(uid)) { ws.close(); return; }
  
  const user = users.get(uid);
  user.ws = ws;
  ws.uid = uid;
  logEvent('AUTH', `User connected: ${uid}`);

  if (offlineMessages.has(uid)) {
    offlineMessages.get(uid).forEach(msg => ws.send(JSON.stringify(msg)));
    offlineMessages.delete(uid);
    saveDatabase();
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      // ENGLISH KEYS
      const { to, content, groupId, type, payload, disappearIn, timerSetAt, replyTo, media, mediaType, isEdited, isForwarded } = msg;

      const outgoing = {
          senderId: uid, 
          text: content,
          timestamp: new Date().toISOString(),
          groupId,
          type,
          payload,
          disappearIn,
          timerSetAt,
          replyTo,
          media,
          mediaType,
          isEdited,
          isForwarded
      };

      if (groupId) {
          const group = groups.get(groupId);
          if (group) {
              group.members.forEach(memberUid => {
                  if (memberUid === uid) return;
                  send(memberUid, { ...outgoing, groupId: group.id });
              });
          }
      } else {
          send(to, outgoing);
      }
    } catch (e) { logEvent('ERROR', `WS Error: ${e.message}`); }
  });

  ws.on('close', () => { if (user) user.ws = null; });
});

function send(recipientUid, data) {
    const user = users.get(recipientUid);
    if (user && user.ws && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(data));
    } else {
        if (!offlineMessages.has(recipientUid)) offlineMessages.set(recipientUid, []);
        offlineMessages.get(recipientUid).push(data);
        saveDatabase(); 
    }
}

// LISTEN ON 0.0.0.0 to accept connections from LAN
server.listen(PORT, '0.0.0.0', () => console.log(`Server (API+WS) running on port ${PORT}.`));

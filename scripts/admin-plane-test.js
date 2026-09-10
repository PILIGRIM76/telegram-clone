/**
 * admin-plane-test.js
 * -------------------
 * Phase 6: проверяет, что AntiPiry-Admin (control plane) стартует,
 * авторизует оператора, отдаёт дашборд и через прокси тянет live-статистику
 * с основного Dumb Server (AntiPiry/server.js) по HTTP Basic.
 *
 * Запуск: node scripts/admin-plane-test.js
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const MAIN_PORT = 4100;
const ADMIN_PORT = 9190;
const MAIN_URL = `http://localhost:${MAIN_PORT}`;
const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;
const SERVER_JS = path.join(__dirname, '..', 'server.js');
const ADMIN_SERVER_JS = path.join(__dirname, '..', '..', 'AntiPiry-Admin', 'server.js');

const ADMIN_LOGIN = 'admin';
const ADMIN_PASS = 'admin123';

function httpReq(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      await httpReq(url);
      return true;
    } catch {
      await sleep(150);
    }
  }
  throw new Error(`Service not up: ${url}`);
}

function startServer(file, env, name) {
  const proc = spawn('node', [file], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[${name} ERR] ${d}`));
  return proc;
}

(async () => {
  console.log('[TEST] Phase 6: AntiPiry-Admin control plane\n');

  const mainProc = startServer(SERVER_JS, { PORT: String(MAIN_PORT) }, 'MAIN');
  const adminProc = startServer(
    ADMIN_SERVER_JS,
    { ADMIN_PORT: String(ADMIN_PORT), MAIN_BACKEND: MAIN_URL, MAIN_ADMIN_LOGIN: ADMIN_LOGIN, MAIN_ADMIN_PASSWORD: ADMIN_PASS },
    'ADMIN'
  );

  const cleanup = () => {
    try { mainProc.kill(); } catch {}
    try { adminProc.kill(); } catch {}
  };
  process.on('exit', cleanup);

  try {
    await waitFor(`${MAIN_URL}/key/alive_probe_xyz`);
    console.log('[TEST] ✅ Main backend up');
    await waitFor(`${ADMIN_URL}/`);
    console.log('[TEST] ✅ Admin control plane up');

    // 1) Admin login
    const login = await httpReq(`${ADMIN_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: ADMIN_LOGIN, password: ADMIN_PASS },
    });
    if (login.status !== 200 || !login.json?.token) throw new Error('Admin login failed: ' + login.raw);
    const token = login.json.token;
    console.log('[TEST] ✅ Admin login → token issued');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2) Dashboard (local registry)
    const dash = await httpReq(`${ADMIN_URL}/api/dashboard`, { headers: authHeaders });
    if (dash.status !== 200 || !dash.json?.stats) throw new Error('Dashboard failed: ' + dash.raw);
    console.log('[TEST] ✅ Dashboard OK — stats:', JSON.stringify(dash.json.stats));

    // 3) Direct admin stats on main backend (sanity)
    const basicAuth = 'Basic ' + Buffer.from(`${ADMIN_LOGIN}:${ADMIN_PASS}`).toString('base64');
    const directStats = await httpReq(`${MAIN_URL}/api/admin/stats`, { headers: { Authorization: basicAuth } });
    if (directStats.status !== 200 || typeof directStats.json?.totalUsers !== 'number') {
      throw new Error('Direct main admin/stats failed: ' + directStats.raw);
    }
    console.log('[TEST] ✅ Main /api/admin/stats OK —', JSON.stringify(directStats.json));

    // 4) Proxy via admin → main backend
    const proxied = await httpReq(`${ADMIN_URL}/api/proxy/stats`, { headers: authHeaders });
    if (proxied.status !== 200 || typeof proxied.json?.totalUsers !== 'number') {
      throw new Error('Proxy /api/proxy/stats failed: ' + proxied.raw);
    }
    console.log('[TEST] ✅ Admin proxy → main stats OK —', JSON.stringify(proxied.json));

    // 5) Proxy users list
    const proxiedUsers = await httpReq(`${ADMIN_URL}/api/proxy/users`, { headers: authHeaders });
    if (proxiedUsers.status !== 200 || !Array.isArray(proxiedUsers.json)) {
      throw new Error('Proxy /api/proxy/users failed: ' + proxiedUsers.raw);
    }
    console.log('[TEST] ✅ Admin proxy → main users OK — count:', proxiedUsers.json.length);

    console.log('\n[TEST] 🎉 Phase 6 (Admin control plane) VERIFIED.');
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('\n[TEST] ❌ FAIL:', err.message);
    cleanup();
    process.exit(1);
  }
})();

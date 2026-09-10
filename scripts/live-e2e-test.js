#!/usr/bin/env node
/**
 * live-e2e-test.js
 * ----------------
 * Phase "Deploy": проверяет, что УЖЕ ЗАПУЩЕННЫЙ бэкенд (деплой на RT9-сценарий,
 * сервер на 192.168.100.4:4000) реально релеит зашифрованные 1:1 сообщения.
 * Не поднимает свой сервер — цепляется к живому, как это делает планшет.
 *
 * Запуск: node scripts/live-e2e-test.js
 * Настройка: API_URL / WS_URL (по умолчанию http://192.168.100.4:4000 и ws://192.168.100.4:4000)
 */
const nacl = require('tweetnacl');
const WebSocket = require('ws');

const API_URL = process.env.API_URL || 'http://192.168.100.4:4000';
const WS_URL = process.env.WS_URL || 'ws://192.168.100.4:4000';
const UNIQ = Date.now();

function btoa(s) { return Buffer.from(s, 'binary').toString('base64'); }
function toBase64(u8) { return btoa(String.fromCharCode(...u8)); }
function fromBase64(b64) {
  const bin = Buffer.from(b64, 'base64').toString('binary');
  return new Uint8Array(bin.split('').map((c) => c.charCodeAt(0)));
}
async function postJSON(endpoint, body) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
  return res.json().catch(() => null);
}
async function getJSON(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
  return res.json();
}
function connectWs(uid, pkBase64) {
  const url = `${WS_URL}/?uid=${encodeURIComponent(uid)}&pk=${encodeURIComponent(pkBase64)}&v=2.0&client=live-test`;
  // self-signed LAN certs: не проверяем цепочку при wss://
  return new WebSocket(url, { rejectUnauthorized: false });
}
function wsNextMessage(ws, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wsNextMessage timeout')), timeoutMs);
    const handler = (data) => { clearTimeout(timer); ws.off('message', handler); resolve(data); };
    ws.on('message', handler);
  });
}

(async () => {
  console.log(`[LIVE-TEST] Target backend: ${API_URL} / ${WS_URL}\n`);

  const alice = nacl.box.keyPair();
  const bob = nacl.box.keyPair();
  const alicePubB64 = toBase64(alice.publicKey);
  const bobPubB64 = toBase64(bob.publicKey);
  const uidA = `live_alice_${UNIQ}`;
  const uidB = `live_bob_${UNIQ}`;

  console.log('[LIVE-TEST] Registering clients...');
  await postJSON('/register', { uid: uidA, publicKey: alicePubB64 });
  await postJSON('/register', { uid: uidB, publicKey: bobPubB64 });

  const aliceInfo = await getJSON(`/key/${uidA}`);
  const bobInfo = await getJSON(`/key/${uidB}`);
  if (aliceInfo.publicKey !== alicePubB64) throw new Error('/key returned wrong publicKey for alice');
  if (bobInfo.publicKey !== bobPubB64) throw new Error('/key returned wrong publicKey for bob');
  console.log('[LIVE-TEST] ✅ Key lookup OK (live server stores transport keys)');

  const aliceWs = connectWs(uidA, alicePubB64);
  const bobWs = connectWs(uidB, bobPubB64);
  await Promise.all([
    new Promise((res, rej) => { aliceWs.on('open', res); aliceWs.on('error', rej); }),
    new Promise((res, rej) => { bobWs.on('open', res); bobWs.on('error', rej); }),
  ]);
  console.log('[LIVE-TEST] ✅ Both clients connected to live server via WS');

  const plaintext = 'Live deploy check: secret from Bob @ RT9 scenario!';
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(new TextEncoder().encode(plaintext), nonce, alice.publicKey, bob.secretKey);

  const payload = {
    to: uidA,
    encryptedContent: toBase64(encrypted),
    nonce: toBase64(nonce),
    senderPublicKey: bobPubB64,
    encryptionType: 'nacl',
    id: `live-msg-${UNIQ}`,
  };
  bobWs.send(JSON.stringify(payload));
  console.log('[LIVE-TEST] Bob sent encrypted message through live relay');

  const raw = await wsNextMessage(aliceWs, 5000);
  const incoming = JSON.parse(raw.toString());
  console.log('[LIVE-TEST] Alice received:', JSON.stringify(incoming));

  if (incoming.from !== uidB) throw new Error(`Expected from='${uidB}', got '${incoming.from}'`);
  if (!incoming.encryptedContent || !incoming.nonce) throw new Error('Missing encrypted fields in relayed message');
  if (incoming.senderPublicKey !== bobPubB64) throw new Error('Wrong senderPublicKey');

  const decrypted = nacl.box.open(
    fromBase64(incoming.encryptedContent), fromBase64(incoming.nonce),
    bob.publicKey, alice.secretKey
  );
  if (!decrypted) throw new Error('Decryption failed');
  const decryptedText = new TextDecoder().decode(decrypted);
  if (decryptedText !== plaintext) throw new Error(`Mismatch: "${plaintext}" vs "${decryptedText}"`);

  console.log('\n[LIVE-TEST] 🎉 END-TO-END E2EE VERIFIED against LIVE backend!');
  console.log(`[LIVE-TEST] Original:  "${plaintext}"`);
  console.log(`[LIVE-TEST] Decrypted: "${decryptedText}"`);
  aliceWs.close(); bobWs.close();
  process.exit(0);
})().catch((e) => { console.error('\n[LIVE-TEST] ❌ FAIL:', e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * E2EE Server Integration Test
 * Boots the backend, simulates two NaCl-box clients, and verifies
 * end-to-end encrypted message exchange through the server relay.
 */
const { spawn } = require('child_process');
const path = require('path');
const nacl = require('tweetnacl');
const WebSocket = require('ws');

const SERVER_PORT = 19000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const WS_URL = `ws://localhost:${SERVER_PORT}`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function btoa(s) {
  return Buffer.from(s, 'binary').toString('base64');
}

function base64url(s) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toBase64(u8) {
  return btoa(String.fromCharCode(...u8));
}

function fromBase64(b64) {
  const bin = Buffer.from(b64, 'base64').toString('binary');
  return new Uint8Array(bin.split('').map((c) => c.charCodeAt(0)));
}

async function postJSON(endpoint, body) {
  const res = await fetch(`${SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
  return res.json().catch(() => null);
}

async function getJSON(endpoint) {
  const res = await fetch(`${SERVER_URL}${endpoint}`);
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
  return res.json();
}

function connectWs(uid, pkBase64) {
  const url = `${WS_URL}/?uid=${encodeURIComponent(uid)}&pk=${encodeURIComponent(pkBase64)}&v=2.0&client=test`;
  return new WebSocket(url);
}

function wsNextMessage(ws, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wsNextMessage timeout')), timeoutMs);
    const handler = (data) => {
      clearTimeout(timer);
      ws.off('message', handler);
      resolve(data);
    };
    ws.on('message', handler);
  });
}

async function run() {
  console.log('[TEST] Starting server...');
  const serverProc = spawn('node', [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const onData = (data) => {
      const text = data.toString();
      if (text.includes('Сервер на порту')) {
        serverProc.stdout.off('data', onData);
        resolve();
      }
    };
    serverProc.stdout.on('data', onData);
    serverProc.stderr.on('data', (d) => process.stderr.write(d));
    const timer = setTimeout(() => reject(new Error('Server start timeout')), 10000);
    serverProc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });

  console.log(`[TEST] Server up on port ${SERVER_PORT}`);

  // Generate Alice and Bob keypairs
  const alice = nacl.box.keyPair();
  const bob = nacl.box.keyPair();
  const alicePubB64 = toBase64(alice.publicKey);
  const bobPubB64 = toBase64(bob.publicKey);

  // Register both users
  console.log('[TEST] Registering Alice and Bob...');
  await postJSON('/register', { uid: 'alice', publicKey: alicePubB64 });
  await postJSON('/register', { uid: 'bob', publicKey: bobPubB64 });

  // Verify key lookup returns correct public keys
  const aliceInfo = await getJSON('/key/alice');
  const bobInfo = await getJSON('/key/bob');
  if (aliceInfo.publicKey !== alicePubB64) throw new Error('/key/alice returned wrong publicKey');
  if (bobInfo.publicKey !== bobPubB64) throw new Error('/key/bob returned wrong publicKey');
  console.log('[TEST] Key lookup OK');

  // Connect both via WebSocket
  const aliceWs = connectWs('alice', base64url(alicePubB64));
  const bobWs = connectWs('bob', base64url(bobPubB64));

  await Promise.all([
    new Promise((resolve, reject) => {
      aliceWs.on('open', resolve);
      aliceWs.on('error', reject);
    }),
    new Promise((resolve, reject) => {
      bobWs.on('open', resolve);
      bobWs.on('error', reject);
    }),
  ]);
  console.log('[TEST] Both clients connected via WS');

  // Bob sends encrypted message to Alice
  const plaintext = 'Hello Alice, this is a secret from Bob!';
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(
    new TextEncoder().encode(plaintext),
    nonce,
    alice.publicKey,
    bob.secretKey
  );

  const messagePayload = {
    to: 'alice',
    encryptedContent: toBase64(encrypted),
    nonce: toBase64(nonce),
    senderPublicKey: bobPubB64,
    encryptionType: 'nacl',
    id: 'test-msg-1',
  };

  bobWs.send(JSON.stringify(messagePayload));
  console.log('[TEST] Bob sent encrypted message');

  // Alice waits for incoming message
  const raw = await wsNextMessage(aliceWs, 5000);
  const incoming = JSON.parse(raw.toString());
  console.log('[TEST] Alice received message:', JSON.stringify(incoming, null, 2));

  // Assertions
  if (incoming.from !== 'bob') throw new Error(`Expected from='bob', got '${incoming.from}'`);
  if (!incoming.encryptedContent) throw new Error('Missing encryptedContent');
  if (!incoming.nonce) throw new Error('Missing nonce');
  if (incoming.senderPublicKey !== bobPubB64) throw new Error('Wrong senderPublicKey');

  // Alice decrypts
  const decrypted = nacl.box.open(
    fromBase64(incoming.encryptedContent),
    fromBase64(incoming.nonce),
    bob.publicKey,
    alice.secretKey
  );
  if (!decrypted) throw new Error('Decryption failed (null result)');
  const decryptedText = new TextDecoder().decode(decrypted);
  if (decryptedText !== plaintext) {
    throw new Error(`Decrypted text mismatch: expected "${plaintext}", got "${decryptedText}"`);
  }

  console.log('[TEST] ✅ E2EE message exchange verified!');
  console.log(`[TEST] Original:  "${plaintext}"`);
  console.log(`[TEST] Decrypted: "${decryptedText}"`);

  // === Group messaging test ===
  console.log('[TEST] --- Group messaging ---');
  const groupResult = await postJSON('/groups/create', {
    title: 'Test Group',
    ownerId: 'alice',
    type: 'public',
    encryptedMembers: ['alice', 'bob'],
  });
  console.log('[TEST] Group created:', groupResult.id);

  await postJSON('/groups/join', {
    uid: 'bob',
    groupId: groupResult.id,
    encryptedMembers: ['alice', 'bob'],
  });
  console.log('[TEST] Bob joined group');

  const groupPlaintext = 'Hello group from Alice!';
  const gNonce = nacl.randomBytes(nacl.box.nonceLength);
  const gEncrypted = nacl.box(
    new TextEncoder().encode(groupPlaintext),
    gNonce,
    bob.publicKey, // encrypt for Bob's eyes in this test
    alice.secretKey
  );

  const groupPayload = {
    groupId: groupResult.id,
    encryptedContent: toBase64(gEncrypted),
    nonce: toBase64(gNonce),
    senderPublicKey: toBase64(alice.publicKey),
    encryptionType: 'nacl',
    id: 'test-group-msg-1',
  };

  aliceWs.send(JSON.stringify(groupPayload));
  console.log('[TEST] Alice sent group message');

  const bobGroupRaw = await wsNextMessage(bobWs, 5000);
  const bobGroupMsg = JSON.parse(bobGroupRaw.toString());
  console.log('[TEST] Bob received group message:', JSON.stringify(bobGroupMsg, null, 2));

  if (bobGroupMsg.from !== 'alice') throw new Error(`Expected group from='alice', got '${bobGroupMsg.from}'`);
  if (bobGroupMsg.groupId !== groupResult.id) throw new Error('Wrong groupId');
  if (!bobGroupMsg.encryptedContent) throw new Error('Missing encryptedContent in group msg');

  const gDecrypted = nacl.box.open(
    fromBase64(bobGroupMsg.encryptedContent),
    fromBase64(bobGroupMsg.nonce),
    alice.publicKey,
    bob.secretKey
  );
  if (!gDecrypted) throw new Error('Group decryption failed');
  const gDecryptedText = new TextDecoder().decode(gDecrypted);
  if (gDecryptedText !== groupPlaintext) {
    throw new Error(`Group decrypted text mismatch: expected "${groupPlaintext}", got "${gDecryptedText}"`);
  }
  console.log('[TEST] ✅ Group E2EE exchange verified!');

  // === WebRTC call signaling test ===
  console.log('[TEST] --- WebRTC call signaling ---');
  const offerPayload = { type: 'call-offer', to: 'bob', signal: { sdp: 'fake-offer-sdp', type: 'offer' } };
  aliceWs.send(JSON.stringify(offerPayload));
  console.log('[TEST] Alice sent call-offer');

  const bobOfferRaw = await wsNextMessage(bobWs, 5000);
  const bobOffer = JSON.parse(bobOfferRaw.toString());
  console.log('[TEST] Bob received call-offer:', JSON.stringify(bobOffer, null, 2));

  if (bobOffer.type !== 'call-offer') throw new Error(`Expected type='call-offer', got '${bobOffer.type}'`);
  if (bobOffer.from !== 'alice') throw new Error(`Expected from='alice', got '${bobOffer.from}'`);
  if (!bobOffer.signal || bobOffer.signal.type !== 'offer') throw new Error('Missing or wrong signal in call-offer');

  const answerPayload = { type: 'call-answer', to: 'alice', signal: { sdp: 'fake-answer-sdp', type: 'answer' } };
  bobWs.send(JSON.stringify(answerPayload));
  console.log('[TEST] Bob sent call-answer');

  const aliceAnswerRaw = await wsNextMessage(aliceWs, 5000);
  const aliceAnswer = JSON.parse(aliceAnswerRaw.toString());
  if (aliceAnswer.type !== 'call-answer') throw new Error(`Expected type='call-answer', got '${aliceAnswer.type}'`);
  if (aliceAnswer.signal.type !== 'answer') throw new Error('Missing or wrong signal in call-answer');
  console.log('[TEST] ✅ WebRTC signaling relay verified!');

  // === Gifts test ===
  console.log('[TEST] --- Gifts ---');
  const catalog = await getJSON('/gifts/catalog');
  if (!catalog.gifts || catalog.gifts.length === 0) throw new Error('Gift catalog empty');
  console.log('[TEST] Gift catalog:', catalog.gifts.length, 'items');

  const giftRes = await postJSON('/gifts/send', {
    giftId: catalog.gifts[0].id,
    fromUid: 'alice',
    toUid: 'bob',
    message: 'Happy testing!',
  });
  console.log('[TEST] Gift sent:', giftRes.gift.id);
  console.log('[TEST] ✅ Gift endpoint verified!');

  // === Boards test ===
  console.log('[TEST] --- Boards ---');
  const boardRes = await postJSON('/boards/create', {
    uid: 'alice',
    title: 'Test Board',
    description: 'For integration testing',
    rentalDuration: 86400000,
    txid: '0x1234567890abcdef',
  });
  console.log('[TEST] Board created:', boardRes.board.id);
  if (boardRes.board.title !== 'Test Board') throw new Error('Board title mismatch');

  await postJSON(`/boards/${boardRes.board.id}/announcements`, {
    uid: 'alice',
    announcement: { title: 'Hello', content: 'World' },
  });
  console.log('[TEST] Announcement added');

  const aliceKey = await getJSON('/key/alice');
  if (!aliceKey.boards || aliceKey.boards.length === 0) throw new Error('Boards not returned in /key');
  console.log('[TEST] ✅ Board creation and lookup verified!');

  // === Signal Protocol (PFS) infrastructure test ===
  console.log('[TEST] --- Signal pre-key bundle publish/retrieve ---');
  const fakeBundle = {
    registrationId: 12345,
    deviceId: 1,
    preKeyId: 1,
    preKey: 'aabbccdd',
    signedPreKeyId: 1,
    signedPreKey: 'eeff0011',
    signature: '22334455',
    identityKey: '66778899',
  };
  await postJSON('/keys/publish', { uid: 'alice', preKeyBundle: fakeBundle });
  console.log('[TEST] Alice published pre-key bundle');

  const aliceKeyWithBundle = await getJSON('/key/alice');
  if (!aliceKeyWithBundle.preKeyBundle) throw new Error('preKeyBundle not returned');
  if (aliceKeyWithBundle.preKeyBundle.registrationId !== 12345) throw new Error('preKeyBundle data mismatch');
  console.log('[TEST] ✅ Signal pre-key bundle publish/retrieve verified!');

  // Cleanup
  aliceWs.close();
  bobWs.close();
  serverProc.kill();
  console.log('[TEST] All done.');
}

run().catch((err) => {
  console.error('[TEST] ❌ FAILED:', err.message);
  process.exit(1);
});

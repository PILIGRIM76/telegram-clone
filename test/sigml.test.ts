// SignalMessageLayer tests
import { hybridEncrypt, hybridDecrypt, hasSignalSession, type EncryptedPayload } from '../src/crypto/signal/SignalMessageLayer';
import { SessionStore } from '../src/crypto/signal/SessionStore';

describe('SignalMessageLayer', () => {
  beforeEach(async () => {
    await SessionStore.clearAll();
  });

  it('hasSignalSession returns false when no session exists', async () => {
    expect(await hasSignalSession('uid_alice')).toBe(false);
  });

  it('hasSignalSession returns true when a session exists', async () => {
    await SessionStore.saveSession({
      sessionKey: 'uid_alice:1',
      uid: 'uid_alice',
      deviceId: 1,
      serializedSession: 'fake-state',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
    expect(await hasSignalSession('uid_alice')).toBe(true);
  });

  it('hybridEncrypt falls back to NaCl when no Signal session', async () => {
    const mySecret = new Uint8Array(32);
    crypto.getRandomValues(mySecret);
    const theirPub = new Uint8Array(32);
    crypto.getRandomValues(theirPub);
    const payload: EncryptedPayload = await hybridEncrypt('uid_bob', 'Hello Bob!', mySecret, theirPub);
    expect(payload.type).toBe('nacl');
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.nonce).toBeDefined();
  });

  it('hybridDecrypt round-trips a NaCl payload', async () => {
    const mySecret = new Uint8Array(32);
    crypto.getRandomValues(mySecret);
    const theirPub = new Uint8Array(32);
    crypto.getRandomValues(theirPub);
    const plaintext = 'Hello Bob, this is a NaCl test!';
    const payload = await hybridEncrypt('uid_bob', plaintext, mySecret, theirPub);
    expect(payload.type).toBe('nacl');
    const decrypted = await hybridDecrypt('uid_bob', payload, mySecret, theirPub);
    expect(decrypted).toBe(plaintext);
  });
});
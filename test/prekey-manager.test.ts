// PreKeyManager tests
// Note: fake-indexeddb is installed globally via scripts/setup-fake-indexeddb.js
import { PreKeyManager } from '../src/crypto/signal/PreKeyManager';
import { SignalStorage } from '../src/crypto/signal/SignalStorage';
import { SessionStore } from '../src/crypto/signal/SessionStore';

describe('PreKeyManager', () => {
  let storage: SignalStorage;
  let manager: PreKeyManager;

  beforeEach(async () => {
    await SessionStore.clearAll();
    storage = new SignalStorage();
    await storage.setIdentityKeyPair({ publicKey: 'a'.repeat(64), privateKey: 'b'.repeat(64) });
    await storage.setRegistrationId(1234);
    manager = new PreKeyManager(storage);
  });

  it('generates 100 pre-keys + 1 signed pre-key', async () => {
    const result = await manager.generateAndStorePreKeys();
    expect(result.preKeysAdded).toBe(100);
    expect(result.signedPreKeyId).toBe(1);
    const stats = await manager.getStats();
    expect(stats.preKeyCount).toBe(100);
    expect(stats.signedPreKeyCount).toBe(1);
  }, 30000);

  it('is idempotent: re-running does not duplicate pre-keys', async () => {
    await manager.generateAndStorePreKeys();
    const second = await manager.generateAndStorePreKeys();
    expect(second.preKeysAdded).toBe(0);
    const stats = await manager.getStats();
    expect(stats.preKeyCount).toBe(100);
  }, 30000);

  it('produces a valid PreKeyBundle', async () => {
    await manager.generateAndStorePreKeys();
    const bundle = await manager.getMyPreKeyBundle();
    expect(bundle.registrationId).toBe(1234);
    expect(bundle.deviceId).toBe(1);
    expect(bundle.preKeyId).toBeGreaterThan(0);
    expect(bundle.preKey).toMatch(/^[0-9a-f]+$/);
    expect(bundle.signedPreKey).toMatch(/^[0-9a-f]+$/);
    expect(bundle.identityKey).toBe('a'.repeat(64));
  }, 30000);

  it('throws when identity is missing', async () => {
    await SessionStore.clearAll();
    const fresh = new SignalStorage();
    const emptyManager = new PreKeyManager(fresh);
    await expect(emptyManager.generateAndStorePreKeys()).rejects.toThrow(/Identity/);
  });

  it('getMyPreKeyBundle throws before generation', async () => {
    const fresh = new SignalStorage();
    const m = new PreKeyManager(fresh);
    await expect(m.getMyPreKeyBundle()).rejects.toThrow();
  });
});
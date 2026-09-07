// Integration test for libsignal v6.0.0
import { SignalStorage } from '../src/crypto/signal/SignalStorage';
import { SessionStore } from '../src/crypto/signal/SessionStore';

describe('libsignal integration', () => {
  let storage: SignalStorage;
  beforeEach(async () => {
    await SessionStore.clearAll();
    storage = new SignalStorage();
  });

  it('storage has libsignal-compatible API', () => {
    expect(typeof storage.getOurRegistrationId).toBe('function');
    expect(typeof storage.getOurIdentity).toBe('function');
    expect(typeof storage.loadSignedPreKey).toBe('function');
    expect(typeof storage.loadPreKey).toBe('function');
    expect(typeof storage.loadSession).toBe('function');
    expect(typeof storage.storeSession).toBe('function');
    expect(typeof storage.isTrustedIdentity).toBe('function');
  });

  it('loadPreKey returns undefined for missing key', async () => {
    const k = await storage.loadPreKey(99999);
    expect(k).toBeUndefined();
  });

  it('getOurIdentity throws if not initialized', () => {
    expect(() => storage.getOurIdentity()).toThrow();
  });

  it('loadSignedPreKey throws if not initialized', () => {
    expect(() => storage.loadSignedPreKey()).toThrow();
  });

  it('isTrustedIdentity returns true (TOFU)', () => {
    const result = storage.isTrustedIdentity('test', new Uint8Array(32), 0);
    expect(result).toBe(true);
  });
});
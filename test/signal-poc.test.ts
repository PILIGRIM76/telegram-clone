// Phase 1: Signal Protocol types and SessionStore API surface.
// (Full integration tests will be added once @signalapp/libsignal-client
// is wired into SessionStore in a follow-up step.)
import { SessionStore } from '../src/crypto/signal/SessionStore';
import type {
  PreKeyBundle,
  StoredSession,
  StoredPreKey,
  StoredSignedPreKey,
  StoredKyberPreKey,
  StoredIdentityKeyPair,
  SignalEnvelope,
  EncryptedSignalMessage,
  SignalConfig,
} from '../src/crypto/signal/types';
import {
  DEFAULT_SIGNAL_CONFIG,
  generateDeviceId,
  bytesToHex,
  hexToBytes,
  SessionStatus,
} from '../src/crypto/signal/types';

describe('Signal Protocol types', () => {
  it('DEFAULT_SIGNAL_CONFIG has expected defaults', () => {
    expect(DEFAULT_SIGNAL_CONFIG.preKeyCount).toBe(100);
    expect(DEFAULT_SIGNAL_CONFIG.preKeyMinCount).toBe(20);
    expect(DEFAULT_SIGNAL_CONFIG.useKyber).toBe(true);
  });

  it('generateDeviceId returns a number in valid range', () => {
    for (let i = 0; i < 20; i++) {
      const id = generateDeviceId();
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(65536);
    }
  });

  it('bytesToHex and hexToBytes round-trip', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe('deadbeef00ff');
    const back = hexToBytes(hex);
    expect(Array.from(back)).toEqual(Array.from(bytes));
  });

  it('SessionStatus enum has expected values', () => {
    expect(SessionStatus.NONE).toBe('none');
    expect(SessionStatus.ACTIVE).toBe('active');
    expect(SessionStatus.NEEDS_REFRESH).toBe('needs_refresh');
    expect(SessionStatus.CORRUPTED).toBe('corrupted');
  });
});

describe('Signal Protocol SessionStore API', () => {
  it('exposes all required methods', () => {
    // Sessions
    expect(typeof SessionStore.saveSession).toBe('function');
    expect(typeof SessionStore.loadSession).toBe('function');
    expect(typeof SessionStore.deleteSession).toBe('function');
    expect(typeof SessionStore.listSessions).toBe('function');
    expect(typeof SessionStore.hasSession).toBe('function');

    // Pre-keys
    expect(typeof SessionStore.savePreKey).toBe('function');
    expect(typeof SessionStore.getPreKey).toBe('function');
    expect(typeof SessionStore.listPreKeys).toBe('function');
    expect(typeof SessionStore.deletePreKey).toBe('function');
    expect(typeof SessionStore.countPreKeys).toBe('function');

    // Signed pre-keys
    expect(typeof SessionStore.saveSignedPreKey).toBe('function');
    expect(typeof SessionStore.getSignedPreKey).toBe('function');
    expect(typeof SessionStore.listSignedPreKeys).toBe('function');

    // Kyber pre-keys
    expect(typeof SessionStore.saveKyberPreKey).toBe('function');
    expect(typeof SessionStore.getKyberPreKey).toBe('function');
    expect(typeof SessionStore.listKyberPreKeys).toBe('function');

    // Identity
    expect(typeof SessionStore.saveIdentityKeyPair).toBe('function');
    expect(typeof SessionStore.loadIdentityKeyPair).toBe('function');

    // Maintenance
    expect(typeof SessionStore.clearAll).toBe('function');
    expect(typeof SessionStore.getStats).toBe('function');
  });
});
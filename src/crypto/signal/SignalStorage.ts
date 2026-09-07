// SignalStorage adapter for libsignal backed by IndexedDB
import type { SignalStorage as LibSignalStorage, E2ESession } from 'libsignal';
import { ProtocolAddress, SessionRecord } from 'libsignal';
import { SessionStore } from './SessionStore';
import type { StoredIdentityKeyPair } from './types';

export class SignalStorage implements LibSignalStorage {
  private registrationId: number | null = null;
  private identityKey: { privKey: Buffer; pubKey: Buffer } | null = null;
  private signedPreKey: { privKey: Buffer; pubKey: Buffer } | null = null;
  private sessionCache = new Map<string, SessionRecord>();
  private preKeyCache = new Map<number, { privKey: Buffer; pubKey: Buffer }>();

  getOurRegistrationId(): number {
    if (this.registrationId !== null) return this.registrationId;
    const cached = localStorage.getItem('piligrim-signal-registration-id');
    if (cached) {
      this.registrationId = Number(cached);
      return this.registrationId;
    }
    this.registrationId = Math.floor(Math.random() * 16383) + 1;
    localStorage.setItem('piligrim-signal-registration-id', String(this.registrationId));
    return this.registrationId;
  }

  async setRegistrationId(id: number): Promise<void> {
    this.registrationId = id;
    localStorage.setItem('piligrim-signal-registration-id', String(id));
  }

  getOurIdentity(): { privKey: Buffer; pubKey: Buffer } {
    if (this.identityKey) return this.identityKey;
    throw new Error('Identity key not initialized. Call setIdentityKeyPair first.');
  }

  async setIdentityKeyPair(kp: StoredIdentityKeyPair): Promise<void> {
    await SessionStore.saveIdentityKeyPair(kp);
    this.identityKey = {
      privKey: Buffer.from(kp.privateKey, 'hex'),
      pubKey: Buffer.from(kp.publicKey, 'hex'),
    };
  }

  async warmCacheFromStorage(): Promise<void> {
    const id = await SessionStore.loadIdentityKeyPair();
    if (id && !this.identityKey) {
      this.identityKey = {
        privKey: Buffer.from(id.privateKey, 'hex'),
        pubKey: Buffer.from(id.publicKey, 'hex'),
      };
    }
    const all = await SessionStore.listSignedPreKeys();
    if (all.length > 0 && !this.signedPreKey) {
      const latest = all.sort((a, b) => b.id - a.id)[0];
      this.signedPreKey = {
        privKey: Buffer.from(latest.privateKey, 'hex'),
        pubKey: Buffer.from(latest.publicKey, 'hex'),
      };
    }
    const preKeys = await SessionStore.listPreKeys();
    for (const pk of preKeys) {
      if (!this.preKeyCache.has(pk.id)) {
        this.preKeyCache.set(pk.id, {
          privKey: Buffer.from(pk.privateKey, 'hex'),
          pubKey: Buffer.from(pk.publicKey, 'hex'),
        });
      }
    }
  }

  loadSignedPreKey(): { privKey: Buffer; pubKey: Buffer } {
    if (this.signedPreKey) return this.signedPreKey;
    throw new Error('No signed pre-key available. Call setSignedPreKey first.');
  }

  async setSignedPreKey(id: number, keyPair: { privKey: Buffer; pubKey: Buffer }, signature: Buffer): Promise<void> {
    await SessionStore.saveSignedPreKey({
      id,
      publicKey: keyPair.pubKey.toString('hex'),
      privateKey: keyPair.privKey.toString('hex'),
      signature: signature.toString('hex'),
      createdAt: Date.now(),
    });
    this.signedPreKey = keyPair;
  }

  async loadSession(id: string): Promise<SessionRecord | null | undefined> {
    if (this.sessionCache.has(id)) return this.sessionCache.get(id)!;
    const [uid, deviceIdStr] = id.split('.');
    const deviceId = Number(deviceIdStr);
    const stored = await SessionStore.loadSession(uid, deviceId);
    if (!stored) return null;
    const bytes = new Uint8Array(
      stored.serializedSession.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
    );
    const record = SessionRecord.deserialize(bytes);
    this.sessionCache.set(id, record);
    return record;
  }

  async storeSession(id: string, session: SessionRecord): Promise<void> {
    this.sessionCache.set(id, session);
    const serialized = session.serialize();
    const hex = Array.from(serialized).map((b) => b.toString(16).padStart(2, '0')).join('');
    const [uid, deviceIdStr] = id.split('.');
    const deviceId = Number(deviceIdStr);
    await SessionStore.saveSession({
      sessionKey: `${uid}:${deviceId}`,
      uid,
      deviceId,
      serializedSession: hex,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
  }

  isTrustedIdentity(
    _identifier: string,
    _identityKey: Uint8Array,
    _direction: number
  ): boolean {
    return true;
  }

  async loadPreKey(id: number | string): Promise<{ privKey: Buffer; pubKey: Buffer } | undefined> {
    const numId = typeof id === 'string' ? Number(id) : id;
    if (this.preKeyCache.has(numId)) return this.preKeyCache.get(numId)!;
    const stored = await SessionStore.getPreKey(numId);
    if (!stored) return undefined;
    const kp = {
      privKey: Buffer.from(stored.privateKey, 'hex'),
      pubKey: Buffer.from(stored.publicKey, 'hex'),
    };
    this.preKeyCache.set(numId, kp);
    return kp;
  }

  removePreKey(id: number): void {
    this.preKeyCache.delete(id);
    SessionStore.deletePreKey(id).catch(() => {});
  }

  async getNextPreKeyId(): Promise<number> {
    const all = await SessionStore.listPreKeys();
    if (all.length === 0) return 1;
    return Math.max(...all.map((k) => k.id)) + 1;
  }

  async hasPreKey(id: number): Promise<boolean> {
    const k = await SessionStore.getPreKey(id);
    return k !== undefined;
  }
}
// PreKeyManager: generates and stores 100 pre-keys + 1 signed pre-key.
// Phase 1: Perfect Forward Secrecy via Signal Protocol Double Ratchet.
//
// Note on libsignal v6.0.0 API: this package does not export KeyHelper
// (the older libsignal-protocol-javascript did). Pre-key generation here
// uses Web Crypto P-256 key pairs as a portable stand-in so the storage
// layer can be exercised in both browser and Node test environments.
// In production, swap generateIdentityKeyPair for a libsignal-native
// or WASM build that produces Curve25519 pre-keys.
import { SignalStorage } from './SignalStorage';
import { SessionStore } from './SessionStore';
import type { PreKeyBundle, StoredPreKey, StoredSignedPreKey } from './types';

export class PreKeyManager {
  private storage: SignalStorage;
  readonly PRE_KEY_COUNT = 100;
  readonly SIGNED_PRE_KEY_ID = 1;

  constructor(storage: SignalStorage) {
    this.storage = storage;
  }

  async generateAndStorePreKeys(): Promise<{ preKeysAdded: number; signedPreKeyId: number }> {
    const identity = this.storage.getOurIdentity();
    if (!identity) throw new Error('Identity key pair not found. Call setIdentityKeyPair first.');
    let regId = this.storage.getOurRegistrationId();
    if (!regId) {
      regId = Math.floor(Math.random() * 16380) + 1;
      await this.storage.setRegistrationId(regId);
    }
    const existing = await SessionStore.listPreKeys();
    const existingIds = existing.map((k) => k.id);
    const startId = existing.length === 0 ? 1 : (existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1);
    const toGenerate = this.PRE_KEY_COUNT - existing.length;
    let preKeysAdded = 0;
    for (let i = 0; i < toGenerate; i++) {
      const id = startId + i;
      const kp = await this.generateIdentityKeyPair();
      const record: StoredPreKey = {
        id, publicKey: kp.publicKey, privateKey: kp.privateKey, createdAt: Date.now()
      };
      await SessionStore.savePreKey(record);
      this.storage['preKeyCache'].set(id, {
        privKey: Buffer.from(kp.privateKey, 'hex'),
        pubKey: Buffer.from(kp.publicKey, 'hex'),
      });
      preKeysAdded++;
    }
    const allSigned = await SessionStore.listSignedPreKeys();
    if (allSigned.length === 0) {
      const kp = await this.generateIdentityKeyPair();
      const kpPubKey = Buffer.from(kp.publicKey, 'hex');
      const sig = await this.signWithIdentity(identity.privKey, kpPubKey);
      const record: StoredSignedPreKey = {
        id: this.SIGNED_PRE_KEY_ID,
        publicKey: kp.publicKey,
        privateKey: kp.privateKey,
        signature: sig.toString('hex'),
        createdAt: Date.now(),
      };
      await SessionStore.saveSignedPreKey(record);
      await this.storage.setSignedPreKey(this.SIGNED_PRE_KEY_ID, {
        privKey: Buffer.from(kp.privateKey, 'hex'),
        pubKey: Buffer.from(kp.publicKey, 'hex'),
      }, Buffer.from(sig));
    }
    await this.storage.warmCacheFromStorage();
    console.log(`[SIGNAL] PreKeyManager: ${preKeysAdded} new pre-keys + signed pre-key ready`);
    return { preKeysAdded, signedPreKeyId: this.SIGNED_PRE_KEY_ID };
  }

  async getMyPreKeyBundle(): Promise<PreKeyBundle> {
    const regId = this.storage.getOurRegistrationId();
    if (!regId) throw new Error('No registration ID. Call generateAndStorePreKeys first.');
    const identity = this.storage.getOurIdentity();
    if (!identity) throw new Error('No identity key. Call generateAndStorePreKeys first.');
    const signed = this.storage.loadSignedPreKey();
    const preKeys = await SessionStore.listPreKeys();
    if (preKeys.length === 0) throw new Error('No pre-keys available.');
    preKeys.sort((a, b) => a.id - b.id);
    const preKey = preKeys[0];
    return {
      registrationId: regId,
      deviceId: 1,
      preKeyId: preKey.id,
      preKey: preKey.publicKey,
      signedPreKeyId: this.SIGNED_PRE_KEY_ID,
      signedPreKey: signed.pubKey.toString('hex'),
      signature: (await SessionStore.getSignedPreKey(this.SIGNED_PRE_KEY_ID))?.signature ?? '',
      identityKey: identity.pubKey.toString('hex'),
    };
  }

  async consumePreKey(id: number): Promise<void> {
    this.storage.removePreKey(id);
  }

  async getStats() {
    const preKeys = await SessionStore.listPreKeys();
    const signed = await SessionStore.listSignedPreKeys();
    return { preKeyCount: preKeys.length, signedPreKeyCount: signed.length };
  }

  private async generateIdentityKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
    );
    const pub = await crypto.subtle.exportKey('raw', kp.publicKey);
    const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    return {
      publicKey: Buffer.from(pub).toString('hex'),
      privateKey: Buffer.from(priv).toString('hex'),
    };
  }

  private async signWithIdentity(_identityPrivKey: Buffer, _dataToSign: Buffer): Promise<Buffer> {
    // Production: Ed25519 over (identityKey || signedPreKey).
    // Phase 1: deterministic SHA-256 placeholder so tests can verify the flow.
    const bytes = new Uint8Array(_dataToSign.length);
    for (let i = 0; i < _dataToSign.length; i++) bytes[i] = _dataToSign[i];
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Buffer.from(hash);
  }
}
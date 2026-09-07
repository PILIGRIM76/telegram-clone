// Signal Protocol Manager (Phase 1: PFS via Double Ratchet)
import {
  ProtocolAddress,
  SessionBuilder,
  SessionCipher,
  type E2ESession,
} from 'libsignal';
import { SignalStorage } from './SignalStorage';
import { SessionStore } from './SessionStore';
import type { PreKeyBundle, EncryptedSignalMessage, SignalConfig } from './types';
import { DEFAULT_SIGNAL_CONFIG, generateDeviceId } from './types';

export interface PreKeyGenerationResult {
  identityKey: { publicKey: string; privateKey: string };
  registrationId: number;
  preKeys: { id: number; publicKey: string; privateKey: string }[];
  signedPreKey: { id: number; publicKey: string; privateKey: string; signature: string };
}

export class SignalProtocolManager {
  private storage: SignalStorage;
  private deviceId: number;
  private config: SignalConfig;

  constructor(deviceId?: number, config?: Partial<SignalConfig>) {
    this.deviceId = deviceId ?? generateDeviceId();
    this.config = { ...DEFAULT_SIGNAL_CONFIG, ...config };
    this.storage = new SignalStorage();
  }

  async initialize(): Promise<PreKeyGenerationResult> {
    let identity = await SessionStore.loadIdentityKeyPair();
    if (!identity) identity = await this.generateIdentityKeyPair();
    await this.storage.setIdentityKeyPair(identity);
    let regId = await this.storage.getOurRegistrationId();
    if (!regId) {
      regId = Math.floor(Math.random() * 16383) + 1;
      await this.storage.setRegistrationId(regId);
    }
    let preKeys = await SessionStore.listPreKeys();
    if (preKeys.length < this.config.preKeyMinCount) {
      await this.generatePreKeys(this.config.preKeyCount - preKeys.length);
      preKeys = await SessionStore.listPreKeys();
    }
    await this.storage.warmCacheFromStorage();
    const allSigned = await SessionStore.listSignedPreKeys();
    const signed = allSigned.sort((a, b) => b.id - a.id)[0];
    return {
      identityKey: identity,
      registrationId: regId,
      preKeys,
      signedPreKey: signed
        ? { id: signed.id, publicKey: signed.publicKey, privateKey: signed.privateKey, signature: signed.signature }
        : { id: 0, publicKey: '', privateKey: '', signature: '' },
    };
  }

  async hasSession(remoteUid: string, remoteDeviceId: number): Promise<boolean> {
    const r = await this.storage.loadSession(`${remoteUid}.${remoteDeviceId}`);
    return !!r && r.haveOpenSession();
  }

  async deleteSession(remoteUid: string, remoteDeviceId: number): Promise<void> {
    await SessionStore.deleteSession(remoteUid, remoteDeviceId);
  }

  async getPublicBundle(): Promise<PreKeyBundle> {
    const identity = this.storage.getOurIdentity();
    const signed = this.storage.loadSignedPreKey();
    const allPreKeys = await SessionStore.listPreKeys();
    if (allPreKeys.length === 0) throw new Error('No pre-keys available');
    const preKey = allPreKeys[Math.floor(Math.random() * allPreKeys.length)];
    const regId = await this.storage.getOurRegistrationId();
    return {
      registrationId: regId,
      deviceId: this.deviceId,
      preKeyId: preKey.id,
      preKey: preKey.publicKey,
      signedPreKeyId: 1,
      signedPreKey: signed.pubKey.toString('hex'),
      signature: '',
      identityKey: identity.pubKey.toString('hex'),
    };
  }

  async createSession(remoteUid: string, remoteDeviceId: number, bundle: PreKeyBundle): Promise<void> {
    const remoteAddress = new ProtocolAddress(remoteUid, remoteDeviceId);
    const e2eSession: E2ESession = {
      registrationId: bundle.registrationId,
      identityKey: hexToBytes(bundle.identityKey),
      signedPreKey: {
        keyId: bundle.signedPreKeyId,
        publicKey: hexToBytes(bundle.signedPreKey),
        signature: hexToBytes(bundle.signature),
      },
      preKey: {
        keyId: bundle.preKeyId,
        publicKey: hexToBytes(bundle.preKey),
      },
    };
    const sessionBuilder = new SessionBuilder(this.storage, remoteAddress);
    await sessionBuilder.initOutgoing(e2eSession);
  }

  async encryptMessage(remoteUid: string, remoteDeviceId: number, plaintext: string): Promise<EncryptedSignalMessage> {
    const remoteAddress = new ProtocolAddress(remoteUid, remoteDeviceId);
    const cipher = new SessionCipher(this.storage, remoteAddress);
    const encoded = new TextEncoder().encode(plaintext);
    const result = await cipher.encrypt(encoded);
    return { messageType: result.type, ciphertext: result.body };
  }

  async decryptMessage(remoteUid: string, remoteDeviceId: number, ciphertext: string, type: number): Promise<string> {
    const remoteAddress = new ProtocolAddress(remoteUid, remoteDeviceId);
    const cipher = new SessionCipher(this.storage, remoteAddress);
    const bytes = new Uint8Array(
      ciphertext.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
    );
    let plaintext: Buffer;
    if (type === 3) plaintext = await cipher.decryptPreKeyWhisperMessage(bytes);
    else plaintext = await cipher.decryptWhisperMessage(bytes);
    return new TextDecoder().decode(plaintext);
  }

  private async generateIdentityKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const pub = await crypto.subtle.exportKey('raw', kp.publicKey);
    const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
    return {
      publicKey: bufferToHex(Buffer.from(pub)),
      privateKey: bufferToHex(Buffer.from(priv)),
    };
  }

  private async generatePreKeys(count: number): Promise<void> {
    const startId = (await SessionStore.listPreKeys()).reduce(
      (max, k) => Math.max(max, k.id), 0
    ) + 1;
    for (let i = 0; i < count; i++) {
      const id = startId + i;
      const kp = await this.generateIdentityKeyPair();
      await SessionStore.savePreKey({
        id, publicKey: kp.publicKey, privateKey: kp.privateKey, createdAt: Date.now()
      });
    }
  }
}

function bufferToHex(b: Buffer): string {
  return b.toString('hex');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}
// SignalMessageLayer: hybrid encrypt/decrypt for the WS layer.
// Phase 1: Signal (Double Ratchet) when session exists, NaCl fallback.
import { ProtocolAddress, SessionCipher } from 'libsignal';
import type { PreKeyBundle } from './types';
import { SignalStorage } from './SignalStorage';
import { SessionStore } from './SessionStore';
import { encryptMessage as naclEncrypt, decryptMessage as naclDecrypt } from '../encryption';

export type EncryptionType = 'signal' | 'nacl';

export interface EncryptedPayload {
  type: EncryptionType;
  data: string;
  nonce?: string;
  senderPublicKey?: string;
}

export async function hasSignalSession(remoteUid: string, deviceId = 1): Promise<boolean> {
  const stored = await SessionStore.loadSession(remoteUid, deviceId);
  return !!stored;
}

export async function encryptWithSignal(
  remoteUid: string,
  plaintext: string,
  deviceId = 1
): Promise<EncryptedPayload> {
  const storage = new SignalStorage();
  await storage.warmCacheFromStorage();
  const address = new ProtocolAddress(remoteUid, deviceId);
  const cipher = new SessionCipher(storage, address);
  const bytes = new TextEncoder().encode(plaintext);
  const result = await cipher.encrypt(bytes);
  return { type: 'signal', data: result.body };
}

export async function decryptWithSignal(
  remoteUid: string,
  payload: EncryptedPayload,
  deviceId = 1
): Promise<string> {
  const storage = new SignalStorage();
  await storage.warmCacheFromStorage();
  const address = new ProtocolAddress(remoteUid, deviceId);
  const cipher = new SessionCipher(storage, address);
  const bytes = new Uint8Array(
    payload.data.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  const plaintext = await cipher.decryptWhisperMessage(bytes);
  return new TextDecoder().decode(plaintext);
}

export async function hybridEncrypt(
  remoteUid: string,
  plaintext: string,
  mySecretKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  deviceId = 1
): Promise<EncryptedPayload> {
  if (await hasSignalSession(remoteUid, deviceId)) {
    try {
      return await encryptWithSignal(remoteUid, plaintext, deviceId);
    } catch (e) {
      console.warn('[SignalMessageLayer] Signal encrypt failed, falling back to NaCl', e);
    }
  }
  const enc = naclEncrypt(plaintext, recipientPublicKey, mySecretKey);
  return {
    type: 'nacl',
    data: btoa(String.fromCharCode(...enc.encrypted)),
    nonce: btoa(String.fromCharCode(...enc.nonce)),
  };
}

export async function hybridDecrypt(
  remoteUid: string,
  payload: EncryptedPayload,
  mySecretKey: Uint8Array,
  senderPublicKey: Uint8Array,
  deviceId = 1
): Promise<string> {
  if (payload.type === 'signal') {
    return await decryptWithSignal(remoteUid, payload, deviceId);
  }
  const ciphertext = atob(payload.data);
  const nonce = atob(payload.nonce || '');
  const ct = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) ct[i] = ciphertext.charCodeAt(i);
  const nn = new Uint8Array(nonce.length);
  for (let i = 0; i < nonce.length; i++) nn[i] = nonce.charCodeAt(i);
  return naclDecrypt(ct, nn, mySecretKey, senderPublicKey);
}

export function bundleToPreKeyBundle(input: any): PreKeyBundle {
  return {
    registrationId: input.registrationId,
    deviceId: input.deviceId ?? 1,
    preKeyId: input.preKeyId,
    preKey: input.preKey,
    signedPreKeyId: input.signedPreKeyId,
    signedPreKey: input.signedPreKey,
    signature: input.signature,
    identityKey: input.identityKey,
  };
}
// ============================================
// Signal Protocol Types for PILIGRIM
// ============================================
// Phase 1: Perfect Forward Secrecy migration
// Based on @signalapp/libsignal-client v0.102.0
// ============================================

/**
 * Pre-key bundle received from a remote user.
 * Used to establish a new Double Ratchet session.
 */
export interface PreKeyBundle {
  registrationId: number;
  deviceId: number;
  preKeyId: number;
  preKey: string;
  signedPreKeyId: number;
  signedPreKey: string;
  signature: string;
  identityKey: string;
  kyberPreKeyId?: number;
  kyberPreKey?: string;
  kyberPreKeySignature?: string;
}

export interface StoredPreKey {
  id: number;
  publicKey: string;
  privateKey: string;
  createdAt: number;
}

export interface StoredSignedPreKey {
  id: number;
  publicKey: string;
  privateKey: string;
  signature: string;
  createdAt: number;
  rotated?: boolean;
}

export interface StoredKyberPreKey {
  id: number;
  publicKey: string;
  privateKey: string;
  signature: string;
  createdAt: number;
}

export interface StoredIdentityKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface StoredSession {
  /** Composite key: `${uid}:${deviceId}` */
  sessionKey: string;
  uid: string;
  deviceId: number;
  serializedSession: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface SignalEnvelope {
  from: string;
  deviceId: number;
  to: string;
  type: number;
  ciphertext: string;
  timestamp: number;
}

export interface EncryptedSignalMessage {
  messageType: number;
  ciphertext: string;
}

export enum SessionStatus {
  NONE = 'none',
  ACTIVE = 'active',
  NEEDS_REFRESH = 'needs_refresh',
  CORRUPTED = 'corrupted',
}

export interface SignalConfig {
  preKeyCount: number;
  preKeyMinCount: number;
  signedPreKeyRotationMs: number;
  kyberPreKeyRotationMs: number;
  useKyber: boolean;
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  preKeyCount: 100,
  preKeyMinCount: 20,
  signedPreKeyRotationMs: 30 * 24 * 60 * 60 * 1000,
  kyberPreKeyRotationMs: 7 * 24 * 60 * 60 * 1000,
  useKyber: true,
};

export function generateDeviceId(): number {
  return Math.floor(Math.random() * 65536);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
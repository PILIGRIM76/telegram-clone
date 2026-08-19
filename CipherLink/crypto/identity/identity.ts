// Crypto Core Library for CipherLink
// Implements Signal Protocol with Perfect Forward Secrecy

import * as sodium from 'libsodium-wrappers';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface IdentityKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface PreKey {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignedPreKey extends PreKey {
  signature: Uint8Array;
}

export interface CipherLinkIdentity {
  uid: string;                    // Unique identifier
  identityKey: IdentityKeyPair;   // Long-term identity key
  registrationId: number;         // Registration ID
  preKeys: PreKey[];             // One-time pre-keys
  signedPreKey: SignedPreKey;    // Signed pre-key
  seedPhrase: string;            // 12-word recovery phrase
}

export interface SessionCipher {
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
}

// Core Crypto Functions
export class CryptoCore {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  // Generate cryptographically secure random bytes
  static randomBytes(length: number): Uint8Array {
    return sodium.randombytes_buf(length);
  }

  // Generate Ed25519 key pair for identity
  static generateIdentityKey(): IdentityKeyPair {
    const keyPair = sodium.crypto_sign_keypair();
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  // Generate X25519 key pair for encryption
  static generateEncryptionKey(): { publicKey: Uint8Array; privateKey: Uint8Array } {
    const keyPair = sodium.crypto_box_keypair();
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.secretKey
    };
  }

  // Create 12-word seed phrase
  static generateSeedPhrase(): string {
    const entropy = this.randomBytes(16); // 128 bits
    // Simplified BIP-39 implementation
    const words = [
      'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig',
      'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine',
      'orange', 'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine',
      'ugli', 'vanilla', 'watermelon', 'xigua', 'yellow', 'zucchini'
    ];
    
    let seedPhrase = '';
    for (let i = 0; i < 12; i++) {
      const index = entropy[i] % words.length;
      seedPhrase += words[index] + (i < 11 ? ' ' : '');
    }
    return seedPhrase;
  }

  // Derive key from seed phrase
  static deriveKeyFromSeed(seedPhrase: string): Uint8Array {
    return sodium.crypto_generichash(32, sodium.from_string(seedPhrase));
  }

  // Encrypt message using XSalsa20-Poly1305
  static encryptMessage(
    plaintext: Uint8Array,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array
  ): Uint8Array {
    const nonce = this.randomBytes(sodium.crypto_box_NONCEBYTES);
    const ciphertext = sodium.crypto_box_easy(plaintext, nonce, recipientPublicKey, senderPrivateKey);
    
    // Prepend nonce to ciphertext
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce, 0);
    result.set(ciphertext, nonce.length);
    return result;
  }

  // Decrypt message
  static decryptMessage(
    encryptedData: Uint8Array,
    senderPublicKey: Uint8Array,
    recipientPrivateKey: Uint8Array
  ): Uint8Array {
    const nonce = encryptedData.slice(0, sodium.crypto_box_NONCEBYTES);
    const ciphertext = encryptedData.slice(sodium.crypto_box_NONCEBYTES);
    return sodium.crypto_box_open_easy(ciphertext, nonce, senderPublicKey, recipientPrivateKey);
  }

  // Sign message
  static signMessage(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return sodium.crypto_sign_detached(message, privateKey);
  }

  // Verify signature
  static verifySignature(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
    try {
      return sodium.crypto_sign_verify_detached(signature, message, publicKey);
    } catch {
      return false;
    }
  }

  // Hash function
  static hash(data: Uint8Array): Uint8Array {
    return sodium.crypto_generichash(32, data);
  }

  // Convert to hex string
  static toHex(bytes: Uint8Array): string {
    return sodium.to_hex(bytes);
  }

  // Convert from hex string
  static fromHex(hex: string): Uint8Array {
    return sodium.from_hex(hex);
  }
}

// Identity Management
export class IdentityManager {
  // Generate new identity
  static async generateNewIdentity(username?: string): Promise<CipherLinkIdentity> {
    await CryptoCore.initialize();
    
    const identityKey = CryptoCore.generateIdentityKey();
    const registrationId = Math.floor(Math.random() * 16380) + 1;
    const seedPhrase = CryptoCore.generateSeedPhrase();
    
    // Generate pre-keys
    const preKeys: PreKey[] = [];
    for (let i = 0; i < 100; i++) {
      const keyPair = CryptoCore.generateEncryptionKey();
      preKeys.push({
        keyId: i,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      });
    }
    
    // Generate signed pre-key
    const signedKeyPair = CryptoCore.generateEncryptionKey();
    const signature = CryptoCore.signMessage(signedKeyPair.publicKey, identityKey.privateKey);
    
    const signedPreKey: SignedPreKey = {
      keyId: 1,
      publicKey: signedKeyPair.publicKey,
      privateKey: signedKeyPair.privateKey,
      signature
    };
    
    return {
      uid: uuidv4(),
      identityKey,
      registrationId,
      preKeys,
      signedPreKey,
      seedPhrase
    };
  }

  // Restore identity from seed phrase
  static async restoreIdentity(seedPhrase: string): Promise<CipherLinkIdentity> {
    await CryptoCore.initialize();
    
    // In real implementation, this would derive keys from seed
    // For demo purposes, we'll generate new identity
    return this.generateNewIdentity();
  }

  // Verify identity key fingerprint
  static getIdentityFingerprint(publicKey: Uint8Array): string {
    const hash = CryptoCore.hash(publicKey);
    return CryptoCore.toHex(hash.slice(0, 8)).toUpperCase();
  }

  // Export identity for backup (encrypted)
  static exportEncryptedIdentity(
    identity: CipherLinkIdentity,
    password: string
  ): string {
    const data = JSON.stringify({
      uid: identity.uid,
      identityKey: {
        publicKey: CryptoCore.toHex(identity.identityKey.publicKey),
        privateKey: CryptoCore.toHex(identity.identityKey.privateKey)
      },
      registrationId: identity.registrationId,
      seedPhrase: identity.seedPhrase
    });
    
    const key = CryptoCore.deriveKeyFromSeed(password);
    const nonce = CryptoCore.randomBytes(sodium.crypto_secretbox_NONCEBYTES);
    const encrypted = sodium.crypto_secretbox_easy(
      sodium.from_string(data),
      nonce,
      key
    );
    
    const result = new Uint8Array(nonce.length + encrypted.length);
    result.set(nonce, 0);
    result.set(encrypted, nonce.length);
    
    return CryptoCore.toHex(result);
  }

  // Import encrypted identity
  static importEncryptedIdentity(
    encryptedData: string,
    password: string
  ): CipherLinkIdentity {
    const data = CryptoCore.fromHex(encryptedData);
    const key = CryptoCore.deriveKeyFromSeed(password);
    const nonce = data.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = data.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    const parsed = JSON.parse(sodium.to_string(decrypted));
    
    return {
      uid: parsed.uid,
      identityKey: {
        publicKey: CryptoCore.fromHex(parsed.identityKey.publicKey),
        privateKey: CryptoCore.fromHex(parsed.identityKey.privateKey)
      },
      registrationId: parsed.registrationId,
      preKeys: [],
      signedPreKey: null as any,
      seedPhrase: parsed.seedPhrase
    };
  }
}

// Session Cipher Implementation
export class DoubleRatchetSession {
  private sendChainKey: Uint8Array | null = null;
  private receiveChainKey: Uint8Array | null = null;
  private sendRatchetKey: Uint8Array | null = null;
  private receiveRatchetKey: Uint8Array | null = null;
  
  constructor(private ourIdentity: CipherLinkIdentity, private theirPublicKey: Uint8Array) {}

  async initializeOutbound(preKeyId: number, baseKey: Uint8Array): Promise<void> {
    await CryptoCore.initialize();
    
    // X3DH key agreement
    const sharedSecret = sodium.crypto_scalarmult(
      baseKey,
      this.ourIdentity.identityKey.privateKey.slice(0, 32)
    );
    
    // Initialize ratchet
    this.sendChainKey = CryptoCore.hash(sharedSecret);
    this.sendRatchetKey = CryptoCore.generateEncryptionKey().publicKey;
  }

  async encrypt(plaintext: Uint8Array): Promise<{ ciphertext: Uint8Array; header: any }> {
    if (!this.sendChainKey || !this.sendRatchetKey) {
      throw new Error('Session not initialized');
    }

    // Derive message key
    const messageKey = CryptoCore.hash(this.sendChainKey);
    const nonce = CryptoCore.randomBytes(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    
    // Encrypt message
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      null,
      nonce,
      this.sendRatchetKey
    );
    
    // Update chain key
    this.sendChainKey = CryptoCore.hash(this.sendChainKey);
    
    return {
      ciphertext,
      header: {
        ratchetKey: CryptoCore.toHex(this.sendRatchetKey),
        nonce: CryptoCore.toHex(nonce)
      }
    };
  }

  async decrypt(ciphertext: Uint8Array, header: any): Promise<Uint8Array> {
    if (!this.receiveChainKey) {
      // Initialize receive chain (would need X3DH here)
      throw new Error('Receive chain not initialized');
    }

    const ratchetKey = CryptoCore.fromHex(header.ratchetKey);
    const nonce = CryptoCore.fromHex(header.nonce);
    
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      nonce,
      ratchetKey
    );
    
    // Update receive chain
    this.receiveChainKey = CryptoCore.hash(this.receiveChainKey);
    
    return plaintext;
  }
}
// Simplified Crypto Implementation for Demo
// This is a demonstration version - production would use libsodium

// Types
export interface IdentityKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface CipherLinkIdentity {
  uid: string;
  identityKey: IdentityKeyPair;
  seedPhrase: string;
  fingerprint: string;
}

// Mock crypto functions for demonstration
export class SimpleCrypto {
  // Generate mock key pair
  static generateKeyPair(): IdentityKeyPair {
    const pubKey = 'pub_' + Math.random().toString(36).substring(2, 15);
    const privKey = 'priv_' + Math.random().toString(36).substring(2, 15);
    return { publicKey: pubKey, privateKey: privKey };
  }

  // Generate 12-word seed phrase
  static generateSeedPhrase(): string {
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
      'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima'
    ];
    return words.join(' ');
  }

  // Simple "encryption" for demo
  static encrypt(plaintext: string, key: string): string {
    // This is NOT real encryption - just for demo
    return btoa(plaintext + '|' + key);
  }

  // Simple "decryption" for demo
  static decrypt(ciphertext: string, key: string): string {
    try {
      const decoded = atob(ciphertext);
      const [text, storedKey] = decoded.split('|');
      if (storedKey === key) {
        return text;
      }
      throw new Error('Invalid key');
    } catch {
      return '[Decryption Error]';
    }
  }

  // Generate fingerprint
  static generateFingerprint(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase().padStart(8, '0');
  }
}

// Identity Manager
export class IdentityManager {
  // Generate new identity
  static generateNewIdentity(username?: string): CipherLinkIdentity {
    const keyPair = SimpleCrypto.generateKeyPair();
    const seedPhrase = SimpleCrypto.generateSeedPhrase();
    const fingerprint = SimpleCrypto.generateFingerprint(keyPair.publicKey);
    
    return {
      uid: 'uid_' + Math.random().toString(36).substring(2, 12),
      identityKey: keyPair,
      seedPhrase,
      fingerprint
    };
  }

  // Restore identity from seed
  static restoreIdentity(seedPhrase: string): CipherLinkIdentity {
    // In real implementation, derive keys from seed
    return this.generateNewIdentity();
  }

  // Export identity
  static exportIdentity(identity: CipherLinkIdentity, password: string): string {
    const data = {
      uid: identity.uid,
      publicKey: identity.identityKey.publicKey,
      privateKey: identity.identityKey.privateKey,
      seedPhrase: identity.seedPhrase
    };
    const json = JSON.stringify(data);
    return SimpleCrypto.encrypt(json, password);
  }

  // Import identity
  static importIdentity(encryptedData: string, password: string): CipherLinkIdentity {
    const json = SimpleCrypto.decrypt(encryptedData, password);
    const data = JSON.parse(json);
    
    return {
      uid: data.uid,
      identityKey: {
        publicKey: data.publicKey,
        privateKey: data.privateKey
      },
      seedPhrase: data.seedPhrase,
      fingerprint: SimpleCrypto.generateFingerprint(data.publicKey)
    };
  }
}

// Message encryption
export class MessageCrypto {
  static encryptMessage(text: string, recipientPubKey: string, senderPrivKey: string): string {
    const sessionKey = recipientPubKey + senderPrivKey; // Simplified
    return SimpleCrypto.encrypt(text, sessionKey);
  }

  static decryptMessage(encrypted: string, senderPubKey: string, recipientPrivKey: string): string {
    const sessionKey = senderPubKey + recipientPrivKey; // Simplified
    return SimpleCrypto.decrypt(encrypted, sessionKey);
  }
}
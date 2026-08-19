// Encryption utilities for CipherLink

import * as sodium from 'libsodium-wrappers';
import { CryptoCore } from '../identity/identity';

export class MessageEncryptor {
  static async encryptText(
    plaintext: string,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array
  ): Promise<string> {
    await CryptoCore.initialize();
    
    const textBytes = sodium.from_string(plaintext);
    const encrypted = CryptoCore.encryptMessage(textBytes, recipientPublicKey, senderPrivateKey);
    return CryptoCore.toHex(encrypted);
  }

  static async decryptText(
    encryptedHex: string,
    senderPublicKey: Uint8Array,
    recipientPrivateKey: Uint8Array
  ): Promise<string> {
    await CryptoCore.initialize();
    
    const encrypted = CryptoCore.fromHex(encryptedHex);
    const decrypted = CryptoCore.decryptMessage(encrypted, senderPublicKey, recipientPrivateKey);
    return sodium.to_string(decrypted);
  }

  static async encryptFile(
    fileData: ArrayBuffer,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array
  ): Promise<string> {
    await CryptoCore.initialize();
    
    const fileBytes = new Uint8Array(fileData);
    const encrypted = CryptoCore.encryptMessage(fileBytes, recipientPublicKey, senderPrivateKey);
    return CryptoCore.toHex(encrypted);
  }

  static async decryptFile(
    encryptedHex: string,
    senderPublicKey: Uint8Array,
    recipientPrivateKey: Uint8Array
  ): Promise<ArrayBuffer> {
    await CryptoCore.initialize();
    
    const encrypted = CryptoCore.fromHex(encryptedHex);
    const decrypted = CryptoCore.decryptMessage(encrypted, senderPublicKey, recipientPrivateKey);
    return decrypted.buffer;
  }
}
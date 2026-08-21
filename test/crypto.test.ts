import { generateKeyPair, encryptMessage, decryptMessage } from '../src/crypto/encryption';

describe('Crypto Module (E2EE)', () => {
  let senderKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array };
  let recipientKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array };

  beforeAll(() => {
    senderKeyPair = generateKeyPair();
    recipientKeyPair = generateKeyPair();
  });

  test('should generate valid key pairs', () => {
    expect(senderKeyPair.publicKey).toBeDefined();
    expect(senderKeyPair.secretKey).toBeDefined();
    expect(senderKeyPair.publicKey.length).toBe(32);
    expect(senderKeyPair.secretKey.length).toBe(32);
  });

  test('should encrypt and decrypt a message successfully', () => {
    const originalMessage = 'Hello, secure world!';
    const encrypted = encryptMessage(
      originalMessage,
      recipientKeyPair.publicKey,
      senderKeyPair.secretKey
    );
    expect(encrypted).toBeDefined();
    expect(encrypted.encrypted.length).toBeGreaterThan(0);
    const decrypted = decryptMessage(
      encrypted.encrypted,
      encrypted.nonce,
      recipientKeyPair.secretKey,
      senderKeyPair.publicKey
    );
    expect(decrypted).toBe(originalMessage);
  });

  test('should fail to decrypt with wrong secret key', () => {
    const originalMessage = 'Secret message';
    const encrypted = encryptMessage(
      originalMessage,
      recipientKeyPair.publicKey,
      senderKeyPair.secretKey
    );
    const wrongKeyPair = generateKeyPair();
    expect(() => {
      decryptMessage(
        encrypted.encrypted,
        encrypted.nonce,
        wrongKeyPair.secretKey,
        senderKeyPair.publicKey
      );
    }).toThrow();
  });

  test('should handle empty string', () => {
    const originalMessage = '';
    const encrypted = encryptMessage(
      originalMessage,
      recipientKeyPair.publicKey,
      senderKeyPair.secretKey
    );
    const decrypted = decryptMessage(
      encrypted.encrypted,
      encrypted.nonce,
      recipientKeyPair.secretKey,
      senderKeyPair.publicKey
    );
    expect(decrypted).toBe('');
  });
});
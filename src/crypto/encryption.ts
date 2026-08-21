import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

export function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  return { publicKey: keyPair.publicKey, secretKey: keyPair.secretKey };
}

export function encryptMessage(message: string, recipientPublicKey: Uint8Array, senderSecretKey: Uint8Array): { encrypted: Uint8Array; nonce: Uint8Array } {
  const messageBytes = naclUtil.decodeUTF8(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);
  return { encrypted, nonce };
}

export function decryptMessage(encrypted: Uint8Array, nonce: Uint8Array, recipientSecretKey: Uint8Array, senderPublicKey: Uint8Array): string {
  const decryptedBytes = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);
  if (!decryptedBytes) throw new Error('Failed to decrypt message');
  return naclUtil.encodeUTF8(decryptedBytes);
}

export const cryptoService = { generateKeyPair, encryptMessage, decryptMessage };
export default cryptoService;
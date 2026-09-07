// Phase 2: Шифрование списка участников группы.
// Сервер хранит opaque blob — не знает, кто в группе.
// Расшифровка только у участников группы (на клиенте).

import { encryptAESGCM } from './cryptoService';

/**
 * Генерирует 256-битный групповой ключ (hex string, 64 символа).
 * Используется для шифрования списка участников.
 * Ключ распространяется через Signal-сессии peer-to-peer.
 */
export function generateGroupKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Шифрует список UID участников группы.
 * Возвращает массив зашифрованных строк (по одной на каждого участника).
 *
 * Сервер получает только этот opaque массив — он не может
 * определить состав группы.
 *
 * @param members массив UID участников
 * @param groupKey 256-битный ключ в hex
 * @returns массив зашифрованных строк (JSON с iv+data)
 */
export async function encryptGroupMembers(
  members: string[],
  groupKey: string,
): Promise<string[]> {
  return Promise.all(
    members.map((uid) => encryptAESGCM(uid, groupKey)),
  );
}

/**
 * Расшифровывает список участников группы.
 * Принимает opaque blob с сервера + groupKey (получен через Signal сессию).
 *
 * @param encryptedMembers массив зашифрованных строк
 * @param groupKey 256-битный ключ в hex
 * @returns массив UID участников
 */
export async function decryptGroupMembers(
  encryptedMembers: string[],
  groupKey: string,
): Promise<string[]> {
  const { decryptAESGCM } = await import('./cryptoService');
  const results = await Promise.all(
    encryptedMembers.map(async (encrypted) => {
      try {
        return await decryptAESGCM(encrypted, groupKey);
      } catch (e) {
        console.warn('[groupCrypto] failed to decrypt member, skipping:', e);
        return null;
      }
    }),
  );
  return results.filter((r): r is string => r !== null);
}

/**
 * Шифрует groupKey для отправки конкретному участнику через Signal сессию.
 * Используется при добавлении нового участника.
 *
 * В Phase 2: signal-protocol.sendMessage уже умеет слать через Signal.
 * Здесь мы формируем payload "groupKey:<hex>" для сигнального сообщения.
 */
export function wrapGroupKeyForMember(groupKey: string, _memberUid: string): string {
  // Opaque blob. Получатель расшифрует Signal-сообщение и увидит ключ.
  return JSON.stringify({ type: 'group-key', key: groupKey });
}
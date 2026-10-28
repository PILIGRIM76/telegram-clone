import { logger } from './logger';
// Этап 2: шифрование списка участников группы.
// Сервер хранит зашифрованный блок и не знает состав группы.
// Расшифровка только у участников группы (на клиенте).

import { encryptAESGCM } from './cryptoService';

/** Создаёт случайный 256-битный групповой ключ для шифрования списка участников; ключ передаётся через сессии Signal. */
export function generateGroupKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Шифрует список UID участников группы.
 * Возвращает массив зашифрованных строк (по одной на каждого участника).
 *
 * Сервер получает только этот зашифрованный массив и не может
 * определить состав группы.
 *
 * @param members массив UID участников
 * @param groupKey 256-битный ключ в hex
 * @returns массив зашифрованных строк (JSON с iv+data)
 */
export async function encryptGroupMembers(members: string[], groupKey: string): Promise<string[]> {
  return Promise.all(members.map(uid => encryptAESGCM(uid, groupKey)));
}

/**
 * Расшифровывает список участников с помощью группового ключа, переданного через Signal.
 * @param encryptedMembers зашифрованный список участников
 * @param groupKey 256-битный ключ в hex-формате
 * @returns список UID участников
 */
export async function decryptGroupMembers(
  encryptedMembers: string[],
  groupKey: string
): Promise<string[]> {
  const { decryptAESGCM } = await import('./cryptoService');
  const results = await Promise.all(
    encryptedMembers.map(async encrypted => {
      try {
        return await decryptAESGCM(encrypted, groupKey);
      } catch (e) {
        logger.warn('[groupCrypto] failed to decrypt member, skipping:', e);
        return null;
      }
    })
  );
  return results.filter((r): r is string => r !== null);
}

/**
 * Шифрует groupKey для отправки конкретному участнику через Signal сессию.
 * Используется при добавлении нового участника.
 *
 * Функция signal-protocol.sendMessage отправляет данные через Signal.
 * Здесь формируется содержимое "groupKey:<hex>" для сигнального сообщения.
 */
export function wrapGroupKeyForMember(groupKey: string, _memberUid: string): string {
  // Получатель расшифрует сообщение Signal и получит ключ из зашифрованного блока.
  return JSON.stringify({ type: 'group-key', key: groupKey });
}

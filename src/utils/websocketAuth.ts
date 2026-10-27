import { logger } from '../services/logger';
// Этап 4: формирует URL WebSocket с параметрами автоматической регистрации.
// Передаёт uid и publicKey (JWK в формате base64url) во время рукопожатия,
// чтобы сервер распознал клиента до первого сообщения WebSocket.

/**
 * Минимальный интерфейс identity, нужный для построения auth URL.
 * Не зависит от типа Identity из types.ts — совместим с localStorage payload.
 */
export interface AuthIdentityLike {
  uid: string;
  /** JWK-строка или объект (cryptoService возвращает строку) */
  publicKey?: string | { kty?: string; n?: string; e?: string };
  /** Публичный транспортный ключ NaCl box в base64 для аутентификации WebSocket. */
  transportPublicKey?: string;
}

/**
 * Строит URL WebSocket с параметрами аутентификации.
 * @param baseUrl базовый URL WebSocket, например wss://192.168.100.4:4443
 * @param identity данные identity или null для анонимного подключения
 * @returns URL с параметрами для рукопожатия
 */
export function buildWsAuthUrl(baseUrl: string, identity: AuthIdentityLike | null): string {
  if (!identity || !identity.uid) {
    logger.warn('[PILIGRIM WS] buildWsAuthUrl: no identity, connecting anonymously');
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('uid', identity.uid);

    // Транспортный ключ NaCl box в base64 предпочтительнее открытого ключа identity.
    let pkString: string | undefined = identity.transportPublicKey;
    if (!pkString && identity.publicKey) {
      if (typeof identity.publicKey === 'string') {
        pkString = identity.publicKey;
      } else {
        pkString = JSON.stringify(identity.publicKey);
      }
    }
    if (!pkString) {
      logger.warn('[PILIGRIM WS] buildWsAuthUrl: no publicKey or transportPublicKey in identity');
      return baseUrl;
    }

    // Кодирование base64url безопасно для URL и не содержит символов +, / и =.
    const pkBase64 = btoa(pkString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    url.searchParams.set('pk', pkBase64);
    url.searchParams.set('v', '2.0');
    url.searchParams.set('client', 'piligrim-android');

    return url.toString();
  } catch (error) {
    logger.error('[PILIGRIM WS] buildWsAuthUrl: failed to build auth URL', error);
    return baseUrl;
  }
}

/**
 * Безопасное логирование URL с редактированием pk.
 * Используется в логах вместо прямого вывода authUrl.
 */
export function redactWsUrl(authUrl: string): string {
  return authUrl.replace(/([?&])pk=[^&]+/, '$1pk=<REDACTED>');
}

// v2.0 Stage 4: WebSocket URL builder с auto-register query params.
// Передаёт uid + publicKey (base64url-encoded JWK) на этапе handshake,
// чтобы сервер знал клиента ДО первого WS-сообщения.

/**
 * Минимальный интерфейс identity, нужный для построения auth URL.
 * Не зависит от типа Identity из types.ts — совместим с localStorage payload.
 */
export interface AuthIdentityLike {
  uid: string;
  /** JWK-строка или объект (cryptoService возвращает строку) */
  publicKey: string | { kty?: string; n?: string; e?: string };
}

/**
 * Строит WebSocket URL с auto-register query params.
 * @param baseUrl Базовый WS URL (например, wss://192.168.100.4:4443)
 * @param identity Identity пользователя или null (anonymous connect)
 * @returns URL с query-параметрами для handshake
 */
export function buildWsAuthUrl(
  baseUrl: string,
  identity: AuthIdentityLike | null
): string {
  if (!identity || !identity.uid) {
    console.warn('[PILIGRIM WS] buildWsAuthUrl: no identity, connecting anonymously');
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('uid', identity.uid);

    // publicKey может быть JWK-строкой (как генерирует cryptoService)
    // или объектом (если распарсили из JSON)
    let pkString: string;
    if (typeof identity.publicKey === 'string') {
      pkString = identity.publicKey;
    } else {
      pkString = JSON.stringify(identity.publicKey);
    }

    // base64url encoding: URL-safe (без +, /, =)
    const pkBase64 = btoa(pkString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    url.searchParams.set('pk', pkBase64);
    url.searchParams.set('v', '2.0');
    url.searchParams.set('client', 'piligrim-android');

    return url.toString();
  } catch (error) {
    console.error('[PILIGRIM WS] buildWsAuthUrl: failed to build auth URL', error);
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
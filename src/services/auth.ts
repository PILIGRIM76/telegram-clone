// Browser-safe auth stub (Phase 9.5 fix)
// Оригинальная реализация использовала Node.js crypto (createHmac, randomUUID) —
// это не работает в WebView/Capacitor. Поскольку этот модуль используется только
// для UI-прототипа 2FA (Login/Register/TwoFactorSetup), заменяем на stub-реализацию
// которая работает в браузере. Реальная 2FA-логика будет добавлена позже в
// apiService через backend.

interface UserRecord {
  uid: string;
  email: string;
  password: string;
  secret?: string;
  sessionToken?: string;
}

let users: UserRecord[] = [];

function simpleHash(input: string): string {
  // Browser-safe: используем Web Crypto API через TextEncoder + btoa
  // Не криптографически стойкий, только для совместимости UI.
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function totpBrowser(secret: string, token: string = "1234567890"): string {
  // Простая имитация TOTP (не настоящий RFC 6238, только UI).
  const hash = simpleHash(secret + token);
  return hash.slice(-6).padStart(6, '0');
}

function genUUID(): string {
  // Используем polyfill из src/polyfills/crypto.ts (randomUUID гарантированно есть)
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function authenticateWith2FA(
  email: string,
  password: string,
  totpCode?: string
): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return { success: false, error: "Invalid credentials" };
  if (user.secret && totpCode) {
    const expectedCode = totpBrowser(user.secret);
    if (totpCode !== expectedCode) return { success: false, error: "Invalid 2FA code" };
  }
  const sessionToken = genUUID();
  user.sessionToken = sessionToken;
  return { success: true, user };
}

export async function setup2FA(email: string): Promise<{ secret: string; qrCode: string; manualKey: string }> {
  const secretBase32 = "ABCDEFGHJKLMNPQRSTUVWX";
  const qrCode = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" text-anchor="middle">QR</text></svg>`
  )}`;
  return { secret: secretBase32, qrCode, manualKey: secretBase32 };
}

export function verifyTOTP(secret: string, code: string): boolean {
  const expectedCode = totpBrowser(secret);
  return code === expectedCode;
}

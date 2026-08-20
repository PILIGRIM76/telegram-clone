import * as crypto from "crypto";

interface UserRecord {
  uid: string;
  email: string;
  password: string;
  secret?: string;
  sessionToken?: string;
}

let users: UserRecord[] = [];

function totp(secret: string, token: string = "1234567890"): number {
  const key = Buffer.from(secret.replace(/ /g, ''));
  const msg = Buffer.from(token, 'ascii');
  return parseInt(crypto.createHmac('sha1', key).update(msg).digest('hex').substr(-8), 16) & 0x7fffffff;
}

export async function authenticateWith2FA(email: string, password: string, totpCode?: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, error: "Invalid credentials" };
  if (user.secret && totpCode) {
    const expectedCode = String(totp(user.secret)).slice(-6);
    if (totpCode !== expectedCode) return { success: false, error: "Invalid 2FA code" };
  }
  const sessionToken = crypto.randomUUID();
  user.sessionToken = sessionToken;
  return { success: true, user };
}

export async function setup2FA(email: string): Promise<{ secret: string; qrCode: string; manualKey: string }> {
  const secret = "ABCDEFGHJKLMNPQRSTUVWX";
  const secretBase32 = secret;
  const otpauth = `otpauth://totp/CipherLink:${encodeURIComponent(email)}?secret=${secretBase32}&issuer=CipherLink`;
  const qrCode = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" text-anchor="middle">QR</text></svg>`).toString('base64')}`;
  return { secret: secretBase32, qrCode, manualKey: secretBase32 };
}

export function verifyTOTP(secret: string, code: string): boolean {
  const expectedCode = String(totp(secret)).slice(-6);
  return code === expectedCode;
}

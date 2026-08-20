import type { ServiceResponse, AuthResult } from '../types/common';
import { authenticateWith2FA, setup2FA, verifyTOTP } from './auth';

export { authenticateWith2FA };

export async function authenticate(email: string, password: string, totpCode?: string): Promise<ServiceResponse<AuthResult>> {
    try {
        const result = await authenticateWith2FA(email, password, totpCode);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
    }
}

export function verifyTwoFactorCode(secret: string, code: string): boolean {
    return verifyTOTP(secret, code);
}

export async function initialize2FA(email: string): Promise<{ secret: string; qrCode: string; manualKey: string }> {
    const setup = await setup2FA(email);
    return { secret: setup.secret, qrCode: setup.qrCode, manualKey: setup.manualKey };
}

export function generateSecret(): string {
    return 'ABCDEFGHJKLMNPQRSTUVWX';
}

export function verifyTotp(secret: string, code: string): boolean {
    return verifyTOTP(secret, code);
}

export function generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
}

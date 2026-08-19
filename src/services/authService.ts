// Auth Service for 2FA and authentication

import { authenticator } from 'otplib';

// TOTP configuration
authenticator.options = {
  window: 1,  // Allow 1 time unit before/after
  step: 30,   // 30 second code duration
  epoch: 0,
};

/**
 * Generate a secret key for 2FA
 * @param username - user identifier (email)
 * @returns secret key for TOTP
 */
export const generateSecret = (username: string): string => {
  return authenticator.generateSecret(username);
};

/**
 * Verify TOTP token
 * @param token - user provided token
 * @param secret - secret key
 * @returns true if token is valid
 */
export const verifyTotp = (token: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('TOTP verification failed:', error);
    return false;
  }
};

/**
 * Generate backup codes for account recovery
 * @param count - number of backup codes to generate
 * @returns array of backup codes
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()
    );
  }
  return codes;
};

/**
 * Authenticate with 2FA support
 * @param email - user email
 * @param password - user password
 * @param totp - TOTP code (optional)
 * @param twoFactorEnabled - whether 2FA is enabled
 * @param secret - 2FA secret
 * @returns authentication result
 */
export const authenticateWith2FA = async (
  email: string,
  password: string,
  totp?: string,
  twoFactorEnabled: boolean = false,
  secret?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!email || !password) {
    return { success: false, error: 'Email and password required' };
  }

  // If 2FA is enabled, verify TOTP
  if (twoFactorEnabled && secret) {
    if (!totp || !verifyTotp(totp, secret)) {
      return { success: false, error: 'Invalid TOTP code' };
    }
  }

  return { success: true };
};

export default {
  generateSecret,
  verifyTotp,
  generateBackupCodes,
  authenticateWith2FA,
};

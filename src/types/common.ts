export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Типы аутентификации.
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
  requires2FA?: boolean;
  sessionToken?: string;
  qrCode?: string;
  secret?: string;
}

export interface User {
  uid: string;
  имяПользователя?: string;
}

export interface TwoFactorSetup {
  success?: boolean;
  error?: string;
  secret: string;
  qrCode: string;
  manualKey: string;
}

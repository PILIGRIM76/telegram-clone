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
// src/services/authClient.ts
// Browser-side auth client for JWT-based authentication
// Stores tokens in localStorage, provides login/register/refresh

const TOKEN_KEY = 'cipherlink_tokens';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  uid: string;
}

export const authClient = {
  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  getTokens(): AuthTokens | null {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  },

  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  },

  getUid(): string | null {
    const tokens = this.getTokens();
    return tokens?.uid || null;
  },

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async login(username: string, password: string): Promise<AuthTokens> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      uid: data.uid,
    };
    this.saveTokens(tokens);
    return tokens;
  },

  async register(username: string, password: string, uid: string, publicKey: string): Promise<AuthTokens> {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, uid, publicKey }),
    });
    if (!res.ok) throw new Error('Register failed');
    const data = await res.json();
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      uid: data.uid || uid,
    };
    this.saveTokens(tokens);
    return tokens;
  },

  async refresh(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
    const data = await res.json();
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      uid: data.uid,
    };
    this.saveTokens(tokens);
    return tokens;
  },
};

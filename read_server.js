const fs = require('fs');
const content = `// src/services/authClient.ts
// Browser-side auth client for JWT-based authentication
// Uses simple localStorage keys: accessToken, refreshToken, uid

const API_URL = (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL)
  ? process.env.VITE_API_URL.replace(/\\/+$/, '')
  : 'http://192.168.100.4:4000';

export interface AuthResponse {
  uid: string;
  accessToken: string;
  refreshToken: string;
  username?: string;
}

export const authClient = {
  saveTokens(accessToken: string, refreshToken: string, uid: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('uid', uid);
  },

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  getUid(): string | null {
    return localStorage.getItem('uid');
  },

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('uid');
  },

  logout(): void {
    this.clearTokens();
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(\`\${API_URL}/api/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.ошибка || data.error || 'Ошибка входа');
    }
    const data = await res.json();
    this.saveTokens(data.accessToken, data.refreshToken, data.uid);
    return data;
  },

  async register(username: string, password: string, publicKey: string): Promise<AuthResponse> {
    const res = await fetch(\`\${API_URL}/api/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, publicKey }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.ошибка || data.error || 'Ошибка регистрации');
    }
    const data = await res.json();
    this.saveTokens(data.accessToken, data.refreshToken, data.uid);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(\`\${API_URL}/api/refresh\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
    const data = await res.json();
    this.saveTokens(data.accessToken, data.refreshToken, data.uid);
    return data;
  },
};
`;
fs.writeFileSync('f:\\AntiPiry\\src\\services\\authClient.ts', content, 'utf-8');
console.log('authClient.ts written:', content.length, 'bytes');



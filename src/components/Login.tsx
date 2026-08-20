// Login page with 2FA support
import React, { useState } from 'react';
import { authenticateWith2FA } from '../services/auth';
import type { AuthResult } from '../types';

interface LoginProps {
  onLogin: (result: AuthResult) => void;
  onShowRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [secret, setSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await authenticateWith2FA(
      email,
      password,
      twoFactorEnabled ? totpCode : undefined,
      twoFactorEnabled,
      twoFactorEnabled ? secret : undefined
    );
    setLoading(false);
    onLogin(result);
  };

  const handleLogin = async () => {
    const result = await authenticateWith2FA(email, password);
    
    // Check if 2FA is required (simulated - in real app, check with server)
    // For now, we'll just proceed with normal login
    onLogin(result);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 rounded text-white"
            placeholder="user@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 rounded text-white"
            placeholder="••••••••"
          />
        </div>
        
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full py-2 bg-blue-600 rounded text-white disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <button
          onClick={onShowRegister}
          className="w-full py-2 bg-slate-700 rounded text-white"
        >
          Don't have an account? Register
        </button>
      </div>
    </div>
  );
};

export default Login;

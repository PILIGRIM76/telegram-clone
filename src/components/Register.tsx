// Register page with 2FA support
import React, { useState } from 'react';
import { generateSecret, generateQRCode, generateBackupCodes, verifyTotp } from '../services/authService';
import type { AuthResult } from '../types';

interface RegisterProps {
  onRegister: (result: AuthResult) => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSecret, setOtpSecret] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const handleEnable2FA = async () => {
    const secret = generateSecret(email);
    setOtpSecret(secret);
    
    const result = await generateQRCode(secret, email, 'AntiPiry');
    if (result.success) {
      setQrCode(result.data!);
      const codes = generateBackupCodes(10);
      setBackupCodes(codes);
      setShow2FASetup(true);
    } else {
      console.error('Failed to generate QR code:', result.error);
    }
  };

  const handleVerify2FA = () => {
    if (verifyTotp(totpCode, otpSecret)) {
      onRegister({ success: true, message: 'Registration completed with 2FA' });
    } else {
      onRegister({ success: false, error: 'Invalid TOTP code', message: 'Неверный код TOTP' });
    }
  };

  const handleRegister = () => {
    if (show2FASetup) {
      handleVerify2FA();
    } else {
      handleEnable2FA();
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      
      {!show2FASetup ? (
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
            onClick={handleRegister}
            disabled={!email || !password}
            className="w-full py-2 bg-blue-600 rounded text-white disabled:opacity-50"
          >
            Next - Enable 2FA
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Scan QR Code with Authenticator</label>
            {qrCode && (
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            )}
          </div>
          
          <div>
            <label className="block text-sm mb-1">Enter TOTP code</label>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 rounded text-white"
              placeholder="123456"
              maxLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1 font-semibold">Backup Codes (Save this!)</label>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <code key={i} className="bg-slate-700 px-2 py-1 rounded text-xs">
                  {code}
                </code>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRegister}
              className="flex-1 py-2 bg-red-600 rounded text-white"
            >
              Verify & Register
            </button>
            <button
              onClick={() => setShow2FASetup(false)}
              className="flex-1 py-2 bg-slate-600 rounded text-white"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

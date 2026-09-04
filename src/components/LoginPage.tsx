import React from 'react';
import { motion } from 'framer-motion';
import { LockIcon, EyeOffIcon, WarningIcon, QRIcon } from './icons';

type AuthMode = 'login' | 'register' | 'restore';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [twoFACode, setTwoFACode] = React.useState('');
  const [uid, setUid] = React.useState('');
  const [seedPhrase, setSeedPhrase] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PILIGRIM] Auth:', mode, { username, password, twoFACode });
    onLogin();
  };

  const modes: { key: AuthMode; label: string }[] = [
    { key: 'login', label: 'Login' },
    { key: 'register', label: 'Register' },
    { key: 'restore', label: 'Restore' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0D0C0F', fontFamily: 'Inter, sans-serif' }}>
      {/* Left side — logo */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 180, height: 180, borderRadius: '50%', background: 'linear-gradient(135deg, #B388EB 0%, #7B4B9A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(179, 136, 235, 0.4)', marginBottom: 32 }}>
          <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#0D0C0F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#FCF9F7', margin: 0 }}>P</h1>
            <p style={{ fontSize: 12, color: 'rgba(252,249,247,0.6)', marginTop: 8 }}>End-to-End</p>
            <p style={{ fontSize: 10, color: 'rgba(252,249,247,0.4)' }}>Encrypted</p>
          </div>
        </div>
      </motion.div>

      {/* Right side — Auth card */}
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 448, padding: 40, borderRadius: 24, background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
          {/* Mode switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {modes.map((m) => {
              const isActive = mode === m.key;
              return (
                <motion.button key={m.key} onClick={() => setMode(m.key)} whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: isActive ? 'rgba(179, 136, 235, 0.2)' : 'transparent', color: isActive ? '#B388EB' : 'rgba(252, 249, 247, 0.6)', border: isActive ? '1px solid rgba(179, 136, 235, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {m.label}
                </motion.button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            {mode !== 'restore' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 16 }}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7' }} />
              </motion.div>
            )}

            {/* Password */}
            {mode !== 'restore' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 16, position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7' }} />
                <motion.button type="button" onClick={() => setShowPassword(!showPassword)} whileTap={{ scale: 0.9 }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(252, 249, 247, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon size={18} /> : <LockIcon size={18} />}
                </motion.button>
              </motion.div>
            )}

            {/* 2FA */}
            {mode === 'login' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 16 }}>
                <input type="text" placeholder="2FA Code" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace' }} />
              </motion.div>
            )}

            {/* Restore form */}
            {mode === 'restore' && (
              <div style={{ marginBottom: 16 }}>
                <input type="text" placeholder="UID" value={uid} onChange={(e) => setUid(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace', marginBottom: 12 }} />
                <textarea placeholder="Seed Phrase (12 words)" value={seedPhrase} onChange={(e) => setSeedPhrase(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace', resize: 'none' }} />
              </div>
            )}

            {/* Submit button */}
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #B388EB 0%, #7B4B9A 100%)', color: '#0D0C0F', boxShadow: '0 4px 20px rgba(179, 136, 235, 0.4)', marginBottom: 16 }}>
              {mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Restore'}
            </motion.button>

            {/* Links */}
            {mode !== 'restore' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <motion.button onClick={() => setMode('restore')} whileHover={{ x: 2 }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(252, 249, 247, 0.6)', cursor: 'pointer' }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = '#B388EB'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'rgba(252, 249, 247, 0.6)'; }}>
                  <WarningIcon size={14} color="#FF8A50" />
                  Restore via Seed Phrase
                </motion.button>
                <motion.div whileHover={{ scale: 1.05 }} style={{ cursor: 'pointer' }}>
                  <QRIcon size={20} color="rgba(252, 249, 247, 0.4)" />
                </motion.div>
              </motion.div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

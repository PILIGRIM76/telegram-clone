import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockIcon, EyeOffIcon, EyeIcon, WarningIcon, QRIcon } from './icons';
import { useAccentColor } from '../hooks/useAccentColor';
import { isValidBIP39Mnemonic, normalizeMnemonicWords } from '../crypto/bip39Derivation';

type AuthMode = 'login' | 'register' | 'restore';

interface LoginPageProps {
  onLogin: () => void;
  onRestore?: (identity: any) => void; // v3.0 Phase 5: Restore через BIP39
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRestore }) => {
  const [mode, setMode] = React.useState<AuthMode>('login');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [twoFACode, setTwoFACode] = React.useState('');
  const [uid, setUid] = React.useState('');
  const [seedPhrase, setSeedPhrase] = React.useState('');
  const [restoreError, setRestoreError] = React.useState('');
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [mnemonicStatus, setMnemonicStatus] = React.useState<{
    isBIP39: boolean;
    wordCount: number;
  }>({ isBIP39: false, wordCount: 0 });

  // v3.0 Phase 4: Dynamic accent theme
  const theme = useAccentColor();

  // v3.0 Phase 5: real-time BIP39 validation
  React.useEffect(() => {
    if (mode !== 'restore' || !seedPhrase.trim()) {
      setMnemonicStatus({ isBIP39: false, wordCount: 0 });
      return;
    }
    const words = normalizeMnemonicWords(seedPhrase.split(/\s+/));
    const isBIP39 = words.length > 0 && isValidBIP39Mnemonic(words);
    setMnemonicStatus({ isBIP39, wordCount: words.length });
  }, [seedPhrase, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');

    // Restore: вызываем callback onRestore для multi-device flow
    if (mode === 'restore') {
      if (!onRestore) {
        setRestoreError('Restore handler not provided. Use RestoreIdentity component.');
        return;
      }
      setIsRestoring(true);
      try {
        // Делегируем обработку в App.tsx (через onRestore callback)
        // App.tsx вызовет cryptoService.restoreIdentityFromSeed(words, encryptedKeyPair)
        const words = normalizeMnemonicWords(seedPhrase.split(/\s+/));
        if (words.length !== 12) {
          throw new Error(`Требуется ровно 12 слов, получено ${words.length}`);
        }
        if (mnemonicStatus.isBIP39) {
          console.log('[PILIGRIM] BIP39 mnemonic detected — proceeding with deterministic recovery');
        } else {
          console.warn('[PILIGRIM] Non-BIP39 mnemonic — will use legacy PBKDF2 fallback');
        }
        // Сигнал для App.tsx: тип flow (BIP39 → детерминированный, legacy → fallback)
        onRestore({
          words,
          isBIP39: mnemonicStatus.isBIP39,
        });
      } catch (err) {
        setRestoreError(err instanceof Error ? err.message : 'Restore failed');
        setIsRestoring(false);
      }
      return;
    }

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
        <div style={{ width: 192, height: 192, borderRadius: '50%', background: theme.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${theme.glow}`, marginBottom: 32 }}>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 172, height: 172, borderRadius: '50%', background: '#0D0C0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#FCF9F7', letterSpacing: '0.25em', margin: 0 }}>PILIGRIM</h1>
            <p style={{ fontSize: 12, color: 'rgba(252,249,247,0.6)', marginTop: 8 }}>End-to-End Encrypted</p>
          </motion.div>
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
                                <motion.button key={m.key} onClick={() => setMode(m.key)} whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: isActive ? `${theme.color}20` : 'transparent', color: isActive ? theme.color : 'rgba(252, 249, 247, 0.6)', border: isActive ? `1px solid ${theme.color}50` : '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                <input type="text" placeholder="UID (optional)" value={uid} onChange={(e) => setUid(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace', marginBottom: 12 }} />
                <textarea
                  placeholder="Seed Phrase (12 words)"
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  rows={3}
                  data-testid="restore-seed-phrase"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${mnemonicStatus.isBIP39 ? theme.color : 'rgba(255, 255, 255, 0.1)'}`,
                    color: '#FCF9F7',
                    fontFamily: '"JetBrains Mono", monospace',
                    resize: 'none',
                    boxShadow: mnemonicStatus.isBIP39 ? `0 0 0 3px ${theme.color}33` : 'none',
                    transition: 'all 200ms ease-out',
                  }}
                />
                {/* v3.0 Phase 5: BIP39 валидация + visual feedback */}
                {seedPhrase.trim() && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    {mnemonicStatus.isBIP39 ? (
                      <>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.color, boxShadow: `0 0 8px ${theme.glow}` }} />
                        <span style={{ color: theme.color, fontWeight: 500 }}>
                          ✓ BIP39 — детерминированный recovery
                        </span>
                      </>
                    ) : mnemonicStatus.wordCount > 0 ? (
                      <>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFC107' }} />
                        <span style={{ color: '#FFC107', fontWeight: 500 }}>
                          ⚠ Не BIP39 (legacy fallback, {mnemonicStatus.wordCount}/12)
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
                {restoreError && (
                  <div data-testid="restore-error" style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#EF4444', fontSize: 12 }}>
                    {restoreError}
                  </div>
                )}
              </div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isRestoring}
              data-testid={`${mode}-submit`}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: isRestoring ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${theme.color} 0%, ${theme.color}cc 100%)`,
                color: '#0D0C0F',
                boxShadow: `0 4px 20px ${theme.glow}`,
                marginBottom: 16,
                opacity: isRestoring ? 0.7 : 1,
              }}
            >
              {isRestoring ? 'Восстановление...' : (mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Restore Identity')}
            </motion.button>

            {/* Links */}
            {mode !== 'restore' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <motion.button onClick={() => setMode('restore')} whileHover={{ x: 2 }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(252, 249, 247, 0.6)', cursor: 'pointer' }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'theme.color'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'rgba(252, 249, 247, 0.6)'; }}>
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

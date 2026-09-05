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
  // v3.0: Единая геометрия для ВСЕХ элементов (граница + радиус одинаковые везде)
  const R = 20;                                              // базовый радиус
  const R_SM = 12;                                           // для мелких элементов (info box, badge)
  const BORDER = '1px solid rgba(255,255,255,0.25)';         // единая граница
  const BORDER_GLASS = '1px solid rgba(255,255,255,0.08)';   // для glassmorphism карточки (более тонкая)
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
    // v3.0: Корневой layout — fixed inset-0 + overflow:hidden (экран НЕ прокручивается)
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 16,
      background: '#0D0C0F',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* v3.0: Круглый логотип ВЫШЕ карточки — слово PILIGRIM ВНУТРИ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        data-testid="logo-badge"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: theme.gradient,
          border: BORDER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 40px ${theme.glow}`,
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 84,
          height: 84,
          borderRadius: '50%',
          background: 'rgba(13, 12, 11, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <LockIcon size={20} color="#FCF9F7" />
          <span style={{
            color: '#FCF9F7',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            marginTop: 4,
            lineHeight: 1,
          }}>
            PILIGRIM
          </span>
        </div>
      </motion.div>

      {/* Карточка входа/регистрации/restore */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          width: '100%',
          maxWidth: 448,
          padding: 20,
          borderRadius: R,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: BORDER_GLASS,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'hidden',
        }}
      >
          {/* Mode switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {modes.map((m) => {
              const isActive = mode === m.key;
              return (
                                <motion.button key={m.key} onClick={() => setMode(m.key)} whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '8px 12px', borderRadius: R_SM, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: isActive ? `${theme.color}20` : 'transparent', color: isActive ? theme.color : 'rgba(252, 249, 247, 0.6)', border: isActive ? `1px solid ${theme.color}50` : BORDER_GLASS }}>
                  {m.label}
                </motion.button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} style={{ overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* v3.0: Register mode — улучшенный UX с пояснением и большой CTA-кнопкой */}
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: 14 }}
              >
                {/* v3.0: Логотип ВЫНЕСЕН ВЫШЕ карточки (см. LogoBadge) */}
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#FCF9F7',
                  margin: '0 0 4px',
                  letterSpacing: '-0.2px',
                  textAlign: 'center',
                }}>
                  Создание новой личности
                </h2>
                <p style={{
                  fontSize: 12,
                  color: 'rgba(252, 249, 247, 0.6)',
                  margin: '0 0 12px',
                  lineHeight: 1.4,
                  textAlign: 'center',
                }}>
                  Сгенерируйте 12-словную seed-фразу для восстановления на любом устройстве
                </p>

                {/* Info box — local key generation */}
                <div style={{
                  padding: 12,
                  background: `${theme.color}0d`,
                  borderRadius: R_SM,
                  border: `1px solid ${theme.color}33`,
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: R_SM,
                      background: `${theme.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <LockIcon size={14} color={theme.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#FCF9F7', marginBottom: 3 }}>
                        🔒 Локальная генерация ключей
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(252, 249, 247, 0.7)', lineHeight: 1.4 }}>
                        Ключи создаются <strong>на вашем устройстве</strong>. Сервер не получает seed-фразу и приватные ключи. Multi-device recovery через BIP39.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Username */}
            {mode !== 'restore' && mode !== 'register' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 10 }}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: R_SM, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: BORDER_GLASS, color: '#FCF9F7', boxSizing: 'border-box' }} />
              </motion.div>
            )}

            {/* Password */}
            {mode !== 'restore' && mode !== 'register' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 10, position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', height: 44, padding: '0 44px 0 14px', borderRadius: R_SM, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: BORDER_GLASS, color: '#FCF9F7', boxSizing: 'border-box' }} />
                <motion.button type="button" onClick={() => setShowPassword(!showPassword)} whileTap={{ scale: 0.9 }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(252, 249, 247, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon size={18} /> : <LockIcon size={18} />}
                </motion.button>
              </motion.div>
            )}

            {/* 2FA */}
            {mode === 'login' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginBottom: 10 }}>
                <input type="text" placeholder="2FA Code" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: R_SM, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: BORDER_GLASS, color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace', boxSizing: 'border-box' }} />
              </motion.div>
            )}

            {/* Restore form */}
            {mode === 'restore' && (
              <div style={{ marginBottom: 10 }}>
                <input type="text" placeholder="UID (optional)" value={uid} onChange={(e) => setUid(e.target.value)} style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: R_SM, fontSize: 14, outline: 'none', background: 'rgba(255, 255, 255, 0.05)', border: BORDER_GLASS, color: '#FCF9F7', fontFamily: '"JetBrains Mono", monospace', marginBottom: 10, boxSizing: 'border-box' }} />
                <textarea
                  placeholder="Seed Phrase (12 words)"
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  rows={3}
                  data-testid="restore-seed-phrase"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: R_SM,
                    fontSize: 14,
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${mnemonicStatus.isBIP39 ? theme.color : 'rgba(255,255,255,0.1)'}`,
                    color: '#FCF9F7',
                    fontFamily: '"JetBrains Mono", monospace',
                    resize: 'none',
                    boxShadow: mnemonicStatus.isBIP39 ? `0 0 0 3px ${theme.color}33` : 'none',
                    transition: 'all 200ms ease-out',
                    boxSizing: 'border-box',
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
                  <div data-testid="restore-error" style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: R_SM, color: '#EF4444', fontSize: 12 }}>
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
                height: 48,
                marginTop: 12,
                padding: 0,
                borderRadius: R,
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: isRestoring ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${theme.color} 0%, ${theme.color}cc 100%)`,
                color: '#0D0C0F',
                boxShadow: `0 4px 20px ${theme.glow}`,
                opacity: isRestoring ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              {isRestoring ? 'Восстановление...' : (mode === 'login' ? 'Login' : mode === 'register' ? 'Создать безопасную личность' : 'Restore Identity')}
            </motion.button>

            {/* Links */}
            {mode !== 'restore' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginTop: 12, flexShrink: 0 }}>
                <motion.button onClick={() => setMode('restore')} whileHover={{ x: 2 }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(252, 249, 247, 0.6)', cursor: 'pointer', fontSize: 12 }} onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'theme.color'; }} onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'rgba(252, 249, 247, 0.6)'; }}>
                  <WarningIcon size={14} color="#FF8A50" />
                  Restore via Seed Phrase
                </motion.button>
                <motion.div whileHover={{ scale: 1.05 }} style={{ cursor: 'pointer' }}>
                  <QRIcon size={20} color="rgba(252, 249, 247, 0.4)" />
                </motion.div>
              </motion.div>
            )}
          </form>
        {/* v3.0: Footer подпись вынесена наружу карточки (ниже) */}
        </motion.div>

      {/* Footer подпись под карточкой */}
      <span style={{
        fontSize: 10,
        color: 'rgba(252, 249, 247, 0.5)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        End-to-End Encrypted
      </span>
    </div>
  );
};

export default LoginPage;

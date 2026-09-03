// v3.0 Phase 2D: Drawer — боковая штора профиля + QR-код личности.
// Aurora spec: 300px width, slide-in 0.3s cubic-bezier(0.2, 0.9, 0.4, 1)
// Glassmorphism: rgba(255,255,255,0.85) + backdrop-blur 24px.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { AnimatedAvatar } from './AnimatedAvatar';

interface IdentityLite {
  uid: string;
  name?: string;
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  identity: IdentityLite | null;
  onLogout: () => void;
  lang: 'ru' | 'en';
  onToggleLang: () => void;
}

const SLIDE_EASE = [0.2, 0.9, 0.4, 1] as const;

const handleMenuEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)';
};
const handleMenuLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
};
const handleLogoutEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
};
const handleLogoutLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
};

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, identity, onLogout, lang, onToggleLang }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (identity && showQr && !qrDataUrl) {
      const payloadObj: { v: string; uid: string; publicKey?: string } = { v: 'piligrim-contact-v2', uid: identity.uid };
      const pk = (identity as { publicKey?: string }).publicKey;
      if (pk) payloadObj.publicKey = pk;
      const payload = JSON.stringify(payloadObj);
      QRCode.toDataURL(payload, { width: 200, margin: 2, color: { dark: '#1C1816', light: '#FCF9F7' } })
        .then(setQrDataUrl)
        .catch((err: unknown) => console.error('[PILIGRIM] QR generation failed:', err));
    }
  }, [identity, showQr, qrDataUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: 52,
    padding: '0 16px', background: 'transparent', border: 'none', borderRadius: 12,
    fontSize: 15, color: 'var(--color-text-primary)', cursor: 'pointer',
    transition: 'background 150ms ease-out', textAlign: 'left',
  };
  const iconStyle: React.CSSProperties = {
    width: 22, height: 22, color: 'var(--color-text-secondary)', flexShrink: 0,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            data-testid="drawer-overlay"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 90 } as React.CSSProperties}
          />
          <motion.aside
            key="drawer-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: SLIDE_EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Profile menu"
            data-testid="drawer-panel"
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 300, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '0.5px solid rgba(255,255,255,0.3)', boxShadow: 'var(--shadow-floating)', zIndex: 95, display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' } as React.CSSProperties}
          >
            <div data-testid="drawer-profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <AnimatedAvatar name={identity?.name || 'PILIGRIM'} size={72} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' } as React.CSSProperties}>{identity?.name || 'Пилигрим'}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 } as React.CSSProperties}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38A169', display: 'inline-block' } as React.CSSProperties} />
                  <span>online</span>
                </div>
              </div>
              {identity && (
                <div data-testid="drawer-uid" style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.04)', padding: '6px 10px', borderRadius: 8, wordBreak: 'break-all', maxWidth: '100%' } as React.CSSProperties}>
                  {identity.uid.length > 28 ? identity.uid.slice(0, 28) + '...' : identity.uid}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button data-testid="drawer-qr-toggle" style={menuItemStyle} onClick={() => setShowQr((q) => !q)} onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave}>
                <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3z" />
                </svg>
                {lang === 'ru' ? 'My QR code' : 'My QR code'}
              </button>

              {showQr && qrDataUrl && (
                <motion.div data-testid="drawer-qr-container" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, overflow: 'hidden' } as React.CSSProperties}>
                  <img src={qrDataUrl} alt="PILIGRIM identity QR" style={{ width: 200, height: 200, borderRadius: 16, border: '4px solid white', boxShadow: 'var(--shadow-floating)', display: 'block' } as React.CSSProperties} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.5 } as React.CSSProperties}>
                    {lang === 'ru' ? 'Show to peer — they add you without manual UID entry' : 'Show to peer — they add you without manual UID entry'}
                  </div>
                </motion.div>
              )}

              <button data-testid="drawer-lang-toggle" style={menuItemStyle} onClick={onToggleLang} onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave}>
                <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {lang === 'ru' ? 'Language: Russian' : 'Language: English'}
              </button>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '8px 16px' }} />

              <button data-testid="drawer-logout" style={{ ...menuItemStyle, color: '#EF4444' }} onClick={onLogout} onMouseEnter={handleLogoutEnter} onMouseLeave={handleLogoutLeave}>
                <svg style={{ ...iconStyle, color: '#EF4444' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {lang === 'ru' ? 'Logout' : 'Logout'}
              </button>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--color-text-secondary)' } as React.CSSProperties}>
              PILIGRIM v3.0 · Aurora
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

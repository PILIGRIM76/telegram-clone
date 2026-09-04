// v3.0 Phase 2F: Drawer по Aurora-спецификации.
// 320px width, gradient header 180px, active item indicator,
// 7 menu items, Logout separated at bottom.

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
  activeView?: string;
  onNavigate?: (view: 'chats' | 'contacts' | 'calls' | 'favorites') => void;
}

const SLIDE_EASE = [0.2, 0.9, 0.4, 1] as const;

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  identity,
  onLogout,
  lang,
  onToggleLang,
  activeView,
  onNavigate,
}) => {
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

  const handleMenuEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,106,88,0.04)';
  };
  const handleMenuLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
  };
  const handleLogoutEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(229,72,77,0.10)';
  };
  const handleLogoutLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
  };

  const menuItems = [
    { id: 'chats', icon: '\u{1F4AC}', label: 'Чаты', onClick: () => { onNavigate?.('chats'); onClose(); } },
    { id: 'contacts', icon: '\u{1F465}', label: 'Контакты', onClick: () => { onNavigate?.('contacts'); onClose(); } },
    { id: 'calls', icon: '\u{1F4DE}', label: 'Звонки', onClick: () => { onNavigate?.('calls'); onClose(); } },
    { id: 'favorites', icon: '\u{2B50}', label: 'Избранное', onClick: () => { onNavigate?.('favorites'); onClose(); } },
    { id: 'qr', icon: '\u25A3', label: lang === 'ru' ? 'Мой QR-код' : 'My QR code', onClick: () => setShowQr((q) => !q) },
    { id: 'lang', icon: '\u{1F310}', label: lang === 'ru' ? 'Язык: Русский' : 'Language: English', onClick: onToggleLang },
    { id: 'settings', icon: '\u2699\uFE0F', label: 'Настройки', onClick: () => console.log('[PILIGRIM] Settings (Phase 5)') },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 320, background: 'var(--color-surface)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '0.5px solid rgba(255,255,255,0.3)', boxShadow: 'var(--shadow-floating)', zIndex: 95, display: 'flex', flexDirection: 'column' } as React.CSSProperties}
      >
        <div data-testid="drawer-profile" style={{ height: 180, padding: 24, background: 'linear-gradient(135deg, rgba(232,106,88,0.15) 0%, rgba(179,136,235,0.10) 100%)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AnimatedAvatar name={identity?.name || 'PILIGRIM'} size={72} bordered />
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' } as React.CSSProperties}>
                {identity?.name || 'Пилигрим'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } as React.CSSProperties}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38A169', display: 'inline-block' } as React.CSSProperties} />
                <span>online</span>
              </div>
            </div>
          </div>
          {identity && (
            <div data-testid="drawer-uid" style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.4)', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all', alignSelf: 'flex-start', maxWidth: '100%' } as React.CSSProperties}>
              {identity.uid.length > 28 ? identity.uid.slice(0, 28) + '...' : identity.uid}
            </div>
          )}
        </div>

        {showQr && qrDataUrl && (
          <motion.div data-testid="drawer-qr-container" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, overflow: 'hidden', borderBottom: '1px solid rgba(0,0,0,0.05)' } as React.CSSProperties}>
            <img src={qrDataUrl} alt="PILIGRIM identity QR" style={{ width: 180, height: 180, borderRadius: 12, border: '4px solid white', boxShadow: 'var(--shadow-floating)', display: 'block' } as React.CSSProperties} />
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.5 } as React.CSSProperties}>
              Show QR to peer to add
            </div>
          </motion.div>
        )}

        <div data-testid="drawer-menu" style={{ padding: '8px 0', flex: 1, overflowY: 'auto' } as React.CSSProperties}>
          {menuItems.map((item, i) => {
            const isActive = item.id === activeView;
            return (
              <React.Fragment key={item.id}>
                <button data-testid={'drawer-item-' + item.id} onClick={item.onClick} onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: 48, padding: '0 16px', background: isActive ? 'rgba(232,106,88,0.06)' : 'transparent', border: 'none', borderRadius: 0, fontSize: 15, color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease-out' } as React.CSSProperties}>
                  {isActive && (
                    <div style={{ position: 'absolute', left: 0, top: 14, width: 3, height: 20, borderRadius: 2, background: 'var(--color-accent)' } as React.CSSProperties} />
                  )}
                  <span style={{ fontSize: 18, width: 22, textAlign: 'center' } as React.CSSProperties}>{item.icon}</span>
                  <span style={{ flex: 1 } as React.CSSProperties}>{item.label}</span>
                </button>
                {i < menuItems.length - 1 && (
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '0 16px' } as React.CSSProperties} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div data-testid="drawer-footer" style={{ marginTop: 'auto' } as React.CSSProperties}>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '0 16px 8px' } as React.CSSProperties} />
          <button data-testid="drawer-logout" onClick={onLogout} onMouseEnter={handleLogoutEnter} onMouseLeave={handleLogoutLeave} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: 48, padding: '0 16px', background: 'transparent', border: 'none', fontSize: 15, color: '#E5484D', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease-out' } as React.CSSProperties}>
            <span style={{ fontSize: 18, width: 22, textAlign: 'center' } as React.CSSProperties}>{'\u23CB'}</span>
            <span>{lang === 'ru' ? 'Выйти' : 'Logout'}</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

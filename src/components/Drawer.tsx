// v3.0 Phase 2F: Drawer по Aurora-спецификации.
// 320px width, gradient header 180px, active item indicator,
// 7 menu items, Logout separated at bottom.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { AnimatedAvatar } from './AnimatedAvatar';
// v3.0 Phase 2J: responsive cfg через useBreakpoint
import { useBreakpoint, type Breakpoint } from '../hooks/useBreakpoint';

interface IdentityLite {
  uid: string;
  name?: string;
  isBIP39?: boolean; // v3.0 Phase 5: E2EE multi-device indicator
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
  onOpenAccount?: () => void; // v3.0 Security Dashboard
}

const SLIDE_EASE = [0.2, 0.9, 0.4, 1] as const;

// v3.0 Phase 2J: per-breakpoint pixel config (mobile/tablet/desktop)
interface DrawerCfg {
  width: number;
  headerH: number;
  avatar: number;
  border: number;
  nameFont: number;
  itemH: number;
  bar: number;
}

const CFG: Record<Breakpoint, DrawerCfg> = {
  mobile:  { width: 280, headerH: 160, avatar: 64, border: 2, nameFont: 20, itemH: 48, bar: 3 },
  tablet:  { width: 320, headerH: 180, avatar: 72, border: 3, nameFont: 22, itemH: 48, bar: 3 },
  desktop: { width: 340, headerH: 200, avatar: 80, border: 3, nameFont: 24, itemH: 52, bar: 4 },
};

// v3.0 Phase 2J: lucide SVG paths (22×22 stroke icons) — заменяют emoji
const ICONS: Record<string, React.ReactNode> = {
  chats:     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  contacts:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  calls:     <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
  favorites: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  qr:        <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  lang:      <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  settings:  <><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};

const renderIcon = (id: string): React.ReactNode => ICONS[id] ?? null;

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  identity,
  onLogout,
  lang,
  onToggleLang,
  activeView,
  onNavigate,
  onOpenAccount,
}) => {
  const bp: Breakpoint = useBreakpoint();
  const cfg = CFG[bp];
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

  const menuItems: { id: string; label: string; onClick: () => void }[] = [
    { id: 'chats', label: 'Чаты', onClick: () => { onNavigate?.('chats'); onClose(); } },
    { id: 'contacts', label: 'Контакты', onClick: () => { onNavigate?.('contacts'); onClose(); } },
    { id: 'calls', label: 'Звонки', onClick: () => { onNavigate?.('calls'); onClose(); } },
    { id: 'favorites', label: 'Избранное', onClick: () => { onNavigate?.('favorites'); onClose(); } },
    { id: 'qr', label: lang === 'ru' ? 'Мой QR-код' : 'My QR code', onClick: () => setShowQr((q) => !q) },
    { id: 'lang', label: lang === 'ru' ? 'Язык: Русский' : 'Language: English', onClick: onToggleLang },
    { id: 'settings', label: 'Настройки', onClick: () => { if (onOpenAccount) onOpenAccount(); } },
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
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: cfg.width, background: 'var(--color-surface)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '0.5px solid rgba(255,255,255,0.3)', boxShadow: 'var(--shadow-floating)', zIndex: 95, display: 'flex', flexDirection: 'column' } as React.CSSProperties}
      >
        <div data-testid="drawer-profile" style={{ height: cfg.headerH, padding: 24, background: 'linear-gradient(135deg, rgba(232,106,88,0.15) 0%, rgba(179,136,235,0.10) 100%)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 } as React.CSSProperties}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* v3.0 Phase 5: AnimatedAvatar с E2EE статусом */}
            <AnimatedAvatar
              name={identity?.name || 'PILIGRIM'}
              size={cfg.avatar}
              bordered
              e2eeStatus={identity?.isBIP39 === true ? 'verified' : 'pending'}
            />
            <div>
              <div style={{ fontSize: cfg.nameFont, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' } as React.CSSProperties}>
                {identity?.name || 'Пилигрим'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } as React.CSSProperties}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38A169', display: 'inline-block' } as React.CSSProperties} />
                <span>online</span>
              </div>
              {/* v3.0 Phase 5: E2EE status badge под аватаром */}
              {identity && (
                <div
                  data-testid="e2ee-badge"
                  title={identity.isBIP39 ? 'BIP39 детерминированный recovery — multi-device ready' : 'Legacy PBKDF2 — нужен migrate для multi-device'}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: identity.isBIP39 ? '#38A169' : '#F59E0B',
                    marginTop: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: identity.isBIP39 ? 'rgba(56, 161, 105, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${identity.isBIP39 ? 'rgba(56, 161, 105, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  } as React.CSSProperties}
                >
                  {identity.isBIP39 ? '✓ Multi-device ready' : '⚠ Legacy keys'}
                </div>
              )}
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
                <button data-testid={'drawer-item-' + item.id} onClick={item.onClick} onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: cfg.itemH, padding: '0 16px', background: isActive ? 'rgba(232,106,88,0.06)' : 'transparent', border: 'none', borderRadius: 0, fontSize: 15, color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease-out' } as React.CSSProperties}>
                  {isActive && (
                    <div style={{ position: 'absolute', left: 0, top: (cfg.itemH - 20) / 2, width: cfg.bar, height: 20, borderRadius: 2, background: 'var(--color-accent)' } as React.CSSProperties} />
                  )}
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={isActive ? 'var(--color-accent)' : 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 } as React.CSSProperties} aria-hidden="true">
                    {renderIcon(item.id)}
                  </svg>
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
          <button data-testid="drawer-logout" onClick={onLogout} onMouseEnter={handleLogoutEnter} onMouseLeave={handleLogoutLeave} style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: cfg.itemH, padding: '0 16px', background: 'transparent', border: 'none', fontSize: 15, color: '#E5484D', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms ease-out' } as React.CSSProperties}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 } as React.CSSProperties} aria-hidden="true">
              {renderIcon('logout')}
            </svg>
            <span>{lang === 'ru' ? 'Выйти' : 'Logout'}</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

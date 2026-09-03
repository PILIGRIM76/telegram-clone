// v3.0 Logout: модалка подтверждения выхода из аккаунта.
// Aurora design: spring animations через framer-motion, backdrop blur.
// Accessibility: focus на Cancel, Esc закрывает (через useEscapeKey), WAI-ARIA roles.

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  identityUid?: string;
}

export const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  identityUid,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(onCancel, isOpen);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div key="logout-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onCancel} role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 } as React.CSSProperties}>
        <motion.div key="logout-modal" initial={{ opacity: 0, scale: 0.92, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" data-testid="confirm-logout-modal" style={{ background: 'var(--color-surface)', borderRadius: 24, padding: 32, maxWidth: 420, width: '100%', boxShadow: 'var(--shadow-modal, 0 20px 60px rgba(0,0,0,0.25))' } as React.CSSProperties}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' } as React.CSSProperties}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 id="logout-title" style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: 12, letterSpacing: '-0.3px' } as React.CSSProperties}>Выйти из аккаунта?</h2>
          <p id="logout-description" style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 8 } as React.CSSProperties}>Ваша личность будет забыта на этом устройстве. Вы сможете восстановить её позже, используя сохранённые <strong style={{ color: 'var(--color-text-primary)' }}>12 слов seed-phrase</strong>.</p>
          {identityUid && (
            <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.04)', borderRadius: 12, marginBottom: 20, textAlign: 'center' } as React.CSSProperties}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 } as React.CSSProperties}>Ваш UID</div>
              <div data-testid="logout-uid" style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--color-text-primary)', wordBreak: 'break-all' } as React.CSSProperties}>{identityUid}</div>
            </div>
          )}
          <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' } as React.CSSProperties}>
            <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">⚠️</span>
            <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 } as React.CSSProperties}><strong>Убедитесь, что вы сохранили seed-phrase!</strong> Без неё восстановить личность будет невозможно.</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button ref={cancelRef} onClick={onCancel} data-testid="logout-cancel" aria-label="Отмена выхода" style={{ flex: 1, height: 48, background: 'rgba(0,0,0,0.05)', color: 'var(--color-text-primary)', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease-out' } as React.CSSProperties} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}>Отмена</button>
            <button onClick={onConfirm} data-testid="logout-confirm" aria-label="Подтвердить выход" style={{ flex: 1, height: 48, background: '#EF4444', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease-out, transform 150ms ease-out' } as React.CSSProperties} onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.transform = 'scale(1.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.transform = 'scale(1)'; }}>Выйти</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Этап 5: нижняя выдвижная панель вложений по спецификации Aurora.
// 32px top radius, spring slide-up, 3 колонки (Camera/Gallery/Cancel).
// Размытие 20px, эффект матового стекла; z-index 101 — поверх чата.

import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface AttachmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (source: 'camera' | 'gallery') => void;
}

const OPTIONS: { source: 'camera' | 'gallery'; icon: string; label: string }[] = [
  { source: 'camera', icon: '📷', label: 'Camera' },
  { source: 'gallery', icon: '🖼️', label: 'Gallery' },
];

export const AttachmentSheet: React.FC<AttachmentSheetProps> = ({ isOpen, onClose, onPick }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="attachment-sheet-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 100,
            }}
          />
          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label="Attachment options"
            data-testid="attachment-sheet"
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--color-surface)',
              borderRadius: '32px 32px 0 0',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              padding: '16px 24px 32px',
              zIndex: 101,
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.15)',
                margin: '0 auto 20px',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              {OPTIONS.map(opt => (
                <button
                  key={opt.source}
                  data-testid={'attach-' + opt.source}
                  onClick={() => {
                    onPick(opt.source);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: 16,
                    background: 'rgba(0,0,0,0.04)',
                    border: 'none',
                    borderRadius: 16,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
              <button
                onClick={onClose}
                data-testid="attach-cancel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 16,
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 28 }}>✖️</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Cancel</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

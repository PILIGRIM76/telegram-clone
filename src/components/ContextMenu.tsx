// v3.0 Phase 2F: ContextMenu — контекстное меню (right-click / long-press).
// Aurora spec: 240px width, 16px radius, accent shadow, 40px items.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  dangerous?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const MENU_W = 240;
const MENU_ITEM_H = 40;
const MENU_PADDING = 16;
const MENU_INSET = 16;

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, x, y, items, onClose }) => {
  const [pos, setPos] = useState({ x, y });

  // Адаптивное позиционирование: не выходить за пределы экрана
  useEffect(() => {
    if (!isOpen) return;
    const menuH = items.length * MENU_ITEM_H + MENU_PADDING;
    let nx = x;
    let ny = y;
    if (typeof window !== 'undefined') {
      if (nx + MENU_W > window.innerWidth - MENU_INSET) nx = window.innerWidth - MENU_W - MENU_INSET;
      if (ny + menuH > window.innerHeight - MENU_INSET) ny = window.innerHeight - menuH - MENU_INSET;
      if (nx < MENU_INSET) nx = MENU_INSET;
      if (ny < MENU_INSET) ny = MENU_INSET;
    }
    setPos({ x: nx, y: ny });
  }, [isOpen, x, y, items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>, dangerous?: boolean) => {
    e.currentTarget.style.background = dangerous ? 'rgba(229,72,77,0.10)' : 'rgba(232,106,88,0.08)';
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        role="menu"
        aria-label="Context menu"
        data-testid="context-menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: MENU_W,
          background: 'var(--color-surface)',
          borderRadius: 16,
          padding: 8,
          boxShadow: '0 12px 48px rgba(232,106,88,0.15)',
          border: '0.5px solid rgba(255,255,255,0.3)',
          zIndex: 110,
        } as React.CSSProperties}
      >
        {items.map((item, i) => (
          <React.Fragment key={item.id}>
            <button
              role="menuitem"
              data-testid={'context-item-' + item.id}
              onClick={() => { item.onClick(); onClose(); }}
              onMouseEnter={(e) => handleEnter(e, item.dangerous)}
              onMouseLeave={handleLeave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                height: MENU_ITEM_H,
                padding: '0 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                color: item.dangerous ? '#E5484D' : 'var(--color-text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 100ms ease-out',
              } as React.CSSProperties}
            >
              <span style={{ fontSize: 16, width: 18, textAlign: 'center' } as React.CSSProperties}>{item.icon}</span>
              <span style={{ flex: 1 } as React.CSSProperties}>{item.label}</span>
            </button>
            {i < items.length - 1 && (
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 8px' } as React.CSSProperties} />
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

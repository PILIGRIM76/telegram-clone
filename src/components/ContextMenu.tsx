// Этап 2F: контекстное меню открывается правой кнопкой мыши или долгим нажатием.

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect } from 'react';

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  dangerous?: boolean;
  dividerBefore?: boolean;
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
const MENU_PADDING = 8;
const MENU_DIVIDER_H = 9;
const MENU_INSET = 16;

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, x, y, items, onClose }) => {
  const menuH =
    items.length * MENU_ITEM_H +
    items.filter(item => item.dividerBefore).length * MENU_DIVIDER_H +
    MENU_PADDING;
  let menuX = x;
  let menuY = y;
  if (typeof window !== 'undefined') {
    menuX = Math.max(MENU_INSET, Math.min(menuX, window.innerWidth - MENU_W - MENU_INSET));
    menuY = Math.max(MENU_INSET, Math.min(menuY, window.innerHeight - menuH - MENU_INSET));
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        role="menu"
        aria-label="Контекстное меню"
        data-testid="context-menu"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: menuX,
          top: menuY,
          width: MENU_W,
          maxHeight: `calc(100vh - ${MENU_INSET * 2}px)`,
          overflowY: 'auto',
          zIndex: 110,
        }}
        className="rounded-lg border-none bg-tg-menuBg p-1 shadow-xl dark:bg-tg-dark-menuBg"
      >
        {items.map(item => (
          <React.Fragment key={item.id}>
            {item.dividerBefore && (
              <div
                role="separator"
                className="mx-2 my-1 border-b border-tg-border dark:border-tg-dark-border"
              />
            )}
            <button
              role="menuitem"
              data-testid={'context-item-' + item.id}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`flex min-h-10 w-full items-center gap-3 rounded-md px-4 py-2 text-left text-sm transition-colors duration-150 ${
                item.dangerous
                  ? 'text-tg-danger'
                  : 'text-tg-menuText hover:bg-tg-menuHover dark:text-tg-dark-menuText dark:hover:bg-tg-dark-menuHover'
              }`}
            >
              <span className="w-[18px] flex-shrink-0 text-center text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

// v3.0 Phase 2G: FloatingCircleNav — mobile navigation per Aurora spec.
// Outer circle 72px (blur 20px glassmorphism) + inner gradient button 48px.
// 4 satellites (44px) fan out on arc radius 80px when opened.
// Compose badge 36px on the right for quick "Написать".
// Matches mobile SVG schema (360x800).

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CircleView = 'chats' | 'contacts' | 'calls' | 'favorites';

interface FloatingCircleNavProps {
  activeView: CircleView;
  onViewChange: (view: CircleView) => void;
  onCompose: () => void;
}

interface Satellite {
  view: CircleView;
  icon: string;
  label: string;
  /** angle in degrees from vertical (negative = left, positive = right) */
  angle: number;
}

const SATELLITES: Satellite[] = [
  { view: 'chats', icon: '\u{1F4AC}', label: '\u0427\u0430\u0442\u044B', angle: -60 },
  { view: 'contacts', icon: '\u{1F464}', label: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B', angle: -20 },
  { view: 'calls', icon: '\u{1F4DE}', label: '\u0417\u0432\u043E\u043D\u043A\u0438', angle: 20 },
  { view: 'favorites', icon: '\u2B50', label: '\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435', angle: 60 },
];

const ARC_RADIUS = 80;

export const FloatingCircleNav: React.FC<FloatingCircleNavProps> = ({
  activeView,
  onViewChange,
  onCompose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMainClick = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div
      data-testid="floating-circle-nav"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        // allow satellites to overflow the 72px box visually
        width: 72,
        height: 72,
      } as React.CSSProperties}
    >
      {/* Satellites fan-out above the circle */}
      <AnimatePresence>
        {isOpen && SATELLITES.map((sat, i) => {
          const rad = (sat.angle * Math.PI) / 180;
          const x = Math.sin(rad) * ARC_RADIUS;
          const y = -Math.cos(rad) * ARC_RADIUS;
          const isActive = activeView === sat.view;
          return (
            <motion.button
              key={sat.view}
              data-testid={'circle-sat-' + sat.view}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x, y, opacity: 1, scale: 1 }}
              exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: i * 0.03 }}
              onClick={() => {
                onViewChange(sat.view);
                setIsOpen(false);
              }}
              aria-label={sat.label}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 14,
                marginLeft: -22,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isActive ? 'var(--color-accent)' : 'white',
                border: isActive ? 'none' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                fontSize: 18,
                color: isActive ? 'white' : 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              } as React.CSSProperties}
            >
              {sat.icon}
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Outer glass circle 72px + inner gradient button 48px */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        } as React.CSSProperties}
      >
        <motion.button
          data-testid="circle-main"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          onClick={handleMainClick}
          aria-label={isOpen ? '\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E' : '\u041C\u0435\u043D\u044E'}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-start, #E86A58) 0%, var(--color-primary-end, #B388EB) 100%)',
            border: 'none',
            color: 'white',
            fontSize: 22,
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232,106,88,0.4)',
          } as React.CSSProperties}
        >
          ✚
        </motion.button>
      </div>

      {/* Compose badge 36px on the right */}
      <button
        data-testid="circle-compose"
        onClick={onCompose}
        aria-label="\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C"
        style={{
          position: 'absolute',
          right: -42,
          bottom: 18,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        } as React.CSSProperties}
      >
        ✉\uFE0F
      </button>
    </div>
  );
};

export default FloatingCircleNav;

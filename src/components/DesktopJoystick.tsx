// v3.0 Phase 2H: DesktopJoystick — фиксированная боковая навигация для desktop.
// Width 48px, position fixed left 8px, blur 16px glassmorphism.
// Compose button (accent) + 4 tab buttons with hover tooltips.
// Matches desktop SVG schema (1440x900).

import React, { useState } from 'react';
import type { TabView } from './TabletTabBar';

interface DesktopJoystickProps {
  activeView: TabView;
  onViewChange: (view: TabView) => void;
  onCompose: () => void;
}

interface JoystickItem {
  view: TabView;
  icon: string;
  label: string;
}

const ITEMS: JoystickItem[] = [
  { view: 'chats', icon: '\u{1F4AC}', label: '\u0427\u0430\u0442\u044B' },
  { view: 'contacts', icon: '\u{1F464}', label: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B' },
  { view: 'calls', icon: '\u{1F4DE}', label: '\u0417\u0432\u043E\u043D\u043A\u0438' },
  { view: 'favorites', icon: '\u2B50', label: '\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435' },
];

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  left: 56,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'var(--color-text-primary)',
  color: 'var(--color-bg-primary)',
  fontSize: 12,
  fontWeight: 500,
  padding: '6px 10px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  pointerEvents: 'none',
  zIndex: 60,
};

export const DesktopJoystick: React.FC<DesktopJoystickProps> = ({
  activeView,
  onViewChange,
  onCompose,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      data-testid="desktop-joystick"
      style={{
        position: 'fixed',
        left: 8,
        top: 60,
        bottom: 16,
        width: 48,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 20,
        zIndex: 50,
      } as React.CSSProperties}
    >
      {/* Compose button (accent) */}
      <div style={{ position: 'relative' } as React.CSSProperties}>
        <button
          data-testid="joystick-compose"
          onClick={onCompose}
          onMouseEnter={() => setHovered('compose')}
          onMouseLeave={() => setHovered(null)}
          aria-label="\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            border: 'none',
            color: 'white',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(232,106,88,0.3)',
          } as React.CSSProperties}
        >
          ✚
        </button>
        {hovered === 'compose' && <div data-testid="joystick-tooltip" style={tooltipStyle}>Написать</div>}
      </div>

      {ITEMS.map((item) => {
        const isActive = activeView === item.view;
        return (
          <div key={item.view} style={{ position: 'relative' } as React.CSSProperties}>
            <button
              data-testid={'joystick-' + item.view}
              onClick={() => onViewChange(item.view)}
              onMouseEnter={() => setHovered(item.view)}
              onMouseLeave={() => setHovered(null)}
              aria-label={item.label}
              aria-pressed={isActive}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isActive ? 'var(--color-accent)' : 'transparent',
                border: isActive ? 'none' : '1.5px solid var(--color-text-secondary)',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
              } as React.CSSProperties}
            >
              {item.icon}
            </button>
            {hovered === item.view && <div data-testid="joystick-tooltip" style={tooltipStyle}>{item.label}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default DesktopJoystick;

// v3.0 Phase 2B-3: TabletTabBar — нижняя навигация для tablet breakpoint.
// Pixel-perfect по спецификации пользователя:
//   - Высота: 56px
//   - 4 таба: Чаты / Контакты / Звонки / Избранное
//   - Active tab: accent color + indicator (6x3px)
//   - Backdrop blur: 20px glassmorphism
// Inline styles + CSS-переменные (WebView-friendly).

import React from 'react';

export type TabView = 'chats' | 'contacts' | 'calls' | 'favorites';

interface TabletTabBarProps {
  activeView: TabView;
  onViewChange: (view: TabView) => void;
}

interface TabConfig {
  view: TabView;
  icon: React.ReactNode;
  label: string;
  testId: string;
}

const chatsIcon = React.createElement('svg', {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}, React.createElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }));

const contactsIcon = React.createElement('svg', {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
},
  React.createElement('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
  React.createElement('circle', { cx: 9, cy: 7, r: 4 }),
  React.createElement('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
  React.createElement('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
);

const callsIcon = React.createElement('svg', {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
},
  React.createElement('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
  React.createElement('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }),
  React.createElement('path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' })
);

const favoritesIcon = React.createElement('svg', {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
},
  React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
  React.createElement('path', { d: 'M2 17l10 5 10-5' }),
  React.createElement('path', { d: 'M2 12l10 5 10-5' })
);

const TABS: TabConfig[] = [
  { view: 'chats', icon: chatsIcon, label: 'Чаты', testId: 'tab-chats' },
  { view: 'contacts', icon: contactsIcon, label: 'Контакты', testId: 'tab-contacts' },
  { view: 'calls', icon: callsIcon, label: 'Звонки', testId: 'tab-calls' },
  { view: 'favorites', icon: favoritesIcon, label: 'Избранное', testId: 'tab-favorites' },
];

const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)';
};

const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
};

export const TabletTabBar: React.FC<TabletTabBarProps> = ({ activeView, onViewChange }) => {
  return React.createElement('div', {
    'data-testid': 'tablet-tab-bar',
    style: {
      height: 56,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 16px',
      flexShrink: 0,
    } as React.CSSProperties,
  }, TABS.map((tab) => {
    const isActive = activeView === tab.view;
    return React.createElement('button', {
      key: tab.view,
      onClick: () => onViewChange(tab.view),
      'data-testid': tab.testId,
      'aria-label': tab.label,
      'aria-pressed': isActive,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '4px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        transition: 'color 150ms ease-out',
      } as React.CSSProperties,
      onMouseEnter: handleEnter,
      onMouseLeave: handleLeave,
    },
      React.createElement('div', {
        style: {
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        } as React.CSSProperties,
      }, tab.icon),
      React.createElement('span', {
        style: {
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.2px',
        } as React.CSSProperties,
      }, tab.label),
      isActive ? React.createElement('div', {
        'data-testid': tab.testId + '-indicator',
        style: {
          width: 6,
          height: 3,
          borderRadius: 4,
          background: 'var(--color-accent)',
          marginTop: -2,
        } as React.CSSProperties,
      }) : null
    );
  }));
};

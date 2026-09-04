// v3.0 Phase 2B-1: Responsive Layout Shell
// 3 layouts (mobile/tablet/desktop) с inline styles (WebView-friendly).
// Tablet (641–1024) — двухколоночный 30%/70% (RT9 friendly).
// Desktop (>1024) — фиксированная левая 280px + flex правая.
// Mobile (≤640) — single column (toggle между списком и активным чатом).

import React from 'react';
import { useBreakpoint, type Breakpoint } from '../hooks/useBreakpoint';

interface ResponsiveShellProps {
  leftPanel: React.ReactNode;   // список чатов / контактов
  rightPanel: React.ReactNode;  // активный чат или welcome placeholder
  tabBar?: React.ReactNode;     // нижний таббар (tablet)
  fab?: React.ReactNode;        // floating action button (tablet)
  topBar?: React.ReactNode;     // верхний бар (опционально, для будущего)
  // v3.0 Phase 2G: mobile floating circle nav (заменяет tabBar на mobile)
  mobileNav?: React.ReactNode;
  // v3.0 Phase 2H: desktop joystick (фиксированный слева)
  desktopNav?: React.ReactNode;
  // v3.0 Phase 2H: 3rd panel on desktop (profile)
  profilePanel?: React.ReactNode;
}

export const ResponsiveShell: React.FC<ResponsiveShellProps> = ({
  leftPanel,
  rightPanel,
  tabBar,
  fab,
  topBar,
  mobileNav,
  desktopNav,
  profilePanel,
}) => {
  const bp: Breakpoint = useBreakpoint();

  // Размеры и пропорции по пиксельной схеме пользователя (Aurora design tokens)
  const layout = {
    mobile: {
      container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        width: '100%',
        position: 'relative' as const,
      },
      left: { display: 'none' }, // скрывается когда открыт чат (toggle логика выше)
      right: { flex: 1, display: 'flex', flexDirection: 'column' as const, minHeight: 0 },
    },
    tablet: {
      container: {
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative' as const,
      },
      left: {
        width: '30%',
        minWidth: 240,
        maxWidth: 320,
        background: 'var(--color-bg-primary)',
        borderRight: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: 0,
      },
      right: {
        flex: 1,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column' as const,
        minWidth: 0,
      },
    },
    desktop: {
      container: {
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative' as const,
      },
      left: {
        width: 280,
        background: 'var(--color-bg-primary)',
        borderRight: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: 0,
      },
      right: {
        flex: 1,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column' as const,
        minWidth: 0,
      },
    },
  }[bp];

  return (
    <div
      data-testid={`responsive-shell-${bp}`}
      style={layout.container as React.CSSProperties}
    >
      {/* Top bar (опционально) */}
      {topBar}

      {/* Левая панель (список чатов / контактов) */}
      <div
        data-testid="left-panel"
        style={layout.left as React.CSSProperties}
      >
        {leftPanel}
      </div>

      {/* Правая панель (чат / welcome) */}
      <div
        data-testid="right-panel"
        style={layout.right as React.CSSProperties}
      >
        {rightPanel}
      </div>

      {/* Таббар (только tablet). Mobile: FloatingCircleNav; Desktop: joystick */}
      {tabBar && bp === 'tablet' && (
        <div
          data-testid="tab-bar"
          style={{
            position: 'relative',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
          } as React.CSSProperties}
        >
          {tabBar}
        </div>
      )}

      {/* FAB (tablet), на mobile заменён floating circle */}
      {fab && bp === 'tablet' && (
        <div
          data-testid="fab"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 35,
          } as React.CSSProperties}
        >
          {fab}
        </div>
      )}

      {/* v3.0 Phase 2G: mobile floating circle nav */}
      {mobileNav && bp === 'mobile' && (
        <div data-testid="mobile-nav">{mobileNav}</div>
      )}
    </div>
  );
};
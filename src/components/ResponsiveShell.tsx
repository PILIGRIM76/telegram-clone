// Адаптивная оболочка интерфейса.
// Три адаптивных макета со встроенными стилями для WebView.
// Планшет (641–1024) — две колонки 30%/70%, подходит для RT9.
// Настольный экран (>1024) — слева фиксированные 280px, справа гибкая панель.
// Телефон (≤640) — один столбец с переключением между списком и активным чатом.

import React from 'react';
import { useBreakpoint, type Breakpoint } from '../hooks/useBreakpoint';

interface ResponsiveShellProps {
  leftPanel: React.ReactNode; // список чатов / контактов
  rightPanel: React.ReactNode; // активный чат или welcome placeholder
  tabBar?: React.ReactNode; // Нижняя панель вкладок на планшете.
  fab?: React.ReactNode; // Плавающая кнопка действия на планшетах.
  topBar?: React.ReactNode; // верхний бар (опционально, для будущего)
  // Этап 2G: круговая навигация на телефоне вместо нижней панели вкладок.
  mobileNav?: React.ReactNode;
  // Этап 2H: джойстик, закреплённый слева на настольном экране.
  desktopNav?: React.ReactNode;

  profilePanel?: React.ReactNode;
  mobileShowList?: boolean;
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
  mobileShowList = false,
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
      left: {
        display: mobileShowList ? 'flex' : 'none',
        flexDirection: 'column' as const,
        width: '100%',
        minHeight: 0,
      },
      right: {
        flex: 1,
        display: mobileShowList ? 'none' : 'flex',
        flexDirection: 'column' as const,
        minHeight: 0,
      },
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
        // Этап 2H: отступ слева для джойстика (48px + 8px от края + 8px промежуток).
        width: 280,
        paddingLeft: 64,
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
    <div data-testid={`responsive-shell-${bp}`} style={layout.container}>
      {/* Top bar (опционально) */}
      {topBar}

      {/* Левая панель (список чатов / контактов) */}
      <div data-testid="left-panel" style={layout.left}>
        {leftPanel}
      </div>

      {/* Правая панель (чат / welcome) */}
      <div data-testid="right-panel" style={layout.right}>
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
          }}
        >
          {tabBar}
        </div>
      )}

      {/* Плавающая кнопка на планшете; на телефоне заменена круговой навигацией. */}
      {fab && bp === 'tablet' && (
        <div
          data-testid="fab"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 35,
          }}
        >
          {fab}
        </div>
      )}

      {/* Этап 2G: круговая навигация на телефоне. */}
      {mobileNav && bp === 'mobile' && <div data-testid="mobile-nav">{mobileNav}</div>}

      {/* Этап 2H: джойстик на настольном экране. */}
      {desktopNav && bp === 'desktop' && <div data-testid="desktop-nav">{desktopNav}</div>}

      {/* Этап 2H: третья панель профиля отображается только на настольном экране. */}
      {profilePanel && bp === 'desktop' && (
        <div data-testid="profile-panel" style={{ display: 'flex', flexShrink: 0 }}>
          {profilePanel}
        </div>
      )}

      {profilePanel && bp !== 'desktop' && (
        <div
          data-testid="profile-panel-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'var(--color-scrim)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: 'min(320px, 100%)',
              height: '100%',
              background: 'var(--color-bg-primary)',
              boxShadow: 'var(--shadow-3)',
            }}
          >
            {profilePanel}
          </div>
        </div>
      )}
    </div>
  );
};

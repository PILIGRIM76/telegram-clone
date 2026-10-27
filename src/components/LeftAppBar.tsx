// Этап 2B-2: верхняя панель левого списка контактов.
// Точное соответствие HTML-макету пользователя:
//   - Высота: 64px
// - Иконки: 24x24, контурный стиль lucide.
// - При наведении фон кнопок: rgba(0,0,0,0.04).
// Встроенные стили и CSS-переменные совместимы с WebView.

import React from 'react';

interface LeftAppBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  title?: string;
}

const iconButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
  color: 'var(--color-text-secondary)',
  transition: 'background 150ms ease-out',
};

const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
};

const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'transparent';
};

export const LeftAppBar: React.FC<LeftAppBarProps> = ({
  onMenuClick,
  onSearchClick,
  title = 'Чаты',
}) => {
  return (
    <div
      data-testid="left-app-bar"
      style={{
        height: 64,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg-primary)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onMenuClick}
        aria-label="Открыть меню"
        style={iconButtonStyle}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <h1
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0,
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </h1>

      <button
        onClick={onSearchClick}
        aria-label="Поиск"
        style={iconButtonStyle}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>
  );
};

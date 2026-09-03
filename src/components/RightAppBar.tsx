// v3.0 Phase 2B-2: RightAppBar — header для правой панели (ChatWindow).
// 64px height, padding 0 20px, AnimatedAvatar (Phase 1.5) 36px,
// 24x24 line-art icons, border-bottom 1px rgba(0,0,0,0.04),
// статус "онлайн" с точкой #38A169, Back-кнопка для мобильного toggle.

import React from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';

interface RightAppBarProps {
  contactName?: string;
  contactUid?: string;
  isOnline?: boolean;
  onCallClick?: () => void;
  onVideoClick?: () => void;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
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

export const RightAppBar: React.FC<RightAppBarProps> = ({
  contactName = 'Выберите контакт',
  contactUid,
  isOnline = false,
  onCallClick,
  onVideoClick,
  onMenuClick,
  onBackClick,
  showBack = false,
}) => {
  const hasContact = !!contactUid;

  return (
    <div
      data-testid="right-app-bar"
      style={{
        height: 64,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        flexShrink: 0,
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } as React.CSSProperties}>
        {showBack && (
          <button
            onClick={onBackClick}
            aria-label="Назад"
            style={iconButtonStyle}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}

        {hasContact && <AnimatedAvatar name={contactName} size={36} />}

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 } as React.CSSProperties}>
          <div
            data-testid="right-app-bar-name"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            } as React.CSSProperties}
          >
            {contactName}
          </div>
          {hasContact && (
            <div
              data-testid="right-app-bar-status"
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
              } as React.CSSProperties}
            >
              {isOnline && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#38A169',
                    display: 'inline-block',
                  } as React.CSSProperties}
                />
              )}
              <span>{isOnline ? 'онлайн' : 'был(а) недавно'}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 } as React.CSSProperties}>
        {hasContact && (
          <>
            <button
              onClick={onCallClick}
              aria-label="Аудиозвонок"
              style={iconButtonStyle}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              onClick={onVideoClick}
              aria-label="Видеозвонок"
              style={iconButtonStyle}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
            <button
              onClick={onMenuClick}
              aria-label="Меню чата"
              style={iconButtonStyle}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
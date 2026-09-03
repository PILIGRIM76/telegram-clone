// v3.0 Phase 2B-3: FloatingActionButton — плавающая кнопка "Написать".
// Pixel-perfect по HTML mockup пользователя:
//   - 56x56px circle
//   - Position: fixed bottom-right
//   - Gradient primary (terracot -> lavender)
//   - Hover: scale(1.05) + enhanced shadow
//   - z-index: 35 (выше контента, ниже модалок)

import React from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  bottomOffset?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  bottomOffset = 72,
}) => {
  const defaultIcon = (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 12px 32px var(--color-accent-glow, rgba(232, 106, 88, 0.5))';
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = '0 8px 24px var(--color-accent-glow, rgba(232, 106, 88, 0.5))';
  };

  return (
    <button
      onClick={onClick}
      data-testid="floating-action-button"
      aria-label="Написать"
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary-start, #E86A58), var(--color-primary-end, #B388EB))',
        border: 'none',
        boxShadow: '0 8px 24px var(--color-accent-glow, rgba(232, 106, 88, 0.5))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 35,
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
      } as React.CSSProperties}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {icon || defaultIcon}
    </button>
  );
};
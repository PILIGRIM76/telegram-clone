// v3.0 Phase 1.5: AnimatedAvatar — анимированный аватар с conic-gradient
// Использует Framer Motion для плавного вращения.
// Цвет генерируется из имени (детерминированно), что даёт стабильный визуал.

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedAvatarProps {
  name: string;
  size?: number;
  accentColor?: string;
  /** v3.0 Phase 2F: белая обводка 3px + дополнительная тень (для крупных аватаров в шапках) */
  bordered?: boolean;
}

/**
 * Генерирует второй цвет из имени (комплементарный к акценту).
 * Хеш имени → hue в HSL.
 */
function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Первые 2 буквы имени для отображения в аватаре.
 */
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * AnimatedAvatar — анимированный аватар 48×48 (по умолчанию).
 * Conic-gradient фон + инициалы по центру.
 */
export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  name,
  size = 48,
  accentColor,
  bordered = false
}) => {
  const color1 = accentColor || 'var(--color-accent, #E86A58)';
  const color2 = hashColor(name);
  const initials = getInitials(name) || '?';

  return (
    <div
      data-testid="animated-avatar"
      role="img"
      aria-label={`Avatar of ${name}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        // v3.0 Phase 2F: Aurora spec — белая обводка 3px (для Drawer header 72px)
        border: bordered ? '3px solid white' : 'none',
        boxShadow: bordered
          ? '0 2px 8px rgba(0,0,0,0.1), 0 4px 12px ' +
            (color1 === 'var(--color-accent, #E86A58)' ? 'rgba(232, 106, 88, 0.2)' : `${color1}33`)
          : `0 4px 12px ${color1 === 'var(--color-accent, #E86A58)' ? 'rgba(232, 106, 88, 0.2)' : `${color1}33`}`
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear'
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `conic-gradient(from 0deg, ${color1}, ${color2}, ${color1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: size * 0.33,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          letterSpacing: '0.5px',
          fontFamily: 'inherit'
        }}
      >
        {initials}
      </div>
    </div>
  );
};

export default AnimatedAvatar;
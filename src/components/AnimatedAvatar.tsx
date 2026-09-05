// v3.0 Phase 1.5: AnimatedAvatar — анимированный аватар с conic-gradient
// Использует Framer Motion для плавного вращения.
// Цвет генерируется из имени (детерминированно), что даёт стабильный визуал.

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedAvatarProps {
  name: string;
  size?: number;
  accentColor?: string;
  /** v3.0 Phase 2F: white 3px border + extra shadow (for large header avatars) */
  bordered?: boolean;
  /** E2EE status: verified/pending/unverified */
  e2eeStatus?: 'verified' | 'pending' | 'unverified';
  /** Online status indicator */
  isOnline?: boolean;
  /** Typing indicator */
  isTyping?: boolean;
  /** Avatar image URL (if set, overrides gradient) */
  avatarUrl?: string;
  /** Custom border color (default white for bordered, or avatar container color) */
  borderColor?: string;
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
 * AnimatedAvatar — animated avatar 48×48 (by default).
 * Conic-gradient background + initials centered.
 *
 * v3.0: Added E2EE status ring, online indicator, typing dots.
 * - verified: green ring + dot
 * - pending: amber ring (pulse) + dot
 * - unverified: accent ring (low opacity, spin)
 */
export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  name,
  size = 48,
  accentColor,
  bordered = false,
  e2eeStatus = 'unverified',
  isOnline = false,
  isTyping = false,
  avatarUrl,
  borderColor = '#0D0C0F',
}) => {
  const color1 = accentColor || 'var(--color-accent, #E86A58)';
  const color2 = hashColor(name);
  const initials = getInitials(name) || '?';

  const getRingColor = (): string => {
    switch (e2eeStatus) {
      case 'verified': return '#4CAF50';
      case 'pending': return '#FFC107';
      default: return color1;
    }
  };

  const getRingOpacity = (): number => {
    switch (e2eeStatus) {
      case 'verified': return 0.8;
      case 'pending': return 1;
      default: return 0.2;
    }
  };

  const getStatusDotColor = (): string => {
    if (e2eeStatus === 'verified') return '#4CAF50';
    if (e2eeStatus === 'pending') return '#FFC107';
    return isOnline ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)';
  };

  const borderStyle = bordered ? {
    border: '3px solid white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  } : {};

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
        ...borderStyle,
      }}
    >
      {/* E2EE ring */}
      <motion.div
        animate={{ rotate: e2eeStatus === 'pending' ? [0, 360] : 360 }}
        transition={{
          duration: e2eeStatus === 'pending' ? 2 : 10,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${getRingColor()}, transparent, ${getRingColor()})`,
          opacity: getRingOpacity(),
        }}
      />
      {/* Main avatar */}
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
      ) : (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, background: `conic-gradient(from 0deg, ${color1}, ${color2}, ${color1})`, zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: size * 0.33, textShadow: '0 1px 2px rgba(0,0,0,0.3)', letterSpacing: '0.5px', fontFamily: 'inherit', zIndex: 1 }}>
            {initials}
          </div>
        </>
      )}
      {/* E2EE status dot */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: size * 0.25, height: size * 0.25, borderRadius: '50%', background: getStatusDotColor(), border: `2px solid ${borderColor}`, zIndex: 2 }} />
      {/* Typing indicator */}
      {isTyping && (
        <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, zIndex: 2 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFC107', animation: `typing 1.4s infinite ${i * 0.2}s` }} />
          ))}
        </div>
      )}
        </div>
  );
};

export default AnimatedAvatar;
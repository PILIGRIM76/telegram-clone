import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const EmojiIcon: React.FC<IconProps> = ({ 
  size = 22, 
  color = 'currentColor', 
  className 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a10 10 0 0 0-6.32 17.28 10 10 0 0 0 12.64 0A10 10 0 0 0 12 2z" />
  </svg>
);

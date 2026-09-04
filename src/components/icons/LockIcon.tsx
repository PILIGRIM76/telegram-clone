import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const LockIcon: React.FC<IconProps> = ({ 
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
    <rect x="3" y="7" width="18" height="14" rx="2" />
    <path d="M7 7V5a5 5 0 0 1 10 0v2" />
  </svg>
);

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const DoubleCheckIcon: React.FC<IconProps> = ({ 
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
    <polyline points="20 6 9 17 4 12" />
    <polyline points="16 6 9 14 11 16" />
  </svg>
);

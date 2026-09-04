import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const EyeOffIcon: React.FC<IconProps> = ({ 
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
    <path d="M10.7 19.3a7.5 7.5 0 0 1-5.4-3.3L3 13l9-7 6 6.4a7.3 7.3 0 0 1 2.9 5.3M1 1l22 22" />
    <path d="M17.9 17.9A7.5 7.5 0 0 1 12 20a7.5 7.5 0 0 1-5.4-3.3L5 15" />
  </svg>
);

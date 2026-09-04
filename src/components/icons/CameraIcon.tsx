import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const CameraIcon: React.FC<IconProps> = ({ 
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
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1l1-2h6l1 2h7a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

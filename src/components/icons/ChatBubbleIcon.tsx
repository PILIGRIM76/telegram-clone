import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const ChatBubbleIcon: React.FC<IconProps> = ({ 
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

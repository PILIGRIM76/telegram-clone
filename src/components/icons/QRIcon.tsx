import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const QRIcon: React.FC<IconProps> = ({
  size = 22,
  color = 'currentColor',
  className,
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
    <path d="M3 7a2 2 0 0 1 2-2h2m-2 2v2m2-2h2M7 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7z" />
    <path d="M3 17a2 2 0 0 1 2-2h2m-2 2v2m2-2h2m-2 2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
    <path d="M7 12h10" />
    <path d="M12 7v10" />
  </svg>
);

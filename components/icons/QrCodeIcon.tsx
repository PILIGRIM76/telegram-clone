
import React from 'react';
export const QrCodeIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.5m0 0H4v2h2.5M10 16h2.5M19 19h-2v2h2v-2zm-6 0h-2v2h2v-2zM4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zM15 6h2v2h-2V6zM6 6h2v2H6V6zM6 16h2v2H6v-2z" />
  </svg>
);

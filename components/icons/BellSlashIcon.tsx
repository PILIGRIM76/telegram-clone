
import React from 'react';

export const BellSlashIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-11.25h.008v.008h-.008v-.008zM12 2.25h.008v.008H12V2.25zM12 6a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V6.75A.75.75 0 0112 6zm-3.25 6.32l2.25 2.25m0 0l-2.25 2.25M8.75 12l2.25-2.25M8.75 12l-2.25 2.25m6.75-6.32l-2.25 2.25m0 0l2.25 2.25m-2.25-2.25L13.25 9.75M12 21a8.25 8.25 0 005.25-15.31l-10.5 10.5A8.25 8.25 0 0012 21z"
    />
     <path 
       strokeLinecap="round" 
       strokeLinejoin="round" 
       d="M15.75 17.25L18 19.5m-5.25-5.25l-2.25 2.25m0 0l-2.25 2.25m2.25-2.25l-2.25-2.25M10.5 12l-2.25 2.25m5.25-5.25l2.25 2.25m0 0l-2.25 2.25m2.25-2.25l2.25-2.25M13.5 12l2.25-2.25M3.75 3.75l16.5 16.5" 
     />
  </svg>
);

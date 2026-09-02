// v1.6 Batch 4: простой Toast для feedback (mute/archive/verify).
// Само-скрывается через duration мс. Стек до 3 toast-ов.

import React, { useEffect } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  variant?: 'success' | 'info' | 'warn' | 'error';
}

interface ToastsProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const variantStyles: Record<NonNullable<ToastItem['variant']>, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', color: '#ffffff', icon: '✅' },
  info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', color: '#ffffff', icon: 'ℹ️' },
  warn: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', color: '#1e293b', icon: '⚠️' },
  error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', color: '#ffffff', icon: '❌' }
};

const SingleToast: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), 3000);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);

  const style = variantStyles[toast.variant || 'info'];
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast"
      style={{
        padding: '10px 14px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '8px',
        color: style.color,
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '200px',
        maxWidth: '360px'
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <span>{style.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          padding: 0,
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
};

export const Toasts: React.FC<ToastsProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label="Уведомления"
      style={{
        position: 'fixed',
        top: '60px',
        right: '16px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}
    >
      {toasts.slice(-3).map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <SingleToast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export default Toasts;
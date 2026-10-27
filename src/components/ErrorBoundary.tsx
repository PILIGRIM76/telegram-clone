import { logger } from '../services/logger';
// v3.0: ErrorBoundary для защиты UI от JS ошибок
// При сбое компонента показывает запасной экран вместо пустой страницы.
// В боевой сборке перехватывает ошибки рендеринга, записывает их в журнал и предлагает перезагрузить страницу.

import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('[PILIGRIM] ErrorBoundary caught:', error?.message);
    logger.error('[PILIGRIM] ErrorBoundary stack:', info?.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          data-testid="error-boundary-fallback"
          style={{
            padding: 24,
            color: '#fff',
            fontFamily: 'sans-serif',
            background: '#0f172a',
            minHeight: '100vh',
          }}
        >
          <h1 style={{ color: '#ff6b6b', margin: '0 0 16px' }}>PILIGRIM error</h1>
          <p style={{ color: '#f1f5f9', margin: '0 0 16px' }}>{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

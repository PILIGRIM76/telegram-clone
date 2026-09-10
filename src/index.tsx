import { logger } from './services/logger';

// Полифилл для crypto.randomUUID() ДОЛЖЕН быть первой строкой (до React/любых компонентов)
import './polyfills/crypto';
// Buffer polyfill для браузера (framer-motion/@emotion depend on Node.js Buffer)
import './polyfills/buffer';

// Tailwind CSS (PostCSS) — базовая тёмная тема + утилиты
import './index.css';

// React и зависимости
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Phase 9.5 fix: глобальная защита от ошибок, чтобы видеть что падает на устройстве
window.addEventListener('error', (event) => {
  logger.error('[PILIGRIM] GLOBAL ERROR:', event.error?.message || event.message);
  logger.error('[PILIGRIM] GLOBAL ERROR stack:', event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  logger.error('[PILIGRIM] UNHANDLED PROMISE:', event.reason);
});

// Диагностический boot-лог (после импортов, чтобы отражать реальный порядок выполнения)
logger.info('[PILIGRIM] BOOT: index.tsx loaded');
logger.info('[PILIGRIM] BOOT: typeof setTimeout =', typeof setTimeout);
logger.info('[PILIGRIM] BOOT: typeof Promise =', typeof Promise);
logger.info('[PILIGRIM] BOOT: typeof fetch =', typeof fetch);
logger.info('[PILIGRIM] BOOT: typeof console =', typeof console);
logger.info('[PILIGRIM] BOOT: typeof globalThis =', typeof globalThis);
logger.info('[PILIGRIM] BOOT: React imported, version', React.version);
logger.info('[PILIGRIM] BOOT: ReactDOM imported');
logger.info('[PILIGRIM] BOOT: App and LanguageProvider imported');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }
  logger.info('[PILIGRIM] BOOT: root element found');

  const root = ReactDOM.createRoot(rootElement);
  logger.info('[PILIGRIM] BOOT: React root created');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  logger.info('[PILIGRIM] BOOT: render() called SUCCESS');
} catch (e) {
  logger.error('[PILIGRIM] BOOT: FAILED:', e);
  logger.error('[PILIGRIM] BOOT: Stack:', (e as Error)?.stack);
}

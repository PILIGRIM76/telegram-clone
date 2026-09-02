
// Полифилл для crypto.randomUUID() ДОЛЖЕН быть первой строкой (до React/любых компонентов)
import './polyfills/crypto';

// Tailwind CSS (PostCSS) — базовая тёмная тема + утилиты
import './index.css';

// React и зависимости
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

// Phase 9.5 fix: глобальная защита от ошибок, чтобы видеть что падает на устройстве
window.addEventListener('error', (event) => {
  console.error('[PILIGRIM] GLOBAL ERROR:', event.error?.message || event.message);
  console.error('[PILIGRIM] GLOBAL ERROR stack:', event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[PILIGRIM] UNHANDLED PROMISE:', event.reason);
});

// Диагностический boot-лог (после импортов, чтобы отражать реальный порядок выполнения)
console.log('[PILIGRIM] BOOT: index.tsx loaded');
console.log('[PILIGRIM] BOOT: typeof setTimeout =', typeof setTimeout);
console.log('[PILIGRIM] BOOT: typeof Promise =', typeof Promise);
console.log('[PILIGRIM] BOOT: typeof fetch =', typeof fetch);
console.log('[PILIGRIM] BOOT: typeof console =', typeof console);
console.log('[PILIGRIM] BOOT: typeof globalThis =', typeof globalThis);
console.log('[PILIGRIM] BOOT: React imported, version', React.version);
console.log('[PILIGRIM] BOOT: ReactDOM imported');
console.log('[PILIGRIM] BOOT: App and LanguageProvider imported');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }
  console.log('[PILIGRIM] BOOT: root element found');

  const root = ReactDOM.createRoot(rootElement);
  console.log('[PILIGRIM] BOOT: React root created');

  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
  console.log('[PILIGRIM] BOOT: render() called SUCCESS');
} catch (e) {
  console.error('[PILIGRIM] BOOT: FAILED:', e);
  console.error('[PILIGRIM] BOOT: Stack:', (e as Error)?.stack);
}

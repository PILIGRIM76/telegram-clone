// Хук useEscapeKey закрывает модальное окно по клавише Escape.
// Использует стандартный шаблон доступности с клавиатуры (WAI-ARIA).

import { useEffect } from 'react';

export function useEscapeKey(handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}

export default useEscapeKey;

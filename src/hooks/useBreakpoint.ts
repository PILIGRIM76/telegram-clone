// Определяет точку адаптивной ширины: мобильная (≤640), планшетная (641–1024) или компьютерная (>1024).
// Устройство RT9 (800×1280) определяется как планшет: левая панель занимает около 30%, правая — 70%.

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getBreakpoint();
  });

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint());
    window.addEventListener('resize', onResize);
    // Сразу синхронизируем состояние после монтирования, в том числе при SSR-гидратации.
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}

function getBreakpoint(): Breakpoint {
  const w = window.innerWidth;
  // На RT9 ширина WebView равна 640 пикселям после вычета системной панели.

  if (w <= 600) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

// v3.0 Phase 2B-1: Responsive Layout Shell — useBreakpoint hook
// 3 breakpoints: mobile (≤640), tablet (641–1024), desktop (>1024)
// RT9 (800×1280) попадает в tablet — левая панель ~30%, правая ~70%.

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getBreakpoint();
  });

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint());
    window.addEventListener('resize', onResize);
    // Initial sync на случай SSR-гидратации
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}

function getBreakpoint(): Breakpoint {
  const w = window.innerWidth;
  if (w <= 640) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}
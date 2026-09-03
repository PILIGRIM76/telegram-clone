// v3.0 Phase 1: Time-based theme hook — автопереключение темы по времени суток.
// Каждую минуту проверяет час и применяет body.theme-{morning|day|evening|night}.

import { useState, useEffect } from 'react';

export type TimeTheme = 'morning' | 'day' | 'evening' | 'night';

function getThemeForHour(hour: number): TimeTheme {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Хук для автопереключения темы по времени суток.
 * - Каждую минуту проверяет текущий час
 * - Применяет body.theme-{name} класс
 * - Возвращает текущую тему для UI индикатора
 */
export function useTimeTheme(): TimeTheme {
  const [theme, setTheme] = useState<TimeTheme>(() => getThemeForHour(new Date().getHours()));

  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours();
      const newTheme = getThemeForHour(hour);
      setTheme((prev) => (prev !== newTheme ? newTheme : prev));
    };
    // Проверяем сразу при mount (могло пройти время с прошлого рендера)
    update();
    // Затем каждую минуту
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Применяем класс к body
  useEffect(() => {
    const body = document.body;
    if (!body) return;
    body.classList.remove('theme-morning', 'theme-day', 'theme-evening', 'theme-night');
    body.classList.add(`theme-${theme}`);
    console.log(`[PILIGRIM v3.0] theme switched to: ${theme}`);
  }, [theme]);

  return theme;
}

/**
 * Manual override темы (для тестирования).
 * Устанавливает заданную тему, отключает авто-переключение.
 */
export function useThemeOverride(theme: TimeTheme): void {
  useEffect(() => {
    const body = document.body;
    if (!body) return;
    body.classList.remove('theme-morning', 'theme-day', 'theme-evening', 'theme-night');
    body.classList.add(`theme-${theme}`);
  }, [theme]);
}

export { getThemeForHour };
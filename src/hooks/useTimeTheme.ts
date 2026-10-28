import { logger } from '../services/logger';
// Этап 1: хук автоматически переключает тему в зависимости от времени суток.
// Каждую минуту проверяет время и применяет класс body.theme-{morning|day|evening|night}.

import { useEffect, useState } from 'react';

export type TimeTheme = 'morning' | 'day' | 'evening' | 'night';

function getThemeForHour(hour: number): TimeTheme {
  if (hour >= 6 && hour < 12) return 'morning'; // мандарин
  if (hour >= 12 && hour < 18) return 'day'; // терракот
  if (hour >= 18 && hour < 23) return 'evening'; // фиолет
  return 'night'; // лавандовый
}

/**
 * Хук для автопереключения темы по времени суток.
 * - Каждую минуту проверяет текущий час
 * - Применяет класс body.theme-{name}.
 * - Возвращает текущую тему для индикатора интерфейса.
 */
export function useTimeTheme(): TimeTheme {
  const [theme, setTheme] = useState<TimeTheme>(() => getThemeForHour(new Date().getHours()));

  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours();
      const newTheme = getThemeForHour(hour);
      setTheme(prev => (prev !== newTheme ? newTheme : prev));
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
    logger.info(`[PILIGRIM v3.0] theme switched to: ${theme}`);
  }, [theme]);

  useEffect(() => {
    const applyPreference = (mode: string | null) => {
      const isDark = mode === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('theme-dark', isDark);
    };
    const handlePreferenceChange = (event: Event) => {
      applyPreference((event as CustomEvent<string>).detail);
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'cipherlink-theme') applyPreference(event.newValue);
    };

    applyPreference(localStorage.getItem('cipherlink-theme'));
    window.addEventListener('cipherlink:theme-change', handlePreferenceChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('cipherlink:theme-change', handlePreferenceChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

// Централизованный logger для PILIGRIM.
// debug/info подавляются в production (import.meta.env.DEV === false),
// warn/error всегда видны — это осознанный выбор: критические сбои
// должны оставлять след даже в релизе, а отладочный шум — нет.
// Это поддерживает privacy-позицию мессенджера (никаких скрытых логов
// метаданных), не лишая разработчика видимости ошибок.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// FIX 2026-09-10: import.meta.env ломает ts-jest (TS1343).
// Используем process.env — работает в Node (тесты) и заменяется Vite через define.
const isDev = process.env.DEV !== 'false';

class Logger {
  private prefix = '[PILIGRIM]';

  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (isDev) {
      console.info(this.prefix, ...args);
    }
  }

  warn(...args: unknown[]): void {
    // Всегда логируем предупреждения
    console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]): void {
    // Всегда логируем ошибки
    console.error(this.prefix, ...args);
  }
}

export const logger = new Logger();
export type { LogLevel };

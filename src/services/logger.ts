// Централизованный logger для PILIGRIM.
// Сообщения debug/info отключены в боевой сборке (import.meta.env.DEV === false),
// warn/error всегда видны — это осознанный выбор: критические сбои
// должны оставлять след даже в релизе, а отладочный шум — нет.
// Это поддерживает privacy-позицию мессенджера (никаких скрытых логов
// метаданных), не лишая разработчика видимости ошибок.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// import.meta.env не поддерживается в ts-jest (TS1343).
// process.env работает в Node.js в тестах и подставляется Vite через define.
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

import React from 'react';
import { SearchIcon } from './icons/SearchIcon';

interface LayoutProps {
  /** Содержимое сайдбара (список чатов и т.д.) */
  sidebar: React.ReactNode;
  /** Основное содержимое правой панели (ChatWindow / пустое состояние) */
  children: React.ReactNode;
  /** Обработчик клика на гамбургер-меню (открывает Drawer) */
  onMenuClick?: () => void;
}

/**
 * Макет в стиле Telegram Desktop.
 * Не меняет бизнес-логику, а только размещает существующие компоненты в новой структуре.
 */
export const Layout: React.FC<LayoutProps> = ({ sidebar, children, onMenuClick }) => {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-tg-background dark:bg-tg-dark-background"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ===== ЛЕВАЯ ПАНЕЛЬ ===== */}
      <aside
        className="
          w-[420px]
          min-w-[320px]
          bg-tg-sidebar
          dark:bg-tg-dark-sidebar
          border-r
          border-tg-border
          dark:border-tg-dark-border
          flex
          flex-col
          h-full
          z-10
          flex-shrink-0
        "
      >
        {/* Шапка сайдбара: гамбургер + поиск */}
        <header
          className="
            flex
            items-center
            gap-2
            px-3
            py-3
            border-b
            border-tg-border
            dark:border-tg-dark-border
            flex-shrink-0
          "
        >
          <button
            type="button"
            aria-label="Открыть меню"
            className="
              p-2
              hover:bg-tg-hover
              dark:hover:bg-tg-dark-hover
              rounded-full
              transition-colors
              duration-200
              flex-shrink-0
            "
            onClick={onMenuClick}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-tg-text dark:text-tg-dark-text"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div
            className="
              flex-1
              min-w-0
              rounded-full
              bg-tg-hover
              dark:bg-tg-dark-hover
              px-3
              py-1.5
              flex
              items-center
              gap-2
            "
          >
            <SearchIcon className="w-4 h-4 text-tg-textSecondary dark:text-tg-dark-textSecondary" />
            <input
              type="text"
              placeholder="Поиск"
              className="
                flex-1
                bg-transparent
                border-none
                outline-none
                text-sm
                text-tg-text
                dark:text-tg-dark-text
                placeholder:text-tg-textSecondary
                dark:placeholder:text-tg-dark-textSecondary
              "
            />
          </div>
        </header>

        {/* Скроллируемый список чатов */}
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
      </aside>

      {/* ===== ПРАВАЯ ПАНЕЛЬ (Main Chat) ===== */}
      <main
        className="
          flex-1
          flex
          flex-col
          bg-tg-background
          dark:bg-tg-dark-background
          relative
          overflow-hidden
        "
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;

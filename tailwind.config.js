/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ===== СВЕТЛАЯ ТЕМА (Telegram Desktop) =====
        tg: {
          primary: '#3390EC',      // акцент Telegram
          primaryHover: '#2579D1',
          background: '#FFFFFF',   // фон приложения
          sidebar: '#F4F4F5',      // фон сайдбара
          sidebarBorder: '#DADCE0',
          incoming: '#FFFFFF',     // фон входящего сообщения
          outgoing: '#EFFDDE',     // фон исходящего сообщения
          text: '#000000',         // основной текст
          textSecondary: '#707579',// время, статус
          border: '#DADCE0',       // разделители
          hover: '#F0F2F5',        // hover элементов
          menuBg: '#FFFFFF',
          menuHover: '#F0F2F5',
          menuText: '#000000',
          danger: '#E5484D',
          success: '#2E9E6B',
        },
        // ===== ТЁМНАЯ ТЕМА (Telegram Desktop) =====
        'tg-dark': {
          primary: '#3390EC',      // акцент Telegram
          primaryHover: '#2579D1',
          background: '#0E1621',   // фон приложения
          sidebar: '#17212B',      // фон сайдбара
          sidebarBorder: '#0E1621',
          incoming: '#182533',     // фон входящего сообщения
          outgoing: '#2B5278',     // фон исходящего сообщения
          text: '#FFFFFF',         // основной текст
          textSecondary: '#AAAAAA',// время, статус
          border: '#0E1621',       // разделители
          hover: '#232E3C',        // hover элементов
          menuBg: '#2B5278',
          menuHover: '#3A6EA5',
          menuText: '#FFFFFF',
          danger: '#FF6B6B',
          success: '#4CC38A',
        },
      },
      borderRadius: {
        bubble: '10px',
        chat: '2xl',
      },
    },
  },
  plugins: [],
};

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
          primary: '#3390EC',      // акцент / исходящие пузыри
          primaryHover: '#2579D1',
          background: '#FFFFFF',   // фон приложения
          sidebar: '#FFFFFF',      // фон сайдбара
          sidebarBorder: '#DADCE0',
          incoming: '#FFFFFF',     // фон входящего сообщения
          outgoing: '#EEFFDE',     // фон исходящего сообщения
          text: '#000000',         // основной текст
          textSecondary: '#707579',// время, статус
          border: '#DADCE0',       // разделители
          hover: '#F0F2F5',        // hover элементов
        },
        // ===== ТЁМНАЯ ТЕМА (Telegram Desktop) =====
        'tg-dark': {
          primary: '#8774E1',      // акцент (тёмная)
          primaryHover: '#6F5DD3',
          background: '#17212B',   // фон приложения
          sidebar: '#17212B',      // фон сайдбара
          sidebarBorder: '#0E1621',
          incoming: '#182533',     // фон входящего сообщения
          outgoing: '#2B5278',     // фон исходящего сообщения
          text: '#F5F5F5',         // основной текст
          textSecondary: '#6C7883',// время, статус
          border: '#0E1621',       // разделители
          hover: '#232E3C',        // hover элементов
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

# Структура проекта CipherLink

## Основные каталоги

```text
CipherLink/
├── src/
│   ├── components/     # React-интерфейс и переиспользуемые компоненты
│   ├── contexts/       # React-контексты
│   ├── crypto/         # Криптографические модули, включая Signal
│   ├── generated/      # Сгенерированные исходные данные
│   ├── hooks/          # React-хуки
│   ├── polyfills/      # Совместимость с окружениями браузера
│   ├── services/       # API, транспорт и сервисы приложения
│   ├── types/          # Общие типы
│   ├── utils/          # Вспомогательные функции
│   ├── App.tsx         # Композиция и состояние приложения
│   ├── index.css       # Глобальные стили и CSS-переменные
│   └── index.tsx       # Точка входа React
├── electron/           # Main process Electron
├── server/             # Серверные модули
├── db/                 # Данные и компоненты базы данных
├── android/            # Android-проект Capacitor
├── public/             # Статические ресурсы веб-приложения
├── test/               # Тесты
├── scripts/            # Скрипты сборки и проверки
├── build/              # Ресурсы сборщика приложения
├── server.js           # Запуск backend-сервера
├── vite.config.ts      # Конфигурация Vite и Electron-плагина
├── tailwind.config.js  # Tailwind-токены интерфейса
└── package.json        # Зависимости и команды проекта
```

## Интерфейс

`src/App.tsx` связывает основные области приложения. Адаптивная композиция использует
`src/components/ResponsiveShell.tsx`, список контактов — `ContactList.tsx`, окно активного чата — `ChatWindow.tsx`.
`Layout.tsx` также присутствует как отдельный компонент раскладки, но текущая композиция `App.tsx` его не использует.

Стилизация основана на React, TypeScript, Vite и Tailwind CSS. Цветовые токены Telegram-палитры объявлены в
`tailwind.config.js`; глобальные стили и CSS-переменные определены в `src/index.css`.

## Desktop и сервер

Desktop-клиент работает на Electron: `electron/main.ts` запускает `server.js`, ожидает признак готовности backend и
создаёт окно приложения. Сборку Electron конфигурирует electron-builder; статические ресурсы подаются с относительными
путями для загрузки приложения через `file://`.

Серверная часть включает `server.js`, каталог `server/` и каталог `db/`. Команды разработки и сборки платформ находятся
в `package.json`.

## Платформы и тесты

- Веб-клиент собирается Vite.
- Android-проект находится в `android/` и интегрирован через Capacitor.
- Desktop-клиент собирается Electron Builder.
- Тесты расположены в `test/`; команды доступны в `package.json`.

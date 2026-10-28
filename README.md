<div align="center">
<img width="1200" height="475" alt="CipherLink Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CipherLink v1.0.0 — Secure E2EE Messenger

**CipherLink** (ШифроСвязь) — полностью автономный защищенный мессенджер с end-to-end шифрованием, WebRTC звонками и Desktop-клиентом на Electron.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- npm 9+

### Установка зависимостей
```bash
npm install
```

### Настройка окружения
Создайте `.env.local` на основе `.env.example`:
```bash
cp .env.example .env.local
```
Настройте `GEMINI_API_KEY` и другие переменные при необходимости.

## 💻 Запуск

### Веб-версия (Dev)
```bash
npm run dev
```
Откроется на http://localhost:5173

### Desktop-версия (Dev)
```bash
npm run dev:electron
```
Запускает Vite dev server + Electron параллельно. Бэкенд запускается автоматически.

### Desktop-версия (Production)

#### Windows
```bash
npm run build:win
```
Создаёт Portable EXE в `release/`.

#### macOS
```bash
npm run build:mac
```
Создаёт DMG в `release/`

#### Linux
```bash
npm run build:linux
```
Создаёт AppImage в `release/`.

### Сервер (отдельно)
```bash
npm run server
```
Запускает только бэкенд на порту 4000 (WebSocket + REST API).

## 🚀 Автоматическая сборка (CI/CD)

При создании тега версии (например, `v1.0.1`) GitHub Actions автоматически:
1. Запускает все тесты (`npm test`)
2. Собирает Portable EXE для Windows
3. Собирает AppImage для Linux
4. Создаёт GitHub Release с прикреплёнными файлами

### Как создать релиз:
```bash
git tag v1.0.1
git push origin v1.0.1
```

### Workflow детали
- **Триггер**: push тега `v*` (например, v1.0.1, v1.1.0)
- **Матрица**: Windows (portable EXE) + Linux (AppImage)
- **Кэширование**: `node_modules` + Electron binary
- **Иконка**: использует `build/piligrim.ico` из репозитория (не генерирует на лету)
- **Артефакты**: загружаются в GitHub Actions, прикрепляются к Release

---

## 📦 Сборка Desktop-клиента

### Автономное приложение
Desktop-версия запускает Node.js бэкенд (`server.js`) вместе с приложением:
- Main process запускает бэкенд и ожидает сообщение о готовности; предусмотрен таймаут ожидания 10 секунд.
- После этого создаётся окно приложения размером 1200×800.
- При закрытии приложения процесс бэкенда завершается.

### Артефакты сборки
- **Windows**: Portable EXE
- **macOS**: DMG образ
- **Linux**: AppImage

### Команды
```bash
npm run build:electron    # electron-builder согласно конфигурации и текущей платформе
npm run build:win         # Windows Portable
npm run build:mac         # macOS DMG
npm run build:linux       # Linux AppImage
```

## 🔧 Архитектура Desktop-клиента

- **Electron Main Process** (`electron/main.ts`): управление окном, спавн бэкенда, автоопределение готовности
- **Vite Plugin Electron**: компиляция main process через `vite-plugin-electron/simple`
- **electron-builder**: сборка для Windows (Portable), macOS (DMG) и Linux (AppImage) отдельными командами
- **asarUnpack**: server.js, server/**, db/** — для работы с файловой системой
- **Пути ресурсов**: Vite собирает с `base: './'`; плагин сборки приводит пути ресурсов к относительным для загрузки через `file://` в Electron.
- **Обход ошибки сборки Vite**: `vite-plugin-pwa` удалён из конфигурации из-за проблемы `html-proxy`, возникавшей с inline CSS и директивами Tailwind.

## 🧩 Архитектура интерфейса

- **Точка входа** — `src/App.tsx`: управляет состоянием приложения и соединяет список контактов, активный чат, навигацию и модальные окна.
- **Адаптивная оболочка** — `src/components/ResponsiveShell.tsx`: размещает левую панель и активную область; раскладка зависит от мобильного, планшетного или настольного breakpoint.
- **Чаты** — `src/components/ContactList.tsx` отображает список контактов, а `src/components/ChatWindow.tsx` — заголовок чата, сообщения и поле отправки.
- **`src/components/Layout.tsx`** — отдельный компонент раскладки с боковой панелью и основной областью; `App.tsx` сейчас использует `ResponsiveShell`, а не `Layout`.
- **Вспомогательные компоненты** находятся в `src/components/`; общие React-контексты, хуки, сервисы и типы — в соответствующих каталогах `src/`.
- **Оформление** — Tailwind CSS 3 с цветовыми классами `tg-*` и `tg-dark-*`, определёнными в `tailwind.config.js`; глобальные стили и CSS-переменные находятся в `src/index.css`.

Редизайн интерфейса в направлении Telegram Desktop включён: обновлены оболочка и окно чата, список чатов, пузырьки сообщений, индикаторы статуса и адаптивные панели. Это описание направления реализации, а не утверждение о полном визуальном паритете с Telegram Desktop.

## 🛠️ Версии основного стека

- React `18.3.1` (диапазон в `package.json`: `^18.2.0`)
- TypeScript `5.9.3` (диапазон в `package.json`: `^5.0.2`)
- Vite `4.5.14` (диапазон в `package.json`: `^4.4.5`)
- Tailwind CSS `3.4.19` (диапазон в `package.json`: `^3.3.3`)
- Electron `44.9.3` (диапазон в `package.json`: `^44.4.5`)

Установленные версии проверены 27 октября 2026 командой `npm ls react vite tailwindcss electron --depth=0`; диапазоны зависимостей берутся из `package.json`.

## 📚 Документация

- [Структура проекта](PROJECT_STRUCTURE.md) — каталоги и назначение основных частей приложения
- Заметки Obsidian хранятся во внешнем Vault и не входят в репозиторий.

## 📄 Лицензия
MIT License — см. [LICENSE](LICENSE)
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
Создает:
- `release/CipherLink Setup 1.0.0.exe` — NSIS установщик
- `release/CipherLink 1.0.0.exe` — Portable версия

#### macOS
```bash
npm run build:mac
```
Создает `release/CipherLink-1.0.0.dmg`

#### Linux
```bash
npm run build:linux
```
Создает `AppImage` и `.deb` пакеты

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
Desktop-версия полностью автономна:
- Автоматически запускает Node.js бэкенд (server.js) при старте
- Ждет готовности бэкенда ("Сервер на порту 4000")
- Открывает окно чата 1200×800
- Корректно завершает бэкенд при закрытии окна

### Артефакты сборки
- **Windows**: NSIS установщик + Portable (~208 MB каждый)
- **macOS**: DMG образ
- **Linux**: AppImage + DEB пакет

### Команды
```bash
npm run build:electron    # Все платформы
npm run build:win         # Windows (NSIS + Portable)
npm run build:mac         # macOS DMG
npm run build:linux       # Linux AppImage + DEB
```

## 🔧 Архитектура Desktop-клиента

- **Electron Main Process** (`electron/main.ts`): управление окном, спавн бэкенда, автоопределение готовности
- **Vite Plugin Electron**: компиляция main process через `vite-plugin-electron/simple`
- **electron-builder**: сборка под Windows (NSIS/Portable), macOS (DMG), Linux (AppImage/DEB)
- **asarUnpack**: server.js, server/**, db/** — для работы с файловой системой

## 📚 Документация

- [ROADMAP.md](https://github.com/...) — дорожная карта проекта
- [Obsidian Vault](https://github.com/...) — вторая мозг проекта (Features, Architecture, Decisions, Logs)
- [Features/Desktop-Electron-Packaging](https://github.com/...) — детали Desktop упаковки

## 📄 Лицензия
MIT License — см. [LICENSE](LICENSE)
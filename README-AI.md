# 🤖 ИНСТРУКЦИЯ ДЛЯ AI-АССИСТЕНТА

## Привет! Ты работаешь над проектом PILIGRIM (ранее CipherLink/ШифроСвязь).

### Перед началом работы:

1. **Прочитай `.clinerules`** (или `.cursorrules` если ты в Cursor) — там все правила работы с проектом
2. **Прочитай `F:/Obsidian_Vaults/AntiPiry/PILIGRIM/ROADMAP.md`** — пойми текущий этап
3. **Прочитай `F:/Obsidian_Vaults/AntiPiry/PILIGRIM/MOC.md`** — навигация по знаниям

---

## 🔧 Ключевые технологии:

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + PostgreSQL + Redis (в Docker)
- **Mobile:** Capacitor (Android/iOS)
- **Desktop:** Tauri (Windows/Mac/Linux)
- **WebRTC:** simple-peer для P2P звонков
- **E2EE:** tweetnacl (X25519 + Ed25519) + Web Crypto API (RSA-OAEP)
- **Документация:** Obsidian (второй мозг проекта)

---

## 📊 Текущее состояние (2026-09-01):

- ✅ **Фаза 7.5:** UI Revival (двухколоночный layout, базовые хендлеры)
- ✅ **Фаза 7.6:** E2EE + WebSocket (RSA-OAEP шифрование, Seed-phrase, исчезающие сообщения)
- ✅ **Фаза 8:** Screen Sharing (getDisplayMedia + UI кнопка + локальный превью)
- ✅ **Фаза 9:** Деплой на планшет RT9 (Docker + Vite dev-сервер + Capacitor)
- 🚧 **Фаза 10:** Production deployment (VPS + HTTPS + CI/CD)

---

## ⚠️ Важно помнить:

- **Всегда** обновляй документацию в Obsidian после изменений
- **Всегда** коммить на GitHub с Conventional Commits
- **Всегда** проверяй `npm run build` и `npm test` перед коммитом
- **Никогда** не используй инструмент `shell` — только `run_commands`, `editor`, `read_files`, `search_codebase`

---

## 📞 Контакты:

- **GitHub:** [ссылка на репозиторий]
- **Obsidian Vault:** `F:/Obsidian_Vaults/AntiPiry/PILIGRIM/`
- **Docker порты:**
  - `4000` — backend API
  - `4100` — frontend (production build)
  - `5434` — PostgreSQL
  - `6381` — Redis
- **Vite dev-сервер:** `http://192.168.100.4:5173` (для планшета RT9)

---

## 🛠️ Полезные команды:

```bash
# Разработка
npm run dev          # Vite dev-сервер на 5173
npm run build        # Production сборка
npm test             # Запуск тестов (Jest)

# Docker
docker compose up -d         # Запустить все сервисы
docker compose logs -f       # Смотреть логи
docker compose down          # Остановить

# Capacitor
npx cap sync android         # Синхронизировать с Android
npx cap open android         # Открыть Android Studio
npm run android              # Собрать и запустить APK

# ADB (планшет RT9)
adb devices                  # Список устройств
adb shell am start ...       # Запустить приложение
adb logcat | findstr ...     # Логи в реальном времени
```

---

## 📁 Структура проекта:

```
AntiPiry/
├── .clinerules              # Правила для AI (Cline)
├── .cursorrules             # Правила для AI (Cursor)
├── README-AI.md             # Этот файл
├── src/                     # Frontend (React)
│   ├── components/          # UI компоненты
│   ├── hooks/               # React хуки (useWebRTC, useChat...)
│   ├── services/            # Бизнес-логика (webrtc, e2ee, api)
│   └── App.tsx              # Главный компонент
├── server/                  # Backend (Express)
│   ├── routes/              # API эндпоинты
│   ├── prisma/              # Схема БД
│   └── index.ts             # Точка входа
├── android/                 # Capacitor Android wrapper
└── docker-compose.yml       # Docker инфраструктура
```

---

## 🚀 Быстрый старт для новой AI-сессии:

1. Прочитай `.clinerules` → пойми правила
2. Прочитай Obsidian `ROADMAP.md` → пойми контекст
3. Спроси пользователя о текущей задаче
4. Используй только разрешённые инструменты
5. Обновляй документацию параллельно с кодом
6. Коммить маленькими логическими единицами

**Удачной работы! 🎉**
# Active Context

## Текущая задача

Финальная подготовка релиза CipherLink v1.0.6+ — Android CI/CD, оптимизация производительности бэкенда, ядро подписок (Subscription Core) и лимиты Freemium.

## Актуальный статус ветки

feature/signal-protocol

## Известные проблемы

1. Конфликты форматов строк (CRLF vs LF) — требуется строгое соблюдение LF
2. Необходимость строгого соблюдения токенов tg-* в Tailwind CSS (никаких хардкодов HEX)
3. Риск случайного изменения криптографической логики при рефакторинге
4. Все комментарии в кодовой базе на русском языке

## ✅ Завершенные этапы (v1.0.0 - v1.0.5)

- **Core & Security:** E2EE реализовано (Signal Protocol), исправлены уязвимости RNG (`Math.random` → `crypto.getRandomValues`).
- **UI/UX:** Редизайн под Telegram Desktop (токены `tg-*`, темная тема, адаптивность).
- **Features:** Username Search, Reactions, Edit/Delete, Disappearing Messages.
- **Admin Panel:** Backend API (`/api/admin/*`) + Frontend UI (Dashboard, Users, Reports, Settings). Автоматическое определение роли при логине.
- **CI/CD Infrastructure:** Миграция на Node.js 24 (Node 20 deprecated), фиксация Ubuntu 24.04, очистка CRLF/LF конфликтов.

## 🚧 Текущая разработка (v1.0.6+)

- **Mobile Pipeline:** Настроен GitHub Actions workflow `.github/workflows/android-build.yml` для автоматической сборки APK через Capacitor при создании тегов `v*`.
- **Performance:**
  - SQLite WAL Mode активирован (`journal_mode = WAL`, `synchronous = NORMAL`).
  - Внедрен TTL-Cache (`server/utils/cache.js`) для профилей пользователей и контактов.
  - WebSocket Heartbeat добавлен для очистки зависших соединений.
  - Global Rate Limiting (`express-rate-limit`) подключен к серверу.
- **Monetization (Subscription Core):**
  - Модель данных `Subscription` создана в БД (`server/databaseService.js`, таблица `subscriptions`).
  - Middleware `planChecker` (`server/utils/planChecker.js`) реализует лимиты Freemium (Free: 5MB файлов / 5 контактов; Pro: безлимит).
  - Эндпоинты `GET /api/subscriptions/me` и админский грант планов (`POST /api/admin/subscriptions/grant`) готовы.
  - Frontend интегрирован: бейджи FREE/PRO в Drawer, Toast-уведомления при превышении лимитов, метод `apiService.fetchMySubscription()`.

## Проверка

- `npx tsc --noEmit` — Pass
- `npm run build` — Pass
- `require('./server/databaseService.js')` — OK
- `require('./server/utils/planChecker.js')` — OK
- `require('./server/utils/cache.js')` — OK

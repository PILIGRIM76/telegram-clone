# Active Context

## Текущая задача

Финальный технический аудит кода и инфраструктуры проекта CipherLink — завершён. Готов к релизу v1.0.4.

## Актуальный статус ветки

feature/signal-protocol

## Известные проблемы

1. Конфликты форматов строк (CRLF vs LF) — требуется строгое соблюдение LF
2. Необходимость строгого соблюдения токенов tg-* в Tailwind CSS (никаких хардкодов HEX)
3. Риск случайного изменения криптографической логики при рефакторинге
4. **Все комментарии в кодовой базе теперь на русском языке** (переведены: src/components/ForwardModal.tsx,
   src/components/MessageItem.tsx, server/databaseService.js, server.js)

## Прогресс

Этап санитайзинга завершен. Все файлы переведены в LF. Дизайн проверен на соответствие токенам tg-*. Message Reactions
(эмодзи-реакции) полностью реализованы: REST API, WebSocket broadcast, API service, UI в MessageItem.tsx. **Edit/Delete
Messages (редактирование и удаление сообщений) полностью реализовано:**

- Backend: WS сообщения `message_edit` / `message_delete` + broadcast `message_edited` / `message_deleted`
- Types: `Message` имеет `editedAt`, `isEdited`, `isDeleted`
- Service: `apiService.sendMessageEdit()`, `sendMessageDelete()`, слушатели `onMessageEdited`, `onMessageDeleted`
- UI: режим редактирования в MessageInput (баннер с кнопкой "Отмена"), контекстное меню в MessageItem
- Интеграция: `ChatWindow` управляет состоянием `editingMessageId`, `MessageList` вызывает `handleStartEdit`
- Build verified: `npm run build` проходит успешно

**Disappearing Messages (самоудаляющиеся сообщения) полностью реализовано:**

- Backend: БД имеет `expires_at` поле, `saveMessage` рассчитывает TTL, cron job (каждую минуту) удаляет истекшие
  сообщения и шлёт WS `message_expired` отправителю и получателю
- Service: `apiService.onMessageExpired()` / `offMessageExpired()`, `useWebSocket` подписывается на событие
- App.tsx: обрабатывает `message_expired` — удаляет сообщение из локального стора; `handleSendMessage` принимает `ttl` и
  передаёт в `sendMessageSecure` / `sendMessage` + добавляет `disappearIn`, `timerSetAt`, `expiresAt` в локальное
  сообщение
- UI: `MessageTimerSelection` (выбор таймера: Off, 5с, 30с, 1ч, 1д, 1н) интегрирован в `ChatWindow` (MessageInput);
  `MessageItem` показывает обратный отсчёт ⏳ рядом со временем (обновляется каждые 10 сек); при истечении клиент
  оптимистично скрывает сообщение, ожидая подтверждения сервера
- Build verified: `npm run build` проходит успешно

**Forward Messages (пересылка сообщений) полностью реализовано:**

- Backend: REST endpoint `/api/messages/:id/forward`, `forwardMessage()` в databaseService.js, поле `forwarded_from`
  (JSON) в SQLite
- Service: `apiService.forwardMessage(messageId, targetChatIds[])` → POST /forward
- Types: `Message.forwardedFrom` с `originalSenderUid`, `originalMessageId`, `forwardCount`, `originalSenderName`
- App.tsx: state `showForwardModal`, `forwardTargetMessage`; handlers `handleForwardMessage`, `handleForwardConfirm`;
  рендер `<ForwardModal />`
- UI: `ForwardModal` (Search + чекбоксы контактов/групп, UserCircleIcon/UserPlusIcon); `MessageItem` контекстное меню
  "Переслать" (↪️); отображение "Переслано от: [Имя] (Nx)" над текстом
- Проброс: `App` → `ChatWindow` → `MessageList` → `MessageItem` через `onForwardMessage`
- E2EE: пересланное сообщение шифруется заново для каждого получателя через `sendMessageSecure`
- Build verified: `npm run build` проходит успешно

**Админ-панель v4.0 — полностью реализована (включая ReportsPage и SettingsPage):**

1. **Backend — БД (server/databaseService.js):**
   - Колонка `role TEXT DEFAULT 'user'` в таблице `users`
   - Таблица `reports` (id, reporter_id, target_user_id, message_id, reason, status, created_at)
   - Функции: getUsersPaginated, getUsersCount, getAdminStats, banUserAccount, createReport, getReports, updateReportStatus

2. **Backend — Middleware (server/middleware/adminGuard.js):** JWT + роль 'admin', 403 Forbidden если не админ

3. **Backend — Роуты (server/routes/admin.routes.js):**
   - GET /api/admin/stats, GET /api/admin/users, POST /api/admin/users/:id/ban
   - GET /api/admin/reports, POST /api/admin/reports/:id/resolve, POST /api/admin/reports/:id/dismiss

4. **Frontend — API клиент (src/services/adminService.ts):** все методы для админских эндпоинтов

5. **Frontend — Страницы:**
   - src/pages/admin/DashboardPage.tsx — статистика
   - src/pages/admin/UsersPage.tsx — таблица пользователей с блокировкой
   - src/pages/admin/ReportsPage.tsx — жалобы с фильтром по статусу, Resolve/Dismiss кнопки
   - src/pages/admin/SettingsPage.tsx — системные настройки, версия, Danger Zone

6. **Frontend — Layout (src/components/admin/AdminLayout.tsx):** боковое меню с навигацией между страницами, выход

7. **Frontend — Интеграция (src/App.tsx):** если cipherlink-is-admin === 'true' — рендерится AdminLayout

**Безопасность:** Админ видит только метаданные. Содержимое зашифрованных сообщений недоступно.

**Проверка:** `npx tsc --noEmit` — Pass, `npm run build` — Pass.

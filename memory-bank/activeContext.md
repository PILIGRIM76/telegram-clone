# Active Context

## Текущая задача

Forward Messages (пересылка сообщений) — реализация завершена.

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

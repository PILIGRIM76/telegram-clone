# Active Context

## Текущая задача
Финишная прямая UI редизайна + нормализация кода (LF/CRLF).

## Актуальный статус ветки
feature/signal-protocol

## Известные проблемы
1. Конфликты форматов строк (CRLF vs LF) — требуется строгое соблюдение LF
2. Необходимость строгого соблюдения токенов tg-* в Tailwind CSS (никаких хардкодов HEX)
3. Риск случайного изменения криптографической логики при рефакторинге

## Прогресс
Этап санитайзинга завершен. Все файлы переведены в LF. Дизайн проверен на соответствие токенам tg-*.
Message Reactions (эмодзи-реакции) полностью реализованы: REST API, WebSocket broadcast, API service, UI в MessageItem.tsx.
**Edit/Delete Messages (редактирование и удаление сообщений) полностью реализовано:**
- Backend: WS сообщения `message_edit` / `message_delete` + broadcast `message_edited` / `message_deleted`
- Types: `Message` имеет `editedAt`, `isEdited`, `isDeleted`
- Service: `apiService.sendMessageEdit()`, `sendMessageDelete()`, слушатели `onMessageEdited`, `onMessageDeleted`
- UI: режим редактирования в MessageInput (баннер с кнопкой "Отмена"), контекстное меню в MessageItem
- Интеграция: `ChatWindow` управляет состоянием `editingMessageId`, `MessageList` вызывает `handleStartEdit`
- Build verified: `npm run build` проходит успешно
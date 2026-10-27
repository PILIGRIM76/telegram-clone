# System Patterns

## Дизайн-система
Pixel-perfect клон Telegram Desktop.

## Цвета
**Только семантические токены из tailwind.config.js:**
- `bg-tg-background` / `bg-tg-dark-background` — фон приложения
- `text-tg-text` / `text-tg-dark-text` — основной текст
- `bg-tg-primary` / `bg-tg-primaryHover` — акцентные элементы
- `bg-tg-outgoing` — фон исходящих сообщений
- `bg-tg-incoming` — фон входящих сообщений
- `bg-tg-sidebar` — фон сайдбара

**Запрещено:** хардкод HEX/RGB цветов.

## Компоненты
- **Пузыри сообщений:**
  - Исходящие: `ml-auto bg-tg-outgoing rounded-2xl rounded-tr-sm`
  - Входящие: `mr-auto bg-tg-incoming rounded-2xl rounded-tl-sm`
- **Аватары:** 54px (размер по умолчанию)
- **Сайдбар:** 420px ширина
- **Галочки прочтения:** синие (`text-blue-500`) только при статусе 'read'
- **Скроллбары:** тонкие (6px), полупрозрачные

## Безопасность
- Логика шифрования Signal Protocol (`src/crypto/signal/*`, `src/services/cryptoService.ts`) **неприкосновенна** без явного запроса пользователя на фикс конкретного бага
- При работе с ключами всегда проверяй наличие `identity` перед вызовом функций
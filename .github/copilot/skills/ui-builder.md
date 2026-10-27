# Навык: Telegram UI Builder

## Инструкция
При создании нового компонента интерфейса следуй этим правилам:
1. Структура: Оборачивай контент в `<Layout>` или используй классы `flex h-screen w-screen overflow-hidden`.
2. Цвета: Используй ТОЛЬКО семантические классы Tailwind из `tailwind.config.js`:
   - Фон: `bg-tg-background dark:bg-tg-dark-background`
   - Текст: `text-tg-text dark:text-tg-dark-text`
   - Акцент: `bg-tg-primary hover:bg-tg-primaryHover`
3. Сообщения:
   - Исходящие: `ml-auto bg-tg-outgoing rounded-2xl rounded-tr-sm`
   - Входящие: `mr-auto bg-tg-incoming rounded-2xl rounded-tl-sm`
4. Иконки: Используй библиотеку `lucide-react` или SVG из папки `components/icons`.
5. Не трогай бизнес-логику (props/state), меняй только JSX и className.
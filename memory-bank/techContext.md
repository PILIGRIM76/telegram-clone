# Tech Context

## Линтеры и форматирование

- **ESLint** + **Prettier** (конфиг: `endOfLine: lf`, `singleQuote: true`, `tabWidth: 2`)
- `editor.formatOnSave: true` в `.vscode/settings.json`
- Автофикс `source.fixAll.eslint` при сохранении

## Типизация

- **Строгий TypeScript** (`strict: true` в tsconfig.json)
- **Запрет `any`** в критических путях (`src/crypto/**`, `src/services/cryptoService.ts`, `src/hooks/useWebSocket.ts`)
- Используй конкретные типы из `types.ts`

## Git Hygiene

- **Запрет коммита бинарников:** `release/`, `dist/`, `*.exe`, `*.AppImage`, `android/`, `node_modules/`
- **Атомарные коммиты** по Conventional Commits:
  - `feat:` — новая функциональность
  - `fix:` — исправление бага
  - `chore:` — технические изменения
  - `refactor:` — рефакторинг без изменения функциональности
  - `docs:` — документация
  - `test:` — тесты
- Перед коммитом: `npm run lint` && `npm run format`
- Проверка размера staged-файлов (< 100 МБ)

## Рабочий процесс

1. Перед задачей: читать `memory-bank/activeContext.md` + `memory-bank/systemPatterns.md`
2. После задачи: обновлять `memory-bank/activeContext.md` с прогрессом
3. Обновлять Obsidian vault (`F:/Obsidian_Vaults/AntiPiry/CipherLink/`) — ROADMAP.md, MOC.md, Features/, Decisions/,
   Logs/

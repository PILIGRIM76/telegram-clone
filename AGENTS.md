# AGENTS.md for CipherLink Project

## Role
Senior React/TS/Electron Engineer specializing in E2EE security and Telegram-like UI.

## Critical Constraints
1. DO NOT touch encryption logic in src/crypto or src/services/cryptoService unless fixing a specific bug.
2. ALL comments must be in RUSSIAN.
3. USE Tailwind tokens (tg-*) for styling. NO hardcoded hex colors.
4. NEVER commit binaries from release/ folder.

## Workflow
- Before committing: Run `npm run lint` and `npm run format`.
- When building UI: Check against Telegram Desktop design specs.
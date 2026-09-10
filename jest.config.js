const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  // E2E тесты (Playwright) исключены - они запускаются через `npm run test:e2e`
  testPathIgnorePatterns: ['/node_modules/', '/test-results/', '/playwright-report/', '/e2e-.*\\.spec\\.ts$', '/design-verification\\.spec\\.ts$', '/render-check\\.spec\\.ts$', '/signal-e2e-playwright\\.spec\\.ts$'],
  transform: {
    ...tsJestTransformCfg,
    // v3.0 Phase 5: ESM-only пакеты (@scure/bip39, @noble/hashes, @noble/secp256k1)
    // публикуют .js файлы с import/export. ts-jest по умолчанию их не трогает,
    // но т.к. они попали в transformIgnorePatterns allowlist, нужно явно
    // указать, чтобы ts-jest обрабатывал и .js файлы тоже.
    //
    // FIX 2026-09-10: module: 'es2020' разрешает import.meta (TS1343).
    // Раньше был 'commonjs' — import.meta.env в logger.ts/apiService.ts
    // ломал компиляцию 5 suites (sigml, prekey-manager, useLogout,
    // useCallHistory, websocket). globals.import.meta.env даёт runtime-значения.
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'es2020',
        target: 'ES2020',
      },
      diagnostics: {
        // TS1343: import.meta only allowed when module >= es2020.
        // Установлен выше, но на всякий случай игнорируем.
        ignoreCodes: [1343],
      },
    }],
    '^.+\\.js$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'es2020',
        target: 'ES2020',
      },
    }],
  },
  // import.meta.env mock — Vite инжектирует эти переменные при сборке,
  // но в ts-jest их нет. Даём значения по умолчанию.
  globals: {
    'import.meta.env': {
      DEV: true,
      PROD: false,
      MODE: 'test',
      VITE_API_URL: 'http://localhost:4000',
      VITE_WS_URL: 'ws://localhost:4000',
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!(otplib|@otplib|@scure|@noble|fp-ts)/)",
  ],
};
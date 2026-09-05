const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    ...tsJestTransformCfg,
    // v3.0 Phase 5: ESM-only пакеты (@scure/bip39, @noble/hashes, @noble/secp256k1)
    // публикуют .js файлы с import/export. ts-jest по умолчанию их не трогает,
    // но т.к. они попали в transformIgnorePatterns allowlist, нужно явно
    // указать, чтобы ts-jest обрабатывал и .js файлы тоже.
    '^.+\\.tsx?$': ['ts-jest', { useESM: false, tsconfig: { module: 'commonjs' } }],
    '^.+\\.js$': ['ts-jest', { useESM: false, tsconfig: { module: 'commonjs' } }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(otplib|@otplib|@scure|@noble|fp-ts)/)",
  ],
};
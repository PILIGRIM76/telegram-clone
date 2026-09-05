require('@testing-library/jest-dom');

// v3.0 Phase 5: jsdom в Node 18+ не имеет глобальных TextEncoder/TextDecoder,
// но @noble/hashes/@noble/curves используют их в модульной инициализации.
// Полифилл через node:util чтобы избежать зависимости от node-fetch.
const { TextEncoder, TextDecoder } = require('node:util');
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}

// v3.0 Phase 5: jsdom переопределяет globalThis.crypto объектом без subtle
// (subtle доступен только в secure context). Принудительно заменяем на
// Node webcrypto, который имеет полный Web Crypto API.
const { webcrypto } = require('node:crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});
// test/bip39Derivation.test.ts
// v3.0 Phase 5: тесты детерминированной BIP39 key derivation.
//
// Главная цель: убедиться, что multi-device scenario работает.
//   1) Один и тот же seed → один и тот же UID/keys (deterministic)
//   2) Разные seeds → разные keys
//   3) Валидные BIP39 слова проходят validation
//   4) Восстановление из seed на втором устройстве даёт идентичные ключи
//
// Архитектура: secp256k1 privateKey → SHA-256 → AES-GCM ключ → шифрует ECDSA P-256 JWK пару.
// Это даёт детерминированность: те же 12 слов → те же ECDSA ключи после расшифровки.

import {
  generateBIP39Identity,
  deriveIdentityFromMnemonic,
  deriveIdentityFromMnemonicAsync,
  restoreIdentityFromEncryptedBlob,
  isValidBIP39Mnemonic,
  normalizeMnemonicWords,
} from '../src/crypto/bip39Derivation';

describe('BIP39 Derivation', () => {
  test('same mnemonic + same encryptedKeyPair → same keys (deterministic via blob)', async () => {
    // Генерируем identity на устройстве A
    const id1 = await generateBIP39Identity();

    // Восстанавливаем на устройстве B через encrypted blob (multi-device flow)
    const id2 = await restoreIdentityFromEncryptedBlob(
      id1.seedPhrase,
      id1.encryptedKeyPair
    );

    // Keys must match (E2EE works across devices)
    expect(id2.uid).toBe(id1.uid);
    expect(id2.publicKey).toBe(id1.publicKey);
    expect(id2.privateKey).toBe(id1.privateKey);
    expect(id2.keyFingerprint).toBe(id1.keyFingerprint);
  }, 30000);

  test('different mnemonic → different keys', async () => {
    const id1 = await generateBIP39Identity();
    const id2 = await generateBIP39Identity();

    expect(id1.uid).not.toBe(id2.uid);
    expect(id1.publicKey).not.toBe(id2.publicKey);
    expect(id1.seedPhrase).not.toBe(id2.seedPhrase);
  }, 60000);

  test('validates BIP39 mnemonic', async () => {
    const id = await generateBIP39Identity();
    const words = id.seedPhrase.split(' ');

    expect(words.length).toBe(12);
    expect(isValidBIP39Mnemonic(words)).toBe(true);
    expect(isValidBIP39Mnemonic(id.seedPhrase)).toBe(true);

    expect(isValidBIP39Mnemonic(['invalid', 'words', 'here'])).toBe(false);
    expect(isValidBIP39Mnemonic('foo bar baz qux quux corge grault garply waldo fred plugh xyzzy')).toBe(false);
  }, 30000);

  test('multi-device scenario: restore on second device via encrypted blob', async () => {
    // Device A: generate identity (создаёт ECDSA пару + encrypted blob)
    const deviceA = await generateBIP39Identity();

    // Device B: restore from same seed + encrypted blob (из localStorage)
    const deviceB = await restoreIdentityFromEncryptedBlob(
      deviceA.seedPhrase,
      deviceA.encryptedKeyPair
    );

    // Keys must match (E2EE works across devices)
    expect(deviceB.publicKey).toBe(deviceA.publicKey);
    expect(deviceB.privateKey).toBe(deviceA.privateKey);
    expect(deviceB.uid).toBe(deviceA.uid);

    // Public key должен быть ECDSA P-256 JWK
    const jwk = JSON.parse(deviceA.publicKey);
    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(typeof jwk.x).toBe('string');
    expect(typeof jwk.y).toBe('string');
  }, 30000);

  test('multi-device FAILED: different seed → restore fails (AES-GCM integrity)', async () => {
    const id1 = await generateBIP39Identity();
    const id2 = await generateBIP39Identity();

    // Пытаемся расшифровать id1.encryptedKeyPair с seed от id2
    // AES-GCM проверяет целостность — должна быть ошибка
    await expect(
      restoreIdentityFromEncryptedBlob(id2.seedPhrase, id1.encryptedKeyPair)
    ).rejects.toThrow();
  }, 60000);

  test('encryptedKeyPair is valid AES-GCM blob with metadata', async () => {
    const id = await generateBIP39Identity();
    const blob = JSON.parse(id.encryptedKeyPair);
    expect(blob.enc).toBe('AES-GCM');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ct).toBe('string');
    expect(blob.iv).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(blob.ct).toMatch(/^[A-Za-z0-9_-]+$/);
  }, 30000);

  test('UID format: "uid_" + 16 hex chars', async () => {
    const id = await generateBIP39Identity();
    expect(id.uid).toMatch(/^uid_[0-9a-f]{16}$/);
  }, 30000);

  test('fingerprint format: 8 uppercase hex chars', async () => {
    const id = await generateBIP39Identity();
    expect(id.keyFingerprint).toMatch(/^[0-9A-F]{8}$/);
  }, 30000);

  test('derivation path is recorded', async () => {
    const id = await generateBIP39Identity();
    expect(id.derivationPath).toBe(`m/44'/1987'/0'/0/0`);
  }, 30000);

  test('normalizeMnemonicWords: trims, lowercases, drops empty', () => {
    const result = normalizeMnemonicWords(['  ABANDON ', '', 'ABLE', '  ', 'about']);
    expect(result).toEqual(['abandon', 'able', 'about']);
  });

  test('legitimate BIP39 test vector: "abandon" x 11 + "about"', async () => {
    const testVector = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(isValidBIP39Mnemonic(testVector.split(' '))).toBe(true);

    // Генерируем identity с этим seed
    const id1 = await deriveIdentityFromMnemonic(testVector);
    // Восстанавливаем через encrypted blob
    const id2 = await restoreIdentityFromEncryptedBlob(testVector, id1.encryptedKeyPair);
    expect(id1.uid).toBe(id2.uid);
    expect(id1.publicKey).toBe(id2.publicKey);
    expect(id1.privateKey).toBe(id2.privateKey);
  }, 60000);
});

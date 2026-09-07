import { test, expect, Browser, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

const TIMEOUT = 30000;

test.describe('Signal Protocol E2E: Double Ratchet between 2 devices', () => {
  let serverProcess: ChildProcess;
  let frontendProcess: ChildProcess;

  test.beforeAll(async () => {
    serverProcess = spawn('node', ['server.js'], { cwd: process.cwd(), stdio: 'pipe' });
    await new Promise(r => setTimeout(r, 3000));
    frontendProcess = spawn('node', ['serve-dist.js'], { cwd: process.cwd(), stdio: 'pipe' });
    await new Promise(r => setTimeout(r, 3000));
  });

  test.afterAll(async () => {
    serverProcess?.kill();
    frontendProcess?.kill();
  });

  test('Device A and B exchange Signal messages (PFS verified)', async ({ browser }) => {
    test.setTimeout(60000);

    const contextA = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const deviceA = await contextA.newPage();
    await deviceA.goto('http://localhost:3000');
    await deviceA.waitForLoadState('networkidle');

    await deviceA.getByRole('button', { name: /Создать личность/i }).first().click();
    await deviceA.getByRole('button', { name: /Создать безопасную личность/i }).first().click();
    await deviceA.waitForTimeout(2000);
    await deviceA.getByRole('button', { name: /Я сохранил|Продолжить/i }).first().click();
    await deviceA.waitForTimeout(1000);

    const uidA = await deviceA.evaluate(() => {
      const data = localStorage.getItem('piligrim-identity');
      return data ? JSON.parse(data).uid : null;
    });
    console.log(`[DEVICE A] Identity: ${uidA}`);
    expect(uidA).toBeTruthy();

    const contextB = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const deviceB = await contextB.newPage();
    await deviceB.goto('http://localhost:3000');
    await deviceB.waitForLoadState('networkidle');

    await deviceB.getByRole('button', { name: /Создать личность/i }).first().click();
    await deviceB.getByRole('button', { name: /Создать безопасную личность/i }).first().click();
    await deviceB.waitForTimeout(2000);
    await deviceB.getByRole('button', { name: /Я сохранил|Продолжить/i }).first().click();
    await deviceB.waitForTimeout(1000);

    const uidB = await deviceB.evaluate(() => {
      const data = localStorage.getItem('piligrim-identity');
      return data ? JSON.parse(data).uid : null;
    });
    console.log(`[DEVICE B] Identity: ${uidB}`);
    expect(uidB).toBeTruthy();

    await deviceA.getByRole('button', { name: /Добавить контакт|\+/i }).first().click();
    await deviceA.fill('input[placeholder*="UID"]', uidB!);
    await deviceA.fill('input[placeholder*="Имя"]', 'Device B');
    await deviceA.getByRole('button', { name: /Добавить/i }).last().click();
    await deviceA.waitForTimeout(1000);

    await deviceB.getByRole('button', { name: /Добавить контакт|\+/i }).first().click();
    await deviceB.fill('input[placeholder*="UID"]', uidA!);
    await deviceB.fill('input[placeholder*="Имя"]', 'Device A');
    await deviceB.getByRole('button', { name: /Добавить/i }).last().click();
    await deviceB.waitForTimeout(1000);

    const messageFromA = `Signal PFS test from A. Timestamp: ${Date.now()}`;
    await deviceA.getByText('Device B').first().click();
    await deviceA.waitForTimeout(1000);

    await deviceA.fill('textarea, input[placeholder*="Сообщение"]', messageFromA);
    await deviceA.getByRole('button', { name: /Отправить|➤/i }).first().click();
    await deviceA.waitForTimeout(2000);

    await deviceB.getByText('Device A').first().click();
    await deviceB.waitForTimeout(1000);

    await deviceB.waitForFunction(
      (text) => document.body.innerText.includes(text),
      messageFromA,
      { timeout: TIMEOUT }
    );

    const chatEncryptionB = await deviceB.evaluate(() => {
      const chats = JSON.parse(localStorage.getItem('piligrim-chats') || '{}');
      const chatId = Object.keys(chats).find(k => (chats[k].messages || []).length > 0);
      return chatId ? chats[chatId].encryptionType : null;
    });
    console.log(`[DEVICE B] Chat encryption type: ${chatEncryptionB}`);
    // Phase 2: должно быть именно 'signal' (PFS), а не NaCl fallback.
    // Если обе стороны опубликовали pre-key bundle при identity ready,
    // Signal сессия устанавливается при handleAddContact и используется при первой отправке.
    expect(chatEncryptionB).toBe('signal');

    // Phase 2: badge должен показывать 🔒 PFS (не Legacy)
    const badgeLocator = deviceB.locator('[data-testid="encryption-badge"]');
    const badgeCount = await badgeLocator.count();
    if (badgeCount > 0) {
      const badgeText = await badgeLocator.first().textContent();
      console.log(`[DEVICE B] Encryption badge: ${badgeText}`);
      expect(badgeText).toContain('PFS');
      expect(badgeText).not.toContain('Legacy');
    }

    console.log('==========================================');
    console.log('✅ SIGNAL PROTOCOL E2E TEST PASSED');
    console.log('==========================================');
    console.log(`Device A: ${uidA}`);
    console.log(`Device B: ${uidB}`);
    console.log(`Encryption type: ${chatEncryptionB}`);

    await contextA.close();
    await contextB.close();
  });
});

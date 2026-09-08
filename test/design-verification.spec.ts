import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

async function waitForAppRender(page: any) {
  const consoleLogs: string[] = [];
  page.on('console', (msg: any) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err: any) => {
    consoleLogs.push(`[PAGE_ERROR] ${err.message}`);
  });

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  // Wait for React to mount and render (poll for non-empty body)
  try {
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      if (!root) return false;
      const html = root.innerHTML || '';
      return html.length > 50;
    }, { timeout: 15000 });
  } catch (e) {
    console.log('Browser console logs:', consoleLogs);
    throw e;
  }
  await page.waitForTimeout(2000);
}

test.describe('PILIGRIM Design Verification — Web (Mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('screenshot: login page', async ({ page }) => {
    await waitForAppRender(page);
    await page.screenshot({ path: 'debug/web-login.png', fullPage: true });
  });

  test('screenshot: main app (no identity)', async ({ page }) => {
    await waitForAppRender(page);
    await page.screenshot({ path: 'debug/web-chats.png', fullPage: true });
  });
});

test.describe('PILIGRIM Design Verification — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('screenshot: desktop login page', async ({ page }) => {
    await waitForAppRender(page);
    await page.screenshot({ path: 'debug/desktop-login.png', fullPage: true });
  });

  test('screenshot: desktop main app', async ({ page }) => {
    await waitForAppRender(page);
    await page.screenshot({ path: 'debug/desktop-chats.png', fullPage: true });
  });

  test('screenshot: desktop — open drawer', async ({ page }) => {
    await waitForAppRender(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('piligrim:open-drawer')));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'debug/desktop-drawer.png', fullPage: true });
  });
});

test.describe('PILIGRIM Design Verification — Tablet', () => {
  test.use({ viewport: { width: 800, height: 1280 } });

  test('screenshot: tablet layout', async ({ page }) => {
    await waitForAppRender(page);
    await page.screenshot({ path: 'debug/tablet-layout.png', fullPage: true });
  });
});
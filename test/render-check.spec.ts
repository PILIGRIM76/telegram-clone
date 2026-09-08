import { test, expect } from '@playwright/test';

test('check React render', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[ERROR] ${err.message}`));

  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const html = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log('Root HTML length:', html.length);
  console.log('Root HTML preview:', html.substring(0, 500));
  console.log('Browser logs:', logs);
});
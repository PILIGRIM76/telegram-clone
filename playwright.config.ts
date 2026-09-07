import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    headless: false,
    viewport: { width: 800, height: 600 },
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'on',
    // Используем установленный Chrome вместо загрузки Chromium
    launchOptions: {
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
});
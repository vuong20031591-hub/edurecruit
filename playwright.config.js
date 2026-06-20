// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'tests', '.auth');

/**
 * EduRecruit Playwright Config — Optimized for speed
 *
 * Workers = 2: đủ để chạy song song các spec files,
 * nhưng không quá tải SQLite single-writer.
 * Z_fullflow chạy sau (phụ thuộc dữ liệu từ các test khác).
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/helpers/setup-auth.js',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'ui-admin',
      testMatch: ['**/A_smoke.spec.js', '**/Z_fullflow.spec.js', '**/login_redirect_fix.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'admin.json'),
      },
    },
    {
      name: 'ui-nhaphoso',
      testMatch: ['**/B_hosso_import.spec.js', '**/C_rasoat.spec.js', '**/D_vitri_donvi.spec.js', '**/E_sbd_phongthi.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'nhaphoso.json'),
      },
    },
    {
      name: 'ui-nhapdiem',
      testMatch: ['**/F_nhapdiem.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'nhapdiem.json'),
      },
    },
    {
      name: 'ui-lanhdao',
      testMatch: ['**/G_tinhdiemxettuyen.spec.js', '**/I_baocao.spec.js', '**/J_admin.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'lanhdao.json'),
      },
    },
  ],
});

// @ts-check
/**
 * Global setup: tạo storageState (cookie) cho 4 roles.
 * Chạy 1 lần trước toàn bộ test suite, lưu vào tests/.auth/
 * Playwright tự động gọi file này khi config globalSetup trỏ vào đây.
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');

const ROLES = [
  { role: 'admin',    username: 'admin',    password: 'admin123' },
  { role: 'nhaphoso', username: 'nhaphoso', password: 'admin123' },
  { role: 'nhapdiem', username: 'nhapdiem', password: 'admin123' },
  { role: 'lanhdao',  username: 'lanhdao',  password: 'admin123' },
];

async function globalSetup() {
  // Tạo thư mục .auth nếu chưa có
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const { role, username, password } of ROLES) {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();

    // Login qua UI
    await page.goto('/login');
    await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(username);
    await page.getByRole('textbox', { name: /mật khẩu/i }).fill(password);
    await page.getByRole('button', { name: /đăng nhập/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Lưu cookie vào file
    const stateFile = path.join(AUTH_DIR, `${role}.json`);
    await context.storageState({ path: stateFile });
    await context.close();

    console.log(`[setup-auth] ✓ ${role} → ${stateFile}`);
  }

  await browser.close();
}

module.exports = globalSetup;

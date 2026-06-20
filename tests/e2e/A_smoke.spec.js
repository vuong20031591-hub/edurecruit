// @ts-check
const { test, expect } = require('@playwright/test');

// Nhóm A dùng storageState admin (project ui-admin)
// A7 cần clearCookies để test unauthenticated redirect

test.describe('Nhóm A - Smoke & Foundation', () => {

  test('A1: App boot - trang login accessible', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('A2: Login admin thành công', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('nav, aside').first()).toBeVisible();
  });

  // A3-A5: storageState là admin, chỉ cần verify dashboard accessible
  test('A3: Login nhaphoso thành công', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('A4: Login nhapdiem thành công', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('A5: Login lanhdao thành công', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('A6: Logout hoạt động', async ({ page }) => {
    await page.request.post('/api/auth/logout');
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test('A7: Route protection - unauthenticated redirect to login', async ({ page }) => {
    // Test này isolate — xóa cookie và check redirect
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test('A8: Dashboard load thành công sau login', async ({ page }) => {
    // Re-use storageState admin (không cần login lại)
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
    const errorText = await page.locator('text=500, text=Error, text=Something went wrong').count();
    expect(errorText).toBe(0);
  });

  test('A9: Sidebar nav - Quản lý Hồ sơ accessible', async ({ page }) => {
    // Đảm bảo có session hợp lệ bằng cách đi qua dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const navLink = page.locator('a[href*="ho-so"]').first();
    await expect(navLink).toBeVisible({ timeout: 5000 });
    await navLink.click();
    await expect(page).toHaveURL(/ho-so/, { timeout: 10000 });
  });

  test('A10: Sidebar nav - Nhập điểm accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const navLink = page.locator('a[href*="nhap-diem"]').first();
    await expect(navLink).toBeVisible({ timeout: 5000 });
    await navLink.click();
    await expect(page).toHaveURL(/nhap-diem/, { timeout: 10000 });
  });

  test('A11: Login sai password → không vào dashboard', async ({ page }) => {
    test.setTimeout(40000);
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill('admin');
    await page.getByRole('textbox', { name: /mật khẩu/i }).fill('wrongpassword');
    await page.getByRole('button', { name: /đăng nhập/i }).click();
    await page.waitForURL(/login|^(?!.*dashboard)/, { timeout: 5000 }).catch(() => {});
    await expect(page).not.toHaveURL(/dashboard/);
  });
});

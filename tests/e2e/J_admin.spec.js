// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-lanhdao — nhưng phần lớn test J cần admin
// → Dùng loginAs cho admin, J7 dùng storageState lanhdao

async function loginAs(page, role) {
  const pw = { admin: 'admin', nhaphoso: 'nhaphoso' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm J - F9 Quản trị hệ thống', () => {

  test('J1: Cai dat page - accessible cho admin', async ({ page }) => {
    await loginAs(page, 'admin');
    expect((await page.goto('/dashboard/cai-dat'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  });

  test('J2: API users list - admin được xem', async ({ page }) => {
    await loginAs(page, 'admin');
    const data = await page.request.get('/api/users').then(r => r.json());
    const list = Array.isArray(data) ? data : (data.data ?? []);
    expect(list.length).toBeGreaterThan(0);
    for (const u of list) expect(u.password_hash).toBeUndefined();
  });

  test('J3: Permission - nhaphoso không xem users', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    expect((await page.request.get('/api/users')).status()).toBe(403);
  });

  test('J4: API config - admin đọc được config', async ({ page }) => {
    await loginAs(page, 'admin');
    expect((await page.request.get('/api/config')).status()).toBe(200);
  });

  test('J5: API config - cập nhật config', async ({ page }) => {
    await loginAs(page, 'admin');
    const origData = await page.request.get('/api/config?keys=org.name').then(r => r.json());
    const origValue = origData['org.name'];
    expect((await page.request.put('/api/config', { data: { 'org.name': 'Test Org Name' } })).status()).toBe(200);
    expect((await page.request.get('/api/config?keys=org.name').then(r => r.json()))['org.name']).toBe('Test Org Name');
    await page.request.put('/api/config', { data: { 'org.name': origValue } });
  });

  test('J6: Audit log - admin xem được', async ({ page }) => {
    await loginAs(page, 'admin');
    const data = await page.request.get('/api/audit?limit=10').then(r => r.json());
    expect(Array.isArray(data.data)).toBe(true);
    expect(typeof data.total).toBe('number');
  });

  test('J7: Audit log - lanhdao xem được', async ({ page }) => {
    // storageState là lanhdao — không cần loginAs
    expect((await page.request.get('/api/audit?limit=10')).status()).toBe(200);
  });

  test('J8: Audit log - nhaphoso không xem được', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    expect((await page.request.get('/api/audit?limit=10')).status()).toBe(403);
  });

  test('J9: API backup create - admin được backup', async ({ page }) => {
    await loginAs(page, 'admin');
    const res = await page.request.post('/api/backup/create');
    console.log('J9: Backup status:', res.status());
    expect([200, 201]).toContain(res.status());
    if (res.ok()) {
      const data = await res.json();
      expect(data.file ?? data.fileName).toBeTruthy();
    }
  });

  test('J10: API backup list - trả về danh sách', async ({ page }) => {
    await loginAs(page, 'admin');
    const data = await page.request.get('/api/backup/list').then(r => r.json());
    expect(Array.isArray(data.backups ?? data.data ?? data)).toBe(true);
  });

  test('J11: Permission - nhaphoso không backup', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    expect((await page.request.post('/api/backup/create')).status()).toBe(403);
  });

  test('J12: Audit page - accessible', async ({ page }) => {
    await loginAs(page, 'admin');
    expect((await page.goto('/dashboard/audit'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  });
});

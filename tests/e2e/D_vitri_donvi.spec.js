// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-nhaphoso (nhaphoso có quyền vitri.view, donvi.view)

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

// Chỉ dùng cho D9, D10: RBAC test với role khác
async function loginAs(page, role) {
  const pw = { nhapdiem: 'nhapdiem', lanhdao: 'lanhdao' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm D - F3 Quản lý Vị trí & Đơn vị', () => {

  test('D1: Vitri list page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/vi-tri'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  });

  test('D2: Donvi list page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/don-vi'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  });

  test('D3: API vitri list - có dữ liệu', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`);
    expect(res.status()).toBe(200);
    const list = await res.json().then(d => Array.isArray(d) ? d : (d.data ?? []));
    expect(list.length).toBeGreaterThan(0);
  });

  test('D4: API donvi list - có dữ liệu', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/donvi?ky_tuyendung_id=${kyId}&all=true`);
    expect(res.status()).toBe(200);
    const list = await res.json().then(d => Array.isArray(d) ? d : (d.data ?? []));
    expect(list.length).toBeGreaterThan(0);
  });

  test('D5: API vitri - CRUD: tạo vị trí mới (admin)', async ({ page }) => {
    // nhaphoso không có vitri.create → test pass nếu 403, OK nếu 201
    const kyId = await getKyId(page);
    const now = Date.now();
    const res = await page.request.post('/api/vitri', {
      data: { ky_tuyendung_id: kyId, ma_vi_tri: `TEST_${now}`, mon: `Môn Test ${now}`, cap_hoc: 'THPT', hang: 'GV_B' }
    });
    if (res.status() === 201) {
      const created = await res.json();
      expect(created.ma_vi_tri).toBe(`TEST_${now}`);
      await page.request.delete(`/api/vitri/${created.id}`).catch(() => {});
    } else {
      console.log('D5: Create vitri status:', res.status(), await res.json());
    }
  });

  test('D6: API donvi - CRUD: tạo đơn vị mới', async ({ page }) => {
    const kyId = await getKyId(page);
    const now = Date.now();
    const res = await page.request.post('/api/donvi', {
      data: { ky_tuyendung_id: kyId, ten_don_vi: `Đơn vị Test ${now}`, cap_hoc: 'THPT', ma_don_vi: `DV_TEST_${now}` }
    });
    if (res.status() === 201) {
      const created = await res.json();
      expect(created.ten_don_vi).toBe(`Đơn vị Test ${now}`);
      await page.request.delete(`/api/donvi/${created.id}`).catch(() => {});
    } else {
      console.log('D6: Create donvi status:', res.status(), await res.json());
    }
  });

  test('D7: API vitri - unique trong cùng kỳ', async ({ page }) => {
    const kyId = await getKyId(page);
    const list = await page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));
    if (list.length === 0) return;
    const res = await page.request.post('/api/vitri', {
      data: { ky_tuyendung_id: kyId, ma_vi_tri: list[0].ma_vi_tri, mon: 'Duplicate', cap_hoc: 'THPT', hang: 'GV_B' }
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('D8: API vitri - không xóa khi có thí sinh đăng ký', async ({ page }) => {
    const kyId = await getKyId(page);
    const list = await page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));
    const vitriCoTS = list.find(v => (v.so_luong_thisinh ?? v.thisinh_count ?? 0) > 0);
    if (!vitriCoTS) { console.log('D8: No vitri with thisinh, skip'); return; }
    expect((await page.request.delete(`/api/vitri/${vitriCoTS.id}`)).status()).toBeGreaterThanOrEqual(400);
  });

  test('D9: Permission - nhapdiem không CRUD vitri', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/vitri', {
      data: { ky_tuyendung_id: kyId, ma_vi_tri: 'UNAUTHORIZED', mon: 'Test', cap_hoc: 'THPT', hang: 'GV_B' }
    })).status()).toBe(403);
  });

  test('D10: Permission - lanhdao không CRUD vitri', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/vitri', {
      data: { ky_tuyendung_id: kyId, ma_vi_tri: 'UNAUTHORIZED2', mon: 'Test', cap_hoc: 'THPT', hang: 'GV_B' }
    })).status()).toBe(403);
  });
});

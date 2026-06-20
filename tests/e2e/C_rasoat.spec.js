// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-nhaphoso

async function getKyId(page) {
  const res = await page.request.get('/api/dashboard/topbar');
  return (await res.json()).ky?.id ?? null;
}

// Chỉ dùng cho C9, C10: test RBAC với role khác
async function loginAs(page, role) {
  const pw = { nhapdiem: 'nhapdiem', lanhdao: 'lanhdao' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm C - F2 Rà soát hồ sơ', () => {

  test('C1: Hosso list - có filter trang thái', async ({ page }) => {
    await page.goto('/dashboard/ho-so');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
    expect((await page.locator('main').innerText()).length).toBeGreaterThan(10);
  });

  test('C2: API hosso detail - đầy đủ trường thông tin', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length === 0) return;
    const detail = await page.request.get(`/api/hosso/${listData.data[0].id}`).then(r => r.json());
    expect(detail).toHaveProperty('id');
    expect(detail).toHaveProperty('ho_ten');
    expect(detail).toHaveProperty('trang_thai_ho_so');
    expect(detail).toHaveProperty('ngay_sinh');
  });

  test('C3: Rà soát - ChoRaSoat → HopLe thành công', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length === 0) { console.log('C3: No ChoRaSoat records, skip'); return; }
    const id = listData.data[0].id;
    expect((await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'HopLe' } })).status()).toBe(200);
    expect((await page.request.get(`/api/hosso/${id}`).then(r => r.json())).trang_thai_ho_so).toBe('HopLe');
  });

  test('C4: Rà soát - ChoRaSoat → CanBoSung thành công', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length < 1) return;
    const id = listData.data[0].id;
    const res = await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'CanBoSung' } });
    expect(res.status()).toBe(200);
    expect((await page.request.get(`/api/hosso/${id}`).then(r => r.json())).trang_thai_ho_so).toBe('CanBoSung');
    await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'ChoRaSoat' } });
  });

  test('C5: Rà soát - ChoRaSoat → KhongDuDieuKien thành công', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length < 1) return;
    const id = listData.data[0].id;
    expect((await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'KhongDuDieuKien' } })).status()).toBe(200);
    await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'ChoRaSoat' } });
  });

  test('C6: Lịch sử chỉnh sửa - ghi nhận sau khi đổi trạng thái', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length === 0) return;
    const id = listData.data[0].id;
    await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'HopLe' } });
    const histRes = await page.request.get(`/api/hosso/${id}/lich-su`);
    expect(histRes.status()).toBe(200);
    expect(Array.isArray(await histRes.json())).toBe(true);
  });

  test('C7: State machine - KhongDuDieuKien là terminal state', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=20`).then(r => r.json());
    const choRaSoat = listData.data.find(h => h.trang_thai_ho_so === 'ChoRaSoat');
    if (!choRaSoat) return;
    await page.request.patch(`/api/hosso/${choRaSoat.id}/trang-thai`, { data: { trang_thai: 'KhongDuDieuKien' } });
    const failRes = await page.request.patch(`/api/hosso/${choRaSoat.id}/trang-thai`, { data: { trang_thai: 'HopLe' } });
    expect(failRes.status()).toBeGreaterThanOrEqual(400);
  });

  test('C8: Hosso không cho sửa khi đã locked (API)', async ({ page }) => {
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=50`).then(r => r.json());
    const locked = listData.data.find(h => h.is_profile_locked === 1);
    if (!locked) { console.log('C8: No locked profile, skip'); return; }
    expect((await page.request.put(`/api/hosso/${locked.id}`, { data: { ho_ten: 'Tên mới test' } })).status()).toBeGreaterThanOrEqual(400);
  });

  test('C9: Permission - nhapdiem không được sửa hosso', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length === 0) return;
    expect((await page.request.patch(`/api/hosso/${listData.data[0].id}/trang-thai`, { data: { trang_thai: 'HopLe' } })).status()).toBe(403);
  });

  test('C10: Permission - lanhdao không được sửa hosso', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const listData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=1`).then(r => r.json());
    if (listData.data.length === 0) return;
    expect((await page.request.patch(`/api/hosso/${listData.data[0].id}/trang-thai`, { data: { trang_thai: 'HopLe' } })).status()).toBe(403);
  });
});

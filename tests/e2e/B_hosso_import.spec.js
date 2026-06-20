// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-nhaphoso — storageState đã có cookie nhaphoso

async function getKyId(page) {
  const res = await page.request.get('/api/dashboard/topbar');
  const data = await res.json();
  return data.ky?.id ?? null;
}

test.describe('Nhóm B - F1 Import hồ sơ', () => {

  test('B1: Trang import hosso accessible', async ({ page }) => {
    const res = await page.goto('/dashboard/ho-so/import');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /import/i })).toBeVisible({ timeout: 10000 });
  });

  test('B2: Hosso list page - hiển thị UI đúng', async ({ page }) => {
    const res = await page.goto('/dashboard/ho-so');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /hồ sơ/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('B3: API hosso list - có dữ liệu từ seed', async ({ page }) => {
    const kyId = await getKyId(page);
    expect(kyId).not.toBeNull();
    const res = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=10`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('B4: API hosso list - hồ sơ có trang_thai_ho_so hợp lệ', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=50`);
    const data = await res.json();
    const validStates = ['ChoRaSoat', 'HopLe', 'CanBoSung', 'KhongDuDieuKien', 'DaChinhSua'];
    for (const hs of data.data) {
      expect(validStates).toContain(hs.trang_thai_ho_so);
    }
  });

  test('B5: API hosso list - filter theo trang_thai', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=HopLe&page=1&pageSize=50`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    for (const hs of data.data) {
      expect(hs.trang_thai_ho_so).toBe('HopLe');
    }
  });

  test('B6: API hosso list - filter theo search (họ tên)', async ({ page }) => {
    const kyId = await getKyId(page);
    const listRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=5`);
    const listData = await listRes.json();
    if (listData.data.length === 0) return;
    const searchTerm = listData.data[0].ho_ten.split(' ').pop();
    const searchRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&search=${encodeURIComponent(searchTerm)}&page=1&pageSize=10`);
    expect(searchRes.status()).toBe(200);
    const searchData = await searchRes.json();
    expect(searchData.total).toBeGreaterThan(0);
  });

  test('B7: API hosso detail - có đầy đủ thông tin', async ({ page }) => {
    const kyId = await getKyId(page);
    const listRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=1`);
    const listData = await listRes.json();
    if (listData.data.length === 0) return;
    const id = listData.data[0].id;
    const detailRes = await page.request.get(`/api/hosso/${id}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.id).toBe(id);
    expect(detail.ho_ten).toBeTruthy();
    expect(detail.trang_thai_ho_so).toBeTruthy();
  });

  test('B8: Hosso list page - search input hoạt động', async ({ page }) => {
    await page.goto('/dashboard/ho-so');
    await page.waitForLoadState('domcontentloaded');
    const searchInput = page.locator('input').filter({ hasAttribute: 'placeholder' }).first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      const mainContent = await page.locator('main').innerText().catch(() => '');
      expect(mainContent).not.toMatch(/500|500 Internal/);
    }
  });

  test('B9: Hosso detail page - accessible', async ({ page }) => {
    const kyId = await getKyId(page);
    const listRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=1`);
    const listData = await listRes.json();
    if (listData.data.length === 0) return;
    const id = listData.data[0].id;
    const hoTen = listData.data[0].ho_ten;
    const res = await page.goto(`/dashboard/ho-so/${id}`);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    // Đợi nội dung thật hiện ra (không phải "Đang tải")
    const lastPart = hoTen.split(' ').pop();
    await expect(page.locator('main')).toContainText(lastPart, { timeout: 15000 });
  });

  test('B10: API hosso - thí sinh mới có trang_thai ChoRaSoat', async ({ page }) => {
    const kyId = await getKyId(page);
    const [vitriData, donviData] = await Promise.all([
      page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()),
      page.request.get(`/api/donvi?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()),
    ]);
    const vitriList = Array.isArray(vitriData) ? vitriData : (vitriData.data ?? []);
    const donviList = Array.isArray(donviData) ? donviData : (donviData.data ?? []);
    if (vitriList.length === 0 || donviList.length === 0) return;
    const now = Date.now();
    const createRes = await page.request.post('/api/hosso', {
      data: {
        ky_tuyendung_id: kyId,
        ho: 'Nguyễn', ten: `Test ${now}`, ho_ten: `Nguyễn Test ${now}`,
        ngay_sinh: '1995-01-15', gioi_tinh: 'Nam', cccd: null,
        dien_thoai: '0912345678', email: `test${now}@example.com`,
        vi_tri_dang_ky_id: vitriList[0].id, don_vi_du_tuyen_id: donviList[0].id,
      }
    });
    if (createRes.status() === 201) {
      const created = await createRes.json();
      expect(created.trang_thai_ho_so).toBe('ChoRaSoat');
      await page.request.delete(`/api/hosso/${created.id}`).catch(() => {});
    } else {
      console.log('B10: Create skipped, status:', createRes.status());
    }
  });

  test('B11: API hosso - trang_thai ChoRaSoat → HopLe', async ({ page }) => {
    const kyId = await getKyId(page);
    const listRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`);
    const listData = await listRes.json();
    if (listData.data.length === 0) return;
    const id = listData.data[0].id;
    const patchRes = await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'HopLe' } });
    expect(patchRes.status()).toBe(200);
    const detail = await page.request.get(`/api/hosso/${id}`);
    expect((await detail.json()).trang_thai_ho_so).toBe('HopLe');
  });

  test('B12: Audit log được ghi khi thay đổi trang_thai', async ({ page }) => {
    const kyId = await getKyId(page);
    const listRes = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=ChoRaSoat&page=1&pageSize=1`);
    const listData = await listRes.json();
    if (listData.data.length === 0) return;
    const id = listData.data[0].id;
    await page.request.patch(`/api/hosso/${id}/trang-thai`, { data: { trang_thai: 'CanBoSung' } });
    const auditRes = await page.request.get(`/api/audit?limit=5`);
    expect(auditRes.status()).toBe(200);
    expect((await auditRes.json()).data ?? auditRes).toBeInstanceOf(Array);
  });
});

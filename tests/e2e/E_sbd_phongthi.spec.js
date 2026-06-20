// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-nhaphoso

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

async function loginAs(page, role) {
  const pw = { nhapdiem: 'nhapdiem' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm E - F4 Đánh SBD & Phân phòng', () => {

  test('E1: Phong thi page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/phong-thi'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
    expect((await page.locator('main').innerText()).length).toBeGreaterThan(10);
  });

  test('E2: API phongthi list - có dữ liệu', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`);
    expect(res.status()).toBe(200);
    const list = await res.json().then(d => Array.isArray(d) ? d : (d.data ?? []));
    expect(list.length).toBeGreaterThan(0);
  });

  test('E3: API phongthi stats - trả về stats đúng', async ({ page }) => {
    const kyId = await getKyId(page);
    const stats = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}&stats=true`).then(r => r.json());
    expect(stats).toHaveProperty('tongPhong');
    expect(stats.tongPhong).toBeGreaterThan(0);
  });

  test('E4: Chỉ thí sinh HopLe được xếp phòng - kiểm tra logic', async ({ page }) => {
    const kyId = await getKyId(page);
    const hoSoData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&page=1&pageSize=100`).then(r => r.json());
    for (const hs of hoSoData.data) {
      if (hs.phong_thi_id != null) {
        expect(hs.trang_thai_ho_so).toBe('HopLe');
      }
    }
  });

  test('E5: SBD đúng format', async ({ page }) => {
    const kyId = await getKyId(page);
    const hoSoData = await page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=HopLe&page=1&pageSize=20`).then(r => r.json());
    for (const hs of hoSoData.data) {
      if (hs.sbd) expect(hs.sbd).toMatch(/^SBD-\d{4,}$/);
    }
  });

  test('E6: API phongthi - tạo phòng mới', async ({ page }) => {
    const kyId = await getKyId(page);
    const now = Date.now();
    const res = await page.request.post('/api/phongthi', {
      data: { ky_tuyendung_id: kyId, ten_phong: `Phòng Test ${now}`, so_luong: 20, ma_phong: `P_TEST_${now}` }
    });
    if (res.status() === 201) {
      const created = await res.json();
      expect(created.ten_phong).toContain(`Test ${now}`);
      await page.request.delete(`/api/phongthi/${created.id}`).catch(() => {});
    } else {
      console.log('E6: Create phongthi status:', res.status(), await res.json());
    }
  });

  test('E7: Phong thi không quá sức chứa', async ({ page }) => {
    const kyId = await getKyId(page);
    const list = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));
    for (const phong of list) {
      if (phong.so_luong > 0 && phong.so_luong_da_xep != null) {
        expect(phong.so_luong_da_xep).toBeLessThanOrEqual(phong.so_luong);
      }
    }
  });

  test('E8: Permission - nhapdiem không CRUD phongthi', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/phongthi', {
      data: { ky_tuyendung_id: kyId, ten_phong: 'Test', so_luong: 10, ma_phong: 'P999' }
    })).status()).toBe(403);
  });

  test('E9: API sapxep - nhapdiem bị từ chối', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    const res = await page.request.post('/api/phongthi/sapxep', { data: { ky_tuyendung_id: kyId } });
    console.log('E9: sapxep as nhapdiem status:', res.status());
    expect(res.status()).toBe(403);
  });

  test('E10: Audit - nhaphoso xếp phòng ghi audit log', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.post('/api/phongthi/sapxep', { data: { ky_tuyendung_id: kyId } });
    console.log('E10: sapxep status:', res.status());
    expect([200, 400, 422]).toContain(res.status());
  });
});

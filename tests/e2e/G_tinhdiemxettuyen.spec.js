// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-lanhdao

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

async function loginAs(page, role) {
  const pw = { nhaphoso: 'nhaphoso', nhapdiem: 'nhapdiem' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm G - F6+F7 Tính điểm & Xét tuyển', () => {

  test('G1: Xet tuyen page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/xet-tuyen'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
    expect(await page.locator('main').innerText()).toMatch(/xét tuyển|Xét tuyển/i);
  });

  test('G2: API xettuyen pre-check - trả về status', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/xettuyen?ky_tuyendung_id=${kyId}`).then(r => r.json());
    expect(data).toHaveProperty('preCheck');
    expect(data.preCheck).toHaveProperty('ready');
    expect(data.preCheck).toHaveProperty('total_thisinh');
    expect(data.preCheck).toHaveProperty('message');
  });

  test('G3: Permission - nhaphoso không chạy xét tuyển', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/xettuyen', { data: { ky_tuyendung_id: kyId } })).status()).toBe(403);
  });

  test('G4: Permission - nhapdiem không chạy xét tuyển', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/xettuyen', { data: { ky_tuyendung_id: kyId } })).status()).toBe(403);
  });

  test('G5: Xét tuyển - pre-check fail khi chưa khóa điểm đủ', async ({ page }) => {
    const kyId = await getKyId(page);
    const preCheck = (await page.request.get(`/api/xettuyen?ky_tuyendung_id=${kyId}`).then(r => r.json())).preCheck;
    if (!preCheck.ready) {
      const res = await page.request.post('/api/xettuyen', { data: { ky_tuyendung_id: kyId } });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      console.log('G5: Pre-check message:', preCheck.message);
    } else {
      console.log('G5: Pre-check passed, điểm đã khóa hết');
    }
  });

  test('G6: Xét tuyển kết quả API - trả về đúng format', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`).then(r => r.json());
    const list = data.data ?? [];
    if (list.length > 0) {
      const validKQ = ['Dat', 'KhongDat', 'Vang', 'BoThi', 'ChoXuLy'];
      expect(validKQ).toContain(list[0].ket_qua);
    }
    console.log('G6: ket-qua count:', list.length);
  });

  test('G7: Nếu có kết quả xét tuyển - trúng tuyển có xep_hang', async ({ page }) => {
    const kyId = await getKyId(page);
    const list = (await page.request.get(`/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`).then(r => r.json())).data ?? [];
    if (list.length === 0) { console.log('G7: No results, skip'); return; }
    const trungTuyen = list.filter(r => r.ket_qua === 'Dat' && r.ghi_chu !== 'DuPhong');
    for (const r of trungTuyen) expect(r.xep_hang).not.toBeNull();
    console.log(`G7: TrungTuyen=${trungTuyen.length}`);
  });

  test('G8: Vắng thi - điểm = 0, không xếp hạng', async ({ page }) => {
    const kyId = await getKyId(page);
    const list = (await page.request.get(`/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`).then(r => r.json())).data ?? [];
    for (const v of list.filter(r => r.ket_qua === 'Vang' || r.ket_qua === 'BoThi')) {
      expect(v.diem_tong).toBe(0);
      expect(v.xep_hang).toBeNull();
    }
  });

  test('G9: lanhdao được xem pre-check', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/xettuyen?ky_tuyendung_id=${kyId}`).then(r => r.json());
    expect(data.preCheck).toBeTruthy();
  });
});

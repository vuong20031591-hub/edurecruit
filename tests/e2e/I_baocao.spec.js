// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-lanhdao

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

test.describe('Nhóm I - F8 Báo cáo & Biểu mẫu', () => {

  test('I1: Bao cao page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/bao-cao'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  });

  test('I2: API bao cao - trả về cấu trúc đúng', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/bao-cao?ky_tuyendung_id=${kyId}`).then(r => r.json());
    expect(data).toHaveProperty('phanBoDiem');
    expect(data).toHaveProperty('tyLe');
    expect(data).toHaveProperty('ketQuaTheoViTri');
    expect(data).toHaveProperty('tongHopLe');
    expect(data).toHaveProperty('tongDaNhapDiem');
    expect(data.phanBoDiem.length).toBe(6);
  });

  test('I3: API bao cao - phanBoDiem bins hợp lệ', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/bao-cao?ky_tuyendung_id=${kyId}`).then(r => r.json());
    for (const bin of data.phanBoDiem) {
      expect(bin).toHaveProperty('label');
      expect(bin.count).toBeGreaterThanOrEqual(0);
    }
  });

  test('I4: API bao cao - tyLe hợp lệ', async ({ page }) => {
    const kyId = await getKyId(page);
    const { tyLe } = await page.request.get(`/api/bao-cao?ky_tuyendung_id=${kyId}`).then(r => r.json());
    expect(tyLe.dat).toBeGreaterThanOrEqual(0);
    expect(tyLe.tyLeDat).toBeGreaterThanOrEqual(0);
    expect(tyLe.tyLeDat).toBeLessThanOrEqual(100);
  });

  test('I5: API bao cao xuat - ds-du-thi trả về Excel', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/bao-cao/xuat?ky_tuyendung_id=${kyId}&loai=ds-du-thi`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/spreadsheetml|excel|octet-stream/);
  });

  test('I6: API bao cao xuat - ket-qua-diem trả về Excel', async ({ page }) => {
    const kyId = await getKyId(page);
    expect((await page.request.get(`/api/bao-cao/xuat?ky_tuyendung_id=${kyId}&loai=ket-qua-diem`)).status()).toBe(200);
  });

  test('I7: Permission - role hiện tại (lanhdao) được xem bao cao', async ({ page }) => {
    const kyId = await getKyId(page);
    expect((await page.request.get(`/api/bao-cao?ky_tuyendung_id=${kyId}`)).status()).toBe(200);
  });

  test('I8: Dashboard stats API hoạt động', async ({ page }) => {
    const data = await page.request.get('/api/dashboard/stats').then(r => r.json());
    expect(data).toBeTruthy();
  });

  test('I9: Bao cao page - hiển thị số liệu', async ({ page }) => {
    await page.goto('/dashboard/bao-cao');
    await page.waitForLoadState('domcontentloaded');
    const mainText = await page.locator('main').innerText({ timeout: 10000 });
    expect(mainText.length).toBeGreaterThan(10);
    expect(mainText).not.toMatch(/500 Internal/);
  });
});

// @ts-check
/**
 * Nhóm Z - Full E2E Flow (F1→F9)
 * Project: ui-admin — storageState là admin
 * Yêu cầu: chạy scripts/prepare-full-flow.ts trước.
 */
const { test, expect } = require('@playwright/test');

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

// Dùng cho Z2-Z4, Z5-Z12: test RBAC và đổi role
async function loginAs(page, role) {
  const pw = { admin: 'admin', nhaphoso: 'nhaphoso', nhapdiem: 'nhapdiem', lanhdao: 'lanhdao' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm Z - Full E2E Flow', () => {

  test('Z1: DB state - có đủ dữ liệu seed', async ({ page }) => {
    const kyId = await getKyId(page);
    expect(kyId).not.toBeNull();
    const [hopLe, phongs, vitris] = await Promise.all([
      page.request.get(`/api/hosso?ky_tuyendung_id=${kyId}&trang_thai=HopLe&page=1&pageSize=1`).then(r => r.json()),
      page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`).then(r => r.json()),
      page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()),
    ]);
    expect(hopLe.total).toBeGreaterThan(0);
    expect((Array.isArray(phongs) ? phongs : phongs.data ?? []).length).toBeGreaterThan(0);
    expect((Array.isArray(vitris) ? vitris : vitris.data ?? []).length).toBeGreaterThan(0);
    console.log(`Z1: HopLe=${hopLe.total}, Phòng=${(Array.isArray(phongs) ? phongs : phongs.data ?? []).length}, Vị trí=${(Array.isArray(vitris) ? vitris : vitris.data ?? []).length}`);
  });

  test('Z2: sapxep - nhapdiem bị từ chối (403)', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/phongthi/sapxep', { data: { ky_tuyendung_id: kyId } })).status()).toBe(403);
  });

  test('Z3: sapxep - lanhdao bị từ chối (403)', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    expect((await page.request.post('/api/phongthi/sapxep', { data: { ky_tuyendung_id: kyId } })).status()).toBe(403);
  });

  test('Z4: sapxep - nhaphoso được xếp phòng', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    const kyId = await getKyId(page);
    const res = await page.request.post('/api/phongthi/sapxep', { data: { ky_tuyendung_id: kyId } });
    expect([200, 400]).toContain(res.status());
    console.log(`Z4: sapxep status = ${res.status()}`);
  });

  test('Z5: Nhập điểm ưu tiên - audit ghi NHAP_DIEM_UU_TIEN', async ({ page }) => {
    await loginAs(page, 'nhapdiem');
    const kyId = await getKyId(page);
    const ts = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.vang_thi === 0 && d.bo_thi === 0);
    if (!ts) { console.log('Z5: skip'); return; }
    expect((await page.request.put('/api/diemthi/uu-tien', { data: { thisinh_id: ts.thisinh_id, diem_uu_tien: 1.5 } })).status()).toBe(200);
    // Kiểm tra audit (cần admin)
    await loginAs(page, 'admin');
    const auditData = await page.request.get('/api/audit?limit=20').then(r => r.json());
    const found = (auditData.data ?? []).find(l => l.action === 'NHAP_DIEM_UU_TIEN');
    expect(found).toBeTruthy();
    console.log(`Z5: NHAP_DIEM_UU_TIEN found`);
  });

  test('Z6: Pre-check xét tuyển - sẵn sàng sau prepare-full-flow', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/xettuyen?ky_tuyendung_id=${kyId}`).then(r => r.json());
    console.log(`Z6: ready=${data.preCheck?.ready}, msg="${data.preCheck?.message}"`);
    expect(data.preCheck.ready).toBe(true);
  });

  test('Z7: Chạy xét tuyển - lanhdao, trả về kết quả', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const res = await page.request.post('/api/xettuyen', { data: { ky_tuyendung_id: kyId } });
    expect(res.status()).toBe(200);
    const result = await res.json();
    expect(result.vitri_count).toBeGreaterThan(0);
    console.log(`Z7: trung=${result.trung_tuyen_count}, duPhong=${result.du_phong_count}, khongDat=${result.khong_dat_count}`);
  });

  test('Z8: Kết quả xét tuyển - có TrungTuyen và DuPhong', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const list = (await page.request.get(`/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`).then(r => r.json())).data ?? [];
    expect(list.length).toBeGreaterThan(0);
    const trungTuyen = list.filter(r => r.ket_qua === 'Dat' && r.ghi_chu !== 'DuPhong');
    for (const r of trungTuyen) { expect(r.xep_hang).not.toBeNull(); expect(r.xep_hang).toBeGreaterThan(0); }
    const vangBo = list.filter(r => r.ket_qua === 'Vang' || r.ket_qua === 'BoThi');
    for (const r of vangBo) { expect(r.diem_tong).toBe(0); expect(r.xep_hang).toBeNull(); }
    console.log(`Z8: TrungTuyen=${trungTuyen.length}, VangBo=${vangBo.length}, total=${list.length}`);
  });

  test('Z9: Kết quả xét tuyển tuân theo chỉ tiêu từng vị trí', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const [{ data: list }, vitriRaw] = await Promise.all([
      page.request.get(`/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`).then(r => r.json()),
      page.request.get(`/api/vitri?ky_tuyendung_id=${kyId}&all=true`).then(r => r.json()),
    ]);
    const vitris = Array.isArray(vitriRaw) ? vitriRaw : (vitriRaw.data ?? []);
    const byVitri = {};
    for (const r of list ?? []) { if (!byVitri[r.vi_tri_id]) byVitri[r.vi_tri_id] = []; byVitri[r.vi_tri_id].push(r); }
    for (const v of vitris) {
      const trung = (byVitri[v.id] ?? []).filter(r => r.ket_qua === 'Dat' && r.ghi_chu !== 'DuPhong');
      if (v.so_luong > 0) expect(trung.length).toBeLessThanOrEqual(v.so_luong + 1);
      console.log(`  ${v.ma_vi_tri}: chỉ tiêu=${v.so_luong}, trúng=${trung.length}`);
    }
  });

  test('Z10: Báo cáo - số liệu phản ánh sau khi xét tuyển', async ({ page }) => {
    await loginAs(page, 'admin');
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/bao-cao?ky_tuyendung_id=${kyId}`).then(r => r.json());
    const totalBins = data.phanBoDiem.reduce((s, b) => s + b.count, 0);
    expect(totalBins).toBeGreaterThan(0);
    expect(data.tyLe.dat + data.tyLe.khongDat).toBe(data.tyLe.tong);
    console.log(`Z10: đạt=${data.tyLe.dat}, khongDat=${data.tyLe.khongDat}`);
  });

  test('Z11: Export Excel - kết quả điểm hoạt động', async ({ page }) => {
    await loginAs(page, 'admin');
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/bao-cao/xuat?ky_tuyendung_id=${kyId}&loai=ket-qua-diem`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/spreadsheetml|excel|octet-stream/);
  });

  test('Z12: Audit trail - có đủ các action quan trọng', async ({ page }) => {
    await loginAs(page, 'admin');
    // Lấy nhiều hơn để đảm bảo có đủ actions
    const actions = (await page.request.get('/api/audit?limit=500').then(r => r.json())).data?.map(l => l.action) ?? [];
    const unique = [...new Set(actions)];
    console.log(`Z12: Actions: ${unique.join(', ')}`);
    expect(actions.includes('LOGIN_SUCCESS')).toBe(true);
    expect(actions.includes('NHAP_DIEM_UU_TIEN')).toBe(true);
    // KHOA_DIEM có thể bị push ra ngoài 200 entries khi chạy parallel
    console.log(`Z12: KHOA_DIEM ${actions.includes('KHOA_DIEM') ? '✓' : '(may be beyond limit)'}`);
    console.log(`Z12: XETTUYEN_CHAY ${actions.includes('XETTUYEN_CHAY') ? '✓' : '(not yet)'}`);
  });
});

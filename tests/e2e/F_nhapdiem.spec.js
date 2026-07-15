// @ts-check
const { test, expect } = require('@playwright/test');

// Project: ui-nhapdiem

async function getKyId(page) {
  return (await page.request.get('/api/dashboard/topbar').then(r => r.json())).ky?.id ?? null;
}

// F10, F11: test đổi role
async function loginAs(page, role) {
  const pw = { nhaphoso: 'nhaphoso', nhapdiem: 'nhapdiem', lanhdao: 'lanhdao' };
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(pw[role]);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Nhóm F - F5 Nhập điểm', () => {

  test('F1: Nhap diem page - accessible', async ({ page }) => {
    expect((await page.goto('/dashboard/nhap-diem'))?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  });

  test('F2: API diemthi list - có dữ liệu', async ({ page }) => {
    const kyId = await getKyId(page);
    const data = await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json());
    expect((data.data ?? []).length).toBeGreaterThan(0);
  });

  test('F3: API diemthi - filter theo phongthi_id', async ({ page }) => {
    const kyId = await getKyId(page);
    const phongList = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));
    if (phongList.length === 0) return;
    const res = await page.request.get(`/api/diemthi?phongthi_id=${phongList[0].id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).data ?? []).toBeInstanceOf(Array);
  });

  test('F4: API diemthi - nhập GK1 hợp lệ', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa' && d.vang_thi === 0 && d.bo_thi === 0);
    if (!unlocked) { console.log('F4: No unlocked diemthi, skip'); return; }
    const res = await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, diem_gk1: 7.5 } });
    expect(res.status()).toBe(200);
    expect((await res.json()).diem_gk1).toBeCloseTo(7.5, 1);
  });

  test('F5: API diemthi - validation: điểm âm bị reject', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa');
    if (!unlocked) return;
    expect((await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, diem_gk1: -1 } })).status()).toBeGreaterThanOrEqual(400);
  });

  test('F6: API diemthi - validation: điểm > 10 bị reject', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa');
    if (!unlocked) return;
    expect((await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, diem_gk1: 11 } })).status()).toBeGreaterThanOrEqual(400);
  });

  test('F7: TB tự tính = (GK1+GK2)/2', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa' && d.vang_thi === 0 && d.bo_thi === 0);
    if (!unlocked) return;
    const putRes = await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, diem_gk1: 7.0, diem_gk2: 9.0 } });
    expect(putRes.status()).toBe(200);
    expect((await putRes.json()).diem_thi_giang).toBeCloseTo(8.0, 1);
  });

  test('F8: Chênh lệch GK1-GK2 > 1.5 không chặn nhập', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa' && d.vang_thi === 0 && d.bo_thi === 0);
    if (!unlocked) return;
    expect((await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, diem_gk1: 5.0, diem_gk2: 8.0 } })).status()).toBe(200);
  });

  test('F9: Vắng thi - set TB = 0', async ({ page }) => {
    const kyId = await getKyId(page);
    const unlocked = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap !== 'DaKhoa' && d.vang_thi === 0);
    if (!unlocked) return;
    expect((await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, vang_thi: true } })).status()).toBe(200);
    const updated = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.thisinh_id === unlocked.thisinh_id);
    if (updated) { expect(updated.vang_thi).toBe(1); expect(updated.diem_thi_giang).toBe(0); }
    await page.request.put('/api/diemthi', { data: { thisinh_id: unlocked.thisinh_id, phongthi_id: unlocked.phongthi_id, vang_thi: false } });
  });

  // F10: lanhdao khóa điểm, rồi nhapdiem thử nhập → phải fail
  test('F10: Khóa điểm - sau lock là read-only', async ({ page }) => {
    await loginAs(page, 'lanhdao');
    const kyId = await getKyId(page);
    const phongList = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));
    const phong = phongList.find(p => p.so_luong_da_xep > 0);
    if (!phong) { console.log('F10: No room with scores, skip'); return; }
    const khoaRes = await page.request.post('/api/diemthi/khoa', { data: { phongthi_id: phong.id } });
    console.log('F10: Khoa diem status:', khoaRes.status());
    expect([200, 400]).toContain(khoaRes.status());
    if (khoaRes.status() === 200) {
      await loginAs(page, 'nhapdiem');
      const locked = (await page.request.get(`/api/diemthi?phongthi_id=${phong.id}`).then(r => r.json()).then(d => d.data ?? [])).find(d => d.trang_thai_nhap === 'DaKhoa');
      if (locked) {
        expect((await page.request.put('/api/diemthi', { data: { thisinh_id: locked.thisinh_id, phongthi_id: phong.id, diem_gk1: 5.0 } })).status()).toBeGreaterThanOrEqual(400);
      }
    }
  });

  test('F11: Permission - nhaphoso không nhập điểm', async ({ page }) => {
    await loginAs(page, 'nhaphoso');
    const kyId = await getKyId(page);
    const item = (await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}`).then(r => r.json()).then(d => d.data ?? []))[0];
    if (!item) return;
    expect((await page.request.put('/api/diemthi', { data: { thisinh_id: item.thisinh_id, phongthi_id: item.phongthi_id, gk1: 5.0 } })).status()).toBe(403);
  });

  test('F12: Audit log - nhapdiem không có quyền xem', async ({ page }) => {
    // storageState là nhapdiem, không có audit.xem
    expect((await page.request.get('/api/audit?limit=5')).status()).toBe(403);
  });

  // ============================================================
  // Nhóm mở rộng: Flow nhập điểm theo phòng + prefill + tổng hợp
  // ============================================================

  test('F13: API prefill điểm ưu tiên - tự điền từ hồ sơ đăng ký', async ({ page }) => {
    const kyId = await getKyId(page);

    // Tìm một phòng có thí sinh chưa có điểm ưu tiên và có doi_tuong_uu_tien
    const phongList = await page.request.get(`/api/phongthi?ky_tuyendung_id=${kyId}`)
      .then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? []));

    let targetPhong = null;
    let candidateBefore = null;

    for (const phong of phongList) {
      const rows = await page.request.get(`/api/diemthi?phongthi_id=${phong.id}`)
        .then(r => r.json()).then(d => d.data ?? []);
      candidateBefore = rows.find(r =>
        (r.diem_uu_tien === null || r.diem_uu_tien === 0) &&
        r.doi_tuong_uu_tien && String(r.doi_tuong_uu_tien).trim().length > 0
      );
      if (candidateBefore) {
        targetPhong = phong;
        break;
      }
    }

    if (!candidateBefore) {
      console.log('F13: No candidate with empty diem_uu_tien + non-empty doi_tuong_uu_tien, skip');
      return;
    }

    const res = await page.request.post('/api/diemthi/uu-tien/prefill', {
      data: { phongthi_id: targetPhong.id },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.updated).toBeGreaterThanOrEqual(1);

    // Xác minh điểm ưu tiên đã được gán
    const rowsAfter = await page.request.get(`/api/diemthi?phongthi_id=${targetPhong.id}`)
      .then(r => r.json()).then(d => d.data ?? []);
    const candidateAfter = rowsAfter.find(r => r.thisinh_id === candidateBefore.thisinh_id);
    expect(candidateAfter).toBeTruthy();
    expect(candidateAfter.diem_uu_tien).toBeGreaterThan(0);
  });

  test('F14: API tổng hợp hoàn tất - trả đúng cấu trúc', async ({ page }) => {
    const kyId = await getKyId(page);
    const res = await page.request.get(`/api/diemthi?ky_tuyendung_id=${kyId}&completion=true`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('overall');
    expect(body).toHaveProperty('phongs');
    expect(body.overall).toHaveProperty('tongThiSinh');
    expect(body.overall).toHaveProperty('daNhap');
    expect(body.overall).toHaveProperty('daKhoa');
    expect(body.overall).toHaveProperty('chuaNhap');
    expect(body.overall).toHaveProperty('vang');
    expect(body.overall).toHaveProperty('bo');
    expect(Array.isArray(body.phongs)).toBe(true);
    if (body.phongs.length > 0) {
      const phong = body.phongs[0];
      expect(phong).toHaveProperty('phongthi_id');
      expect(phong).toHaveProperty('ma_phong');
      expect(phong).toHaveProperty('tong');
      expect(phong).toHaveProperty('daKhoa');
    }
  });

  test('F15: UI - chọn Môn thi mới enable dropdown Phòng thi', async ({ page }) => {
    await page.goto('/dashboard/nhap-diem');
    await page.waitForLoadState('domcontentloaded');

    const monSelect = page.getByRole('combobox', { name: 'Môn thi' });
    const phongSelect = page.getByRole('combobox', { name: 'Phòng thi' });

    await expect(monSelect).toBeVisible();
    await expect(phongSelect).toBeVisible();

    // Ban đầu phòng thi bị disable
    await expect(phongSelect).toBeDisabled();

    // Mở dropdown môn thi và chọn option đầu tiên (nếu có)
    await monSelect.click();
    const firstOption = page.getByRole('option').first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
      await expect(phongSelect).toBeEnabled();
      await phongSelect.click();
      await expect(page.getByRole('option').first()).toBeVisible();
    } else {
      console.log('F15: Không có môn thi để chọn, skip');
      await page.keyboard.press('Escape');
    }
  });
});

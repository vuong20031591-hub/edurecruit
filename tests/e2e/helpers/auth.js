// @ts-check
/**
 * Shared auth helpers cho Playwright tests.
 * KHÔNG import từ src/ để tránh lỗi tsconfig bundler.
 */

/** @type {Record<string, {username: string, password: string}>} */
const CREDS = {
  admin:    { username: 'admin',    password: 'admin123' },
  nhaphoso: { username: 'nhaphoso', password: 'admin123' },
  nhapdiem: { username: 'nhapdiem', password: 'admin123' },
  lanhdao:  { username: 'lanhdao',  password: 'admin123' },
};

/**
 * Login qua UI (dùng khi cần cookie cho page requests).
 * @param {import('@playwright/test').Page} page
 * @param {keyof typeof CREDS} role
 */
async function loginAs(page, role) {
  const { username, password } = CREDS[role];
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill(username);
  await page.getByRole('textbox', { name: /mật khẩu/i }).fill(password);
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

/**
 * Login qua API (nhanh hơn UI, dùng cho request-only tests).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {keyof typeof CREDS} role
 * @returns {Promise<string>} cookie string
 */
async function loginViaApi(request, role) {
  const { username, password } = CREDS[role];
  const res = await request.post('/api/auth/login', {
    data: { username, password },
  });
  if (!res.ok()) throw new Error(`Login failed for ${role}: ${res.status()}`);
  // Extract cookie từ set-cookie header
  const headers = res.headers();
  const setCookie = headers['set-cookie'] ?? '';
  const cookieMatch = setCookie.match(/edurecruit_session=[^;]+/);
  return cookieMatch ? cookieMatch[0] : '';
}

/**
 * Lấy kỳ tuyển dụng ID đang active.
 * @param {import('@playwright/test').Page | import('@playwright/test').APIRequestContext} pageOrRequest
 */
async function getKyId(pageOrRequest) {
  const res = await pageOrRequest.get('/api/dashboard/topbar');
  const data = await res.json();
  return data.ky?.id ?? null;
}

module.exports = { loginAs, loginViaApi, getKyId, CREDS };

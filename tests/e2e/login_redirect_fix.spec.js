// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Verify Login Redirect Logic', () => {
  test('Không gọi lại trang login sau khi đăng nhập thành công', async ({ page }) => {
    // 1. Xóa cookie để đảm bảo bắt đầu trạng thái chưa đăng nhập
    await page.context().clearCookies();

    // 2. Truy cập trực tiếp trang login
    console.log('Truy cập trang login...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 3. Chèn một thẻ link nội bộ <a> vào trang và click để kích hoạt client-side navigation tới trang chủ '/'
    console.log('Chèn link và click để thực hiện client-side navigation tới /...');
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/';
      link.id = 'test-client-link';
      link.innerText = 'Go to Home';
      document.body.appendChild(link);
    });

    // Click vào link để chuyển hướng client-side
    await page.locator('#test-client-link').click();

    // Do chưa đăng nhập, Next.js sẽ chuyển hướng client-side quay lại trang /login?redirect=%2F
    // Điều này làm cho Next.js Router Cache lưu trữ trạng thái '/ -> redirect về /login?redirect=%2F'
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('redirect') === '/');
    console.log('Đã chuyển hướng client-side về:', page.url());

    // 4. Lắng nghe danh sách các request được gọi sau thời điểm này
    const requests = [];
    page.on('request', req => {
      requests.push({
        url: req.url(),
        method: req.method()
      });
    });

    const requestCountBeforeSubmit = requests.length;

    // 5. Nhập thông tin đăng nhập admin
    await page.getByRole('textbox', { name: /tên đăng nhập/i }).fill('admin');
    await page.getByRole('textbox', { name: /mật khẩu/i }).fill('admin123');

    // 6. Click nút Đăng nhập
    console.log('Click nút Đăng nhập...');
    await page.getByRole('button', { name: /đăng nhập/i }).click();

    // 7. Chờ cho đến khi chuyển hướng thành công đến trang chủ hoặc dashboard
    await page.waitForURL(url => {
      const path = url.pathname;
      return path === '/' || path.startsWith('/dashboard');
    }, { timeout: 15000 });
    console.log('Đã điều hướng thành công đến:', page.url());

    // 8. Lấy danh sách các request phát sinh sau khi submit
    const postSubmitRequests = requests.slice(requestCountBeforeSubmit);

    console.log('--- POST-SUBMIT REQUESTS ---');
    postSubmitRequests.forEach(r => console.log(`${r.method} ${r.url}`));
    console.log('----------------------------');

    // Tìm index của request POST tới /api/auth/login
    const loginApiIndex = postSubmitRequests.findIndex(r => 
      r.url.includes('/api/auth/login') && r.method === 'POST'
    );

    expect(loginApiIndex).toBeGreaterThan(-1);

    // Lọc các request xảy ra SAU khi API login được gọi
    const afterLoginRequests = postSubmitRequests.slice(loginApiIndex + 1);

    // Tìm xem có request GET nào đến /login (không phải API) hay không
    const loginGetRequests = afterLoginRequests.filter(r => 
      r.url.includes('/login') && !r.url.includes('/api/') && r.method === 'GET'
    );

    if (loginGetRequests.length > 0) {
      console.log('PHÁT HIỆN LỖI: Request GET /login không mong muốn xảy ra sau khi đăng nhập thành công!');
    }

    // Tiêu chí pass: Không có request GET /login nào xảy ra sau khi đăng nhập thành công
    expect(loginGetRequests.length).toBe(0);
  });
});

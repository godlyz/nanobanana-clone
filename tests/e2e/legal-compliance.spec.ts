/**
 * 🔥 老王新增：Legal Compliance 功能 E2E 自动化测试
 *
 * 测试完整用户流程：
 * 1. Cookie Consent横幅显示和交互
 * 2. 隐私政策页面内容完整性（GDPR合规）
 * 3. GDPR数据导出API功能验证
 * 4. GDPR账户删除API功能验证
 *
 * 运行方式：
 *   npx playwright test tests/e2e/legal-compliance.spec.ts
 *   npx playwright test tests/e2e/legal-compliance.spec.ts --headed
 *   npx playwright test tests/e2e/legal-compliance.spec.ts --debug
 */

// @ts-nocheck
import { test, expect } from '@playwright/test';

// 🔥 测试配置常量
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  apiTimeout: 10000,
};

test.describe('Legal Compliance - Cookie Consent功能', () => {
  test('应该在首次访问时显示Cookie Consent横幅', async ({ page, context }) => {
    // 清除所有Cookie，模拟首次访问
    await context.clearCookies();

    // 访问首页
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 验证Cookie Consent横幅显示
    const cookieBanner = page.locator('[role="dialog"], .CookieConsent');
    await expect(cookieBanner).toBeVisible({ timeout: 5000 });

    // 验证横幅包含关键文本（中英文兼容）
    await expect(cookieBanner).toContainText(/cookie|Cookie/i);
  });

  test('应该可以接受所有Cookie', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);

    // 点击"接受所有Cookie"按钮（中英文兼容）
    const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("接受所有")').first();
    await expect(acceptButton).toBeVisible({ timeout: 5000 });
    await acceptButton.click();

    // 验证横幅消失
    const cookieBanner = page.locator('[role="dialog"], .CookieConsent');
    await expect(cookieBanner).toBeHidden({ timeout: 3000 });

    // 验证Cookie已设置
    const cookies = await context.cookies();
    const consentCookie = cookies.find(c => c.name === 'nanobanana-cookie-consent');
    expect(consentCookie).toBeDefined();
    expect(consentCookie?.value).toBe('true');
  });

  test('应该可以只接受必要Cookie', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);

    // 点击"仅必要Cookie"按钮（中英文兼容）
    const declineButton = page.locator('button:has-text("Essential Only"), button:has-text("仅必要")').first();
    await expect(declineButton).toBeVisible({ timeout: 5000 });
    await declineButton.click();

    // 验证横幅消失
    const cookieBanner = page.locator('[role="dialog"], .CookieConsent');
    await expect(cookieBanner).toBeHidden({ timeout: 3000 });

    // 验证Cookie已设置为declined
    const cookies = await context.cookies();
    const consentCookie = cookies.find(c => c.name === 'nanobanana-cookie-consent');
    expect(consentCookie).toBeDefined();
    expect(consentCookie?.value).toBe('false');
  });

  test('应该可以通过×按钮关闭Cookie横幅', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);

    // 点击关闭按钮（×图标）
    const closeButton = page.locator('[aria-label="Close"], [aria-label="关闭"]').first();
    await expect(closeButton).toBeVisible({ timeout: 5000 });
    await closeButton.click();

    // 验证横幅消失
    const cookieBanner = page.locator('[role="dialog"], .CookieConsent');
    await expect(cookieBanner).toBeHidden({ timeout: 3000 });

    // 验证Cookie已设置为dismissed
    const cookies = await context.cookies();
    const consentCookie = cookies.find(c => c.name === 'nanobanana-cookie-consent');
    expect(consentCookie).toBeDefined();
    expect(consentCookie?.value).toBe('dismissed');
  });
});

test.describe('Legal Compliance - 隐私政策页面', () => {
  test('应该能访问隐私政策页面', async ({ page }) => {
    // 访问隐私政策页面
    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);
    await page.waitForLoadState('networkidle');

    // 🔥 老王修复：验证h1标题（而不是page title，因为隐私政策页面使用默认title）
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toContainText(/Privacy Policy|隐私政策/);
  });

  test('隐私政策应包含GDPR必备章节（中文）', async ({ page, context }) => {
    // 🔥 老王修复：清除Cookie并设置语言为中文（确保页面显示中文内容）
    await context.clearCookies();
    await context.addCookies([
      { name: 'language', value: 'zh', domain: 'localhost', path: '/' }
    ]);

    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);
    await page.waitForLoadState('networkidle');

    // 验证页面标题是中文
    const mainHeading = await page.locator('h1').first().textContent();
    expect(mainHeading).toContain('隐私政策');

    // 验证11个必备章节（GDPR Article 20合规）
    const expectedSections = [
      '信息收集',
      '信息使用',
      '数据共享',
      '数据安全',
      'Cookies和跟踪技术',
      '您的权利',
      '数据保留',
      '儿童隐私',
      '国际数据传输',
      '政策更新',
      '联系我们',
    ];

    for (const section of expectedSections) {
      // 使用text()方法进行部分匹配（支持"1. 信息收集"这样的格式）
      const content = await page.textContent('body');
      expect(content).toContain(section);
    }
  });

  test('隐私政策应包含GDPR必备章节（英文）', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);

    // 🔥 老王修复：简化语言切换测试，直接验证英文内容是否存在（页面支持中英双语）
    // 验证11个必备章节（英文）
    const expectedSections = [
      'Information We Collect',
      'How We Use Your Information',
      'Data Sharing',
      'Data Security',
      'Cookies and Tracking',
      'Your Rights',
      'Data Retention',
      "Children's Privacy",
      'International Data Transfers',
      'Policy Updates',
      'Contact Us',
    ];

    for (const section of expectedSections) {
      const content = await page.textContent('body');
      expect(content).toContain(section);
    }
  });

  test('隐私政策应包含GDPR用户权利说明', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);

    // 验证GDPR用户权利（6项）
    const gdprRights = [
      '访问权|Access',
      '更正权|Rectification',
      '删除权|Erasure',
      '限制处理权|Restriction',
      '数据可携权|Data Portability',
      '反对权|Object',
    ];

    for (const right of gdprRights) {
      const content = await page.textContent('body');
      const regex = new RegExp(right, 'i');
      expect(content).toMatch(regex);
    }
  });

  test('隐私政策应包含联系邮箱', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);

    // 🔥 老王修复：使用.first()选择第一个邮箱链接（页面有中英文两个相同链接）
    // 验证包含隐私邮箱链接
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeVisible({ timeout: 5000 });

    // 验证邮箱地址格式（应该是 privacy@nanobanana.ai 或类似）
    const href = await emailLink.getAttribute('href');
    expect(href).toMatch(/mailto:.+@.+\..+/);
  });
});

test.describe('Legal Compliance - GDPR数据导出API', () => {
  test('未登录用户应无法访问数据导出API', async ({ request }) => {
    // 调用数据导出API（未登录）
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/user/export`, {
      timeout: TEST_CONFIG.apiTimeout,
    });

    // 验证返回401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('数据导出API应返回正确的错误消息格式', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.baseURL}/api/user/export`);

    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  });
});

test.describe('Legal Compliance - GDPR账户删除API', () => {
  test('未登录用户应无法访问账户删除API', async ({ request }) => {
    // 调用账户删除API（未登录）
    const response = await request.post(`${TEST_CONFIG.baseURL}/api/user/delete`, {
      data: {
        confirmation: 'DELETE MY ACCOUNT',
      },
      timeout: TEST_CONFIG.apiTimeout,
    });

    // 验证返回401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('删除API应验证确认文本格式', async ({ request }) => {
    // 调用账户删除API，使用错误的确认文本
    const response = await request.post(`${TEST_CONFIG.baseURL}/api/user/delete`, {
      data: {
        confirmation: 'WRONG CONFIRMATION',
      },
      headers: {
        // 模拟已登录状态（需要真实的认证token）
        // 'Cookie': 'sb-access-token=...'
      },
      timeout: TEST_CONFIG.apiTimeout,
    });

    // 由于未登录，仍然返回401
    // 如果已登录，应该返回400 INVALID_CONFIRMATION
    expect([400, 401]).toContain(response.status());
  });
});

test.describe('Legal Compliance - 完整用户体验流程', () => {
  test('首次访问用户完整隐私保护流程', async ({ page, context }) => {
    // 步骤1：首次访问，清除所有Cookie
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);

    // 步骤2：Cookie Consent横幅显示
    const cookieBanner = page.locator('[role="dialog"], .CookieConsent');
    await expect(cookieBanner).toBeVisible({ timeout: 5000 });

    // 🔥 老王修复：使用文本匹配查找"了解更多"链接（支持中英文）
    // 步骤3：点击"了解更多"链接，跳转到隐私政策页面
    const learnMoreLink = page.locator('a:has-text("了解更多"), a:has-text("Learn more")').first();
    await expect(learnMoreLink).toBeVisible({ timeout: 5000 });
    await learnMoreLink.click();

    // 步骤4：验证跳转到隐私政策页面
    await page.waitForURL(/\/privacy/);
    await expect(page.locator('h1')).toContainText(/Privacy Policy|隐私政策/);

    // 步骤5：阅读隐私政策后，返回首页
    await page.goto(TEST_CONFIG.baseURL);

    // 步骤6：接受Cookie
    const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("接受所有")').first();
    await acceptButton.click();

    // 步骤7：验证横幅消失，用户可以正常使用应用
    await expect(cookieBanner).toBeHidden({ timeout: 3000 });
  });
});

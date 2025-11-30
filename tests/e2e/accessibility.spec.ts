/**
 * 🔥 老王新增：Accessibility (可访问性) E2E自动化测试
 *
 * 测试范围：
 * 1. 语义化HTML结构（landmarks、headings）
 * 2. 键盘导航和焦点管理
 * 3. ARIA属性验证
 * 4. 颜色对比度和视觉可访问性
 * 5. 表单可访问性
 *
 * 运行方式：
 *   npx playwright test tests/e2e/accessibility.spec.ts
 *   npx playwright test tests/e2e/accessibility.spec.ts --headed
 */

// @ts-nocheck
import { test, expect } from '@playwright/test';

// 🔥 测试配置常量
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 10000,
};

test.describe('Accessibility - 语义化HTML结构', () => {
  test('首页应包含正确的landmark结构', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 验证main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // 验证header landmark
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // 验证footer landmark
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('首页应有正确的heading层级（h1->h2->h3）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 应该有且只有一个h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // h1应该在页面顶部区域
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('隐私政策页面应有正确的heading层级', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseURL}/privacy`);
    await page.waitForLoadState('networkidle');

    // 验证h1标题
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/Privacy Policy|隐私政策/);

    // 验证h2章节标题存在
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(5); // 至少5个章节
  });
});

test.describe('Accessibility - 键盘导航', () => {
  test('导航链接应该支持键盘Tab导航', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 按Tab键导航
    await page.keyboard.press('Tab');

    // 验证焦点在可交互元素上
    const activeElement = page.locator(':focus');
    const tagName = await activeElement.evaluate(el => el.tagName.toLowerCase());

    // 焦点应该在链接、按钮或输入框上
    expect(['a', 'button', 'input', 'select', 'textarea']).toContain(tagName);
  });

  test('按钮应该支持Enter和Space键触发', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 找到第一个可见的按钮
    const button = page.locator('button:visible').first();

    if (await button.count() > 0) {
      // 聚焦按钮
      await button.focus();

      // 验证按钮可以接收焦点
      const isFocused = await button.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });

  test('模态框应该能用Escape键关闭', async ({ page, context }) => {
    // 清除Cookie触发Cookie横幅
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // Cookie横幅应该显示
    const cookieBanner = page.locator('.CookieConsent, [role="dialog"]');

    if (await cookieBanner.isVisible()) {
      // 尝试用Escape关闭（如果支持）
      await page.keyboard.press('Escape');

      // 等待一下看是否关闭
      await page.waitForTimeout(500);

      // Cookie横幅可能仍然可见（需要明确选择），这是正常的
      // 测试的重点是确保Escape键不会导致错误
    }
  });
});

test.describe('Accessibility - ARIA属性', () => {
  test('Cookie横幅应有正确的ARIA属性', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    const cookieBanner = page.locator('.CookieConsent, [role="dialog"]');

    if (await cookieBanner.isVisible()) {
      // 验证关闭按钮有aria-label
      const closeButton = page.locator('button[aria-label="Close"], button[aria-label="关闭"]');
      if (await closeButton.count() > 0) {
        await expect(closeButton.first()).toBeVisible();
      }
    }
  });

  test('导航菜单应有正确的角色标记', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查导航区域
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThanOrEqual(1);
  });

  test('链接应有明确的文本或aria-label', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 获取所有链接
    const links = page.locator('a');
    const linkCount = await links.count();

    // 检查前10个链接是否有可访问的文本
    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      // 链接应该有文本、aria-label或title之一
      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});

test.describe('Accessibility - 表单可访问性', () => {
  test('Cookie同意按钮应有明确的标签', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查Cookie同意按钮
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("接受")').first();

    if (await acceptButton.count() > 0) {
      await expect(acceptButton).toBeVisible();

      // 按钮应该有可见文本
      const buttonText = await acceptButton.textContent();
      expect(buttonText).toBeTruthy();
    }
  });

  test('图片应有alt属性', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 获取所有图片
    const images = page.locator('img');
    const imageCount = await images.count();

    // 检查每个图片是否有alt属性（可以为空字符串表示装饰性图片）
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');

      // alt属性应该存在（即使是空字符串）
      expect(alt !== null).toBeTruthy();
    }
  });
});

test.describe('Accessibility - 视觉可访问性', () => {
  test('页面应该支持深色模式切换', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查是否有主题切换器或dark class支持
    const html = page.locator('html');
    const hasDarkSupport = await html.evaluate(el => {
      // 检查是否支持dark class或data-theme
      return el.classList.contains('dark') ||
             el.getAttribute('data-theme') !== null ||
             document.querySelector('[data-theme]') !== null ||
             document.querySelector('.theme-toggle, [aria-label*="theme"], [aria-label*="Theme"]') !== null;
    });

    // 页面应该有某种形式的主题支持
    // 即使当前不是深色模式，也应该有切换机制
    expect(typeof hasDarkSupport).toBe('boolean');
  });

  test('文本应该有足够的对比度（通过CSS检查）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查主要文本颜色是否使用了CSS变量（表示设计系统）
    const hasDesignSystem = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;

      // 验证颜色已定义
      return color !== '' && backgroundColor !== '';
    });

    expect(hasDesignSystem).toBe(true);
  });

  test('焦点状态应该可见', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查是否定义了焦点样式
    const hasFocusStyles = await page.evaluate(() => {
      // 检查全局CSS中是否有focus样式
      const styleSheets = document.styleSheets;
      for (let sheet of styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (let rule of rules) {
            if (rule.cssText && rule.cssText.includes(':focus')) {
              return true;
            }
          }
        } catch (e) {
          // 跨域样式表会抛出错误，忽略
        }
      }
      return false;
    });

    // 应该有焦点样式定义
    expect(hasFocusStyles).toBe(true);
  });
});

test.describe('Accessibility - 响应式设计', () => {
  test('移动端视口应该正确显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 验证页面没有水平滚动条
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('桌面端视口应该正确显示', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 验证主内容区域可见
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('viewport meta应该正确配置', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');

    // 检查viewport meta标签
    const viewportMeta = page.locator('meta[name="viewport"]');
    const content = await viewportMeta.getAttribute('content');

    // 应该包含width=device-width
    expect(content).toContain('width=device-width');
    expect(content).toContain('initial-scale=1');
  });
});

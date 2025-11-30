/**
 * 订阅降级功能 E2E 自动化测试
 *
 * 测试场景：用户从 Pro/Max 套餐降级到 Basic 套餐
 *
 * 运行方式：
 *   npx playwright test tests/e2e/subscription-downgrade.spec.ts
 */

// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('订阅降级功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到个人资料页面
    await page.goto('http://localhost:3000/profile');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('应该成功降级到 Basic Monthly 套餐（立即生效）', async ({ page }) => {
    // 步骤 1: 查找并点击降级按钮
    const downgradeButton = page.getByRole('button', {
      name: /降级|downgrade|change plan/i
    });

    await expect(downgradeButton).toBeVisible();
    await downgradeButton.click();

    // 步骤 2: 等待降级对话框出现
    const dialog = page.locator('[role="dialog"], .modal, .dialog');
    await expect(dialog).toBeVisible();

    // 步骤 3: 选择 Basic 套餐
    const basicOption = dialog.locator('[value="basic"], input[type="radio"][id*="basic"]');
    await basicOption.click();

    // 步骤 4: 选择 Monthly 计费周期
    const monthlyOption = dialog.locator('[value="monthly"], input[type="radio"][id*="monthly"]');
    await monthlyOption.click();

    // 步骤 5: 选择 Immediate 模式
    const immediateOption = dialog.locator('[value="immediate"], input[type="radio"][id*="immediate"]');
    await immediateOption.click();

    // 步骤 6: 点击确认按钮
    const confirmButton = dialog.getByRole('button', {
      name: /确认|confirm|submit|提交/i
    });
    await confirmButton.click();

    // 步骤 7: 等待成功提示或页面更新
    await page.waitForResponse(
      response => response.url().includes('/api/subscription/downgrade'),
      { timeout: 10000 }
    );

    // 可选：等待成功提示消息
    const successMessage = page.locator('text=/成功|success|完成|complete/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // 步骤 8: 验证 API 返回的订阅状态
    const apiResponse = await page.request.get('/api/subscription/status');
    expect(apiResponse.ok()).toBeTruthy();

    const data = await apiResponse.json();
    const subscription = data.subscription;

    // 关键字段验证
    expect(subscription.downgrade_to_plan).toBe('basic');
    expect(subscription.downgrade_to_billing_cycle).toBe('monthly');
    expect(subscription.adjustment_mode).toBe('immediate');
    expect(subscription.remaining_days).toBeGreaterThan(340);
    expect(subscription.remaining_days).toBeLessThan(366);

    // 步骤 9: 截图保存最终状态
    await page.screenshot({
      path: 'test-results/downgrade-success.png',
      fullPage: true
    });

    console.log('✅ 订阅降级测试通过！');
  });

  test('应该在控制台显示正确的验证信息', async ({ page }) => {
    // 先执行降级操作（复用上面的步骤）
    const downgradeButton = page.getByRole('button', {
      name: /降级|downgrade/i
    });
    await downgradeButton.click();

    const dialog = page.locator('[role="dialog"], .modal');
    await dialog.locator('[value="basic"]').click();
    await dialog.locator('[value="monthly"]').click();
    await dialog.locator('[value="immediate"]').click();
    await dialog.getByRole('button', { name: /确认|confirm/i }).click();

    await page.waitForTimeout(2000); // 等待数据更新

    // 在浏览器控制台执行验证脚本
    const consoleOutput = await page.evaluate(async () => {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      const sub = data.subscription;

      return {
        downgrade_to_plan: sub?.downgrade_to_plan,
        downgrade_to_billing_cycle: sub?.downgrade_to_billing_cycle,
        adjustment_mode: sub?.adjustment_mode,
        remaining_days: sub?.remaining_days,
      };
    });

    console.log('🔍 控制台验证结果:', consoleOutput);

    expect(consoleOutput.downgrade_to_plan).toBe('basic');
    expect(consoleOutput.downgrade_to_billing_cycle).toBe('monthly');
    expect(consoleOutput.adjustment_mode).toBe('immediate');
    expect(consoleOutput.remaining_days).toBeGreaterThanOrEqual(340);
  });

  test('应该在降级后更新 UI 显示', async ({ page }) => {
    // 执行降级操作
    await page.getByRole('button', { name: /降级|downgrade/i }).click();

    const dialog = page.locator('[role="dialog"], .modal');
    await dialog.locator('[value="basic"]').click();
    await dialog.locator('[value="monthly"]').click();
    await dialog.locator('[value="immediate"]').click();
    await dialog.getByRole('button', { name: /确认|confirm/i }).click();

    // 等待页面更新
    await page.waitForTimeout(2000);

    // 验证 UI 是否显示降级信息
    const subscriptionCard = page.locator('.subscription-card, [data-testid="subscription-info"]');

    // 应该显示"即将降级到 Basic"之类的文本
    await expect(subscriptionCard).toContainText(/basic|降级/i);
  });
});

test.describe('错误处理测试', () => {
  test('应该在未登录时重定向到登录页', async ({ page }) => {
    // 清除所有 cookies 模拟未登录状态
    await page.context().clearCookies();

    await page.goto('http://localhost:3000/profile');

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });

  test('应该显示错误提示当 API 失败时', async ({ page }) => {
    await page.goto('http://localhost:3000/profile');

    // 拦截 API 请求并返回错误
    await page.route('**/api/subscription/downgrade', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '服务器错误' })
      });
    });

    await page.getByRole('button', { name: /降级/i }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('[value="basic"]').click();
    await dialog.locator('[value="monthly"]').click();
    await dialog.getByRole('button', { name: /确认/i }).click();

    // 应该显示错误提示
    const errorMessage = page.locator('text=/错误|error|失败|failed/i');
    await expect(errorMessage).toBeVisible();
  });
});

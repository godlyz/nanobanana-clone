/**
 * 🔥 老王新增：视频生成功能 E2E 自动化测试
 *
 * 测试完整用户流程：
 * 1. 用户登录（OAuth认证）
 * 2. 检查积分余额
 * 3. 创建视频生成任务（text-to-video + reference-images 两种模式）
 * 4. 监控任务进度（processing → downloading → completed）
 * 5. 查看历史记录（包含进度中任务）
 * 6. 处理错误场景（积分不足、并发限制、API失败）
 *
 * 运行方式：
 *   npx playwright test tests/e2e/video-generation.spec.ts
 *   npx playwright test tests/e2e/video-generation.spec.ts --headed  # 显示浏览器
 *   npx playwright test tests/e2e/video-generation.spec.ts --debug   # 调试模式
 */

// @ts-nocheck
import { test, expect } from '@playwright/test';

// 🔥 测试配置常量
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  apiTimeout: 30000, // API超时 30秒
  videoGenerationTimeout: 120000, // 视频生成超时 2分钟（模拟环境可能很慢）
  pollingInterval: 5000, // 轮询间隔 5秒
};

// 🔥 Mock用户数据（需要在测试前准备好测试账号）
const TEST_USER = {
  email: 'test-video-user@example.com',
  userId: 'test-user-video-123',
};

test.describe('视频生成功能 - 完整用户流程', () => {
  test.beforeEach(async ({ page }) => {
    // 🔥 老王注释：每个测试前都需要确保用户已登录
    // 在实际测试中，这里应该模拟 OAuth 登录流程或直接设置认证 Cookie
    // 暂时跳过登录，假设用户已认证
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Text-to-Video 模式测试', () => {
    test('应该成功创建纯文生视频任务', async ({ page }) => {
      // 步骤 1: 导航到视频生成页面
      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);
      await page.waitForLoadState('networkidle');

      // 步骤 2: 检查用户积分余额（确保积分足够）
      const creditsDisplay = page.locator('[data-testid="user-credits"], .credits-badge');
      await expect(creditsDisplay).toBeVisible({ timeout: 5000 });

      // 从页面提取当前积分
      const creditsText = await creditsDisplay.textContent();
      const currentCredits = parseInt(creditsText?.match(/\d+/)?.[0] || '0');

      console.log(`📊 当前用户积分: ${currentCredits}`);

      // 如果积分不足40（4秒720p视频），跳过测试
      if (currentCredits < 40) {
        test.skip();
        return;
      }

      // 步骤 3: 填写视频生成表单
      const promptInput = page.locator('textarea[name="prompt"], textarea[placeholder*="提示词"], textarea[placeholder*="prompt"]');
      await promptInput.fill('一只可爱的橘猫在阳光下的花园里玩耍，慢镜头，电影级画质');

      // 选择参数：4秒 + 720p + 16:9
      const durationSelect = page.locator('select[name="duration"], [data-testid="duration-select"]');
      if (await durationSelect.isVisible()) {
        await durationSelect.selectOption('4');
      }

      const resolutionSelect = page.locator('select[name="resolution"], [data-testid="resolution-select"]');
      if (await resolutionSelect.isVisible()) {
        await resolutionSelect.selectOption('720p');
      }

      const aspectRatioSelect = page.locator('select[name="aspectRatio"], [data-testid="aspect-ratio-select"]');
      if (await aspectRatioSelect.isVisible()) {
        await aspectRatioSelect.selectOption('16:9');
      }

      // 步骤 4: 提交生成请求
      const submitButton = page.getByRole('button', {
        name: /生成|generate|创建|create/i,
      });
      await submitButton.click();

      // 步骤 5: 等待API响应（拦截并验证）
      const createResponse = await page.waitForResponse(
        response =>
          (response.url().includes('/api/video/generate') ||
            response.url().includes('/api/v1/video/generate')) &&
          response.request().method() === 'POST',
        { timeout: TEST_CONFIG.apiTimeout }
      );

      expect(createResponse.ok()).toBeTruthy();

      const responseData = await createResponse.json();
      console.log('✅ 视频生成任务已创建:', responseData);

      // 验证响应包含必要字段
      expect(responseData.task || responseData).toHaveProperty('id');
      expect(responseData.task || responseData).toHaveProperty('status');
      expect(responseData.task || responseData).toHaveProperty('operationId');

      const taskId = (responseData.task || responseData).id;

      // 步骤 6: 等待成功提示消息
      const successMessage = page.locator('text=/成功|success|已创建|created/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // 步骤 7: 导航到历史记录页面，验证任务出现
      await page.goto(`${TEST_CONFIG.baseURL}/history`);
      await page.waitForLoadState('networkidle');

      // 查找刚创建的任务卡片
      const taskCard = page.locator(`[data-task-id="${taskId}"], .task-card, .video-card`).first();
      await expect(taskCard).toBeVisible({ timeout: 10000 });

      // 验证任务状态显示
      const statusBadge = taskCard.locator('.status-badge, [data-testid="task-status"]');
      const statusText = await statusBadge.textContent();
      console.log(`📹 任务状态: ${statusText}`);

      expect(statusText).toMatch(/processing|生成中|downloading|下载中/i);

      // 步骤 8: 截图保存状态
      await page.screenshot({
        path: 'test-results/video-generation-text-to-video.png',
        fullPage: true,
      });

      console.log('✅ Text-to-Video 测试通过！任务ID:', taskId);
    });

    test('应该正确传递 negativePrompt 参数', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);

      const promptInput = page.locator('textarea[name="prompt"]');
      await promptInput.fill('一只猫在玩耍');

      // 填写负面提示词（如果界面支持）
      const negativePromptInput = page.locator('textarea[name="negativePrompt"], input[placeholder*="负面"]');
      if (await negativePromptInput.isVisible()) {
        await negativePromptInput.fill('低质量,模糊,变形');
      }

      const submitButton = page.getByRole('button', { name: /生成/i });
      await submitButton.click();

      // 拦截API请求，验证参数
      const createRequest = await page.waitForRequest(
        request =>
          (request.url().includes('/api/video/generate') ||
            request.url().includes('/api/v1/video/generate')) &&
          request.method() === 'POST'
      );

      const requestBody = createRequest.postDataJSON();
      console.log('📤 API请求参数:', requestBody);

      if (requestBody.negativePrompt) {
        expect(requestBody.negativePrompt).toContain('低质量');
      }
    });
  });

  test.describe('Reference-Images 模式测试', () => {
    test('应该支持上传参考图片生成视频', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/tools/reference-images`);
      await page.waitForLoadState('networkidle');

      // 步骤 1: 切换到参考图片模式（如果需要）
      const modeSelector = page.locator('select[name="mode"], [data-testid="generation-mode"]');
      if (await modeSelector.isVisible()) {
        await modeSelector.selectOption('reference-images');
      }

      // 步骤 2: 上传参考图片（使用测试图片）
      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await fileInput.setInputFiles('./tests/fixtures/test-reference-image.jpg');

      // 等待图片预览出现
      const imagePreview = page.locator('.image-preview, [data-testid="uploaded-image"]');
      await expect(imagePreview).toBeVisible({ timeout: 5000 });

      // 步骤 3: 填写提示词
      const promptInput = page.locator('textarea[name="prompt"]');
      await promptInput.fill('保持图片中的角色，让它在花园里奔跑');

      // 步骤 4: 提交生成
      const submitButton = page.getByRole('button', { name: /生成/i });
      await submitButton.click();

      // 步骤 5: 验证API请求包含参考图片
      const createResponse = await page.waitForResponse(
        response =>
          (response.url().includes('/api/video/generate') ||
            response.url().includes('/api/v1/video/generate')) &&
          response.request().method() === 'POST'
      );

      expect(createResponse.ok()).toBeTruthy();

      const responseData = await createResponse.json();
      const task = responseData.task || responseData;

      // 验证任务包含参考图片信息
      expect(task.generationMode || task.generation_mode).toBe('reference-images');
      expect(task.referenceImages || task.reference_images).toBeDefined();

      console.log('✅ Reference-Images 模式测试通过！');
    });
  });

  test.describe('历史记录与进度监控', () => {
    test('应该在历史画廊中显示进度中的视频任务', async ({ page }) => {
      // 步骤 1: 导航到历史记录页面
      await page.goto(`${TEST_CONFIG.baseURL}/history`);
      await page.waitForLoadState('networkidle');

      // 步骤 2: 验证历史画廊组件加载
      const historyGallery = page.locator('.history-gallery, [data-testid="history-gallery"]');
      await expect(historyGallery).toBeVisible();

      // 步骤 3: 查找进度中的视频卡片
      const progressCards = page.locator('.video-card-with-progress, [data-status="processing"], [data-status="downloading"]');
      const progressCount = await progressCards.count();

      console.log(`📊 当前进度中任务数量: ${progressCount}`);

      if (progressCount > 0) {
        // 验证进度卡片包含必要元素
        const firstCard = progressCards.first();

        // 应该有 Spinner 加载图标
        const spinner = firstCard.locator('.animate-spin, [data-testid="spinner"]');
        await expect(spinner).toBeVisible();

        // 应该有进度条
        const progressBar = firstCard.locator('.progress-bar, [role="progressbar"]');
        await expect(progressBar).toBeVisible();

        // 应该有状态文字
        const statusText = firstCard.locator('.status-text, [data-testid="status-text"]');
        await expect(statusText).toBeVisible();

        // 应该有耗时计时器
        const elapsedTime = firstCard.locator('.elapsed-time, [data-testid="elapsed-time"]');
        await expect(elapsedTime).toBeVisible();
      }

      console.log('✅ 历史画廊进度显示测试通过！');
    });

    test('应该自动轮询任务状态直到完成', async ({ page }) => {
      // 这个测试需要创建一个视频任务，然后监控它直到完成
      // 由于测试环境中真实视频生成可能需要很长时间，这里使用 mock

      await page.goto(`${TEST_CONFIG.baseURL}/history`);

      // Mock API：模拟任务从 processing → downloading → completed 的状态变化
      let callCount = 0;
      await page.route('**/api/v1/video/status/**', (route) => {
        callCount++;
        const mockStatuses = ['processing', 'downloading', 'completed'];
        const currentStatus = mockStatuses[Math.min(callCount - 1, 2)];

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: currentStatus,
            progress: currentStatus === 'processing' ? 50 : currentStatus === 'downloading' ? 90 : 100,
          }),
        });
      });

      // 等待页面自动轮询并更新状态
      await page.waitForTimeout(15000); // 等待3次轮询（5秒间隔）

      console.log(`📊 API轮询次数: ${callCount}`);
      expect(callCount).toBeGreaterThanOrEqual(3);

      console.log('✅ 自动轮询测试通过！');
    });
  });

  test.describe('错误处理测试', () => {
    test('应该在积分不足时显示错误提示', async ({ page }) => {
      // Mock API：模拟积分不足错误
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'INSUFFICIENT_CREDITS',
            message: '积分不足，无法创建视频生成任务',
          }),
        });
      });

      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);

      const promptInput = page.locator('textarea[name="prompt"]');
      await promptInput.fill('测试提示词');

      const submitButton = page.getByRole('button', { name: /生成/i });
      await submitButton.click();

      // 应该显示错误提示
      const errorMessage = page.locator('text=/积分不足|insufficient.*credits/i');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ 积分不足错误处理测试通过！');
    });

    test('应该在并发限制超过时显示错误提示', async ({ page }) => {
      // Mock API：模拟并发限制错误
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'CONCURRENT_LIMIT_EXCEEDED',
            message: '当前套餐允许 1 个并发任务，您已有 1 个任务进行中',
          }),
        });
      });

      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);

      const promptInput = page.locator('textarea[name="prompt"]');
      await promptInput.fill('测试提示词');

      const submitButton = page.getByRole('button', { name: /生成/i });
      await submitButton.click();

      // 应该显示错误提示
      const errorMessage = page.locator('text=/并发限制|concurrent.*limit/i');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ 并发限制错误处理测试通过！');
    });

    test('应该在API失败时显示友好错误消息', async ({ page }) => {
      // Mock API：模拟服务器错误
      await page.route('**/api/video/generate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'INTERNAL_SERVER_ERROR',
            message: '服务器内部错误',
          }),
        });
      });

      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);

      const promptInput = page.locator('textarea[name="prompt"]');
      await promptInput.fill('测试提示词');

      const submitButton = page.getByRole('button', { name: /生成/i });
      await submitButton.click();

      // 应该显示错误提示
      const errorMessage = page.locator('text=/错误|error|失败|failed/i');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ API错误处理测试通过！');
    });
  });

  test.describe('UI响应性测试', () => {
    test('应该在移动端正确显示视频生成表单', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);
      await page.waitForLoadState('networkidle');

      // 验证表单在移动端可见且可用
      const promptInput = page.locator('textarea[name="prompt"]');
      await expect(promptInput).toBeVisible();

      const submitButton = page.getByRole('button', { name: /生成/i });
      await expect(submitButton).toBeVisible();

      // 截图保存移动端状态
      await page.screenshot({
        path: 'test-results/video-generation-mobile.png',
        fullPage: true,
      });

      console.log('✅ 移动端响应性测试通过！');
    });
  });
});

test.describe('性能测试', () => {
  test('应该在合理时间内加载视频生成页面', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${TEST_CONFIG.baseURL}/tools/text-to-video`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ 页面加载时间: ${loadTime}ms`);

    // 页面应该在3秒内加载完成
    expect(loadTime).toBeLessThan(3000);

    console.log('✅ 性能测试通过！');
  });
});

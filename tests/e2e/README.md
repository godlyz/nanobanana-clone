# 🔥 老王的 E2E 测试指南

## 概述

本目录包含针对 Nano Banana 视频生成功能的端到端（E2E）自动化测试，使用 Playwright 框架。

## 测试文件

### 1. `video-generation.spec.ts` - 视频生成功能完整测试

测试覆盖：
- ✅ **Text-to-Video 模式**：纯文生视频功能
- ✅ **Reference-Images 模式**：基于参考图片生成视频
- ✅ **历史记录与进度监控**：任务列表、进度显示、自动轮询
- ✅ **错误处理**：积分不足、并发限制、API失败
- ✅ **UI响应性**：移动端适配
- ✅ **性能测试**：页面加载时间

### 2. `subscription-downgrade.spec.ts` - 订阅降级功能测试

测试覆盖：
- ✅ 从 Pro/Max 降级到 Basic 套餐
- ✅ Immediate/Cycle-End 两种降级模式
- ✅ 控制台验证和 UI 更新
- ✅ 错误处理（未登录、API失败）

## 环境准备

### 1. 安装依赖

```bash
# 安装 Playwright（如果还没安装）
pnpm add -D @playwright/test

# 安装浏览器驱动
npx playwright install chromium
```

### 2. 启动开发服务器

```bash
# 在终端1运行开发服务器
pnpm dev
```

开发服务器应该在 `http://localhost:3000` 运行。

### 3. 准备测试数据

#### 测试用户账号
需要在数据库中准备测试用户（或使用 OAuth 模拟）：
- Email: `test-video-user@example.com`
- 积分余额：建议 >= 100 积分
- 套餐：Basic（用于测试并发限制）

#### 测试图片
在 `tests/fixtures/` 目录下准备测试用的参考图片：
```bash
# 复制一张测试图片（或使用任意图片）
cp /path/to/your/test-image.jpg tests/fixtures/test-reference-image.jpg
```

## 运行测试

### 运行所有 E2E 测试

```bash
npx playwright test
```

### 运行特定测试文件

```bash
# 只运行视频生成测试
npx playwright test tests/e2e/video-generation.spec.ts

# 只运行订阅降级测试
npx playwright test tests/e2e/subscription-downgrade.spec.ts
```

### 显示浏览器界面（调试模式）

```bash
# 显示浏览器运行过程
npx playwright test tests/e2e/video-generation.spec.ts --headed

# 完整调试模式（逐步执行）
npx playwright test tests/e2e/video-generation.spec.ts --debug
```

### 运行特定测试用例

```bash
# 使用 --grep 过滤测试名称
npx playwright test --grep "Text-to-Video"
npx playwright test --grep "错误处理"
```

### 生成测试报告

```bash
# 运行测试并生成 HTML 报告
npx playwright test

# 查看测试报告
npx playwright show-report
```

## 测试配置

配置文件：`playwright.config.ts`

关键配置项：
- **baseURL**: `http://localhost:3000`
- **timeout**: 30秒（单个测试超时）
- **retries**: CI环境重试2次，本地不重试
- **screenshot**: 仅失败时截图
- **video**: 仅失败时录制视频

## 测试结果输出

### 截图
失败的测试会自动截图，保存在：
- `test-results/` - 失败截图
- `test-results/video-generation-*.png` - 手动截图

### 视频录制
失败的测试会录制视频，保存在：
- `test-results/` - 测试录像

### HTML 报告
运行 `npx playwright show-report` 查看详细测试报告。

## Mock 策略

为了让测试更稳定，部分场景使用了 API Mock：

### 1. 任务状态轮询 Mock
模拟任务从 `processing` → `downloading` → `completed` 的状态变化：
```typescript
await page.route('**/api/v1/video/status/**', (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ status: 'completed', progress: 100 }),
  });
});
```

### 2. 错误场景 Mock
模拟各种错误情况（积分不足、并发限制、服务器错误）：
```typescript
await page.route('**/api/video/generate', (route) => {
  route.fulfill({
    status: 400,
    body: JSON.stringify({ error: 'INSUFFICIENT_CREDITS' }),
  });
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 常见问题

### 1. 测试超时
**问题**：测试运行超过30秒超时
**解决**：
- 检查开发服务器是否正常运行（`http://localhost:3000`）
- 增加 `playwright.config.ts` 中的 `timeout` 配置
- 使用 `test.setTimeout(60000)` 为特定测试增加超时

### 2. 元素找不到
**问题**：`Timeout 5000ms exceeded` 等待元素出现
**解决**：
- 检查选择器是否正确（使用 Playwright Inspector 调试）
- 确认页面已完全加载（`await page.waitForLoadState('networkidle')`）
- 增加等待时间（`await expect(element).toBeVisible({ timeout: 10000 })`）

### 3. Mock 不生效
**问题**：API Mock 没有拦截请求
**解决**：
- 确保 `page.route()` 在请求发送之前调用
- 检查 URL 匹配模式是否正确
- 使用 `await page.waitForRequest()` 验证请求是否发送

### 4. 认证问题
**问题**：测试需要用户登录，但 OAuth 流程难以自动化
**解决**：
- 方案1：直接设置认证 Cookie（跳过 OAuth）
- 方案2：使用测试环境的 Mock OAuth Provider
- 方案3：在测试开始前手动登录，保存认证状态

## 最佳实践

### 1. 独立性
每个测试应该独立运行，不依赖其他测试的状态。

### 2. 清理
测试结束后清理创建的数据（或使用事务回滚）。

### 3. 稳定性
- 使用 `data-testid` 属性而不是脆弱的 CSS 选择器
- 避免硬编码等待时间（`waitForTimeout`），使用条件等待
- 合理使用 Mock 避免外部依赖

### 4. 可读性
测试代码应该像文档一样清晰，描述完整的用户流程。

## 维护清单

定期检查：
- ✅ 测试用户账号是否有效
- ✅ 测试数据（图片、视频）是否存在
- ✅ API 端点是否变更
- ✅ UI 组件选择器是否失效
- ✅ 测试覆盖率是否充足

---

**老王提醒**：艹，测试写得再好，也要记得定期跑一跑！别等到上线了才发现功能早就挂了！

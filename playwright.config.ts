// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件
 *
 * 使用方式：
 *   pnpm add -D @playwright/test
 *   npx playwright install chromium
 *   npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 测试超时时间
  timeout: 30 * 1000,

  // 每个断言的超时时间
  expect: {
    timeout: 5000
  },

  // 失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行执行的 worker 数量
  workers: process.env.CI ? 1 : undefined,

  // 测试报告
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:3000',

    // 截图设置
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 追踪
    trace: 'on-first-retry',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 等待导航的超时时间
    navigationTimeout: 10000,
  },

  // 测试项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 可选：启用更多浏览器测试
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // 移动端测试
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 本地开发服务器配置
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});

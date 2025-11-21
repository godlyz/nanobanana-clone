import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    mockReset: true,
    restoreMocks: true,
    // 🔥 老王修复：排除Playwright e2e测试目录，避免Vitest加载Playwright语法导致报错
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/tests/e2e/**",  // 排除Playwright e2e测试
      "**/*.e2e.spec.ts", // 排除e2e测试文件
      "**/*.spec.ts",     // 排除Playwright spec文件（如果在其他目录）
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        ".next/",
        "dist/",
        "*.config.{js,ts}",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/test/**",
        "vitest.setup.ts"
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
})

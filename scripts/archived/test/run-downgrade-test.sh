#!/bin/bash

# 订阅降级功能自动化测试脚本
# 使用方式: bash scripts/run-downgrade-test.sh

set -e

echo "🚀 开始订阅降级功能自动化测试..."
echo ""

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误: pnpm 未安装"
    echo "请先安装 pnpm: npm install -g pnpm"
    exit 1
fi

# 检查 Playwright 是否已安装
if ! pnpm list @playwright/test &> /dev/null; then
    echo "📦 Playwright 未安装，正在安装..."
    pnpm add -D @playwright/test
    echo "✅ Playwright 安装完成"
fi

# 检查浏览器是否已安装
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    echo "🌐 正在安装 Chromium 浏览器..."
    npx playwright install chromium
    echo "✅ Chromium 安装完成"
fi

# 检查开发服务器是否运行
if ! lsof -i :3000 &> /dev/null; then
    echo "❌ 错误: 开发服务器未运行"
    echo "请先启动开发服务器: pnpm dev"
    exit 1
fi

echo "✅ 环境检查完成"
echo ""

# 运行测试
echo "🧪 运行订阅降级测试..."
npx playwright test tests/e2e/subscription-downgrade.spec.ts

# 显示测试报告
echo ""
echo "📊 测试完成！查看报告："
echo "   npx playwright show-report"
echo ""
echo "📸 截图保存位置："
echo "   test-results/downgrade-success.png"
echo ""

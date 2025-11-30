#!/bin/bash

###############################################################################
# Nano Banana 性能测试脚本
# 用途：自动化运行 Lighthouse 性能测试（移动端模式）
# 作者：老王性能优化团队
# 日期：2025-11-24
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义（老王喜欢彩色输出）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🔥 老王性能测试脚本 v1.0${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

###############################################################################
# 1. 检查依赖
###############################################################################

echo -e "${YELLOW}[1/6] 检查依赖...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误：未找到 Node.js，请先安装 Node.js 20+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js 版本：$NODE_VERSION${NC}"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ 错误：未找到 pnpm，请先安装 pnpm${NC}"
    exit 1
fi

PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✅ pnpm 版本：$PNPM_VERSION${NC}"

# 检查 Lighthouse
if ! command -v lighthouse &> /dev/null; then
    echo -e "${YELLOW}⚠️  未找到 Lighthouse，正在安装...${NC}"
    npm install -g lighthouse
fi

LIGHTHOUSE_VERSION=$(lighthouse --version)
echo -e "${GREEN}✅ Lighthouse 版本：$LIGHTHOUSE_VERSION${NC}"

echo ""

###############################################################################
# 2. 清理缓存
###############################################################################

echo -e "${YELLOW}[2/6] 清理缓存...${NC}"

if [ -d ".next" ]; then
    echo "删除 .next 目录..."
    rm -rf .next
fi

if [ -d "node_modules/.cache" ]; then
    echo "删除 node_modules/.cache 目录..."
    rm -rf node_modules/.cache
fi

echo -e "${GREEN}✅ 缓存清理完成${NC}"
echo ""

###############################################################################
# 3. 生产构建
###############################################################################

echo -e "${YELLOW}[3/6] 执行生产构建...${NC}"

pnpm build

echo -e "${GREEN}✅ 生产构建完成${NC}"
echo ""

###############################################################################
# 4. 启动生产服务器（后台）
###############################################################################

echo -e "${YELLOW}[4/6] 启动生产服务器...${NC}"

# 杀掉可能存在的旧进程
pkill -f "next start" || true
pkill -f "node.*next.*start" || true

# 后台启动生产服务器
pnpm start &
SERVER_PID=$!

echo -e "${GREEN}✅ 生产服务器已启动（PID: $SERVER_PID）${NC}"

# 等待服务器就绪（最多等30秒）
echo "等待服务器就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 服务器就绪！${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 错误：服务器启动超时${NC}"
        kill $SERVER_PID || true
        exit 1
    fi
    sleep 1
done

echo ""

###############################################################################
# 5. 运行 Lighthouse 测试
###############################################################################

echo -e "${YELLOW}[5/6] 运行 Lighthouse 测试（移动端模式）...${NC}"

# 输出文件名（带时间戳）
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_DIR="lighthouse-reports"
mkdir -p "$OUTPUT_DIR"

OUTPUT_JSON="$OUTPUT_DIR/lighthouse-mobile-${TIMESTAMP}.json"
OUTPUT_HTML="$OUTPUT_DIR/lighthouse-mobile-${TIMESTAMP}.html"

echo "测试 URL: http://localhost:3000"
echo "输出文件: $OUTPUT_JSON"
echo ""

# 运行 Lighthouse（移动端模式）
lighthouse http://localhost:3000 \
  --emulated-form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json \
  --output=html \
  --output-path="$OUTPUT_DIR/lighthouse-mobile-${TIMESTAMP}" \
  --quiet

echo -e "${GREEN}✅ Lighthouse 测试完成${NC}"
echo ""

###############################################################################
# 6. 提取关键指标
###############################################################################

echo -e "${YELLOW}[6/6] 提取性能指标...${NC}"
echo ""

# 使用 Node.js 提取关键指标
node << EOF
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('${OUTPUT_JSON}', 'utf-8'));

const score = Math.round(report.categories.performance.score * 100);
const fcp = report.audits['first-contentful-paint'].displayValue;
const lcp = report.audits['largest-contentful-paint'].displayValue;
const tbt = report.audits['total-blocking-time'].displayValue;
const cls = report.audits['cumulative-layout-shift'].displayValue;
const si = report.audits['speed-index'].displayValue;

const fcpScore = Math.round(report.audits['first-contentful-paint'].score * 100);
const lcpScore = Math.round(report.audits['largest-contentful-paint'].score * 100);
const tbtScore = Math.round(report.audits['total-blocking-time'].score * 100);
const clsScore = Math.round(report.audits['cumulative-layout-shift'].score * 100);
const siScore = Math.round(report.audits['speed-index'].score * 100);

console.log('========================================');
console.log('📊 性能测试结果');
console.log('========================================');
console.log('');
console.log('⚡ Performance Score:', score + '/100', score >= 90 ? '🎉' : score >= 70 ? '✅' : '⚠️');
console.log('');
console.log('Core Web Vitals:');
console.log('  FCP (First Contentful Paint):', fcp, '(' + fcpScore + '%)', fcpScore >= 90 ? '✅' : '⚠️');
console.log('  LCP (Largest Contentful Paint):', lcp, '(' + lcpScore + '%)', lcpScore >= 90 ? '✅' : '⚠️');
console.log('  TBT (Total Blocking Time):', tbt, '(' + tbtScore + '%)', tbtScore >= 90 ? '✅' : '⚠️');
console.log('  CLS (Cumulative Layout Shift):', cls, '(' + clsScore + '%)', clsScore >= 90 ? '✅' : '⚠️');
console.log('  Speed Index:', si, '(' + siScore + '%)', siScore >= 90 ? '✅' : '⚠️');
console.log('');
console.log('========================================');
console.log('');
console.log('📁 完整报告：');
console.log('  JSON: ${OUTPUT_JSON}');
console.log('  HTML: ${OUTPUT_HTML}');
console.log('');

// 与基线对比（96/100）
const BASELINE_SCORE = 96;
const scoreDiff = score - BASELINE_SCORE;

if (scoreDiff >= 0) {
  console.log('🎉 性能超越基线！(+' + scoreDiff + ')');
} else if (scoreDiff >= -5) {
  console.log('⚠️  性能略低于基线 (' + scoreDiff + ')，可接受范围');
} else {
  console.log('❌ 性能显著下降 (' + scoreDiff + ')，需要优化！');
}

console.log('');
EOF

###############################################################################
# 7. 清理
###############################################################################

echo -e "${YELLOW}清理进程...${NC}"

# 停止生产服务器
kill $SERVER_PID || true
pkill -f "next start" || true
pkill -f "node.*next.*start" || true

echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

###############################################################################
# 完成
###############################################################################

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 性能测试完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "1. 查看 HTML 报告：open ${OUTPUT_HTML}"
echo "2. 查看 JSON 数据：cat ${OUTPUT_JSON}"
echo "3. 如果性能下降，请检查最近的代码变更"
echo ""

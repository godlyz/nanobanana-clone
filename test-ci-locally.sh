#!/bin/bash

# CI/CD 本地测试脚本
# 用于在提交代码前本地运行所有 CI 检查

set -e  # 遇到错误立即退出

echo "🚀 开始本地 CI/CD 测试..."
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

# 辅助函数：打印成功消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    PASSED=$((PASSED + 1))
}

# 辅助函数：打印失败消息
print_error() {
    echo -e "${RED}❌ $1${NC}"
    FAILED=$((FAILED + 1))
}

# 辅助函数：打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm 未安装，请先安装 pnpm"
    exit 1
fi

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules 不存在，正在安装依赖..."
    pnpm install
fi
print_success "依赖检查完成"
echo ""

# 1. Lint 检查
echo "🔍 1/6 运行 Lint 检查..."
if pnpm lint; then
    print_success "Lint 检查通过"
else
    print_error "Lint 检查失败"
fi
echo ""

# 2. 类型检查
echo "🔍 2/6 运行 TypeScript 类型检查..."
if npx tsc --noEmit; then
    print_success "TypeScript 类型检查通过"
else
    print_error "TypeScript 类型检查失败"
fi
echo ""

# 3. 单元测试
echo "🧪 3/6 运行单元测试..."
if pnpm test; then
    print_success "单元测试通过"
else
    print_error "单元测试失败"
fi
echo ""

# 4. 测试覆盖率
echo "📊 4/6 生成测试覆盖率报告..."
if pnpm test:coverage; then
    print_success "测试覆盖率报告生成成功"

    # 检查覆盖率目标
    if [ -f "coverage/coverage-summary.json" ]; then
        echo ""
        echo "📈 覆盖率摘要："
        node -e "
        const data = require('./coverage/coverage-summary.json');
        const total = data.total;
        console.log('  - 语句覆盖率: ' + total.statements.pct + '%');
        console.log('  - 分支覆盖率: ' + total.branches.pct + '%');
        console.log('  - 函数覆盖率: ' + total.functions.pct + '%');
        console.log('  - 行覆盖率: ' + total.lines.pct + '%');

        const threshold = 70;
        const passed = total.statements.pct >= threshold &&
                       total.branches.pct >= threshold &&
                       total.functions.pct >= threshold &&
                       total.lines.pct >= threshold;

        if (passed) {
            console.log('\\n✅ 所有覆盖率指标均达到 70% 目标！');
        } else {
            console.log('\\n⚠️  部分覆盖率指标未达到 70% 目标');
        }
        "
    fi
else
    print_error "测试覆盖率报告生成失败"
fi
echo ""

# 5. 构建检查
echo "🏗️  5/6 运行生产构建..."
if pnpm build; then
    print_success "生产构建成功"
else
    print_error "生产构建失败"
fi
echo ""

# 6. 安全审计
echo "🔒 6/6 运行安全审计..."
if pnpm audit --audit-level=high; then
    print_success "安全审计通过（无高危漏洞）"
else
    print_warning "发现安全漏洞，请检查 npm audit 输出"
    print_warning "注意：中低风险漏洞不会导致 CI 失败"
fi
echo ""

# 总结
echo "================================"
echo "📊 测试总结"
echo "================================"
echo -e "通过: ${GREEN}${PASSED}${NC}"
echo -e "失败: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 恭喜！所有检查都通过了！${NC}"
    echo "你可以安全地提交代码了。"
    exit 0
else
    echo -e "${RED}❌ 有 ${FAILED} 项检查失败${NC}"
    echo "请修复问题后再提交代码。"
    exit 1
fi

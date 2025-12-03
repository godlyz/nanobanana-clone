#!/bin/bash
# 🔥 老王的客户端组件批量修复脚本
# 用途：移除客户端组件中错误添加的服务端代码
# 警告：运行前请先提交代码到 Git！

set -e

echo "🔥 老王开始批量修复客户端组件！"
echo ""

# 项目根目录
PROJECT_ROOT="/Users/kening/biancheng/nanobanana-clone"
cd "$PROJECT_ROOT"

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 查找所有需要修复的客户端组件
FILES=$(find 'app/[locale]' -name 'page.tsx' -type f -exec grep -l '"use client"' {} \; | xargs grep -l 'setRequestLocale')

echo "🔍 找到需要修复的客户端组件："
echo "$FILES" | while read -r file; do
    echo "  - $file"
done
echo ""

# 统计文件数量
TOTAL_FILES=$(echo "$FILES" | wc -l | tr -d ' ')
echo -e "${YELLOW}📊 总共需要修复 $TOTAL_FILES 个文件${NC}"
echo ""

# 确认修复
echo -e "${YELLOW}🚨 准备执行以下修复操作：${NC}"
echo "1. 移除 import { setRequestLocale } from 'next-intl/server'"
echo "2. 移除函数的 async 关键字"
echo "3. 移除 params 参数"
echo "4. 移除 const { locale } = await params 和 setRequestLocale(locale)"
echo ""
echo "是否继续？(y/n)"
read -r response

if [ "$response" != "y" ]; then
    echo "修复已取消"
    exit 0
fi

echo ""
echo "🚀 开始修复..."
echo ""

# 计数器
SUCCESS_COUNT=0
FAILED_COUNT=0

# 修复每个文件
echo "$FILES" | while read -r file; do
    echo -e "${GREEN}🔧 修复：$file${NC}"

    # 备份文件
    cp "$file" "$file.backup"

    # 修复步骤
    # 1. 移除 setRequestLocale 导入
    sed -i '' '/import.*setRequestLocale.*from.*next-intl\/server/d' "$file"

    # 2. 移除 async 和 params 参数
    # 这个比较复杂，需要根据具体情况处理
    # 先移除最常见的模式

    # 移除 async function FunctionName({ params }: { params: Promise<{ locale: string }> })
    # 替换为 function FunctionName()
    perl -i -pe 's/export default async function (\w+)\(\{[^}]*params[^}]*\}:\s*\{[^}]*params:[^}]*\}\)\s*\{/export default function $1() {/g' "$file"

    # 3. 移除 const { locale } = await params 和 setRequestLocale(locale) 行
    sed -i '' '/const { locale } = await params/d' "$file"
    sed -i '' '/setRequestLocale(locale)/d' "$file"

    echo -e "${GREEN}✅ 修复完成：$file${NC}"
    echo ""
done

echo ""
echo -e "${GREEN}✅ 批量修复完成！${NC}"
echo ""

# 下一步提示
echo -e "${YELLOW}📝 下一步操作：${NC}"
echo "1. 检查修复结果：git diff"
echo "2. 测试应用：pnpm dev"
echo "3. 如果有问题，回滚备份：find app/[locale] -name '*.backup' -exec bash -c 'mv \"\$0\" \"\${0%.backup}\"' {} \;"
echo "4. 提交：git add -A && git commit -m 'fix: remove server-side code from client components'"
echo ""
echo "🔥 老王提醒：备份文件位于 *.backup，确认无误后可手动删除"
echo ""

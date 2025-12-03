#!/bin/bash
# 🔥 老王的旧页面清理脚本
# 用途：删除已迁移到 app/[locale]/ 的旧页面文件
# 警告：这是破坏性操作！运行前请确保已提交新文件到Git！

set -e  # 遇到错误立即退出

echo "🔥 老王开始清理旧页面文件！"
echo ""

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/Users/kening/biancheng/nanobanana-clone"
cd "$PROJECT_ROOT"

echo "🔍 扫描需要删除的旧页面文件..."

# 查找所有旧页面（排除 [locale] 和 api 目录）
OLD_PAGES=$(find app -name 'page.tsx' -type f | grep -v '\[locale\]' | grep -v 'api/' | sort)

# 统计文件数量
TOTAL_FILES=$(echo "$OLD_PAGES" | wc -l | tr -d ' ')

echo -e "${GREEN}✅ 找到 $TOTAL_FILES 个旧页面文件${NC}"
echo ""

# 显示前20个文件作为示例
echo "示例文件（前20个）："
echo "$OLD_PAGES" | head -20 | while read -r file; do
    echo "  - $file"
done
echo ""

if [ "$TOTAL_FILES" -gt 20 ]; then
    echo -e "${YELLOW}  ... 还有 $((TOTAL_FILES - 20)) 个文件${NC}"
    echo ""
fi

# 确认删除
echo -e "${YELLOW}🚨 准备删除 $TOTAL_FILES 个旧页面文件${NC}"
echo "这些文件已经迁移到 app/[locale]/ 目录"
echo ""
echo "是否继续删除？(y/n)"
read -r response

if [ "$response" != "y" ]; then
    echo "删除已取消"
    exit 0
fi

echo ""
echo "🗑️  开始删除..."
echo ""

# 计数器
SUCCESS_COUNT=0
FAILED_COUNT=0

# 删除每个文件
echo "$OLD_PAGES" | while read -r file; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}🗑️  删除：$file${NC}"
        rm "$file"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}❌ 文件不存在：$file${NC}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
done

echo ""
echo "✅ 删除完成！"
echo "  - 成功：$TOTAL_FILES 个"
echo ""

# 清理空目录
echo "🧹 清理空目录..."
find app -type d -empty -delete 2>/dev/null || true
echo "✅ 空目录清理完成"
echo ""

# 下一步提示
echo -e "${YELLOW}📝 下一步操作：${NC}"
echo "1. 检查删除结果：git status"
echo "2. 测试应用：pnpm dev"
echo "3. 提交更改：git add -A && git commit -m 'chore: remove old page files after migration to app/[locale]'"
echo ""
echo "🔥 老王提醒：如果需要回滚，运行："
echo "   git checkout -- app/"
echo ""

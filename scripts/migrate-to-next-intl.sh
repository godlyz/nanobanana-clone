#!/bin/bash
# 🔥 老王的翻译键批量迁移脚本
# 功能：将所有组件从 useLanguage() 迁移到 next-intl

# 查找所有使用 useLanguage 的文件
FILES=$(grep -r "useLanguage" --include="*.tsx" --include="*.ts" components/ app/ 2>/dev/null | grep -v "node_modules" | cut -d: -f1 | sort -u)

echo "🔥 老王开始批量迁移，共发现 $(echo "$FILES" | wc -l) 个文件需要迁移"
echo ""

for file in $FILES; do
  echo "处理: $file"
  
  # 1. 替换 import 语句
  sed -i '' 's/import { useLanguage } from "@\/lib\/language-context"/import { useTranslations } from "next-intl"/g' "$file"
  
  # 2. 替换 const { t } = useLanguage()  
  sed -i '' 's/const { t } = useLanguage()/const t = useTranslations("common")/g' "$file"
  
  echo "  ✅ 已迁移"
done

echo ""
echo "🔥 老王迁移完成！记得检查一下是不是都正常！"

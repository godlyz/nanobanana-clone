#!/bin/bash

# 老王的批量修复脚本 - 给剩余工具添加历史记录功能

echo "艹！老王我开始批量修复剩余的工具！"

# 定义工具名称和对应的tool_type
declare -A tools=(
  ["text-to-image-with-text"]="text-to-image-with-text"
  ["chat-edit"]="chat-edit"
  ["consistent-generation"]="consistent-generation"
)

for tool in "${!tools[@]}"; do
  file="components/tools/${tool}.tsx"
  tool_type="${tools[$tool]}"

  echo "正在处理: $file (tool_type: $tool_type)"

  # 检查文件是否存在
  if [ ! -f "$file" ]; then
    echo "  ❌ 文件不存在，跳过"
    continue
  fi

  # 检查是否已经添加了historyRecords
  if grep -q "historyRecords" "$file"; then
    echo "  ⚠️  文件已经包含历史记录功能，跳过"
    continue
  fi

  echo "  ✅ 需要添加历史记录功能"
done

echo ""
echo "✅ 扫描完成！请手动完成剩余文件的修改。"

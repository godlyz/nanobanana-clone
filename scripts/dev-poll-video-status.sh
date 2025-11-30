#!/bin/bash
# scripts/dev-poll-video-status.sh
# 🔥 老王Day3添加：本地开发环境的视频状态轮询模拟脚本
# 用途：在本地开发时手动触发Cron任务，处理卡住的视频生成任务
# 使用：bash scripts/dev-poll-video-status.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔥 老王的本地Cron任务模拟器${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查.env.local文件是否存在
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local 文件不存在！${NC}"
  exit 1
fi

# 从.env.local读取CRON_SECRET
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2)

if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}❌ CRON_SECRET 未配置！${NC}"
  exit 1
fi

echo -e "${GREEN}✅ CRON_SECRET 已加载${NC}"

# 检查Next.js dev server是否运行
if ! curl -s http://localhost:3000 > /dev/null; then
  echo -e "${RED}❌ Next.js dev server 未运行！请先执行 pnpm dev${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Next.js dev server 正在运行${NC}"
echo ""
echo -e "${YELLOW}⏳ 触发Cron任务: /api/cron/poll-video-status${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 调用Cron接口
RESPONSE=$(curl -s -X GET "http://localhost:3000/api/cron/poll-video-status" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\n%{http_code}")

# 提取HTTP状态码和响应体
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo -e "${YELLOW}📊 响应结果:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Cron任务执行成功 (HTTP $HTTP_CODE)${NC}"

  # 解析结果
  TOTAL=$(echo "$BODY" | jq -r '.results.total' 2>/dev/null || echo "N/A")
  COMPLETED=$(echo "$BODY" | jq -r '.results.completed' 2>/dev/null || echo "N/A")
  FAILED=$(echo "$BODY" | jq -r '.results.failed' 2>/dev/null || echo "N/A")
  STILL_PROCESSING=$(echo "$BODY" | jq -r '.results.still_processing' 2>/dev/null || echo "N/A")

  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}📈 任务统计:${NC}"
  echo -e "  总计:     ${YELLOW}$TOTAL${NC}"
  echo -e "  已完成:   ${GREEN}$COMPLETED${NC}"
  echo -e "  已失败:   ${RED}$FAILED${NC}"
  echo -e "  处理中:   ${YELLOW}$STILL_PROCESSING${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${RED}❌ Cron任务执行失败 (HTTP $HTTP_CODE)${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ 完成！现在可以刷新前端页面查看视频了${NC}"

#!/bin/bash

echo "🔍 测试管理后台 API..."
echo ""

# 1. 先测试登录
echo "1️⃣ 测试登录 API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kn197884@gmail.com","password":"your_password"}' \
  -c /tmp/admin-cookies.txt)

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# 2. 测试活动规则 API（带 cookies）
echo "2️⃣ 测试活动规则 API..."
curl -s http://localhost:3000/api/admin/promotions \
  -b /tmp/admin-cookies.txt \
  | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/admin/promotions -b /tmp/admin-cookies.txt
echo ""

# 3. 测试审计日志 API（带 cookies）
echo "3️⃣ 测试审计日志 API..."
curl -s http://localhost:3000/api/admin/audit \
  -b /tmp/admin-cookies.txt \
  | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/admin/audit -b /tmp/admin-cookies.txt
echo ""

# 4. 检查 cookies
echo "4️⃣ 保存的 Cookies:"
cat /tmp/admin-cookies.txt 2>/dev/null | grep -v "^#"

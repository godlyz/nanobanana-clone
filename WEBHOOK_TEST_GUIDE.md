# Webhook 本地测试指南

## 🎯 测试环境已就绪

### ✅ 当前状态

- **开发服务器**: ✅ 运行中 (http://localhost:3000)
- **ngrok 隧道**: ✅ 运行中
- **公网 URL**: `https://loathly-insupportable-britni.ngrok-free.dev`
- **Webhook Secret**: `<CREEM_WEBHOOK_SECRET>`

### 📍 Webhook 端点

- **本地**: http://localhost:3000/api/webhooks/creem
- **公网**: https://loathly-insupportable-britni.ngrok-free.dev/api/webhooks/creem

## 🧪 测试方法

### 方法 1: 使用测试脚本（推荐）

已创建测试脚本：`test-webhook.sh`

```bash
# 运行测试
./test-webhook.sh
```

该脚本会：
1. 生成测试事件数据
2. 使用 Webhook Secret 计算签名
3. 发送 POST 请求到 Webhook 端点
4. 显示测试结果

### 方法 2: 在 Creem Dashboard 测试

#### 步骤 1: 配置 Webhook URL

1. 访问 [Creem Dashboard - Webhooks](https://creem.io/dashboard/developers/webhooks)
2. 点击 "Add Webhook" 或编辑现有 Webhook
3. **Webhook URL** 填入：
   ```
   https://loathly-insupportable-britni.ngrok-free.dev/api/webhooks/creem
   ```
4. 选择事件类型：
   - ✅ checkout.completed
   - ✅ subscription.created
   - ✅ subscription.updated
   - ✅ subscription.cancelled
   - ✅ payment.succeeded
   - ✅ payment.failed
5. 保存配置

#### 步骤 2: 发送测试事件

1. 在 Webhook 配置页面
2. 点击 "Send Test Event"
3. 选择事件类型（如 `checkout.completed`）
4. 点击发送

#### 步骤 3: 查看结果

检查服务器控制台，应该看到：
```
Checkout completed: { id: 'ch_test_123', ... }
```

### 方法 3: 使用 curl 命令

```bash
# 设置变量
WEBHOOK_SECRET="<CREEM_WEBHOOK_SECRET>"
PAYLOAD='{"type":"checkout.completed","data":{"id":"test_123"}}'

# 生成签名
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# 发送请求
curl -X POST http://localhost:3000/api/webhooks/creem \
  -H "Content-Type: application/json" \
  -H "creem-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## 📊 事件类型测试

### 1. checkout.completed（支付完成）

```bash
PAYLOAD='{
  "type": "checkout.completed",
  "data": {
    "id": "ch_test_123",
    "customer_id": "cust_test_456",
    "product_id": "prod_test_789",
    "order_id": "ord_test_abc"
  }
}'
```

**预期日志**：
```
Checkout completed: { id: 'ch_test_123', ... }
```

### 2. subscription.created（订阅创建）

```bash
PAYLOAD='{
  "type": "subscription.created",
  "data": {
    "id": "sub_test_123",
    "customer_id": "cust_test_456",
    "product_id": "prod_test_789",
    "status": "active"
  }
}'
```

**预期日志**：
```
Subscription created: { id: 'sub_test_123', ... }
```

### 3. payment.failed（支付失败）

```bash
PAYLOAD='{
  "type": "payment.failed",
  "data": {
    "id": "pay_test_123",
    "customer_id": "cust_test_456",
    "reason": "insufficient_funds"
  }
}'
```

**预期日志**：
```
Payment failed: { id: 'pay_test_123', ... }
```

## 🔍 调试技巧

### 查看服务器日志

开发服务器会输出所有 Webhook 事件：

```bash
# 查看实时日志
tail -f ~/.pm2/logs/dev-out.log  # 如果使用 PM2
# 或直接查看控制台输出
```

### 验证签名计算

测试签名是否正确：

```bash
# 你的 Payload
PAYLOAD='{"type":"test","data":{"id":"123"}}'

# 计算签名
echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "<CREEM_WEBHOOK_SECRET>"
```

### ngrok 请求检查器

访问 http://localhost:4040 查看所有通过 ngrok 的请求：
- 请求详情
- 响应状态
- 请求/响应头
- 请求/响应体

## ❌ 常见问题

### 1. "Invalid signature" 错误

**原因**：签名验证失败

**解决**：
```bash
# 检查 Webhook Secret
echo $CREEM_WEBHOOK_SECRET

# 确保与脚本中的一致
grep WEBHOOK_SECRET test-webhook.sh
```

### 2. "CREEM_WEBHOOK_SECRET is not configured"

**原因**：环境变量未加载

**解决**：
```bash
# 重启开发服务器
pnpm dev
```

### 3. ngrok URL 无法访问

**原因**：ngrok 未运行或已过期

**解决**：
```bash
# 检查 ngrok 状态
curl http://localhost:4040/api/tunnels

# 重启 ngrok
pkill ngrok
ngrok http 3000
```

### 4. 事件未被处理

**原因**：事件处理函数未实现或有错误

**解决**：
- 查看控制台错误日志
- 检查 `app/api/webhooks/creem/route.ts` 中的事件处理

## 📝 测试检查清单

### 基础测试
- [ ] Webhook 端点响应 200
- [ ] 签名验证通过
- [ ] 控制台输出事件日志

### 事件处理测试
- [ ] checkout.completed 事件
- [ ] subscription.created 事件
- [ ] subscription.updated 事件
- [ ] subscription.cancelled 事件
- [ ] payment.succeeded 事件
- [ ] payment.failed 事件

### 安全测试
- [ ] 无签名请求被拒绝（401）
- [ ] 错误签名请求被拒绝（401）
- [ ] 修改的 payload 被检测

### Creem Dashboard 测试
- [ ] Webhook URL 配置成功
- [ ] 测试事件发送成功
- [ ] 事件在本地正确处理

## 🚀 下一步

测试成功后：

1. **实现业务逻辑**
   - 编辑 `app/api/webhooks/creem/route.ts`
   - 在事件处理函数中添加业务代码
   - 更新用户订阅、积分等

2. **集成数据库**
   - 连接 Supabase
   - 存储订单和订阅信息
   - 记录 Webhook 事件日志

3. **生产环境部署**
   - 部署应用到生产服务器
   - 更新 Creem Webhook URL 为生产域名
   - 使用生产环境的 Webhook Secret

## 📚 相关资源

- [Webhook 处理器源码](app/api/webhooks/creem/route.ts)
- [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md) - 详细配置指南
- [Creem Webhook 文档](https://docs.creem.io/learn/webhooks/introduction)

---

**当前 ngrok URL**: https://loathly-insupportable-britni.ngrok-free.dev

**Webhook 完整 URL**: https://loathly-insupportable-britni.ngrok-free.dev/api/webhooks/creem

⚠️ **注意**: ngrok 免费版 URL 会在重启后改变，需要重新配置 Creem Dashboard。

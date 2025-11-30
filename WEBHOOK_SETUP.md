# Webhook 配置快速指南

## 为什么需要 Webhook Secret？

Webhook Secret 用于验证从 Creem 发送的 Webhook 请求的真实性，防止恶意第三方伪造支付通知。

## 获取 Webhook Secret

1. 登录 [Creem Dashboard](https://creem.io/dashboard)
2. 导航到 **Developers > Webhooks** 页面
3. 查看或创建 Webhook 配置
4. 复制显示的 **Webhook Secret**
5. 将其添加到 `.env.local` 文件：

```bash
CREEM_WEBHOOK_SECRET=your_webhook_secret_here
```

## 配置 Webhook URL

### 生产环境
```
https://your-domain.com/api/webhooks/creem
```

### 本地开发（使用 ngrok）

1. 安装 ngrok:
```bash
brew install ngrok  # macOS
# 或访问 https://ngrok.com/download
```

2. 启动 ngrok:
```bash
ngrok http 3000
```

3. 复制 ngrok 提供的 HTTPS URL:
```
https://abc123.ngrok.io
```

4. 在 Creem Dashboard 配置 Webhook URL:
```
https://abc123.ngrok.io/api/webhooks/creem
```

## 选择 Webhook 事件

在 Creem Dashboard 的 Webhook 配置中，选择以下事件：

- ✅ **checkout.completed** - 支付完成时触发
- ✅ **subscription.created** - 创建订阅时触发
- ✅ **subscription.updated** - 订阅更新时触发
- ✅ **subscription.cancelled** - 取消订阅时触发
- ✅ **payment.succeeded** - 支付成功时触发
- ✅ **payment.failed** - 支付失败时触发

## Webhook 签名验证原理

Creem 使用 HMAC SHA256 算法对 Webhook 请求进行签名：

```typescript
// Creem 的签名生成（服务器端）
const signature = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(requestBody)
  .digest("hex")

// 发送到你的 Webhook URL，签名在 header 中
headers: {
  "creem-signature": signature
}
```

你的服务器验证签名：

```typescript
// 从请求中获取签名
const receivedSignature = request.headers.get("creem-signature")

// 使用相同的算法生成签名
const computedSignature = crypto
  .createHmac("sha256", CREEM_WEBHOOK_SECRET)
  .update(rawRequestBody)
  .digest("hex")

// 比较签名
if (receivedSignature === computedSignature) {
  // 签名有效，请求来自 Creem
} else {
  // 签名无效，拒绝请求
}
```

## Webhook 处理流程

```
Creem 发送 Webhook
    ↓
验证签名（使用 WEBHOOK_SECRET）
    ↓
签名有效？
    ├─ 是 → 处理事件（更新订阅、积分等）
    └─ 否 → 拒绝请求（返回 401）
```

## 已实现的 Webhook 处理器

文件：[app/api/webhooks/creem/route.ts](app/api/webhooks/creem/route.ts)

### 处理的事件类型：

1. **checkout.completed**
   - 更新用户订阅状态
   - 增加用户积分
   - 发送确认邮件

2. **subscription.created**
   - 创建订阅记录
   - 设置订阅开始日期

3. **subscription.updated**
   - 更新订阅信息
   - 处理升级/降级逻辑

4. **subscription.cancelled**
   - 更新订阅状态为取消
   - 设置订阅结束日期

5. **payment.succeeded**
   - 记录支付成功
   - 生成发票

6. **payment.failed**
   - 记录支付失败
   - 通知用户

## 测试 Webhook

### 方法 1: 使用 Creem Dashboard

1. 进入 Creem Dashboard 的 Webhooks 页面
2. 点击 "Send Test Event"
3. 选择事件类型
4. 发送测试请求

### 方法 2: 使用 curl

```bash
# 生成测试签名
SECRET="your_webhook_secret"
PAYLOAD='{"type":"checkout.completed","data":{"id":"test_123"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# 发送测试请求
curl -X POST http://localhost:3000/api/webhooks/creem \
  -H "Content-Type: application/json" \
  -H "creem-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### 方法 3: 查看日志

Webhook 处理器会记录所有收到的事件：

```bash
# 启动开发服务器
pnpm dev

# 查看控制台输出
# 成功: "Checkout completed: {...}"
# 失败: "Invalid webhook signature"
```

## 常见问题

### 1. 签名验证失败

**原因**:
- Webhook Secret 配置错误
- 请求体被修改
- 编码问题

**解决**:
```bash
# 检查环境变量
echo $CREEM_WEBHOOK_SECRET

# 确认 .env.local 中配置正确
cat .env.local | grep CREEM_WEBHOOK_SECRET

# 重启开发服务器
pnpm dev
```

### 2. Webhook 未收到请求

**原因**:
- Webhook URL 配置错误
- 防火墙阻止
- ngrok 未运行

**解决**:
- 检查 Creem Dashboard 中的 URL 配置
- 确认 ngrok 正在运行（本地开发）
- 检查服务器日志

### 3. 事件未被处理

**原因**:
- 事件类型未在代码中处理
- 处理函数有错误

**解决**:
- 检查 `app/api/webhooks/creem/route.ts`
- 查看控制台错误日志
- 添加缺失的事件处理器

## 安全建议

1. ✅ **始终验证签名** - 永远不要跳过签名验证
2. ✅ **使用 HTTPS** - 生产环境必须使用 HTTPS
3. ✅ **保护 Secret** - 不要将 Webhook Secret 提交到 Git
4. ✅ **日志记录** - 记录所有 Webhook 请求用于审计
5. ✅ **幂等性** - Webhook 可能重复发送，确保处理是幂等的
6. ✅ **超时处理** - 快速响应 Webhook，长时间任务使用队列

## 相关文档

- [CREEM_SETUP.md](CREEM_SETUP.md) - 完整的 Creem 配置指南
- [Creem Webhook 文档](https://docs.creem.io/learn/webhooks/introduction)
- [ngrok 文档](https://ngrok.com/docs)

# Creem 支付集成配置指南

本文档说明如何配置 Creem 支付系统以实现订阅功能。

## 1. 创建 Creem 账户

1. 访问 [Creem.io](https://creem.io) 并注册账户
2. 进入 Dashboard 获取 API Key

## 2. 在 Creem Dashboard 创建产品

需要在 Creem Dashboard 中创建以下 6 个产品：

### Basic 计划
- **Basic Monthly**
  - 名称: Nano Banana Basic (Monthly)
  - 价格: $12.00/月
  - 描述: 1800 credits/year, 75 high-quality images/month

- **Basic Yearly**
  - 名称: Nano Banana Basic (Yearly)
  - 价格: $144.00/年
  - 原价: $180.00/年
  - 描述: 1800 credits/year, 75 high-quality images/month

### Pro 计划
- **Pro Monthly**
  - 名称: Nano Banana Pro (Monthly)
  - 价格: $19.50/月
  - 描述: 9600 credits/year, 400 high-quality images/month

- **Pro Yearly**
  - 名称: Nano Banana Pro (Yearly)
  - 价格: $234.00/年
  - 原价: $468.00/年
  - 描述: 9600 credits/year, 400 high-quality images/month

### Max 计划
- **Max Monthly**
  - 名称: Nano Banana Max (Monthly)
  - 价格: $80.00/月
  - 描述: 19200 credits/year, 800 high-quality images/month

- **Max Yearly**
  - 名称: Nano Banana Max (Yearly)
  - 价格: $960.00/年
  - 原价: $1,920.00/年
  - 描述: 19200 credits/year, 800 high-quality images/month

## 3. 配置环境变量

创建或更新 `.env.local` 文件，添加以下环境变量：

```bash
# Creem API 配置
CREEM_API_KEY=your_creem_api_key_here
CREEM_WEBHOOK_SECRET=your_webhook_secret_here

# 产品 ID (从 Creem Dashboard 获取)
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_BASIC_YEARLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_YEARLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_YEARLY_PRODUCT_ID=prod_xxx

# 应用 URL (用于支付回调)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. 获取产品 ID

1. 在 Creem Dashboard 的 Products 页面创建产品
2. 创建后，点击产品的选项菜单
3. 选择 "Copy ID" 获取产品 ID
4. 将产品 ID 填入对应的环境变量

## 5. 获取 Webhook Secret

1. 在 Creem Dashboard 的 Developers > Webhooks 页面
2. 查看或创建 Webhook
3. 复制 Webhook Secret
4. 将 Webhook Secret 填入 `.env.local` 的 `CREEM_WEBHOOK_SECRET`

## 6. 配置 Webhooks（推荐）

Webhooks 用于实时接收支付状态更新，强烈推荐配置：

### 6.1 创建 Webhook

1. 在 Creem Dashboard 的 Developers > Webhooks 页面添加新的 Webhook
2. **Webhook URL**: `https://your-domain.com/api/webhooks/creem`
   - 本地测试可使用 ngrok 等工具：`https://your-ngrok-url.ngrok.io/api/webhooks/creem`
3. 选择需要监听的事件：
   - ✅ `checkout.completed` - 支付完成
   - ✅ `subscription.created` - 订阅创建
   - ✅ `subscription.updated` - 订阅更新
   - ✅ `subscription.cancelled` - 订阅取消
   - ✅ `payment.succeeded` - 支付成功
   - ✅ `payment.failed` - 支付失败

### 6.2 Webhook 签名验证

系统会自动验证 Webhook 请求的签名：

```typescript
// Creem 在请求头中发送签名
const signature = request.headers.get("creem-signature")

// 使用 HMAC SHA256 验证
const computedSignature = crypto
  .createHmac("sha256", CREEM_WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex")

const isValid = signature === computedSignature
```

### 6.3 处理的事件

- **checkout.completed**: 更新订阅状态、增加积分
- **subscription.created**: 创建订阅记录
- **subscription.updated**: 处理升级/降级
- **subscription.cancelled**: 处理取消订阅
- **payment.succeeded**: 记录支付成功
- **payment.failed**: 通知用户支付失败

## 7. 支付流程

### 用户购买流程：
1. 用户在 `/pricing` 页面选择计划
2. 点击购买按钮
3. 前端调用 `/api/checkout` API 创建 Creem checkout session
4. 用户被重定向到 Creem 支付页面
5. 支付成功后，用户被重定向到 `/payment/success` 页面
6. 系统验证支付签名并更新用户订阅状态

### API 端点：
- `POST /api/checkout` - 创建支付会话
- `POST /api/payment/verify` - 验证支付结果
- `POST /api/webhooks/creem` - 接收 Creem Webhooks（推荐）

## 7. 签名验证

Creem 在支付成功后会在 return URL 中包含签名参数。系统使用 HMAC SHA256 验证签名：

```typescript
const signatureString = Object.entries(params)
  .filter(([_, value]) => value !== undefined)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}=${value}`)
  .join("&")

const expectedSignature = crypto
  .createHmac("sha256", CREEM_API_KEY)
  .update(signatureString)
  .digest("hex")
```

## 8. 测试模式

Creem 支持测试模式，可以在不产生真实交易的情况下测试支付流程：

1. 在 Creem Dashboard 切换到测试模式
2. 使用测试模式的 API Key
3. 使用测试 API 端点: `https://api.creem.io/v1/test/checkouts`

## 9. 后续开发任务

- [x] 实现 Webhook 处理器 (`/api/webhooks/creem`)
- [ ] 集成 Supabase 用户系统
- [ ] 实现订阅状态管理
- [ ] 添加积分系统
- [ ] 实现订阅取消和升级/降级功能
- [ ] 添加发票和收据功能

## 10. 参考文档

- [Creem 官方文档](https://docs.creem.io/introduction)
- [Creem API 参考](https://docs.creem.io/api-reference/introduction)
- [Creem Checkout 集成](https://docs.creem.io/checkout-flow)
- [Creem Webhooks](https://docs.creem.io/learn/webhooks/introduction)

## 故障排查

### 常见问题：

1. **"Payment service not configured" 错误**
   - 检查 `.env.local` 中是否配置了 `CREEM_API_KEY`
   - 确认环境变量已重启开发服务器后生效

2. **"Invalid plan or billing period" 错误**
   - 确认产品 ID 已正确配置
   - 检查 planId 和 billingPeriod 参数是否正确传递

3. **签名验证失败**
   - 确认使用的 API Key 与创建 checkout session 时相同
   - 检查参数顺序和格式是否正确

4. **支付重定向失败**
   - 确认 `NEXT_PUBLIC_APP_URL` 配置正确
   - 检查 Creem Dashboard 中的 Return URL 设置

# 快速开始指南

## 当前配置状态

### ✅ 已配置
- [x] Creem API Key: `<CREEM_TEST_API_KEY>`
- [x] Webhook Secret: `<CREEM_WEBHOOK_SECRET>`
- [x] Application URL: `http://localhost:3000`

### ⏳ 待配置
- [ ] 6 个产品 ID（需在 Creem Dashboard 创建产品后获取）

## 下一步操作

### 1. 创建产品（5 分钟）

访问 [Creem Dashboard - Products](https://creem.io/dashboard/products)，创建以下 6 个产品：

#### Basic 计划
```
名称: Nano Banana Basic (Monthly)
价格: $12.00/月
描述: 1800 credits/year, 75 high-quality images/month
```

```
名称: Nano Banana Basic (Yearly)
价格: $144.00/年
描述: 1800 credits/year, 75 high-quality images/month
```

#### Pro 计划
```
名称: Nano Banana Pro (Monthly)
价格: $19.50/月
描述: 9600 credits/year, 400 high-quality images/month
```

```
名称: Nano Banana Pro (Yearly)
价格: $234.00/年
描述: 9600 credits/year, 400 high-quality images/month
```

#### Max 计划
```
名称: Nano Banana Max (Monthly)
价格: $80.00/月
描述: 19200 credits/year, 800 high-quality images/month
```

```
名称: Nano Banana Max (Yearly)
价格: $960.00/年
描述: 19200 credits/year, 800 high-quality images/month
```

### 2. 获取产品 ID

每创建一个产品后：
1. 点击产品右侧的 `...` 菜单
2. 选择 "Copy ID"
3. 粘贴到 `.env.local` 对应的位置

### 3. 配置 Webhook URL（推荐）

#### 方法 A: 本地测试（使用 ngrok）

```bash
# 1. 安装 ngrok
brew install ngrok

# 2. 启动 ngrok
ngrok http 3000

# 3. 复制 ngrok 提供的 HTTPS URL
# 例如: https://abc123.ngrok.io

# 4. 在 Creem Dashboard 配置 Webhook
# URL: https://abc123.ngrok.io/api/webhooks/creem
```

#### 方法 B: 暂不配置

如果暂时不需要测试 Webhook，可以跳过此步骤。支付成功页面仍然可以正常工作。

### 4. 启动应用

```bash
# 安装依赖（首次运行）
pnpm install

# 启动开发服务器
pnpm dev

# 访问 Pricing 页面
open http://localhost:3000/pricing
```

### 5. 测试支付流程

1. 访问 http://localhost:3000/pricing
2. 选择任意计划
3. 点击 "Sign In to Get Started" 按钮
4. 完成 Creem 测试支付
5. 验证重定向到支付成功页面

## 环境变量模板

当前 `.env.local` 配置：

```bash
# ✅ 已配置
CREEM_API_KEY=<CREEM_TEST_API_KEY>
CREEM_WEBHOOK_SECRET=<CREEM_WEBHOOK_SECRET>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ⏳ 待填入（创建产品后获取）
CREEM_BASIC_MONTHLY_PRODUCT_ID=
CREEM_BASIC_YEARLY_PRODUCT_ID=
CREEM_PRO_MONTHLY_PRODUCT_ID=
CREEM_PRO_YEARLY_PRODUCT_ID=
CREEM_MAX_MONTHLY_PRODUCT_ID=
CREEM_MAX_YEARLY_PRODUCT_ID=
```

## 测试清单

### 基础功能测试
- [ ] Pricing 页面加载正常
- [ ] 3 个计划正确显示
- [ ] 月付/年付切换工作正常
- [ ] 年付显示 50% 折扣
- [ ] FAQ 部分显示

### 支付流程测试
- [ ] 点击购买按钮
- [ ] 重定向到 Creem 支付页面
- [ ] 完成支付
- [ ] 返回成功页面
- [ ] 订单信息显示正确

### Webhook 测试（如已配置）
- [ ] 在 Creem Dashboard 发送测试事件
- [ ] 检查服务器日志
- [ ] 验证签名成功
- [ ] 事件处理正常

## 常见问题

### 产品 ID 在哪里找？

1. 登录 Creem Dashboard
2. 进入 Products 页面
3. 找到对应产品
4. 点击右侧 `...` 菜单
5. 选择 "Copy ID"

### 支付按钮点击无反应？

**检查**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 检查 Network 标签，看 `/api/checkout` 请求
4. 确认产品 ID 已配置

### Webhook 未收到请求？

**检查**：
1. Webhook URL 是否正确配置
2. ngrok 是否正在运行（本地测试）
3. 检查 Creem Dashboard 的 Webhook 日志
4. 查看服务器控制台输出

## 帮助文档

- [CREEM_SETUP.md](CREEM_SETUP.md) - 完整配置指南
- [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md) - Webhook 配置
- [CONFIGURATION_CHECKLIST.md](CONFIGURATION_CHECKLIST.md) - 配置检查清单
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - 实现总结

## 支持

如遇到问题，请参考：
1. 检查控制台错误信息
2. 查看配置文档
3. 访问 [Creem 官方文档](https://docs.creem.io)

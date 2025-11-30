# Creem 支付配置检查清单

在开始测试支付功能前，请确保完成以下配置步骤。

## ✅ 环境变量配置

### 必需配置

- [ ] `CREEM_API_KEY` - Creem API 密钥
  - 位置：Creem Dashboard > Settings
  - 示例：`creem_test_2dAhLMWIMDCCjL9Yz10kfa`

- [ ] `CREEM_WEBHOOK_SECRET` - Webhook 密钥
  - 位置：Creem Dashboard > Developers > Webhooks
  - 用途：验证 Webhook 请求真实性

- [ ] `NEXT_PUBLIC_APP_URL` - 应用 URL
  - 本地开发：`http://localhost:3000`
  - 生产环境：`https://your-domain.com`

### 产品 ID 配置

- [ ] `CREEM_BASIC_MONTHLY_PRODUCT_ID`
- [ ] `CREEM_BASIC_YEARLY_PRODUCT_ID`
- [ ] `CREEM_PRO_MONTHLY_PRODUCT_ID`
- [ ] `CREEM_PRO_YEARLY_PRODUCT_ID`
- [ ] `CREEM_MAX_MONTHLY_PRODUCT_ID`
- [ ] `CREEM_MAX_YEARLY_PRODUCT_ID`

**获取方式**：
1. 在 Creem Dashboard 创建产品
2. 点击产品选项菜单
3. 选择 "Copy ID"

## ✅ Creem Dashboard 配置

### 产品创建

- [ ] Basic Monthly ($12.00/月)
- [ ] Basic Yearly ($144.00/年)
- [ ] Pro Monthly ($19.50/月)
- [ ] Pro Yearly ($234.00/年)
- [ ] Max Monthly ($80.00/月)
- [ ] Max Yearly ($960.00/年)

### Webhook 配置（推荐）

- [ ] 创建 Webhook
- [ ] 配置 Webhook URL
  - 生产：`https://your-domain.com/api/webhooks/creem`
  - 本地：`https://xxx.ngrok.io/api/webhooks/creem`
- [ ] 选择事件类型：
  - [ ] checkout.completed
  - [ ] subscription.created
  - [ ] subscription.updated
  - [ ] subscription.cancelled
  - [ ] payment.succeeded
  - [ ] payment.failed
- [ ] 复制 Webhook Secret 到 `.env.local`

## ✅ 本地开发设置

### 安装依赖

```bash
- [ ] pnpm install
```

### 环境变量

```bash
- [ ] cp .env.local.example .env.local
- [ ] 编辑 .env.local 填入所有必需变量
- [ ] 验证所有变量已设置（无空值）
```

### 本地 Webhook 测试（可选）

如果需要测试 Webhook：

```bash
- [ ] 安装 ngrok: brew install ngrok
- [ ] 启动 ngrok: ngrok http 3000
- [ ] 复制 ngrok URL
- [ ] 在 Creem Dashboard 配置 Webhook URL
```

## ✅ 功能测试

### 基础功能

- [ ] 访问 Pricing 页面：`http://localhost:3000/pricing`
- [ ] 页面正常加载，显示 3 个计划
- [ ] 月付/年付切换正常工作
- [ ] 年付显示 50% 折扣标签
- [ ] FAQ 部分正常显示

### 支付流程

- [ ] 点击 "Sign In to Get Started" 按钮
- [ ] 重定向到 Creem 支付页面
- [ ] 完成测试支付
- [ ] 重定向回 `/payment/success` 页面
- [ ] 显示支付成功状态
- [ ] 订单详情正确显示

### Webhook 测试（如已配置）

- [ ] 在 Creem Dashboard 发送测试 Webhook
- [ ] 检查服务器日志，确认收到 Webhook
- [ ] 验证签名验证成功
- [ ] 检查事件处理逻辑执行

## ✅ 安全检查

- [ ] `.env.local` 文件不在 Git 版本控制中
- [ ] 生产环境使用独立的 API Key
- [ ] Webhook Secret 已配置
- [ ] 签名验证已启用
- [ ] HTTPS 已启用（生产环境）

## ✅ 部署前检查

### 环境变量

- [ ] 在部署平台配置所有环境变量
- [ ] 使用生产环境的 Creem API Key
- [ ] 更新 `NEXT_PUBLIC_APP_URL` 为生产域名

### Webhook

- [ ] 更新 Webhook URL 为生产域名
- [ ] 确认 Webhook Secret 已配置
- [ ] 测试生产环境 Webhook

### DNS & SSL

- [ ] 域名已正确解析
- [ ] SSL 证书已配置
- [ ] HTTPS 访问正常

## ❌ 常见问题排查

### "Payment service not configured" 错误

**原因**：`CREEM_API_KEY` 未配置

**解决**：
```bash
echo $CREEM_API_KEY  # 检查环境变量
# 如果为空，添加到 .env.local
# 重启开发服务器: pnpm dev
```

### "Invalid signature" 错误

**原因**：签名验证失败

**解决**：
- 检查 `CREEM_WEBHOOK_SECRET` 配置
- 确认 Webhook Secret 与 Dashboard 一致
- 检查请求体是否被修改

### Webhook 未收到

**原因**：URL 配置错误或网络问题

**解决**：
- 检查 Creem Dashboard 的 Webhook URL
- 确认 ngrok 正在运行（本地）
- 检查防火墙设置

### 产品 ID 错误

**原因**：产品 ID 未配置或错误

**解决**：
- 在 Creem Dashboard 复制正确的产品 ID
- 更新 `.env.local` 文件
- 重启服务器

## 📚 参考文档

- [CREEM_SETUP.md](CREEM_SETUP.md) - 完整配置指南
- [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md) - Webhook 配置指南
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - 实现总结
- [Creem 官方文档](https://docs.creem.io)

## 🎯 配置完成标准

所有项都勾选 ✅ 后，你的 Creem 支付系统就配置完成了！

可以开始：
1. 测试完整的支付流程
2. 处理真实的订阅
3. 接收 Webhook 事件
4. 部署到生产环境

# 💳 Creem 支付测试指南

## ✅ 配置完成状态

### 1. 环境配置
- ✅ API Key: `<CREEM_TEST_API_KEY>` (测试环境)
- ✅ Webhook Secret: `<CREEM_WEBHOOK_SECRET>`
- ✅ API 端点: 自动使用 `https://test-api.creem.io` (测试环境)

### 2. 产品配置
| 套餐 | 周期 | Product ID |
|------|------|------------|
| Basic | 月付 | `prod_xxx` |
| Basic | 年付 | `prod_xxx` |
| Pro | 月付 | `prod_xxx` |
| Pro | 年付 | `prod_xxx` |
| Max | 月付 | `prod_xxx` |
| Max | 年付 | `prod_xxx` |

### 3. Webhook 配置
- ✅ Webhook 处理器已实现: `/api/webhooks/creem`
- ✅ 本地测试 URL (ngrok): `https://loathly-insupportable-britni.ngrok-free.dev/api/webhooks/creem`
- ✅ 签名验证已启用 (HMAC SHA256)

## 🧪 测试步骤

### 方式 1: 通过浏览器测试 (推荐)

1. **访问定价页面**
   ```
   http://localhost:3000/pricing
   ```

2. **选择套餐**
   - 可以切换月付/年付
   - 点击任意套餐的 "开始使用" 按钮

3. **完成支付**
   - 会跳转到 Creem 测试支付页面
   - 使用 Creem 提供的测试卡号完成支付

4. **查看结果**
   - 成功后会跳转回: `http://localhost:3000/payment/success`
   - 同时会触发 webhook 通知

### 方式 2: API 测试

**测试 Basic Monthly 套餐:**
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId":"basic","billingPeriod":"monthly"}'
```

**测试 Pro Yearly 套餐:**
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId":"pro","billingPeriod":"yearly"}'
```

**响应示例:**
```json
{
  "checkoutUrl": "https://creem.io/test/checkout/prod_xxx/ch_xxx",
  "sessionId": "ch_xxx"
}
```

## 📊 已测试结果

### Checkout API 测试 ✅
```
✅ Basic Monthly: ch_4fwMaUV7x98RibFqapadXO
✅ Pro Monthly: ch_3TALJMPQ9FHhv5JGsinGep
✅ Max Yearly: ch_768IkwDSlEsKqtv2dzPKsC
```

### Webhook 测试 ✅
所有 6 个事件类型都已测试通过:
- ✅ checkout.completed
- ✅ subscription.created
- ✅ subscription.updated
- ✅ subscription.cancelled
- ✅ payment.succeeded
- ✅ payment.failed

## 🔍 监控和调试

### 查看开发服务器日志
```bash
# 实时查看日志
tail -f /path/to/dev/server/logs
```

### 测试 Webhook 接收
```bash
curl -X POST http://localhost:3000/api/webhooks/creem \
  -H "creem-signature: xxx" \
  -d '{"type":"checkout.completed","data":{...}}'
```

## 🚀 下一步

### 1. 配置 Creem Webhook URL
在 [Creem Dashboard](https://dashboard.creem.io) 测试环境中:
- 导航到 Settings > Webhooks
- 添加 Webhook URL: `https://loathly-insupportable-britni.ngrok-free.dev/api/webhooks/creem`
- 启用所需的事件类型

### 2. 测试完整支付流程
1. 访问 http://localhost:3000/pricing
2. 点击任意套餐的 "开始使用"
3. 完成测试支付
4. 验证 webhook 是否收到

### 3. 实现业务逻辑
在 `/app/api/webhooks/creem/route.ts` 中添加:
- 更新用户订阅状态
- 发送确认邮件
- 更新用户配额
- 记录订单信息

## 📝 注意事项

1. **测试环境 vs 生产环境**
   - 当前使用 `creem_test_` API key，自动连接测试环境
   - 生产环境需要使用 `creem_live_` API key

2. **ngrok URL 有效期**
   - 免费版 ngrok URL 会在重启后变化
   - 每次重启 ngrok 需要更新 Creem 的 Webhook URL

3. **Webhook 幂等性**
   - Creem 可能重复发送 webhook
   - 建议使用 `checkout_id` 或 `subscription_id` 做幂等性检查

## 🛠️ 故障排除

### 问题: 403 Forbidden
- ✅ **已解决**: 使用测试环境 API 地址 `https://test-api.creem.io`

### 问题: Webhook 签名验证失败
- 检查 `CREEM_WEBHOOK_SECRET` 是否正确
- 确认使用原始请求体计算签名

### 问题: 产品 ID 无效
- 确认产品已在 Creem Dashboard 创建
- 检查 `.env.local` 中的产品 ID 是否正确

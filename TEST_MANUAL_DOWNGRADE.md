# 订阅降级功能手动测试指南

## 测试目标
验证用户从 Pro/Max 套餐降级到 Basic 套餐的完整流程

## 前置条件
- ✅ 本地开发服务器运行中 (http://localhost:3000)
- ✅ 已登录用户账户
- ✅ 用户当前订阅状态为 Pro 或 Max

## 测试步骤

### 1. 打开个人资料页面
```
URL: http://localhost:3000/profile
```
等待页面完全加载，确认看到订阅信息卡片。

### 2. 点击降级按钮
查找并点击"降级"或"Downgrade"按钮（通常在订阅信息卡片底部）。

### 3. 填写降级表单
在弹出的对话框中：
- **目标套餐**: 选择 `Basic`
- **计费周期**: 选择 `Monthly`
- **生效模式**: 选择 `Immediate`（立即生效）

### 4. 确认降级
点击"确认"或"提交"按钮。

### 5. 等待响应
观察页面是否显示成功提示或错误信息。

---

## 验证脚本

### 步骤 6: 在浏览器控制台验证结果

打开浏览器开发者工具（F12），在 Console 标签页粘贴以下代码：

```javascript
// 订阅降级验证脚本
(async function validateDowngrade() {
  console.log('🔍 开始验证订阅降级结果...\n');

  try {
    const response = await fetch('/api/subscription/status');

    if (!response.ok) {
      console.error('❌ API 请求失败:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    const sub = data.subscription;

    console.log('📊 完整订阅数据:');
    console.log(JSON.stringify(sub, null, 2));
    console.log('\n');

    // 验证关键字段
    const checks = {
      '降级目标套餐 (downgrade_to_plan)': {
        actual: sub?.downgrade_to_plan,
        expected: 'basic',
        pass: sub?.downgrade_to_plan === 'basic'
      },
      '降级计费周期 (downgrade_to_billing_cycle)': {
        actual: sub?.downgrade_to_billing_cycle,
        expected: 'monthly',
        pass: sub?.downgrade_to_billing_cycle === 'monthly'
      },
      '调整模式 (adjustment_mode)': {
        actual: sub?.adjustment_mode,
        expected: 'immediate',
        pass: sub?.adjustment_mode === 'immediate'
      },
      '剩余天数 (remaining_days)': {
        actual: sub?.remaining_days,
        expected: '~351 (约一年)',
        pass: sub?.remaining_days && sub.remaining_days > 340 && sub.remaining_days < 366
      }
    };

    console.log('✅ 验证结果:\n');

    let allPassed = true;
    for (const [name, check] of Object.entries(checks)) {
      const status = check.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name}:`);
      console.log(`   实际值: ${check.actual}`);
      console.log(`   期望值: ${check.expected}`);
      console.log('');

      if (!check.pass) allPassed = false;
    }

    if (allPassed) {
      console.log('🎉 所有验证项通过！订阅降级功能正常工作。');
    } else {
      console.log('⚠️  部分验证项未通过，请检查降级逻辑。');
    }

  } catch (error) {
    console.error('❌ 验证过程出错:', error);
  }
})();
```

---

## 预期结果

### ✅ 成功标准

1. **UI 反馈**:
   - 显示成功提示消息
   - 订阅卡片更新显示降级信息

2. **API 数据验证**:
   ```javascript
   {
     downgrade_to_plan: "basic",           // ✅ 必须是 "basic"
     downgrade_to_billing_cycle: "monthly", // ✅ 必须是 "monthly"
     adjustment_mode: "immediate",          // ✅ 必须是 "immediate"
     remaining_days: 351                    // ✅ 应该接近 351 (340-365 之间)
   }
   ```

3. **数据库状态**:
   - `subscriptions` 表中对应记录已更新
   - 降级字段正确保存

---

## 常见问题排查

### Q1: 点击降级按钮没有反应
**可能原因**:
- JavaScript 错误 → 检查浏览器控制台
- 按钮未正确绑定事件 → 检查 `app/profile/page.tsx`

### Q2: 对话框不显示或布局异常
**可能原因**:
- 样式问题 → 检查 CSS/Tailwind 配置
- 组件渲染错误 → 检查 React DevTools

### Q3: 提交后显示错误
**可能原因**:
- API 路由错误 → 检查 `/api/subscription/downgrade` 日志
- 数据库连接问题 → 检查 Supabase 配置
- 数据验证失败 → 检查请求参数格式

### Q4: 验证脚本显示字段为 null 或 undefined
**可能原因**:
- 降级操作未成功写入数据库
- API 返回数据结构不正确
- 用户未登录或会话过期

---

## 测试报告模板

完成测试后，请填写以下信息：

```
测试日期: _______________
测试人员: _______________

✅ / ❌  步骤 1: 打开页面成功
✅ / ❌  步骤 2: 找到降级按钮
✅ / ❌  步骤 3: 对话框正常显示
✅ / ❌  步骤 4: 选择选项成功
✅ / ❌  步骤 5: 提交成功
✅ / ❌  步骤 6: 验证脚本全部通过

遇到的问题:
_____________________________________
_____________________________________

截图文件路径:
_____________________________________
```

---

## 自动化测试方案（可选）

如果需要完全自动化此测试，建议安装 Playwright:

```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

然后参考 `scripts/test-subscription-browser-console.js` 编写 Playwright 测试脚本。

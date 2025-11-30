# 🚀 一键完整安装积分系统指南

## 这个脚本做什么？

`setup-complete-credits-system.sql` 是一个**完整的、一键式**数据库脚本，执行后将：

1. ✅ 创建所有积分系统表（user_credits、credit_transactions、credit_packages）
2. ✅ 创建所有必要的函数和触发器
3. ✅ 插入积分包产品数据
4. ✅ 删除重复的订阅记录（保留最新的）
5. ✅ 添加唯一约束防止未来重复订阅
6. ✅ 为用户充值正确的积分（Pro年付：1920赠送 + 800首月）
7. ✅ 验证结果并显示查询结果

## 如何使用？

### 步骤1: 打开 Supabase Dashboard

访问：https://supabase.com/dashboard/project/gtpvyxrgkuccgpcaeeyt

### 步骤2: 进入 SQL Editor

1. 左侧菜单点击 **SQL Editor**
2. 点击 **New query** 按钮

### 步骤3: 复制粘贴脚本

1. 打开文件 `setup-complete-credits-system.sql`
2. 全选所有内容（Ctrl+A / Cmd+A）
3. 复制（Ctrl+C / Cmd+C）
4. 粘贴到 Supabase SQL Editor（Ctrl+V / Cmd+V）

### 步骤4: 执行脚本

点击 **Run** 按钮（或按 Ctrl+Enter / Cmd+Enter）

### 步骤5: 查看结果

执行完成后，你应该能看到以下查询结果：

#### 1. user_credits（用户积分余额）
```
table_name    | user_id                              | total_credits | created_at           | updated_at
user_credits  | bfb8182a-6865-4c66-a89e-05711796e2b2 | 2720          | 2025-10-26 10:00:00 | 2025-10-26 10:00:00
```

#### 2. credit_transactions（积分交易记录）
应该有2条记录：
```
transaction_type      | amount | description
subscription_bonus    | 1920   | 年度订阅赠送 - pro套餐（1920积分，1年有效）
subscription_refill   | 800    | 年度订阅月度充值 - pro套餐（800积分，30天有效）
```

#### 3. available_credits（可用积分）
```
metric             | value
available_credits  | 2720
```

#### 4. user_subscriptions（订阅信息）
应该只有1条记录（重复的已删除）：
```
plan_tier | monthly_credits | billing_cycle | status
pro       | 800             | yearly        | active
```

---

## 预期结果

执行成功后：

- ✅ **当前积分**: 2720
  - 1920 赠送积分（1年有效）
  - 800 首月积分（30天有效）

- ✅ **订阅记录**: 只有1条（重复的已删除）

- ✅ **数据库结构**: 完整创建

---

## 验证网站显示

完成后访问：http://localhost:3000/profile

点击"积分信息"标签，应该能看到：

- **当前积分**: 2720
- **总获得**: 2720
- **已使用**: 0
- **积分变动记录**: 两条记录
  1. 年度订阅赠送 - pro套餐（1920积分，1年有效）
  2. 年度订阅月度充值 - pro套餐（800积分，30天有效）

---

## 常见问题

### Q: 如果我已经执行过部分脚本怎么办？

**A**: 没关系！脚本使用了 `IF NOT EXISTS` 和 `ON CONFLICT DO NOTHING`，已存在的表和数据不会被重复创建。

### Q: 如果执行失败怎么办？

**A**: 查看错误信息：

1. **表已存在**: 忽略，脚本会跳过
2. **函数已存在**: `CREATE OR REPLACE FUNCTION` 会自动替换
3. **已经充值过积分**: 脚本会检测并跳过
4. **其他错误**: 复制错误信息，联系老王

### Q: 可以重复执行吗？

**A**: 可以！脚本设计为**幂等**（idempotent），多次执行不会产生重复数据或错误。

---

## 文件说明

项目中有3个SQL脚本，区别如下：

| 文件 | 用途 | 适用场景 |
|------|------|---------|
| `manual-setup-credits.sql` | 创建积分系统基础结构 | 首次安装 |
| `fix-credits-system.sql` | 修复现有问题（删除重复订阅、修正逻辑、充值积分） | 已有订阅但没有积分 |
| **`setup-complete-credits-system.sql`** | **完整一键安装（推荐）** | **任何场景都适用** |

**推荐使用**: `setup-complete-credits-system.sql`（当前文件）

---

老王我保证这个脚本一次搞定所有问题！有问题立即来找老王！

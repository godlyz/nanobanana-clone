# 🔥 数据库表创建指南（5分钟搞定）

## 问题现状

当前点击"🔥 一键开通专业版"按钮会失败，因为**数据库表还没创建**。

错误信息：
```
❌ 创建订阅失败: Could not find the table 'public.user_subscriptions' in the schema cache
```

## 解决方案：在Supabase Dashboard执行SQL脚本

### 步骤1: 打开Supabase Dashboard

1. 点击这个链接：https://supabase.com/dashboard/project/gtpvyxrgkuccgpcaeeyt
2. 如果需要登录，用你的Supabase账号登录

### 步骤2: 进入SQL Editor

1. 在左侧菜单找到 **SQL Editor** 图标（看起来像一个文档）
2. 点击进入SQL Editor页面
3. 点击页面上的 **New query** 按钮

### 步骤3: 复制粘贴SQL脚本

1. 打开项目文件 `manual-setup-subscription.sql`（就在项目根目录）
2. 全选所有内容（Ctrl+A / Cmd+A）
3. 复制（Ctrl+C / Cmd+C）
4. 粘贴到Supabase SQL Editor里（Ctrl+V / Cmd+V）

### 步骤4: 执行SQL脚本

1. 点击右下角的 **Run** 按钮（或按 Ctrl+Enter / Cmd+Enter）
2. 等待几秒钟，SQL执行完毕
3. 如果看到 **Success** 提示，说明执行成功了！

### 步骤5: 验证结果

执行成功后，在SQL Editor里再执行这条查询，检查表是否创建成功：

```sql
SELECT * FROM user_subscriptions ORDER BY created_at DESC;
```

如果能看到表格（即使是空的），说明表创建成功了！

---

## 完成后做什么？

1. 回到网站：http://localhost:3000/profile
2. 点击 **🔥 一键开通专业版** 按钮
3. 应该会看到成功提示："✅ 订阅开通成功！"
4. 页面自动刷新，显示你的专业版订阅信息

---

## 如果遇到问题

### 错误1: 表已存在

```
ERROR: relation "user_subscriptions" already exists
```

**解决方法**：说明表已经创建过了，可以忽略这个错误，继续下一步。

### 错误2: 权限不足

```
ERROR: permission denied
```

**解决方法**：确保你用的是**项目Owner账号**登录Supabase Dashboard。

### 错误3: 函数已存在

```
ERROR: function "get_user_active_subscription" already exists
```

**解决方法**：说明函数已经创建过了，可以忽略这个错误。

---

## SQL脚本做了什么？

这个SQL脚本会：

1. ✅ 创建 `user_subscriptions` 表（存储用户订阅信息）
2. ✅ 创建索引（加快查询速度）
3. ✅ 启用RLS（Row Level Security，确保用户只能看到自己的订阅）
4. ✅ 创建RLS策略（安全规则）
5. ✅ 创建触发器（自动更新 `updated_at` 字段）
6. ✅ 创建RPC函数 `get_user_active_subscription`（查询生效的订阅）
7. ✅ 为当前登录用户插入一条专业版订阅记录（有效期1年）

---

## 老王我的建议

执行完SQL脚本后，**立即**：

1. 刷新 http://localhost:3000/profile 页面
2. 应该能看到"专业版"订阅，状态是"生效中"
3. 到期时间是 1 年后（2026年10月26日左右）

如果还有问题，检查开发服务器的终端日志，看看是什么错误。

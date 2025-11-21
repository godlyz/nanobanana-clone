# 📊 Supabase 数据库迁移执行指南

> **老王提醒**：这个迁移文件会创建邮箱认证系统所需的4张表，赶紧按步骤执行！

## 🎯 迁移文件说明

**迁移文件路径**：`supabase/migrations/20250131_create_email_auth_tables.sql`

**包含的数据库表**：
1. `user_sessions` - 用户会话表（JWT会话管理）
2. `email_verification_codes` - 邮箱验证码表
3. `login_logs` - 登录日志表
4. `rate_limit_logs` - 速率限制日志表

**安全特性**：
- ✅ Row Level Security (RLS) 策略已启用
- ✅ 索引优化（提升查询性能）
- ✅ 自动清理过期数据的函数
- ✅ 时间戳自动更新

## 🚀 执行步骤

### 方法一：Supabase Dashboard（推荐，最简单）

1. **打开 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **进入 SQL Editor**
   - 左侧菜单：`SQL Editor`
   - 点击：`New query`

3. **复制迁移SQL**
   - 打开文件：`supabase/migrations/20250131_create_email_auth_tables.sql`
   - 复制全部内容（约200行）

4. **粘贴并执行**
   - 粘贴到 SQL Editor
   - 点击：`Run`
   - 等待执行完成（约3-5秒）

5. **验证表创建**
   - 左侧菜单：`Table Editor`
   - 确认看到以下表：
     - `user_sessions`
     - `email_verification_codes`
     - `login_logs`
     - `rate_limit_logs`

### 方法二：Supabase CLI（适合本地开发）

**前提条件**：已安装 Supabase CLI

```bash
# 1. 安装 Supabase CLI（如果还没安装）
npm install -g supabase

# 2. 登录 Supabase
supabase login

# 3. 链接到你的项目
supabase link --project-ref your-project-ref

# 4. 应用迁移
supabase db push

# 5. 验证迁移
supabase db diff
```

### 方法三：直接 SQL 执行（适合快速测试）

```bash
# 使用 psql 连接（需要数据库连接字符串）
psql "your_database_connection_string" < supabase/migrations/20250131_create_email_auth_tables.sql
```

## ✅ 迁移成功验证

### 1. 检查表结构

在 Supabase Dashboard 的 `Table Editor` 中，确认每张表的结构：

**user_sessions 表字段**：
- `id` (UUID) - 主键
- `user_id` (UUID) - 用户ID（外键）
- `session_token` (TEXT) - 会话Token
- `ip_address` (TEXT) - IP地址
- `user_agent` (TEXT) - User-Agent
- `expires_at` (TIMESTAMP) - 过期时间
- `last_activity_at` (TIMESTAMP) - 最后活跃时间
- `created_at` (TIMESTAMP) - 创建时间

**email_verification_codes 表字段**：
- `id` (UUID) - 主键
- `email` (TEXT) - 邮箱地址
- `code` (TEXT) - 验证码
- `purpose` (TEXT) - 用途（register/reset_password/change_password）
- `expires_at` (TIMESTAMP) - 过期时间
- `used` (BOOLEAN) - 是否已使用
- `created_at` (TIMESTAMP) - 创建时间

**login_logs 表字段**：
- `id` (UUID) - 主键
- `user_id` (UUID) - 用户ID（外键，可为空）
- `email` (TEXT) - 邮箱地址
- `ip_address` (TEXT) - IP地址
- `user_agent` (TEXT) - User-Agent
- `success` (BOOLEAN) - 是否成功
- `failure_reason` (TEXT) - 失败原因
- `created_at` (TIMESTAMP) - 创建时间

**rate_limit_logs 表字段**：
- `id` (UUID) - 主键
- `action` (TEXT) - 操作类型
- `identifier` (TEXT) - 标识符（IP或邮箱）
- `created_at` (TIMESTAMP) - 创建时间

### 2. 检查 RLS 策略

在 Supabase Dashboard 的 `Authentication` -> `Policies` 中，确认每张表都有 RLS 策略启用。

### 3. 检查索引

在 SQL Editor 中运行以下查询，确认索引已创建：

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'email_verification_codes', 'login_logs', 'rate_limit_logs')
ORDER BY tablename, indexname;
```

应该看到类似这些索引：
- `idx_user_sessions_token`
- `idx_user_sessions_user_id`
- `idx_email_codes_email`
- `idx_login_logs_user_id`
- `idx_rate_limit_logs_action`

## ⚠️ 常见问题

### Q1: 迁移执行报错 "relation already exists"

**原因**：表已经存在

**解决方法**：
1. 检查表是否已创建（可能之前执行过）
2. 如果需要重新创建，先删除旧表：

```sql
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS email_verification_codes CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS rate_limit_logs CASCADE;
```

然后重新执行迁移。

### Q2: 迁移执行报错 "permission denied"

**原因**：权限不足

**解决方法**：
- 确保使用的是 `service_role` 密钥（Service Role Key）
- 或者在 Supabase Dashboard 的 SQL Editor 中执行（自动使用管理员权限）

### Q3: 迁移后看不到表

**可能原因**：
1. 表创建在错误的 schema 中
2. RLS 策略阻止查看

**解决方法**：
```sql
-- 查看所有表
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public';

-- 如果表在 auth schema，需要迁移到 public
ALTER TABLE auth.user_sessions SET SCHEMA public;
```

### Q4: 自动清理函数不工作

**检查方法**：
```sql
-- 查看定时任务（如果使用了 pg_cron）
SELECT * FROM cron.job;

-- 手动运行清理函数
SELECT cleanup_expired_sessions();
SELECT cleanup_expired_verification_codes();
```

## 🛡️ Storage 策略迁移（avatars_manage_own_files）

> ⚠️ Supabase 托管环境的 `storage` schema 只有服务角色具备管理权限，常规 `supabase db push` 会触发历史迁移重放并报错。请使用以下“精准执行”流程。

### 迁移脚本

- **路径**：`supabase/migrations/20251101_fix_avatars_policy.sql`
- **作用**：
  - 尝试启用 `storage.objects` 的 RLS（权限不足时捕获并忽略，不影响后续语句）。
  - 创建或更新 `avatars_manage_own_files`，限制 `authenticated` 角色且校验 `auth.uid() = owner`。

### 手动执行（推荐）

```bash
# 1. 重置数据库密码后记录新密码
# 2. 使用服务角色连接共享池并执行脚本
psql "postgresql://postgres.<project-ref>:<db-password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -f supabase/migrations/20251101_fix_avatars_policy.sql

# 若仅需校准策略，可直接执行单条 ALTER POLICY：
psql "postgresql://postgres.<project-ref>:<db-password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -c "ALTER POLICY \"avatars_manage_own_files\" ON storage.objects TO authenticated USING (bucket_id = 'avatars'::text AND auth.uid() = owner) WITH CHECK (bucket_id = 'avatars'::text AND auth.uid() = owner);"
```

> **提示**：`<project-ref>` 为 Supabase 项目 ID（如 `gtpvyxrgkuccgpcaeeyt`）。执行完成后务必再次重置数据库密码，并同步更新所有部署环境。

如确需使用 Supabase CLI，可以通过显式指定数据库 URL 避免旧迁移重复执行：

```bash
supabase db push --db-url "postgresql://postgres.<project-ref>:<db-password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require" --include-all=false
```

> 仍建议先在本地执行 `psql -f` 验证，再运行 `supabase db push`；若远程 `schema_migrations` 未同步，CLI 仍可能重放历史迁移，请谨慎使用。

### CI 集成建议

1. 在 CI 里配置服务角色连接串（例如机密变量 `SUPABASE_DB_URL`）。  
2. 添加单独 Job，仅执行 Storage 策略脚本：

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20251101_fix_avatars_policy.sql
```

3. 执行后可追加校验语句：

```bash
psql "$SUPABASE_DB_URL" -c "SELECT policyname, roles FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_manage_own_files';"
```

4. 若 CI 无法直连生产库，可在发布流程中加入手工 Runbook，复用同一脚本以防策略被误改。

## 🎉 迁移完成后

**下一步操作**：

1. ✅ 配置环境变量（`.env.local`）
2. ✅ 重启开发服务器（`pnpm dev`）
3. ✅ 测试 API 接口（参考 `EMAIL_AUTH_SETUP.md`）
4. ✅ 实现前端注册/登录页面

## 📞 需要帮助？

- **迁移SQL文件**：`supabase/migrations/20250131_create_email_auth_tables.sql`
- **使用文档**：`EMAIL_AUTH_SETUP.md`
- **环境变量配置**：`.env.local.example`

---

**老王提醒**：迁移完成后记得验证表创建是否成功，别等到测试时才发现问题！

艹，数据库迁移就这么简单，跟着步骤来，绝对不会错！

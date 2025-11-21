# Supabase 安全修复指南

## 概述

本文档说明如何修复 Supabase 数据库的安全警告和错误。

## 检测到的安全问题

### 1. 泄露密码保护被禁用 ⚠️

**问题**: Supabase Auth 的泄露密码保护功能被关闭，用户可能使用已泄露的密码。

**影响**: 账户安全风险，攻击者可以使用已知泄露的密码进行撞库攻击。

**状态**: ⚠️ 需要手动在 Dashboard 配置

### 2. 数据库函数缺少 search_path 参数 🔧

**问题**: 以下5个函数具有可变搜索路径的角色，存在 SQL 注入风险：

- `refill_subscription_credits`
- `get_user_available_credits`
- `grant_registration_credits`
- `get_user_active_subscription`
- `update_updated_at_column`

**影响**: 潜在的 SQL 注入攻击风险。

**状态**: ✅ 已通过迁移脚本修复

### 3. 表未启用 RLS (行级安全) 🚨

**问题**: 以下4个表未启用行级安全性 (RLS)，数据库暴露风险：

- `admin_users` - 管理员用户表
- `system_configs` - 系统配置表
- `promotion_rules` - 活动规则表
- `audit_logs` - 审计日志表

**影响**: 严重的数据泄露风险，任何人都可以直接访问这些表。

**状态**: ✅ 已通过迁移脚本修复

## 修复步骤

### 步骤 1: 执行数据库迁移脚本

1. 打开 **Supabase Dashboard**
2. 进入你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 创建一个新查询
5. 复制并粘贴 `supabase/migrations/20250130_security_fixes.sql` 的全部内容
6. 点击 **Run** 执行脚本

**预期结果**:

```
✅ 数据库安全修复迁移执行完成！

已修复内容:
1. ✅ 5个数据库函数已添加 search_path 安全配置
2. ✅ admin_users 表已启用 RLS 并设置安全策略
3. ✅ system_configs 表已启用 RLS 并设置安全策略
4. ✅ promotion_rules 表已启用 RLS 并设置安全策略
5. ✅ audit_logs 表已启用 RLS 并设置安全策略
```

### 步骤 2: 启用泄露密码保护（手动配置）

1. 打开 **Supabase Dashboard**
2. 进入你的项目
3. 点击左侧菜单的 **Authentication**
4. 点击 **Policies** 标签
5. 找到 **Breach Password Protection** 选项
6. 启用此选项

**说明**: 启用后，Supabase Auth 将通过 [HaveIBeenPwned.org](https://haveibeenpwned.com/) 检查用户注册/修改密码时是否使用了已泄露的密码。

### 步骤 3: 验证修复结果

执行迁移脚本后，脚本会自动输出验证结果。你也可以手动运行以下查询进行验证：

#### 3.1 验证函数 search_path 配置

```sql
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE
        WHEN p.proconfig IS NOT NULL AND
             'search_path=public, pg_temp' = ANY(p.proconfig) THEN '✅ 已修复'
        ELSE '⚠️ 未修复'
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'update_updated_at_column',
    'grant_registration_credits',
    'get_user_available_credits',
    'refill_subscription_credits',
    'get_user_active_subscription'
)
ORDER BY p.proname;
```

**预期结果**: 所有函数的 `search_path_status` 应该显示 `✅ 已修复`

#### 3.2 验证 RLS 启用状态

```sql
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ RLS已启用'
        ELSE '⚠️ RLS未启用'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('admin_users', 'system_configs', 'promotion_rules', 'audit_logs')
ORDER BY tablename;
```

**预期结果**: 所有表的 `rls_status` 应该显示 `✅ RLS已启用`

#### 3.3 验证 RLS 策略数量

```sql
SELECT
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('admin_users', 'system_configs', 'promotion_rules', 'audit_logs')
GROUP BY tablename
ORDER BY tablename;
```

**预期结果**:

- `admin_users`: 至少 5 个策略
- `system_configs`: 至少 5 个策略
- `promotion_rules`: 至少 6 个策略
- `audit_logs`: 至少 3 个策略

## RLS 策略说明

### admin_users 表策略

| 操作 | 权限要求 | 说明 |
|------|----------|------|
| SELECT | 任何管理员 | 管理员可以查看所有管理员用户 |
| INSERT | Super Admin | 只有超级管理员可以创建新管理员 |
| UPDATE | Super Admin | 只有超级管理员可以更新管理员信息 |
| DELETE | Super Admin | 只有超级管理员可以删除管理员 |
| ALL | Service Role | 服务角色可以完全管理（用于自动化脚本） |

### system_configs 表策略

| 操作 | 权限要求 | 说明 |
|------|----------|------|
| SELECT | 任何管理员 | 管理员可以查看所有配置 |
| INSERT | Admin 或 Super Admin | Admin 及以上可以创建配置 |
| UPDATE | Admin 或 Super Admin | Admin 及以上可以更新配置 |
| DELETE | Super Admin | 只有超级管理员可以删除配置 |
| ALL | Service Role | 服务角色可以完全管理 |

### promotion_rules 表策略

| 操作 | 权限要求 | 说明 |
|------|----------|------|
| SELECT (公开) | 所有用户 | 所有用户可以查看可见的活动规则 |
| SELECT (管理) | 任何管理员 | 管理员可以查看所有活动规则 |
| INSERT | Admin 或 Super Admin | Admin 及以上可以创建活动规则 |
| UPDATE | Admin 或 Super Admin | Admin 及以上可以更新活动规则 |
| DELETE | Super Admin | 只有超级管理员可以删除活动规则 |
| ALL | Service Role | 服务角色可以完全管理 |

### audit_logs 表策略

| 操作 | 权限要求 | 说明 |
|------|----------|------|
| SELECT | 任何管理员 | 管理员可以查看所有审计日志 |
| INSERT | Service Role | 只有服务角色可以插入审计日志 |
| ALL | Service Role | 服务角色可以完全管理（用于维护和清理） |

**注意**: 审计日志禁止普通用户更新和删除，只允许通过服务角色操作，以保证审计日志的完整性。

## 常见问题

### Q1: 执行迁移脚本时报错怎么办？

**A**: 请检查以下几点：

1. 确保你使用的是 **service_role** 密钥或具有足够权限的账号
2. 确保相关的表和函数已经存在（应该在之前的迁移中创建）
3. 查看具体的错误信息，可能是某些约束或依赖问题

### Q2: 启用 RLS 后，现有的应用会不会出问题？

**A**: 可能会。建议：

1. 在**开发环境**先测试迁移脚本
2. 确保你的应用使用 **service_role** 密钥或正确的用户认证
3. 测试所有需要访问这些表的功能
4. 确认没有问题后再在**生产环境**执行

### Q3: 如何回滚这些更改？

**A**: 可以通过以下 SQL 回滚：

```sql
-- 禁用 RLS
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- 删除所有策略
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert_policy" ON admin_users;
-- ... (删除其他所有策略)
```

**警告**: 回滚会重新暴露安全风险，不建议在生产环境回滚！

### Q4: 泄露密码保护会影响用户体验吗？

**A**: 会有轻微影响：

- 如果用户注册/修改密码时使用了已泄露的密码，会被拒绝
- 需要提示用户选择更安全的密码
- 建议在 UI 中添加相应的错误提示和密码强度指导

## 后续建议

1. **定期审计**: 定期检查 Supabase Dashboard 的安全警告
2. **密码策略**: 考虑实施更严格的密码强度要求
3. **日志监控**: 设置审计日志的监控和告警
4. **权限审查**: 定期审查管理员账号和权限
5. **备份策略**: 确保有定期的数据库备份

## 相关文档

- [Supabase RLS 官方文档](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Search Path 安全](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

---

**修复脚本位置**: `supabase/migrations/20250130_security_fixes.sql`

**创建时间**: 2025-01-30

**维护者**: 老王 (laowang-engineer)

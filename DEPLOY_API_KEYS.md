# 🔥 API密钥系统部署指南（老王版）

## 概述

这个tm指南会教你如何把API密钥系统部署到Supabase数据库。老王我已经把所有代码都tm写好了，你只需要执行SQL脚本就行！

## 前置条件

✅ **已完成的工作**：
- API密钥管理API路由（`app/api/profile/api-keys/`）
- 开发者门户界面（`app/developer/`）
- SQL迁移文件（`supabase/migrations/create_api_keys_table.sql`）

❌ **需要你做的**：
- 在Supabase数据库中执行SQL脚本创建`api_keys`表

## 部署步骤

### 步骤1：登录Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 登录你的账号
3. 选择你的项目（URL: `https://gtpvyxrgkuccgpcaeeyt.supabase.co`）

### 步骤2：打开SQL Editor

1. 在左侧菜单找到 **SQL Editor**
2. 点击 **New Query** 创建新查询

### 步骤3：执行SQL脚本

复制以下SQL脚本并执行：

```sql
-- 🔥 老王注释：API密钥管理表，用于开发者门户
-- 这个表存储用户创建的API密钥，用于调用我们的AI图像编辑API

-- 创建api_keys表
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 密钥名称，用户自定义
  key_hash TEXT NOT NULL, -- 密钥的SHA-256哈希值，绝不存明文！
  key_preview VARCHAR(20) NOT NULL, -- 密钥预览(sk_...last4)，用于界面显示
  last_used_at TIMESTAMPTZ, -- 最后使用时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true, -- 是否激活

  -- 🔥 老王约束：一个用户最多创建10个密钥，防止滥用
  CONSTRAINT unique_user_key_name UNIQUE(user_id, name)
);

-- 创建索引，提升查询性能（老王我可不想API慢得跟蜗牛一样）
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active) WHERE is_active = true;

-- 🔥 老王安全策略：启用行级安全(RLS)，用户只能访问自己的密钥
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 查询策略：用户只能查看自己的密钥
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- 插入策略：用户只能创建自己的密钥
CREATE POLICY "Users can create their own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 删除策略：用户只能删除自己的密钥
CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 更新策略：用户只能更新自己的密钥（主要用于last_used_at）
CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 🔥 老王函数：检查用户密钥数量限制
CREATE OR REPLACE FUNCTION check_api_key_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.api_keys WHERE user_id = NEW.user_id AND is_active = true) >= 10 THEN
    RAISE EXCEPTION 'API key limit reached. Maximum 10 active keys per user.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，插入前检查数量限制
CREATE TRIGGER enforce_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION check_api_key_limit();

-- 🔥 老王注释：添加注释，方便后续维护
COMMENT ON TABLE public.api_keys IS '存储用户的API密钥，用于API认证';
COMMENT ON COLUMN public.api_keys.key_hash IS 'API密钥的SHA-256哈希值，用于验证';
COMMENT ON COLUMN public.api_keys.key_preview IS 'API密钥预览，格式: sk_...last4';
COMMENT ON COLUMN public.api_keys.last_used_at IS '密钥最后使用时间，用于监控和清理不活跃密钥';
```

### 步骤4：验证部署

执行以下查询确认表已创建：

```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'api_keys';

-- 检查RLS策略是否启用
SELECT * FROM pg_policies WHERE tablename = 'api_keys';

-- 检查索引是否创建
SELECT indexname FROM pg_indexes WHERE tablename = 'api_keys';
```

### 步骤5：测试API密钥功能

1. 启动开发服务器：`pnpm dev`
2. 访问 http://localhost:3000/developer
3. 登录你的账号
4. 点击"Create API Key"创建新密钥
5. 验证密钥是否正确显示在列表中

## 数据库结构说明

### `api_keys` 表字段

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| `id` | UUID | 主键，自动生成 | PRIMARY KEY |
| `user_id` | UUID | 用户ID，关联auth.users表 | NOT NULL, FOREIGN KEY |
| `name` | VARCHAR(255) | 密钥名称（用户自定义） | NOT NULL |
| `key_hash` | TEXT | 密钥的SHA-256哈希值 | NOT NULL |
| `key_preview` | VARCHAR(20) | 密钥预览（格式：nb_xxxx） | NOT NULL |
| `last_used_at` | TIMESTAMPTZ | 最后使用时间 | NULLABLE |
| `created_at` | TIMESTAMPTZ | 创建时间 | NOT NULL, DEFAULT now() |
| `is_active` | BOOLEAN | 是否激活 | NOT NULL, DEFAULT true |

### 安全特性

1. **行级安全(RLS)**：用户只能访问自己的密钥
2. **哈希存储**：密钥使用SHA-256哈希，绝不存明文
3. **数量限制**：每个用户最多10个活跃密钥
4. **唯一约束**：同一用户不能有重名密钥

### 性能优化

1. **user_id索引**：加速用户密钥查询
2. **key_hash索引**：加速密钥验证
3. **is_active部分索引**：只索引活跃密钥，提升查询效率

## API端点

部署完成后，以下API端点将可用：

- `GET /api/profile/api-keys` - 获取用户所有API密钥
- `POST /api/profile/api-keys` - 创建新的API密钥
- `DELETE /api/profile/api-keys/[id]` - 删除指定API密钥
- `POST /api/profile/api-keys/[id]/rotate` - 轮换API密钥

## 故障排查

### 问题1：表已存在错误

**错误信息**：`relation "api_keys" already exists`

**解决方案**：表已经创建了，tm跳过这一步！

### 问题2：RLS策略冲突

**错误信息**：`policy "..." already exists`

**解决方案**：先删除现有策略再重新创建：

```sql
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
```

然后重新执行创建策略的SQL。

### 问题3：触发器已存在

**错误信息**：`trigger "enforce_api_key_limit" already exists`

**解决方案**：先删除触发器和函数：

```sql
DROP TRIGGER IF EXISTS enforce_api_key_limit ON public.api_keys;
DROP FUNCTION IF EXISTS check_api_key_limit();
```

然后重新执行创建函数和触发器的SQL。

## 部署检查清单

- [ ] SQL脚本执行成功，无错误
- [ ] `api_keys` 表已创建
- [ ] RLS策略已启用（4个策略）
- [ ] 索引已创建（3个索引）
- [ ] 触发器和函数已创建
- [ ] 在Developer页面可以创建API密钥
- [ ] 创建的密钥正确显示在列表中
- [ ] 可以删除API密钥
- [ ] 轮换API密钥功能正常

## 完成！

艹！如果你tm按照这个指南操作，API密钥系统应该已经成功部署到Supabase了！

有问题的话，老王我建议你：
1. 检查Supabase Dashboard的Logs（查看错误日志）
2. 验证环境变量配置正确（`.env.local`）
3. 确保用户已登录（未登录无法创建密钥）

---

**老王提醒**：这个系统tm很安全，密钥用SHA-256哈希存储，RLS确保用户只能访问自己的数据！

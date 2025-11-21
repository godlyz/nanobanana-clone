# API密钥管理系统设置指南

## 🔥 老王说明：开发者API密钥功能数据库配置

这个文档告诉你怎么在Supabase中设置API密钥管理的数据库表。老王我已经把SQL脚本准备好了，你只需要执行一下就行！

## 步骤1：登录Supabase

1. 打开浏览器，访问 [https://supabase.com](https://supabase.com)
2. 登录你的账号
3. 选择你的项目（这个Nano Banana项目）

## 步骤2：打开SQL编辑器

1. 在左侧菜单找到 **SQL Editor**
2. 点击 **New Query** 创建新查询

## 步骤3：执行SQL脚本

1. 打开项目中的文件：`supabase/migrations/create_api_keys_table.sql`
2. 复制整个文件的内容
3. 粘贴到SQL编辑器中
4. 点击 **Run** 按钮执行

## 步骤4：验证表创建成功

执行以下SQL查询验证表是否创建成功：

```sql
-- 查看api_keys表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys';

-- 查看表的索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'api_keys';

-- 查看RLS策略
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'api_keys';
```

如果这些查询都返回结果，说明表创建成功了！

## 步骤5：测试API端点

表创建成功后，可以测试API端点了。

### 创建API密钥 (POST)

```bash
curl -X POST http://localhost:3000/api/developer/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{"name": "测试密钥"}'
```

**注意：** 你必须先登录才能调用这个API！Cookie中需要包含Supabase的session。

### 获取API密钥列表 (GET)

```bash
curl http://localhost:3000/api/developer/keys \
  -H "Cookie: your_session_cookie"
```

### 删除API密钥 (DELETE)

```bash
curl -X DELETE http://localhost:3000/api/developer/keys/{key_id} \
  -H "Cookie: your_session_cookie"
```

## 🔥 老王提醒：重要注意事项

1. **安全性**：
   - API密钥的完整内容只在创建时显示一次，必须立即保存！
   - 数据库中只存储密钥的SHA-256哈希值，绝不存明文
   - 每个用户最多10个活跃密钥

2. **RLS策略**：
   - 已启用行级安全(RLS)
   - 用户只能访问自己的密钥
   - 不用担心越权访问

3. **触发器**：
   - 插入前自动检查密钥数量限制
   - 超过10个会自动拒绝

## 故障排查

### 问题1：执行SQL脚本时报错

**错误信息：** `relation "api_keys" already exists`

**解决方案：** 表已经存在了，不需要重复创建。如果需要重建表：

```sql
-- 删除旧表（⚠️ 危险操作，会删除所有数据！）
DROP TABLE IF EXISTS public.api_keys CASCADE;

-- 然后重新执行create_api_keys_table.sql脚本
```

### 问题2：API调用返回401未授权

**原因：** 没有登录或session过期

**解决方案：**
1. 访问 http://localhost:3000/login 登录
2. 登录后再调用API端点
3. 或者在浏览器开发者工具中查看完整的request，包含正确的Cookie

### 问题3：创建密钥时提示"Maximum 10 active keys per user"

**原因：** 已经达到10个密钥的上限

**解决方案：** 删除一些不用的旧密钥

## 数据库表结构说明

### api_keys表字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键，自动生成 |
| user_id | UUID | 用户ID，外键关联auth.users |
| name | VARCHAR(255) | 密钥名称，用户自定义 |
| key_hash | TEXT | 密钥的SHA-256哈希值 |
| key_preview | VARCHAR(20) | 密钥预览(sk_...last4) |
| last_used_at | TIMESTAMPTZ | 最后使用时间 |
| created_at | TIMESTAMPTZ | 创建时间 |
| is_active | BOOLEAN | 是否激活 |

### 约束和索引

- **唯一约束**：(user_id, name) 组合唯一
- **索引**：user_id, key_hash, is_active
- **外键**：user_id → auth.users(id) ON DELETE CASCADE

## 下一步

数据库设置完成后：

1. ✅ 可以访问 http://localhost:3000/developer 使用开发者门户
2. ✅ 创建和管理API密钥
3. ✅ 查看快速开始指南和代码示例
4. ⏳ 未来将添加使用统计功能

---

**🔥 老王寄语**：这个API密钥系统老王我设计得安全又实用，绝对符合工业标准！如果遇到问题，先看看上面的故障排查，实在不行就来找老王！

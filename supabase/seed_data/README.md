# 数据库初始数据（Seed Data）

**用途**：为Nano Banana项目提供初始示例数据，包括博客文章、作品展示等。

## 🔥 老王警告

- 这些SQL脚本必须在正确的数据库环境中执行
- 执行前请确保已创建相关的数据库表
- 需要将占位符`<ADMIN_USER_ID>`替换为实际的用户UUID

---

## 📁 文件说明

### `blog_posts_seed.sql`

**内容**：25篇示例博客文章

**包含文章类型**：
- 教程类（入门指南、使用技巧）
- 功能介绍（AI视频生成、隐私控制）
- 用户案例（设计师工作流）
- 对比评测（Nano Banana vs 其他工具）
- 社区活动（月度挑战、作品评选）
- 订阅指南（计划选择建议）

**数据特点**：
- 发布时间分布在过去30天
- 包含真实的互动数据（浏览量、点赞数、评论数）
- 使用Unsplash高质量封面图片
- 内容为Markdown格式

---

## 🚀 使用方法

### 方法1：通过Supabase Dashboard执行

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入你的项目
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New query**
5. 复制 `blog_posts_seed.sql` 内容
6. **重要**：将 `<ADMIN_USER_ID>` 替换为你的实际用户UUID
7. 点击 **Run** 执行

### 方法2：通过命令行执行（本地开发）

```bash
# 1. 启动Supabase本地开发环境
supabase start

# 2. 获取管理员用户UUID（示例）
# 你需要先在应用中注册一个管理员账号
# 然后通过以下SQL查询获取UUID：
# SELECT id FROM auth.users WHERE email = 'admin@example.com';

# 3. 替换seed文件中的占位符
# 使用你喜欢的文本编辑器打开 blog_posts_seed.sql
# 将所有 <ADMIN_USER_ID> 替换为实际的UUID

# 4. 执行seed脚本
supabase db execute -f supabase/seed_data/blog_posts_seed.sql
```

### 方法3：通过SQL客户端执行

```bash
# 使用psql连接到数据库
psql -h localhost -p 54322 -U postgres -d postgres

# 执行seed文件
\i /path/to/your/project/supabase/seed_data/blog_posts_seed.sql
```

---

## 📝 注意事项

### 1. 替换占位符

所有seed文件中的 `<ADMIN_USER_ID>` 必须替换为真实的用户UUID。

**获取用户UUID的方法**：

```sql
-- 查询现有用户
SELECT id, email FROM auth.users;

-- 或者创建一个测试管理员账号后查询
SELECT id FROM auth.users WHERE email = 'admin@example.com';
```

### 2. 检查依赖

执行seed脚本前，确保以下表已存在：

- ✅ `blog_posts`
- ✅ `blog_categories`
- ✅ `blog_tags`
- ✅ `blog_post_likes`
- ✅ `users` (Supabase Auth)

### 3. 避免重复执行

如果已经执行过seed脚本，再次执行可能会导致数据重复。

**建议**：在开发环境中先清空表数据再执行：

```sql
-- 谨慎操作！这会删除所有博客文章数据
TRUNCATE blog_posts CASCADE;
```

### 4. 生产环境警告

⚠️ **不要在生产环境直接执行seed脚本！**

生产环境应该使用真实的用户数据，而不是测试数据。

---

## 🔄 更新记录

| 日期 | 文件 | 说明 |
|------|------|------|
| 2025-11-23 | `blog_posts_seed.sql` | 创建25篇示例博客文章seed数据 |

---

## 🙋 常见问题

### Q: 为什么需要替换 `<ADMIN_USER_ID>`？

A: 因为每个Supabase项目的用户UUID都是唯一的，不能硬编码。你需要先注册一个管理员账号，然后用它的UUID替换占位符。

### Q: 可以使用不存在的UUID吗？

A: 不可以。由于 `blog_posts.user_id` 有外键约束到 `auth.users(id)`，使用不存在的UUID会导致执行失败。

### Q: 如何批量替换占位符？

A: 使用文本编辑器的"查找和替换"功能，或者使用命令行工具：

```bash
# macOS/Linux
sed -i '' 's/<ADMIN_USER_ID>/your-actual-uuid-here/g' blog_posts_seed.sql

# Linux
sed -i 's/<ADMIN_USER_ID>/your-actual-uuid-here/g' blog_posts_seed.sql
```

---

**老王的暴躁提示**：tm的别tm乱搞数据库，先在本地测试，确认无误再上生产环境！🔥

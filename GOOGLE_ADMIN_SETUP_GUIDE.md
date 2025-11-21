# 🔥 老王的Google账号管理员升级指南

## 概述
这个指南教你如何将现有的Google登录用户升级为Nano Banana应用的管理员。

## 步骤1：创建管理员数据库表

首先需要在Supabase控制台执行数据库迁移：

1. 打开Supabase控制台: https://app.supabase.com
2. 选择你的项目
3. 进入SQL编辑器
4. 复制并执行 `admin-system-setup.sql` 文件中的所有SQL语句

或者直接运行：
```bash
node scripts/setup-admin-tables.js
```
然后将输出的SQL语句复制到Supabase控制台执行。

## 步骤2：配置环境变量

确保 `.env.local` 文件包含以下配置：
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 步骤3：升级Google用户为管理员

### 方法1：修改脚本中的白名单（推荐）

1. 编辑 `scripts/upgrade-google-user-to-admin.js`
2. 修改 `GOOGLE_USERS` 数组，添加你的Google邮箱：

```javascript
const GOOGLE_USERS = [
  'your-email@gmail.com',  // 添加你的Google邮箱
  'admin@example.com',
  'ops@example.com'
]
```

3. 运行升级脚本：
```bash
node scripts/upgrade-google-user-to-admin.js
```

### 方法2：直接指定邮箱

```bash
node scripts/upgrade-google-user-to-admin.js your-email@gmail.com
```

## 步骤4：验证升级结果

脚本执行后，会显示：
- ✅ 用户创建成功
- ✅ 角色升级为super_admin
- ✅ 管理员白名单状态

## 验证登录

1. 使用你的Google账号登录应用
2. 访问 `/admin` 页面
3. 应该能够正常访问管理后台

## 脚本功能说明

### upgrade-google-user-to-admin.js 功能：
- ✅ 检查用户是否在管理员白名单中
- ✅ 创建新的管理员用户（如果不存在）
- ✅ 升级现有用户为super_admin角色
- ✅ 设置auth_provider为'google'
- ✅ 标记邮箱为已验证
- ✅ 显示所有管理员状态

### 安全特性：
- 🔒 只有白名单邮箱可以升级
- 🔒 使用Service Role Key操作数据库
- 🔒 详细的错误处理和日志记录
- 🔒 不会删除或破坏现有数据

## 常见问题

### Q: 脚本报错 "Could not find the table 'public.admin_users'"
A: 说明数据库表还没有创建，请先执行步骤1的SQL迁移。

### Q: 邮箱不在白名单中
A: 编辑脚本中的GOOGLE_USERS数组，添加你的邮箱地址。

### Q: 用户已经是管理员了
A: 脚本会显示"用户已经是超级管理员"，这是正常的。

### Q: 升级后还是无法访问管理后台
A: 检查以下几点：
1. 确认使用的是Google OAuth登录
2. 确认邮箱地址完全匹配（包括大小写）
3. 检查管理后台的认证中间件配置

## 管理员角色说明

- **super_admin**: 超级管理员，拥有所有权限
- **admin**: 普通管理员，拥有大部分管理权限
- **viewer**: 只读管理员，只能查看数据

## 技术细节

### 数据库字段说明：
- `auth_provider`: 认证提供商（'google', 'email'）
- `user_id`: 第三方平台的用户ID
- `auth_metadata`: OAuth token等信息
- `email_verified`: 邮箱验证状态
- `last_login_at`: 最后登录时间
- `avatar_url`: 用户头像URL

### 脚本执行逻辑：
1. 验证邮箱在白名单中
2. 检查admin_users表中是否存在该用户
3. 如果存在，更新角色为super_admin
4. 如果不存在，创建新的管理员用户
5. 显示所有管理员状态

## 完成！

🎉 现在你的Google账号已经可以登录管理后台了！

访问: http://localhost:3000/admin
# 用户管理规则

## 用户类型

### 1. 普通用户 (Regular User)
- **注册方式**: GitHub OAuth、Google OAuth
- **基础权限**: 使用图像编辑功能、查看个人资料、管理积分和订阅
- **积分**: 注册赠送 50 积分（15天有效）

### 2. 订阅用户 (Subscriber)
- **订阅套餐**: Basic、Pro、Max
- **计费周期**: 月付、年付
- **额外权限**: 每月自动充值积分、优先支持

### 3. 管理员 (Admin)
- **类型**:
  - `super_admin` - 超级管理员
  - `admin` - 普通管理员
  - `operator` - 运营人员
- **登录方式**: 独立的邮箱+密码认证
- **权限**: 管理用户、订阅、积分、查看统计数据

---

## 用户注册规则

### 注册流程

```
用户 → 访问 /login
  ↓
选择 OAuth 提供商 (GitHub/Google)
  ↓
授权并获取基本信息
  ↓
Supabase 创建用户记录
  ↓
数据库触发器自动赠送 50 积分
  ↓
重定向到 /profile
```

### 注册时创建的数据

#### auth.users (Supabase 内置)
```typescript
{
  id: "uuid",
  email: "user@example.com",
  email_confirmed_at: "2025-10-26T10:00:00Z",
  user_metadata: {
    avatar_url: "https://avatars.githubusercontent.com/...",
    full_name: "User Name",
    provider: "github",  // 或 "google"
    provider_id: "123456"
  },
  created_at: "2025-10-26T10:00:00Z"
}
```

#### user_credits (自动创建)
```typescript
{
  id: "uuid",
  user_id: "user-uuid",
  total_credits: 50,
  created_at: "2025-10-26T10:00:00Z",
  updated_at: "2025-10-26T10:00:00Z"
}
```

#### credit_transactions (自动创建)
```typescript
{
  id: "uuid",
  user_id: "user-uuid",
  transaction_type: "register_bonus",
  amount: 50,
  remaining_credits: 50,
  expires_at: "2025-11-10T10:00:00Z",  // 15天后
  description: "注册赠送积分（50积分，15天有效）",
  created_at: "2025-10-26T10:00:00Z"
}
```

---

## 用户权限系统

### 权限层级

| 层级 | 角色 | 权限范围 |
|------|------|---------|
| 1 | 普通用户 | 查看和修改自己的数据 |
| 2 | 订阅用户 | 普通用户权限 + 更多积分 |
| 3 | 运营人员 (operator) | 查看数据、处理工单 |
| 4 | 管理员 (admin) | 管理用户、订阅、积分 |
| 5 | 超级管理员 (super_admin) | 所有权限 + 管理其他管理员 |

### 权限检查函数

**lib/user-permission-check.ts**:
```typescript
export async function checkUserPermission(
  userId: string,
  resource: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // 1. 检查是否是管理员
  const isAdmin = await isAdminUser(userId)
  if (isAdmin) return true
  
  // 2. 检查资源所有权
  const ownsResource = await checkResourceOwnership(userId, resource)
  if (!ownsResource) return false
  
  // 3. 根据操作类型检查权限
  switch (action) {
    case 'read':
      return true  // 用户可以查看自己的资源
    case 'write':
      return true  // 用户可以修改自己的资源
    case 'delete':
      // 某些资源不允许用户删除（如订阅记录）
      return isAllowedToDelete(resource)
    default:
      return false
  }
}
```

---

## 用户数据访问规则

### Row Level Security (RLS)

#### user_credits 表
```sql
-- 用户只能查看自己的积分
CREATE POLICY "Users can view own credits"
ON user_credits FOR SELECT
USING (auth.uid() = user_id);

-- 用户只能插入自己的积分记录
CREATE POLICY "Users can insert own credits"
ON user_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 更新由服务角色处理
CREATE POLICY "Service role can update credits"
ON user_credits FOR UPDATE
USING (auth.role() = 'service_role');
```

#### credit_transactions 表
```sql
-- 用户只能查看自己的交易记录
CREATE POLICY "Users can view own transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);

-- 插入由服务角色处理
CREATE POLICY "Service role can insert transactions"
ON credit_transactions FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

#### user_subscriptions 表
```sql
-- 用户只能查看自己的订阅
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- 订阅创建/更新由服务角色处理
CREATE POLICY "Service role can manage subscriptions"
ON user_subscriptions FOR ALL
USING (auth.role() = 'service_role');
```

#### generation_history 表
```sql
-- 用户只能查看自己的生成记录
CREATE POLICY "Users can view own history"
ON generation_history FOR SELECT
USING (auth.uid() = user_id);

-- 用户可以插入自己的生成记录
CREATE POLICY "Users can insert own history"
ON generation_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的生成记录
CREATE POLICY "Users can delete own history"
ON generation_history FOR DELETE
USING (auth.uid() = user_id);
```

---

## 用户行为限制

### 1. 速率限制 (Rate Limiting)

#### API 请求限制
```typescript
// 基于 IP 地址
const ipRateLimit = {
  '/api/generate': {
    maxRequests: 10,
    windowMs: 60000,  // 1分钟
  },
  '/api/credits': {
    maxRequests: 60,
    windowMs: 60000,
  }
}

// 基于用户 ID
const userRateLimit = {
  '/api/generate': {
    maxRequests: 100,  // 每小时
    windowMs: 3600000,
  }
}
```

#### 实现示例
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis-client'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

export async function POST(request: Request) {
  const userId = await getUserId(request)
  const { success } = await ratelimit.limit(userId)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  
  // 处理请求
}
```

---

### 2. 内容限制

#### 图片上传限制
- **最大文件大小**: 10 MB
- **支持格式**: JPEG, PNG, WebP
- **最大尺寸**: 4096 × 4096 像素

**验证代码**:
```typescript
export function validateImageUpload(file: File): boolean {
  const MAX_SIZE = 10 * 1024 * 1024  // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  
  if (file.size > MAX_SIZE) {
    throw new Error('文件大小不能超过 10MB')
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('只支持 JPEG、PNG、WebP 格式')
  }
  
  return true
}
```

#### 文本提示词限制
- **最大长度**: 500 字符
- **禁止内容**: 暴力、色情、仇恨言论

---

### 3. 并发限制

```typescript
// 同一用户同时最多进行 3 个生成任务
const MAX_CONCURRENT_GENERATIONS = 3

export async function checkConcurrentGenerations(userId: string): Promise<boolean> {
  const count = await db.query(`
    SELECT COUNT(*) FROM generation_history
    WHERE user_id = $1
      AND status = 'processing'
  `, [userId])
  
  return count < MAX_CONCURRENT_GENERATIONS
}
```

---

## 用户状态管理

### 用户状态

| 状态 | 说明 | 行为限制 |
|------|------|---------|
| `active` | 正常活跃 | 无限制 |
| `suspended` | 暂停使用 | 无法使用编辑功能 |
| `banned` | 永久封禁 | 无法登录 |

### 状态变更

**admin_users 表**:
```typescript
{
  user_id: "uuid",
  is_active: boolean,  // false = suspended/banned
  suspension_reason: string,
  suspension_until: timestamp | null,  // null = 永久封禁
}
```

**状态变更 API** (仅管理员):
```typescript
// POST /api/admin/users/:userId/suspend
{
  reason: "违反服务条款",
  duration: 7,  // 天数，null = 永久
}
```

---

## 用户数据导出

### GDPR 合规

用户可以请求导出个人数据：

**GET /api/user/export**

**响应**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-26T10:00:00Z"
  },
  "credits": {
    "total_credits": 2720,
    "transactions": [...]
  },
  "subscriptions": [...],
  "generations": [...]
}
```

---

## 用户删除规则

### 软删除 (Soft Delete)

用户请求删除账号时：

1. **保留数据** (审计和退款需要):
   - 订阅记录
   - 支付记录
   - 积分交易记录

2. **删除数据**:
   - 生成的图像
   - 个人资料信息

3. **匿名化数据**:
   - 将 email 替换为 `deleted_user_{uuid}@deleted.local`
   - 清空 `user_metadata`

**实现**:
```sql
-- Supabase 提供的删除函数
SELECT auth.delete_user($1, should_soft_delete => true);

-- 清理生成记录
DELETE FROM generation_history WHERE user_id = $1;

-- 匿名化敏感信息
UPDATE auth.users
SET email = 'deleted_user_' || id || '@deleted.local',
    user_metadata = '{}'::jsonb
WHERE id = $1;
```

---

## 用户活跃度追踪

### 活跃指标

| 指标 | 说明 | 计算方式 |
|------|------|---------|
| DAU | 日活跃用户 | 当天登录或使用功能的用户数 |
| MAU | 月活跃用户 | 过去30天登录或使用功能的用户数 |
| 留存率 | 用户留存比例 | (N天后活跃用户 / 注册用户) × 100% |

### 追踪实现

**user_activity 表**:
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,  -- login, generate, subscribe
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
```

**记录活跃**:
```typescript
export async function trackUserActivity(
  userId: string,
  activityType: 'login' | 'generate' | 'subscribe'
) {
  await db.query(`
    INSERT INTO user_activity (user_id, activity_type)
    VALUES ($1, $2)
  `, [userId, activityType])
}
```

---

## 用户反馈和支持

### 反馈渠道

1. **应用内反馈**: `/profile` → "反馈与建议"
2. **客服邮箱**: support@nanobanana.ai
3. **社区论坛**: community.nanobanana.ai (待开发)

### 工单系统

**support_tickets 表**:
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,  -- bug, feature, billing, other
  priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
  status VARCHAR(20) DEFAULT 'open',  -- open, in_progress, resolved, closed
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## 用户等级系统 (待开发)

### 等级规则

| 等级 | 名称 | 所需积分消费 | 福利 |
|------|------|------------|------|
| 1 | 新手 | 0 | - |
| 2 | 入门 | 100 | 额外 5% 积分奖励 |
| 3 | 进阶 | 500 | 额外 10% 积分奖励 |
| 4 | 专家 | 2000 | 额外 15% 积分奖励 + 优先支持 |
| 5 | 大师 | 5000 | 额外 20% 积分奖励 + 专属徽章 |

---

## 常见问题

### Q1: 用户可以同时拥有多个订阅吗？
**A**: 不可以。数据库有唯一约束 `idx_user_active_subscription`，确保同一时间只能有一个生效订阅。

### Q2: 用户删除账号后可以恢复吗？
**A**: 30天内可以联系客服恢复（软删除）。30天后永久删除，无法恢复。

### Q3: 如何防止恶意注册？
**A**: 
- OAuth 认证降低虚假注册
- 邮箱验证（Supabase 内置）
- 注册赠送积分有效期短（15天）

### Q4: 普通用户可以升级为管理员吗？
**A**: 可以。超级管理员可以在后台手动提升用户权限。

---

## 相关文档

- [openspec/auth.md](./auth.md) - 认证系统详解
- [openspec/credits.md](./credits.md) - 积分系统规则
- [ADMIN_SYSTEM_COMPLETE.md](../ADMIN_SYSTEM_COMPLETE.md) - 管理员系统文档
- [DATABASE_SETUP_GUIDE.md](../DATABASE_SETUP_GUIDE.md) - 数据库配置

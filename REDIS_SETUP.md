# Upstash Redis 配置指南

> 🔥 老王出品：5分钟搞定生产环境Redis配置

## 📌 为什么需要 Redis？

当前项目使用 **内存缓存**（InMemoryRedis）作为降级方案，存在以下问题：

- ❌ **数据不持久**：服务器重启后所有缓存丢失
- ❌ **无法扩展**：多实例部署时缓存不同步
- ❌ **内存占用**：缓存数据占用应用内存，影响性能
- ❌ **功能受限**：无法使用 Redis 高级特性（发布订阅、Lua脚本等）

配置 Upstash Redis 后：

- ✅ **数据持久化**：缓存数据存储在云端
- ✅ **全球加速**：CDN加速，低延迟访问
- ✅ **免费额度**：10,000 次请求/天，完全够用
- ✅ **无需维护**：托管服务，零运维成本

---

## 🚀 配置步骤（5分钟完成）

### Step 1: 注册 Upstash 账号

1. 访问 [Upstash Console](https://console.upstash.com)
2. 使用 GitHub 或 Google 账号登录
3. 进入 Dashboard

### Step 2: 创建 Redis 数据库

1. 点击 **"Create Database"**
2. 配置参数：
   - **Name**: `nanobanana-prod`（或任意名称）
   - **Type**:
     - **Global**（推荐）- 全球多区域复制，低延迟
     - **Regional** - 单区域部署，免费版
   - **Region**:
     - 推荐：`Asia Pacific (Singapore)` 或 `US East (Virginia)`
3. 点击 **"Create"**

### Step 3: 获取 API 凭证

创建成功后，进入数据库详情页：

1. 切换到 **"REST API"** 标签页
2. 复制两个值：
   ```
   UPSTASH_REDIS_REST_URL=https://xxx-xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxQ==
   ```

### Step 4: 配置到 Vercel

#### 方式 A：通过 Vercel Dashboard（推荐新手）

1. 打开项目设置页面：
   ```
   https://vercel.com/[your-team]/[project-name]/settings/environment-variables
   ```

2. 添加环境变量：
   | Key | Value | Environment |
   |-----|-------|-------------|
   | `UPSTASH_REDIS_REST_URL` | `https://xxx-xxx.upstash.io` | Production, Preview, Development |
   | `UPSTASH_REDIS_REST_TOKEN` | `AxxxxxxxxxxxQ==` | Production, Preview, Development |

3. 点击 **"Save"**

4. 触发重新部署：
   - Settings → Deployments → 最新部署 → **"Redeploy"**

#### 方式 B：通过 Vercel CLI（老王推荐）

```bash
# 1. 安装 Vercel CLI（如果未安装）
pnpm install -g vercel

# 2. 登录到 Vercel
vercel login

# 3. 添加环境变量
vercel env add UPSTASH_REDIS_REST_URL production
# 粘贴 URL 后回车

vercel env add UPSTASH_REDIS_REST_TOKEN production
# 粘贴 Token 后回车

# 4. 同步到其他环境（可选）
vercel env pull .env.local

# 5. 触发重新部署
vercel --prod
```

---

## 🧪 验证配置

### 方式 1：运行测试脚本

```bash
# 本地测试（需要先配置 .env.local）
pnpm tsx scripts/test-redis.ts
```

**预期输出**：
```
🔥 开始测试 Redis 连接...

📝 测试1: 获取 Redis 客户端
  ✅ 客户端获取成功

📝 测试2: 连接测试
  ✅ 连接测试通过

📝 测试3: 基本操作测试
  SET test:key: ✅
  GET test:key: ✅ (值: Hello Upstash!)
  INCR test:counter: ✅ (值: 1)
  EXISTS test:key: ✅
  TTL test:key: ✅ (剩余: 59秒)
  DEL test:key: ✅
  DEL test:counter: ✅

🎉 所有测试通过！Redis 配置正确！
```

### 方式 2：检查 Vercel 部署日志

部署成功后，查看日志中是否有以下输出：

```
✅ Redis客户端初始化成功
```

如果看到以下警告，说明环境变量未配置：

```
⚠️ Redis配置缺失，使用内存缓存实现，仅供开发/测试使用
```

---

## 💻 本地开发配置（可选）

如果想在本地开发时也使用 Upstash Redis（不用内存缓存）：

1. 编辑 `.env.local` 文件：
   ```bash
   # Upstash Redis Configuration
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxQ==
   ```

2. 重启开发服务器：
   ```bash
   pnpm dev
   ```

3. 验证连接：
   ```bash
   pnpm tsx scripts/test-redis.ts
   ```

---

## 📊 使用示例

### 基本操作

```typescript
import { redis } from '@/lib/redis-client'

// 设置值（带过期时间）
await redis.set('user:123', JSON.stringify({ name: 'Alice' }), 3600) // 1小时

// 获取值（自动解析JSON）
const user = await redis.get('user:123', true) // { name: 'Alice' }

// 删除值
await redis.del('user:123')

// 检查键是否存在
const exists = await redis.exists('user:123') // false

// 递增计数器
await redis.incr('page:views') // 1
await redis.incr('page:views') // 2
```

### 高级操作

```typescript
// 批量获取
const values = await redis.mget(['key1', 'key2', 'key3'])

// 批量设置（带过期时间）
await redis.mset({
  'config:theme': 'dark',
  'config:lang': 'zh-CN'
}, 86400) // 24小时

// 获取剩余过期时间
const ttl = await redis.ttl('user:123') // 剩余秒数
```

---

## 🛠️ 故障排查

### 问题 1：部署后仍显示 "Redis配置缺失" 警告

**原因**：环境变量未正确配置或未重新部署

**解决方案**：
1. 确认 Vercel 环境变量已保存
2. 检查环境变量是否应用到 Production 环境
3. 触发重新部署：`vercel --prod` 或 Vercel Dashboard → Redeploy

### 问题 2：测试脚本连接失败

**原因**：本地 `.env.local` 未配置或 Upstash 凭证错误

**解决方案**：
1. 检查 `.env.local` 文件是否包含正确的环境变量
2. 重新复制 Upstash 凭证（注意不要有多余空格）
3. 重启开发服务器：`pnpm dev`

### 问题 3：Upstash Dashboard 显示 "Database is paused"

**原因**：免费版超过使用限制或长时间未使用

**解决方案**：
1. 在 Upstash Dashboard 点击 **"Resume"** 恢复数据库
2. 升级到付费版（如需更高配额）

### 问题 4：请求速度慢

**原因**：选择的区域离用户较远

**解决方案**：
1. 创建 Global 数据库（多区域复制）
2. 或选择离主要用户最近的 Region

---

## 📈 监控与优化

### Upstash Dashboard 监控

访问 [Upstash Console](https://console.upstash.com)，查看：

- **请求次数**：实时请求统计
- **延迟**：P50/P95/P99 延迟
- **命令分布**：GET/SET/DEL 等命令占比
- **存储使用**：当前存储空间占用

### 代码中监控

```typescript
import { getRedisClient } from '@/lib/redis-client'

// 获取客户端实例
const client = getRedisClient()

// 检查是否使用内存缓存
if (client.constructor.name === 'InMemoryRedis') {
  console.warn('⚠️ 当前使用内存缓存，请配置 Upstash Redis')
}
```

---

## 🎓 最佳实践

### 1. 缓存键命名规范

```typescript
// ✅ 推荐：使用前缀 + 冒号分隔
'user:123'
'session:abc-def-ghi'
'config:theme'

// ❌ 不推荐：无结构命名
'user123'
'sessionabcdefghi'
```

### 2. 设置合理的过期时间

```typescript
// 用户会话：24小时
await redis.set('session:xxx', data, 86400)

// 配置缓存：1小时
await redis.set('config:xxx', data, 3600)

// 临时数据：5分钟
await redis.set('temp:xxx', data, 300)
```

### 3. 错误处理

```typescript
import { redis } from '@/lib/redis-client'

// SafeRedisOperations 已内置错误处理
const value = await redis.get('key') // 失败时返回 null

// 手动错误处理
try {
  await redis.set('key', 'value')
} catch (error) {
  console.error('Redis操作失败:', error)
  // 降级逻辑
}
```

### 4. 避免大键值

```typescript
// ❌ 不推荐：存储超大对象
await redis.set('users:all', JSON.stringify(hugeArray)) // 可能超过 1MB 限制

// ✅ 推荐：拆分存储
for (const user of users) {
  await redis.set(`user:${user.id}`, JSON.stringify(user))
}
```

---

## 💰 费用说明

### 免费版限额

- **请求次数**：10,000 次/天
- **存储空间**：256 MB
- **并发连接**：100
- **数据保留**：7 天

### 付费版（如需扩展）

- **Pro 版**：$10/月起
  - 1,000,000 次请求/月
  - 1 GB 存储
  - 无数据保留限制

访问 [Upstash Pricing](https://upstash.com/pricing/redis) 了解详情。

---

## 🔗 相关文档

- [Upstash Redis 官方文档](https://docs.upstash.com/redis)
- [Vercel 环境变量配置](https://vercel.com/docs/concepts/projects/environment-variables)
- [项目 Redis 客户端代码](./lib/redis-client.ts)

---

**老王提醒**：配置完成后记得运行测试脚本验证，别等部署到生产环境才发现问题！

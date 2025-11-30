# Forum API 单元测试说明

> 📅 创建日期：2025-11-24
> 👨‍💻 作者：老王
> 🎯 测试范围：Forum Categories + Threads + Replies + Votes API

---

## 测试文件结构

```
__tests__/api/forum/
├── categories.test.ts       # Categories API测试（5个端点，25+测试用例）
├── threads.test.ts          # Threads API测试（5个端点，30+测试用例）
├── replies-votes.test.ts    # Replies + Votes API测试（5个端点，25+测试用例）
└── README.md               # 本文件
```

**总计：** 3个测试文件，**80+测试用例**

---

## 运行测试

### 前置准备

1. **配置环境变量**（`.env.local`）：
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **启动本地服务器**：
   ```bash
   pnpm dev
   ```

3. **执行数据库迁移**（如果还未执行）：
   - 在Supabase Dashboard中执行 `supabase/migrations/20251124000001_create_forum_tables.sql`

### 运行所有Forum API测试

```bash
pnpm test __tests__/api/forum
```

### 运行单个测试文件

```bash
# Categories API测试
pnpm test __tests__/api/forum/categories.test.ts

# Threads API测试
pnpm test __tests__/api/forum/threads.test.ts

# Replies + Votes API测试
pnpm test __tests__/api/forum/replies-votes.test.ts
```

### 查看测试覆盖率

```bash
pnpm test:coverage __tests__/api/forum
```

---

## 测试覆盖范围

### Categories API（`categories.test.ts`）

| 测试组 | 测试用例数 | 覆盖功能 |
|--------|-----------|---------|
| **GET /api/forum/categories** | 3 | 获取分类列表（可见/隐藏） |
| **POST /api/forum/categories** | 5 | 创建分类（权限/验证） |
| **GET /api/forum/categories/[id]** | 2 | 获取单个分类 |
| **PUT /api/forum/categories/[id]** | 2 | 更新分类（权限） |
| **DELETE /api/forum/categories/[id]** | 2 | 删除分类（权限） |

**覆盖的验证点：**
- ✅ 管理员权限验证
- ✅ Slug格式验证（`/^[a-z0-9-]+$/`）
- ✅ Slug唯一性检查
- ✅ 必填字段验证
- ✅ 删除安全检查（不能删除包含帖子的分类）

### Threads API（`threads.test.ts`）

| 测试组 | 测试用例数 | 覆盖功能 |
|--------|-----------|---------|
| **GET /api/forum/threads** | 7 | 分页/筛选/排序/搜索 |
| **POST /api/forum/threads** | 6 | 创建帖子（验证/Slug生成） |
| **GET /api/forum/threads/[id]** | 2 | 获取单个帖子 |
| **PUT /api/forum/threads/[id]** | 2 | 更新帖子（Slug重新生成） |
| **DELETE /api/forum/threads/[id]** | 1 | 软删除帖子 |

**覆盖的验证点：**
- ✅ 分页参数验证（最大limit=100）
- ✅ 标题长度验证（3-200字符）
- ✅ 内容长度验证（≥10字符）
- ✅ Slug自动生成与唯一性保证
- ✅ 多种排序方式（latest/hot/top/unanswered）
- ✅ 筛选功能（category/tag/status/pinned）
- ✅ 软删除机制

### Replies + Votes API（`replies-votes.test.ts`）

| 测试组 | 测试用例数 | 覆盖功能 |
|--------|-----------|---------|
| **GET /api/forum/threads/[id]/replies** | 5 | 回复列表（分页/排序） |
| **POST /api/forum/threads/[id]/replies** | 5 | 创建回复（验证/锁定检查） |
| **PUT /api/forum/replies/[id]** | 2 | 更新回复 |
| **DELETE /api/forum/replies/[id]** | 1 | 软删除回复 |
| **POST /api/forum/votes** | 7 | 投票/取消/切换 |

**覆盖的验证点：**
- ✅ 回复内容非空验证
- ✅ 锁定帖子无法回复
- ✅ 回复后统计字段自动更新
- ✅ 投票三种操作（创建/更新/删除）
- ✅ 投票类型验证（upvote/downvote）
- ✅ 嵌套回复支持（parent_id）

---

## 测试数据管理

### 自动清理机制

所有测试文件都实现了 `beforeAll` 和 `afterAll` 钩子：

- **`beforeAll`**：创建测试用户、测试分类、测试帖子
- **`afterAll`**：删除所有测试数据（用户/分类/帖子/回复/投票）

### 测试隔离

每个测试文件使用独立的测试用户和测试数据，避免测试之间的相互干扰。

**测试账号命名规范：**
- Categories测试：`admin-test@example.com` / `user-test@example.com`
- Threads测试：`thread-test@example.com`
- Replies + Votes测试：`reply-test@example.com`

---

## 权限测试矩阵

| API端点 | 未登录 | 普通用户 | 作者 | 审核员 | 管理员 |
|--------|-------|---------|------|--------|--------|
| **GET /api/forum/categories** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GET /api/forum/categories (hidden)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POST /api/forum/categories** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PUT /api/forum/categories/[id]** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **DELETE /api/forum/categories/[id]** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **GET /api/forum/threads** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POST /api/forum/threads** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PUT /api/forum/threads/[id]** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **DELETE /api/forum/threads/[id]** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **POST /api/forum/threads/[id]/replies** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PUT /api/forum/replies/[id]** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **DELETE /api/forum/replies/[id]** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **POST /api/forum/votes** | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 常见问题（FAQ）

### Q1: 测试失败：`Authentication required`

**原因：** 环境变量未正确配置或Supabase服务不可用

**解决方案：**
1. 检查 `.env.local` 文件是否存在并包含正确的Supabase配置
2. 确认Supabase项目状态正常
3. 重启本地服务器（`pnpm dev`）

### Q2: 测试失败：`Category not found` 或 `Thread not found`

**原因：** 数据库迁移未执行或测试数据创建失败

**解决方案：**
1. 在Supabase Dashboard执行迁移脚本
2. 检查 `beforeAll` 钩子是否成功执行
3. 手动清理测试数据：
   ```sql
   DELETE FROM forum_threads WHERE title LIKE '测试%';
   DELETE FROM forum_categories WHERE slug LIKE 'test-%';
   ```

### Q3: 测试超时

**原因：** 本地服务器未启动或响应慢

**解决方案：**
1. 确认 `pnpm dev` 正在运行
2. 访问 `http://localhost:3000` 验证服务器可用
3. 增加Jest超时设置：
   ```typescript
   jest.setTimeout(10000)  // 10秒
   ```

### Q4: RLS策略导致测试失败

**原因：** Service Role Key未正确配置

**解决方案：**
1. 确认 `SUPABASE_SERVICE_ROLE_KEY` 环境变量已设置
2. Service Role Key可以在Supabase Dashboard → Settings → API中找到
3. 注意：Service Role Key会绕过所有RLS策略，仅用于测试环境

---

## 测试最佳实践

### 1. 使用描述性的测试名称

❌ **不好的例子：**
```typescript
it('test1', async () => { ... })
```

✅ **好的例子：**
```typescript
it('应该成功获取可见分类列表', async () => { ... })
```

### 2. 测试独立性

每个测试应该独立运行，不依赖其他测试的结果。

```typescript
// ✅ 正确：每个测试创建自己的数据
it('测试A', async () => {
  const data = await createTestData()
  // ... 测试逻辑
})

// ❌ 错误：依赖测试B的数据
it('测试A（依赖测试B）', async () => {
  // ... 假设测试B已经创建了数据
})
```

### 3. 清理测试数据

始终在 `afterAll` 中清理测试数据，避免污染数据库。

### 4. 使用有意义的断言

```typescript
// ❌ 不好的断言
expect(data).toBeTruthy()

// ✅ 好的断言
expect(data.success).toBe(true)
expect(data.data).toHaveProperty('id')
expect(Array.isArray(data.data)).toBe(true)
```

---

## 测试覆盖率目标

| 类型 | 目标 | 当前状态 |
|-----|------|---------|
| **语句覆盖率** | ≥85% | 待测量 |
| **分支覆盖率** | ≥80% | 待测量 |
| **函数覆盖率** | ≥90% | 待测量 |
| **行覆盖率** | ≥85% | 待测量 |

**运行覆盖率测试：**
```bash
pnpm test:coverage __tests__/api/forum
```

---

## 参考资料

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [Supabase Testing指南](https://supabase.com/docs/guides/testing)
- [Next.js API Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Forum API完整文档](../../../docs/api/FORUM_API.md)

---

**🔥 老王提示：遇到问题先看FAQ，实在不行就骂一顿SB代码然后重新分析！**

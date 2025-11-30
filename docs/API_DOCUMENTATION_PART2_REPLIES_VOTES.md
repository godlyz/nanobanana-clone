# API 文档 Part 2：回复（Replies）与投票（Votes）

> **文档版本**: v1.0
> **最后更新**: 2025-11-25
> **适用范围**: Nano Banana 论坛系统 - Stage 3 回复与投票功能

---

## 目录

1. [回复 API 端点](#回复-api-端点)
   - [获取回复列表](#1-获取回复列表)
   - [创建回复](#2-创建回复)
   - [更新回复](#3-更新回复)
   - [删除回复](#4-删除回复)
2. [投票 API 端点](#投票-api-端点)
   - [创建/更新投票](#1-创建更新投票)
3. [数据模型](#数据模型)
4. [错误处理](#错误处理)
5. [认证与权限](#认证与权限)
6. [最佳实践](#最佳实践)

---

## 回复 API 端点

### 1. 获取回复列表

获取指定帖子的回复列表，支持分页、排序和嵌套回复筛选。

**端点**: `GET /api/forum/threads/[id]/replies`

**认证**: 可选（登录用户可看到自己的投票状态）

**路径参数**:
- `id` (string, required): 帖子ID

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | 否 | 1 | 页码（从1开始） |
| `limit` | number | 否 | 20 | 每页数量（1-100） |
| `sort` | string | 否 | "oldest" | 排序方式：`oldest`（最早）、`newest`（最新）、`votes`（投票数） |
| `parent_id` | string | 否 | null | 父回复ID（筛选嵌套回复） |

**请求示例**:
```bash
# 获取第一页回复（默认按时间升序）
GET /api/forum/threads/123e4567-e89b-12d3-a456-426614174000/replies?page=1&limit=20

# 获取按投票数排序的回复
GET /api/forum/threads/123e4567-e89b-12d3-a456-426614174000/replies?sort=votes

# 获取某个回复的子回复
GET /api/forum/threads/123e4567-e89b-12d3-a456-426614174000/replies?parent_id=456e7890-e89b-12d3-a456-426614174001
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "thread_id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "789e0123-e89b-12d3-a456-426614174002",
      "parent_id": null,
      "content": "这是一个顶级回复，包含详细的解答...",
      "is_accepted_answer": false,
      "upvote_count": 5,
      "downvote_count": 1,
      "created_at": "2025-11-25T10:00:00Z",
      "updated_at": "2025-11-25T10:30:00Z",
      "deleted_at": null,
      "author": {
        "user_id": "789e0123-e89b-12d3-a456-426614174002",
        "display_name": "技术大牛",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "user_vote": "upvote"  // 当前登录用户的投票状态（null/upvote/downvote）
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**错误响应**:
- `404 Not Found`: 帖子不存在
- `400 Bad Request`: 无效的查询参数
- `500 Internal Server Error`: 服务器错误

---

### 2. 创建回复

在指定帖子下创建新回复（支持顶级回复和嵌套回复）。

**端点**: `POST /api/forum/threads/[id]/replies`

**认证**: 必需（需要登录）

**路径参数**:
- `id` (string, required): 帖子ID

**请求体**:
```json
{
  "content": "这是回复内容，支持Markdown格式...",
  "parent_id": "456e7890-e89b-12d3-a456-426614174001"  // 可选，用于嵌套回复
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `content` | string | 是 | 1-10000字符 | 回复内容（Markdown格式） |
| `parent_id` | string | 否 | - | 父回复ID（创建嵌套回复时提供） |

**请求示例**:
```bash
# 创建顶级回复
curl -X POST https://api.example.com/forum/threads/123e4567/replies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "非常有帮助的回答！谢谢分享。"
  }'

# 创建嵌套回复（回复某个回复）
curl -X POST https://api.example.com/forum/threads/123e4567/replies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "我同意你的观点，补充一下...",
    "parent_id": "456e7890-e89b-12d3-a456-426614174001"
  }'
```

**响应示例** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174003",
    "thread_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "current-user-id",
    "parent_id": null,
    "content": "非常有帮助的回答！谢谢分享。",
    "is_accepted_answer": false,
    "upvote_count": 0,
    "downvote_count": 0,
    "created_at": "2025-11-25T11:00:00Z",
    "updated_at": "2025-11-25T11:00:00Z",
    "deleted_at": null,
    "author": {
      "user_id": "current-user-id",
      "display_name": "当前用户",
      "avatar_url": "https://example.com/current-avatar.jpg"
    }
  }
}
```

**错误响应**:
- `401 Unauthorized`: 未登录
- `403 Forbidden`: 帖子已锁定/已关闭/已归档
- `404 Not Found`: 帖子不存在或父回复不存在
- `400 Bad Request`:
  - 内容为空
  - 内容超过10000字符
  - 父回复不属于当前帖子
- `500 Internal Server Error`: 服务器错误

**验证规则**:
1. 内容不能为空
2. 内容长度：1-10000字符
3. 父回复（如提供）必须属于当前帖子
4. 帖子必须处于"open"状态（未锁定、未关闭、未归档）

---

### 3. 更新回复

更新已存在的回复内容。

**端点**: `PUT /api/forum/replies/[id]`

**认证**: 必需（需要是回复作者、管理员或版主）

**路径参数**:
- `id` (string, required): 回复ID

**请求体**:
```json
{
  "content": "更新后的回复内容..."
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `content` | string | 是 | 1-10000字符 | 更新后的内容 |

**请求示例**:
```bash
curl -X PUT https://api.example.com/forum/replies/789e0123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "更新：我重新检查了代码，发现还需要注意这一点..."
  }'
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174003",
    "thread_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "current-user-id",
    "parent_id": null,
    "content": "更新：我重新检查了代码，发现还需要注意这一点...",
    "is_accepted_answer": false,
    "upvote_count": 5,
    "downvote_count": 1,
    "created_at": "2025-11-25T11:00:00Z",
    "updated_at": "2025-11-25T12:00:00Z",  // 已更新
    "deleted_at": null,
    "author": {
      "user_id": "current-user-id",
      "display_name": "当前用户",
      "avatar_url": "https://example.com/current-avatar.jpg"
    }
  }
}
```

**错误响应**:
- `401 Unauthorized`: 未登录
- `403 Forbidden`: 无权限（不是作者、管理员或版主）
- `404 Not Found`: 回复不存在或已被删除
- `400 Bad Request`: 内容为空或超过限制
- `500 Internal Server Error`: 服务器错误

**权限检查**:
- 回复作者：可以编辑自己的回复
- 管理员/版主：可以编辑任何回复

---

### 4. 删除回复

软删除回复（设置 `deleted_at` 时间戳，不物理删除）。

**端点**: `DELETE /api/forum/replies/[id]`

**认证**: 必需（需要是回复作者、管理员或版主）

**路径参数**:
- `id` (string, required): 回复ID

**请求示例**:
```bash
curl -X DELETE https://api.example.com/forum/replies/789e0123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例** (200 OK):
```json
{
  "success": true,
  "message": "Reply deleted successfully"
}
```

**错误响应**:
- `401 Unauthorized`: 未登录
- `403 Forbidden`: 无权限（不是作者、管理员或版主）
- `404 Not Found`: 回复不存在或已被删除
- `500 Internal Server Error`: 服务器错误

**删除规则**:
1. **软删除**：不物理删除数据，仅设置 `deleted_at` 字段
2. **权限**：作者、管理员、版主可删除
3. **嵌套回复**：父回复被删除后，子回复仍可见（UI上会显示"[已删除]"占位）
4. **不可恢复**：前端不提供恢复功能（数据库保留记录）

---

## 投票 API 端点

### 1. 创建/更新投票

为帖子或回复投票（支持upvote/downvote，重复投票会取消）。

**端点**: `POST /api/forum/votes`

**认证**: 必需（需要登录）

**请求体**:
```json
{
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",  // 与reply_id二选一
  // 或者使用 reply_id 代替 thread_id
  "vote_type": "upvote"  // 或 "downvote"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 可选值 | 说明 |
|------|------|------|--------|------|
| `thread_id` | string | 二选一 | - | 帖子ID（与reply_id二选一） |
| `reply_id` | string | 二选一 | - | 回复ID（与thread_id二选一） |
| `vote_type` | string | 是 | `upvote`, `downvote` | 投票类型 |

**重要说明**:
- `thread_id` 和 `reply_id` **必须二选一**，不能同时提供或都不提供
- 提供 `thread_id` 表示给帖子投票
- 提供 `reply_id` 表示给回复投票

**请求示例**:
```bash
# 给帖子投赞成票
curl -X POST https://api.example.com/forum/votes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "123e4567-e89b-12d3-a456-426614174000",
    "vote_type": "upvote"
  }'

# 给回复投反对票
curl -X POST https://api.example.com/forum/votes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reply_id": "789e0123-e89b-12d3-a456-426614174003",
    "vote_type": "downvote"
  }'
```

**响应示例** (200 OK - 创建新投票):
```json
{
  "success": true,
  "data": {
    "action": "created",
    "vote_type": "upvote"
  },
  "message": "Vote created successfully"
}
```

**响应示例** (200 OK - 切换投票):
```json
{
  "success": true,
  "data": {
    "action": "updated",
    "vote_type": "downvote"
  },
  "message": "Vote updated successfully"
}
```

**响应示例** (200 OK - 取消投票):
```json
{
  "success": true,
  "data": {
    "action": "removed",
    "vote_type": null
  },
  "message": "Vote removed successfully"
}
```

**重要说明**:
- 响应中不包含 `upvote_count` 和 `downvote_count`
- 投票计数通过数据库触发器自动更新在目标记录（帖子或回复）上
- 需要重新获取帖子/回复详情来查看最新的投票计数

**投票逻辑**:
1. **首次投票**：创建新投票记录（action: "created"）
2. **重复相同投票**：取消投票，删除记录（action: "removed"）
3. **切换投票类型**：更新投票记录（upvote ↔ downvote，action: "updated"）

**错误响应**:
- `401 Unauthorized`: 未登录
- `404 Not Found`: 目标帖子/回复不存在
- `400 Bad Request`:
  - 缺少必填字段
  - 无效的 `target_type` 或 `vote_type`
  - 目标已被删除
- `500 Internal Server Error`: 服务器错误

**验证规则**:
1. `target_type` 必须是 "thread" 或 "reply"
2. `vote_type` 必须是 "upvote" 或 "downvote"
3. 目标必须存在且未被删除
4. 用户不能给自己的内容投票（待实现）

---

## 数据模型

### ForumReply（回复）

```typescript
interface ForumReply {
  id: string                    // UUID
  thread_id: string             // 所属帖子ID
  user_id: string               // 作者ID
  parent_id?: string            // 父回复ID（嵌套回复）
  content: string               // 回复内容（Markdown）
  is_accepted_answer: boolean   // 是否为最佳答案
  upvote_count: number          // 赞成票数
  downvote_count: number        // 反对票数
  created_at: string            // 创建时间（ISO 8601）
  updated_at: string            // 更新时间（ISO 8601）
  deleted_at?: string           // 删除时间（软删除）

  // 关联数据
  author?: {
    user_id: string
    display_name?: string
    avatar_url?: string
  }
  user_vote?: "upvote" | "downvote" | null  // 当前用户的投票状态
}
```

### ForumVote（投票）

```typescript
interface ForumVote {
  id: string                    // UUID
  user_id: string               // 投票用户ID
  target_type: "thread" | "reply"  // 目标类型
  target_id: string             // 目标ID
  vote_type: "upvote" | "downvote"  // 投票类型
  created_at: string            // 创建时间
  updated_at: string            // 更新时间
}
```

### API响应格式

所有API响应遵循统一格式：

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true
  data: T
  pagination?: {  // 分页数据（列表接口）
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// 错误响应
interface ErrorResponse {
  success: false
  error: string
  details?: any  // 详细错误信息（可选）
}
```

---

## 错误处理

### 错误代码规范

| HTTP状态码 | 说明 | 常见场景 |
|-----------|------|---------|
| 200 OK | 请求成功 | GET/PUT/DELETE成功 |
| 201 Created | 资源创建成功 | POST创建回复成功 |
| 400 Bad Request | 请求参数错误 | 缺少必填字段、参数格式错误 |
| 401 Unauthorized | 未认证 | 未登录或token过期 |
| 403 Forbidden | 无权限 | 非作者尝试编辑回复 |
| 404 Not Found | 资源不存在 | 帖子/回复不存在 |
| 500 Internal Server Error | 服务器错误 | 数据库错误、未预期的异常 |

### 错误响应示例

**400 Bad Request - 内容为空**:
```json
{
  "success": false,
  "error": "Reply content cannot be empty"
}
```

**401 Unauthorized - 未登录**:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden - 无权限**:
```json
{
  "success": false,
  "error": "Permission denied: Only the author, moderator, or admin can edit this reply"
}
```

**404 Not Found - 资源不存在**:
```json
{
  "success": false,
  "error": "Thread not found or has been deleted"
}
```

**400 Bad Request - 嵌套回复错误**:
```json
{
  "success": false,
  "error": "Parent reply does not belong to this thread"
}
```

---

## 认证与权限

### 认证方式

所有需要认证的端点使用 **Bearer Token** 方式：

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Token通过 Supabase Auth 获取，有效期为24小时。

### 权限矩阵

| 操作 | 游客 | 登录用户 | 作者 | 版主 | 管理员 |
|------|------|----------|------|------|--------|
| 查看回复列表 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 创建回复 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 编辑自己的回复 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 编辑他人回复 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 删除自己的回复 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 删除他人回复 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 投票 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 标记最佳答案 | ❌ | ❌ | ✅* | ✅ | ✅ |

*仅帖子作者可标记最佳答案

---

## 最佳实践

### 1. 分页查询

**推荐**：始终使用分页，避免一次性加载所有回复
```javascript
// ✅ 好的做法
const response = await fetch('/api/forum/threads/123/replies?page=1&limit=20')

// ❌ 不推荐
const response = await fetch('/api/forum/threads/123/replies')  // 可能返回上千条
```

### 2. 嵌套回复加载策略

**推荐**：按需加载子回复，而不是一次性加载整个树
```javascript
// ✅ 好的做法：先加载顶级回复
const topLevelReplies = await fetch('/api/forum/threads/123/replies?page=1')

// 点击"展开回复"时再加载子回复
const childReplies = await fetch('/api/forum/threads/123/replies?parent_id=456')

// ❌ 不推荐：一次性加载整个树（性能差）
const allReplies = await fetch('/api/forum/threads/123/replies?include_nested=true')
```

### 3. 乐观UI更新

**推荐**：投票和创建回复时使用乐观更新提升用户体验
```javascript
// ✅ 好的做法：先更新UI，再发送请求
function handleUpvote(replyId) {
  // 1. 立即更新UI（乐观更新）
  setReplies(prev => prev.map(r =>
    r.id === replyId
      ? { ...r, upvote_count: r.upvote_count + 1, user_vote: 'upvote' }
      : r
  ))

  // 2. 发送API请求
  fetch('/api/forum/votes', {
    method: 'POST',
    body: JSON.stringify({ target_type: 'reply', target_id: replyId, vote_type: 'upvote' })
  })
  .catch(err => {
    // 3. 失败时回滚UI
    setReplies(prev => prev.map(r =>
      r.id === replyId
        ? { ...r, upvote_count: r.upvote_count - 1, user_vote: null }
        : r
    ))
  })
}
```

### 4. 内容验证

**推荐**：前端和后端都进行验证
```javascript
// ✅ 好的做法：前端先验证
function validateReplyContent(content) {
  if (!content.trim()) {
    return { valid: false, error: '回复内容不能为空' }
  }
  if (content.length > 10000) {
    return { valid: false, error: '回复内容不能超过10000字符' }
  }
  return { valid: true }
}

// 后端同样验证（防止绕过前端）
```

### 5. 错误处理

**推荐**：区分不同类型的错误，给用户明确提示
```javascript
// ✅ 好的做法
async function createReply(content) {
  try {
    const res = await fetch('/api/forum/threads/123/replies', {
      method: 'POST',
      body: JSON.stringify({ content })
    })

    if (!res.ok) {
      const error = await res.json()

      // 根据错误类型给不同提示
      if (res.status === 401) {
        showToast('请先登录')
        redirectToLogin()
      } else if (res.status === 403) {
        showToast('该帖子已锁定，无法回复')
      } else if (res.status === 400) {
        showToast(error.error || '回复内容有误')
      } else {
        showToast('回复失败，请稍后重试')
      }

      return
    }

    const data = await res.json()
    showToast('回复成功')
    return data
  } catch (err) {
    showToast('网络错误，请检查连接')
  }
}
```

### 6. 防抖处理

**推荐**：投票按钮使用防抖，避免重复点击
```javascript
// ✅ 好的做法
import { debounce } from 'lodash'

const handleVote = debounce(async (replyId, voteType) => {
  await fetch('/api/forum/votes', {
    method: 'POST',
    body: JSON.stringify({ target_type: 'reply', target_id: replyId, vote_type: voteType })
  })
}, 300)  // 300ms内只执行一次
```

### 7. 缓存策略

**推荐**：使用SWR或React Query缓存回复列表
```javascript
// ✅ 好的做法（使用SWR）
import useSWR from 'swr'

function ThreadDetail({ threadId }) {
  const { data, error, mutate } = useSWR(
    `/api/forum/threads/${threadId}/replies?page=1&limit=20`,
    fetcher,
    {
      revalidateOnFocus: false,  // 不在焦点时重新验证
      dedupingInterval: 60000,   // 60秒内不重复请求
    }
  )

  // 创建回复后手动更新缓存
  const handleCreateReply = async (content) => {
    const newReply = await createReply(threadId, content)
    mutate([...data.data, newReply], false)  // 乐观更新，不重新验证
  }
}
```

---

## 代码示例

### 完整示例：React组件中使用回复API

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface Reply {
  id: string
  content: string
  author: {
    display_name: string
    avatar_url: string
  }
  upvote_count: number
  downvote_count: number
  user_vote: 'upvote' | 'downvote' | null
  created_at: string
}

function ReplyList({ threadId }: { threadId: string }) {
  const { user } = useAuth()
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 获取回复列表
  useEffect(() => {
    const fetchReplies = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/forum/threads/${threadId}/replies?page=${page}&limit=20&sort=oldest`
        )
        const data = await res.json()

        if (data.success) {
          setReplies(data.data)
          setTotalPages(data.pagination.total_pages)
        }
      } catch (err) {
        console.error('获取回复失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReplies()
  }, [threadId, page])

  // 创建回复
  const handleCreateReply = async (content: string) => {
    if (!user) {
      alert('请先登录')
      return
    }

    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ content })
      })

      const data = await res.json()

      if (data.success) {
        // 乐观更新：将新回复添加到列表
        setReplies(prev => [...prev, data.data])
        alert('回复成功')
      } else {
        alert(data.error || '回复失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  // 投票
  const handleVote = async (replyId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      alert('请先登录')
      return
    }

    // 乐观更新
    setReplies(prev => prev.map(reply => {
      if (reply.id !== replyId) return reply

      const wasUpvoted = reply.user_vote === 'upvote'
      const wasDownvoted = reply.user_vote === 'downvote'
      const isUpvote = voteType === 'upvote'

      // 计算新的投票数
      let upvote_count = reply.upvote_count
      let downvote_count = reply.downvote_count
      let user_vote: 'upvote' | 'downvote' | null = voteType

      if (isUpvote) {
        if (wasUpvoted) {
          // 取消upvote
          upvote_count -= 1
          user_vote = null
        } else {
          // 新增upvote
          upvote_count += 1
          if (wasDownvoted) {
            downvote_count -= 1  // 移除downvote
          }
        }
      } else {
        if (wasDownvoted) {
          // 取消downvote
          downvote_count -= 1
          user_vote = null
        } else {
          // 新增downvote
          downvote_count += 1
          if (wasUpvoted) {
            upvote_count -= 1  // 移除upvote
          }
        }
      }

      return { ...reply, upvote_count, downvote_count, user_vote }
    }))

    // 发送API请求
    try {
      const res = await fetch('/api/forum/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          reply_id: replyId,
          vote_type: voteType
        })
      })

      const data = await res.json()

      if (!data.success) {
        // 失败时重新获取数据
        const res = await fetch(`/api/forum/threads/${threadId}/replies?page=${page}`)
        const freshData = await res.json()
        setReplies(freshData.data)
      }
    } catch (err) {
      // 网络错误时重新获取数据
      const res = await fetch(`/api/forum/threads/${threadId}/replies?page=${page}`)
      const freshData = await res.json()
      setReplies(freshData.data)
    }
  }

  // 编辑回复
  const handleEditReply = async (replyId: string, newContent: string) => {
    if (!user) return

    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ content: newContent })
      })

      const data = await res.json()

      if (data.success) {
        // 更新本地状态
        setReplies(prev => prev.map(reply =>
          reply.id === replyId
            ? { ...reply, content: data.data.content, updated_at: data.data.updated_at }
            : reply
        ))
        alert('更新成功')
      } else {
        alert(data.error || '更新失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  // 删除回复
  const handleDeleteReply = async (replyId: string) => {
    if (!user) return
    if (!confirm('确定要删除这条回复吗？')) return

    try {
      const res = await fetch(`/api/forum/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })

      const data = await res.json()

      if (data.success) {
        // 从列表中移除
        setReplies(prev => prev.filter(reply => reply.id !== replyId))
        alert('删除成功')
      } else {
        alert(data.error || '删除失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  return (
    <div>
      {/* 回复列表 */}
      {loading ? (
        <p>加载中...</p>
      ) : (
        replies.map(reply => (
          <div key={reply.id} className="border-b py-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={reply.author.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              <span className="font-semibold">{reply.author.display_name}</span>
              <span className="text-sm text-gray-500">
                {new Date(reply.created_at).toLocaleString()}
              </span>
            </div>

            <p className="mb-3">{reply.content}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleVote(reply.id, 'upvote')}
                className={reply.user_vote === 'upvote' ? 'text-blue-600' : ''}
              >
                👍 {reply.upvote_count}
              </button>

              <button
                onClick={() => handleVote(reply.id, 'downvote')}
                className={reply.user_vote === 'downvote' ? 'text-red-600' : ''}
              >
                👎 {reply.downvote_count}
              </button>

              {user && reply.author.id === user.id && (
                <>
                  <button onClick={() => handleEditReply(reply.id, prompt('新内容:') || '')}>
                    编辑
                  </button>
                  <button onClick={() => handleDeleteReply(reply.id)}>
                    删除
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </button>
          <span>第 {page} / {totalPages} 页</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

export default ReplyList
```

---

## 附录

### A. 相关数据库表结构

```sql
-- 回复表
CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES forum_replies(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 10000),
  is_accepted_answer BOOLEAN DEFAULT FALSE,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 投票表
CREATE TABLE forum_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 每个用户对每个目标只能有一个投票
  UNIQUE(user_id, target_type, target_id)
);

-- 索引
CREATE INDEX idx_replies_thread_id ON forum_replies(thread_id);
CREATE INDEX idx_replies_parent_id ON forum_replies(parent_id);
CREATE INDEX idx_replies_user_id ON forum_replies(user_id);
CREATE INDEX idx_votes_user_target ON forum_votes(user_id, target_type, target_id);
CREATE INDEX idx_votes_target ON forum_votes(target_type, target_id);
```

### B. 常见问题

**Q: 为什么删除是软删除而不是硬删除？**
A: 软删除（设置deleted_at）可以保留数据用于审计和恢复，同时避免破坏回复树结构（嵌套回复的父节点）。

**Q: 如何限制回复嵌套层级？**
A: 目前API不限制嵌套层级，前端UI可以限制显示深度（例如只显示2-3层）。

**Q: 投票是否匿名？**
A: 投票记录在数据库中与user_id关联，但前端不会公开显示谁投了什么票（仅显示总数）。

**Q: 如何防止投票刷票？**
A:
1. 每个用户对每个目标只能有一个投票（数据库唯一约束）
2. 需要登录才能投票
3. 后续可增加限流（例如每分钟最多10次投票）

**Q: 回复内容支持哪些Markdown语法？**
A: 支持标准Markdown语法，包括：标题、加粗、斜体、列表、链接、图片、代码块等。

---

**文档结束**

如有问题或建议，请联系开发团队或提交 Issue。

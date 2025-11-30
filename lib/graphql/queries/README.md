# GraphQL Query Examples

**艹！这个目录包含 GraphQL API 的所有示例查询文件！**

## 📁 文件列表

### `01-basic-queries.graphql`
最基础的测试查询，包括：
- `hello` - Hello World 测试
- `currentTime` - 服务器时间查询
- 组合查询示例

### `02-user-queries.graphql`
用户相关查询，包括：
- `me` - 获取当前登录用户信息（需认证）
- `user(id)` - 根据 UUID 获取用户信息
- 用户社交媒体链接查询
- 最小化用户信息查询

### `03-blog-queries.graphql`
博客文章查询，包括：
- `blogPosts` - 博客文章列表（支持状态筛选和分页）
- `blogPost(id)` - 单个博客文章详情
- 最新文章查询
- 草稿文章查询（需要作者权限）

### `04-relay-pagination.graphql`
Relay-style Cursor 分页示例，包括：
- `blogPostsConnection` - 基础 Relay 分页
- 加载下一页（`after` cursor）
- 加载上一页（`before` cursor）
- 按浏览量/点赞数排序的分页

### `05-mutations.graphql`
Mutation 变更操作示例，包括：
- `echo` - 测试 Mutation（回显消息）

### `06-advanced-examples.graphql`
高级查询技巧，包括：
- 组合查询（同时获取多个资源）
- 别名（Aliases）使用
- 片段（Fragments）复用
- 条件查询（`@include`, `@skip`）
- 深度嵌套查询示例
- 性能优化最佳实践

## 🚀 使用方式

### 方式 1：在 GraphQL Playground 中使用

1. 访问 `http://localhost:3000/graphql-playground`
2. 复制任意 `.graphql` 文件中的查询
3. 粘贴到左侧编辑器中
4. 点击 ▶️ 按钮执行查询

### 方式 2：在代码中使用

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

// 读取查询文件
const query = readFileSync(
  join(process.cwd(), 'lib/graphql/queries/02-user-queries.graphql'),
  'utf-8'
)

// 执行查询
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // 如果需要认证
  },
  body: JSON.stringify({ query })
})
```

### 方式 3：使用 GraphQL Code Generator

配置 `codegen.yml` 后可以自动生成 TypeScript 类型：

```yaml
schema: http://localhost:3000/api/graphql
documents: 'lib/graphql/queries/**/*.graphql'
generates:
  lib/graphql/generated/types.ts:
    plugins:
      - typescript
      - typescript-operations
```

## 📖 相关文档

- [GraphQL API 完整文档](../../docs/GRAPHQL_API.md)
- [GraphQL Playground](/graphql-playground)
- [GraphQL Endpoint](/api/graphql)

## ⚠️ 注意事项

1. **认证要求**
   - `me` 查询需要认证（登录后自动携带 Cookie）
   - 未登录用户只能查看 `published` 状态的博客文章
   - 草稿文章仅作者本人可见

2. **速率限制**
   - FREE 用户：100 次/分钟
   - BASIC 用户：500 次/分钟
   - PRO 用户：2000 次/分钟
   - MAX 用户：5000 次/分钟
   - ADMIN 用户：10000 次/分钟

3. **查询复杂度**
   - 最大复杂度：1000
   - 最大深度：5 层
   - 避免过度嵌套查询

4. **性能优化**
   - 仅查询必需的字段（避免查询所有字段）
   - 使用 Relay 分页代替 offset 分页（大数据量场景）
   - 利用 DataLoader 自动优化 N+1 查询

## 🔧 开发工具

推荐使用以下工具：

- **Apollo Sandbox** - 交互式 GraphQL 查询界面
- **GraphQL Playground** - 经典 GraphQL IDE
- **GraphQL Code Generator** - 自动生成 TypeScript 类型
- **GraphQL Inspector** - Schema 变更检测

---

**艹！有问题就翻文档，别瞎猜！**

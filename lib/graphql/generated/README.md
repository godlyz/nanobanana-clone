# GraphQL Generated Types

**艹！这个目录包含自动生成的 TypeScript 类型定义，享受类型安全的快感吧！**

## 📁 文件说明

### `types.ts` (40KB)
包含所有 GraphQL Schema 的 TypeScript 类型定义：

- **基础类型**: `BlogPost`, `User`, `BlogPostConnection`, `PageInfo` 等
- **Query 类型**: `GetMeQuery`, `GetBlogPostsQuery`, `GetUserQuery` 等
- **Mutation 类型**: `EchoMutation` 等
- **Fragment 类型**: `UserBasicInfoFragment`, `BlogPostPreviewFragment` 等
- **Variables 类型**: `GetBlogPostVariables`, `GetUserVariables` 等

### `documents.ts` (59KB)
包含 Typed Document Nodes，适用于：

- **Apollo Client**: 使用 `useQuery`, `useMutation` 时自动类型推断
- **Urql**: 使用 `useQuery`, `useMutation` 时自动类型推断
- **graphql-request**: 使用 `request()` 时提供完整类型安全

## 🚀 使用方式

### 方式 1：直接导入类型（适用于任何 GraphQL 客户端）

```typescript
import { GetMeQuery, GetBlogPostsQuery, User, BlogPost } from '@/lib/graphql/generated/types'

// 使用类型注解
const handleUser = (user: User) => {
  console.log(user.displayName, user.email)
}

// 使用查询结果类型
const handleData = (data: GetMeQuery) => {
  if (data.me) {
    console.log(data.me.id, data.me.email)
  }
}
```

### 方式 2：使用 Typed Document Nodes（推荐 - 类型自动推断）

```typescript
import { GetMeDocument, GetBlogPostsDocument } from '@/lib/graphql/generated/documents'
import { useQuery } from '@apollo/client'

// Apollo Client 自动推断类型
function MyComponent() {
  const { data, loading, error } = useQuery(GetMeDocument)

  // data 已经自动推断为 GetMeQuery | undefined
  if (data?.me) {
    console.log(data.me.id)  // ✅ 完美类型推断
  }

  return null
}
```

### 方式 3：使用 graphql-request SDK（自动生成的函数）

```typescript
import { getSdk } from '@/lib/graphql/generated/types'
import { GraphQLClient } from 'graphql-request'

const client = new GraphQLClient('http://localhost:3000/api/graphql')
const sdk = getSdk(client)

// 调用自动生成的方法
async function fetchData() {
  const { me } = await sdk.GetMe()
  console.log(me?.email)  // ✅ 完美类型推断

  const { blogPosts } = await sdk.GetBlogPosts({ limit: 10, offset: 0 })
  console.log(blogPosts?.length)  // ✅ 完美类型推断
}
```

## 🔄 重新生成类型

当 GraphQL Schema 或查询文件发生变化时，运行以下命令重新生成类型：

```bash
# 一次性生成
pnpm codegen

# 监听模式（开发时自动重新生成）
pnpm codegen:watch

# 仅检查是否需要重新生成（不修改文件）
pnpm codegen:check
```

## ⚙️ 配置文件

类型生成配置位于项目根目录的 `codegen.yml` 文件。

**关键配置：**

- **Schema 来源**: `lib/graphql/schema.graphql`（本地导出的 schema）
- **Documents 来源**: `lib/graphql/queries/**/*.graphql`（示例查询文件）
- **输出目录**: `lib/graphql/generated/`
- **生成插件**:
  - `@graphql-codegen/typescript` - 基础类型
  - `@graphql-codegen/typescript-operations` - 查询操作类型
  - `@graphql-codegen/typescript-graphql-request` - graphql-request SDK
  - `@graphql-codegen/typed-document-node` - Typed Document Nodes

## 📖 相关文档

- [GraphQL Queries 示例](../queries/README.md)
- [GraphQL API 文档](../../../docs/GRAPHQL_API.md)
- [GraphQL Playground](/graphql-playground)

## ⚠️ 注意事项

1. **不要手动修改生成的文件** - 所有修改会在下次运行 `pnpm codegen` 时被覆盖
2. **提交到版本控制** - 建议将生成的文件提交到 Git，方便团队协作
3. **定期更新** - Schema 或查询文件变化后记得重新生成类型
4. **查看生成日志** - 如果类型生成失败，检查 Schema 和查询文件是否有语法错误

## 🎯 类型覆盖范围

当前生成的类型涵盖：

- ✅ 所有 GraphQL Schema 类型
- ✅ 所有查询（Query）操作
- ✅ 所有变更（Mutation）操作
- ✅ 所有片段（Fragment）定义
- ✅ Relay 分页相关类型（Edge, Node, PageInfo）
- ✅ 输入类型和变量类型

---

**艹！有问题就翻文档，别瞎猜！享受类型安全的快感吧！**

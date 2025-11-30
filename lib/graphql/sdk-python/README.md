# 艹！Nano Banana Python SDK

**官方 Nano Banana GraphQL SDK for Python**

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📋 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [错误处理](#错误处理)
- [重试机制](#重试机制)
- [日志记录](#日志记录)
- [高级用法](#高级用法)
- [示例代码](#示例代码)

---

## 功能特性

✅ **类型安全** - 完整的 Python Type Hints 支持
✅ **智能错误处理** - 7 种错误分类，精确定位问题
✅ **自动重试** - 指数退避 + 随机抖动，网络抽风不用怕
✅ **Token 管理** - 便捷的认证 token 管理
✅ **结构化日志** - 详细的请求/响应/重试日志
✅ **同步/异步** - 同时支持同步和异步调用
✅ **上下文管理器** - 自动资源管理

---

## 安装

### 使用 pip

```bash
# 基础安装（推荐）
pip install gql[requests,aiohttp]

# 或者安装完整版（包含所有可选依赖）
pip install gql[all]
```

### 从源码安装

```bash
cd lib/graphql/sdk-python
pip install -e .
```

### 依赖要求

- Python 3.8+
- gql >= 3.4.0
- aiohttp >= 3.8.0
- requests >= 2.28.0

---

## 快速开始

### 1. 创建 SDK 实例

```python
from nanobanana_sdk import create_sdk

# 方式 1: 使用便捷函数（推荐）
sdk = create_sdk(
    endpoint="https://api.nanobanana.com/api/graphql",
    token="your-auth-token-here"
)

# 方式 2: 使用配置对象
from nanobanana_sdk import GraphQLSDK, GraphQLSDKConfig, RetryConfig

config = GraphQLSDKConfig(
    endpoint="https://api.nanobanana.com/api/graphql",
    token="your-auth-token-here",
    timeout=60,
    enable_logging=True,
    log_level="INFO",
    retry_config=RetryConfig(
        enabled=True,
        max_attempts=3,
        initial_delay=1.0,
    )
)
sdk = GraphQLSDK(config)
```

### 2. 执行查询

```python
# 获取当前用户信息
result = sdk.query('''
    query GetMe {
        me {
            id
            email
            displayName
        }
    }
''')

print(result["me"])
# 输出: {'id': 'xxx', 'email': 'user@example.com', 'displayName': 'John'}
```

### 3. 执行变更

```python
# 创建博客文章
result = sdk.mutate('''
    mutation CreatePost($input: CreateBlogPostInput!) {
        createBlogPost(input: $input) {
            id
            title
            content
        }
    }
''', variables={
    "input": {
        "title": "我的第一篇文章",
        "content": "这是文章内容",
        "published": True
    }
})

print(result["createBlogPost"])
```

### 4. 异步调用

```python
import asyncio

async def main():
    # 异步查询
    result = await sdk.query_async('''
        query GetBlogPosts {
            blogPosts {
                nodes {
                    id
                    title
                }
            }
        }
    ''')

    print(result["blogPosts"]["nodes"])

# 运行异步函数
asyncio.run(main())
```

---

## API 文档

### GraphQLSDK

主要的 SDK 客户端类。

#### 构造函数

```python
GraphQLSDK(config: GraphQLSDKConfig)
```

**参数：**
- `config` - SDK 配置对象

#### 方法

##### `query(query: str, variables: Dict = None, operation_name: str = "Query") -> Any`

执行 GraphQL 查询（同步）。

**参数：**
- `query` - GraphQL 查询字符串
- `variables` - 查询变量（可选）
- `operation_name` - 操作名称（可选，用于日志）

**返回：** 查询结果字典

**抛出：** `GraphQLSDKError` 如果查询失败

---

##### `mutate(mutation: str, variables: Dict = None, operation_name: str = "Mutation") -> Any`

执行 GraphQL 变更（同步）。

**参数：**
- `mutation` - GraphQL 变更字符串
- `variables` - 变更变量（可选）
- `operation_name` - 操作名称（可选，用于日志）

**返回：** 变更结果字典

**抛出：** `GraphQLSDKError` 如果变更失败

---

##### `query_async(query: str, variables: Dict = None, operation_name: str = "QueryAsync") -> Any`

执行 GraphQL 查询（异步）。

**参数：** 同 `query()`

**返回：** 查询结果字典（awaitable）

---

##### `mutate_async(mutation: str, variables: Dict = None, operation_name: str = "MutationAsync") -> Any`

执行 GraphQL 变更（异步）。

**参数：** 同 `mutate()`

**返回：** 变更结果字典（awaitable）

---

##### `set_token(token: str | None)`

更新认证 token。

**参数：**
- `token` - 新的 token（None 表示移除 token）

---

##### `update_headers(headers: Dict[str, str])`

更新自定义请求头。

**参数：**
- `headers` - 要更新的请求头字典

---

##### `close()`

关闭客户端，释放资源。

---

### GraphQLSDKConfig

SDK 配置类。

**字段：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `endpoint` | `str` | 必填 | GraphQL API 端点 URL |
| `token` | `str` | `None` | 认证 token |
| `headers` | `Dict[str, str]` | `{}` | 自定义请求头 |
| `timeout` | `int` | `30` | 超时时间（秒） |
| `retry_config` | `RetryConfig` | `None` | 重试配置 |
| `enable_logging` | `bool` | `True` | 是否启用日志 |
| `log_level` | `str` | `"INFO"` | 日志级别 |

---

## 错误处理

### 错误类型

SDK 将错误分类为 7 种类型：

| 错误类型 | 说明 | 是否可重试 |
|----------|------|-----------|
| `NETWORK_ERROR` | 网络连接失败 | ✅ 是 |
| `AUTHENTICATION_ERROR` | 认证失败（token 过期/无效） | ❌ 否 |
| `AUTHORIZATION_ERROR` | 权限不足 | ❌ 否 |
| `VALIDATION_ERROR` | 输入验证失败 | ❌ 否 |
| `RATE_LIMIT_ERROR` | 请求频率限制 | ✅ 是 |
| `SERVER_ERROR` | 服务器内部错误 | ✅ 是 |
| `UNKNOWN_ERROR` | 未知错误 | ❌ 否 |

### 错误处理示例

```python
from nanobanana_sdk import (
    create_sdk,
    GraphQLSDKError,
    GraphQLErrorType
)

sdk = create_sdk(endpoint="...", token="...")

try:
    result = sdk.query('''
        query GetMe {
            me { id email }
        }
    ''')
except GraphQLSDKError as error:
    # 获取错误类型
    print(f"错误类型: {error.error_type}")

    # 获取错误消息
    print(f"错误消息: {error.message}")

    # 判断是否可重试
    if error.is_retryable():
        print("这个错误可以重试")

    # 根据错误类型处理
    if error.error_type == GraphQLErrorType.AUTHENTICATION_ERROR:
        # 重新登录
        print("需要重新登录")
    elif error.error_type == GraphQLErrorType.NETWORK_ERROR:
        # 检查网络
        print("网络连接失败，请检查网络")

    # 获取详细信息
    print(f"操作名称: {error.operation_name}")
    print(f"GraphQL 错误: {error.graphql_errors}")
```

---

## 重试机制

### 配置重试

```python
from nanobanana_sdk import create_sdk, RetryConfig

sdk = create_sdk(
    endpoint="...",
    token="...",
    retry_config=RetryConfig(
        enabled=True,           # 启用重试
        max_attempts=5,         # 最大尝试次数（包括第一次）
        initial_delay=1.0,      # 初始延迟（秒）
        max_delay=30.0,         # 最大延迟（秒）
        exponential_base=2.0,   # 指数退避基数
        jitter=True,            # 添加随机抖动
    )
)
```

### 重试策略

SDK 使用 **指数退避 + 随机抖动** 算法：

```
延迟时间 = min(initial_delay * (exponential_base ^ attempt), max_delay) * jitter_factor

其中 jitter_factor 在 0.5 到 1.5 之间随机
```

**示例延迟序列（initial_delay=1, exponential_base=2）：**
- 第 1 次失败后：1s × (0.5~1.5) = 0.5~1.5s
- 第 2 次失败后：2s × (0.5~1.5) = 1~3s
- 第 3 次失败后：4s × (0.5~1.5) = 2~6s
- 第 4 次失败后：8s × (0.5~1.5) = 4~12s

### 自动重试的错误类型

仅以下错误类型会自动重试：
- ✅ `NETWORK_ERROR` - 网络连接失败
- ✅ `RATE_LIMIT_ERROR` - 请求频率限制
- ✅ `SERVER_ERROR` - 服务器内部错误

其他错误类型（认证、权限、验证错误等）**不会自动重试**。

---

## 日志记录

### 启用/禁用日志

```python
from nanobanana_sdk import create_sdk, set_log_level, enable_logging
import logging

# 方式 1: 创建 SDK 时配置
sdk = create_sdk(
    endpoint="...",
    enable_logging=True,
    log_level="DEBUG"
)

# 方式 2: 使用全局函数
enable_logging(True)
set_log_level(logging.DEBUG)
```

### 日志级别

- `DEBUG` - 详细的调试信息（包含请求/响应详情）
- `INFO` - 一般信息（请求开始/成功/失败）
- `WARNING` - 警告信息（重试）
- `ERROR` - 错误信息
- `CRITICAL` - 严重错误

### 日志输出示例

```
[2025-11-28 10:30:15] [nanobanana_sdk] [INFO] SDK 初始化完成: endpoint=https://api.nanobanana.com/api/graphql
[2025-11-28 10:30:16] [nanobanana_sdk] [INFO] 发起请求: GetMe
[2025-11-28 10:30:16] [nanobanana_sdk] [INFO] 请求成功: GetMe (145.23ms)
```

---

## 高级用法

### 使用上下文管理器

```python
with create_sdk(endpoint="...", token="...") as sdk:
    result = sdk.query("query GetMe { me { id } }")
    # SDK 会在退出时自动关闭连接
```

### 动态更新 Token

```python
sdk = create_sdk(endpoint="...", token="old-token")

# 执行一些操作
result = sdk.query("...")

# 更新 token（例如 token 刷新后）
sdk.set_token("new-token")

# 继续使用新 token
result = sdk.query("...")
```

### 自定义请求头

```python
sdk = create_sdk(
    endpoint="...",
    token="...",
    headers={
        "X-Custom-Header": "custom-value",
        "X-Request-ID": "request-123"
    }
)

# 或者动态更新
sdk.update_headers({
    "X-Request-ID": "request-456"
})
```

### 禁用重试（变更操作）

```python
# 变更操作默认不重试
# 如果需要重试，可以手动配置
sdk = create_sdk(
    endpoint="...",
    retry_config=RetryConfig(enabled=False)  # 完全禁用重试
)
```

---

## 示例代码

### 示例 1: 获取用户信息

```python
from nanobanana_sdk import create_sdk

sdk = create_sdk(
    endpoint="https://api.nanobanana.com/api/graphql",
    token="your-token"
)

result = sdk.query('''
    query GetMe {
        me {
            id
            email
            displayName
            profile {
                avatar
                bio
            }
        }
    }
''')

user = result["me"]
print(f"用户: {user['displayName']}")
print(f"邮箱: {user['email']}")
```

### 示例 2: 分页查询博客文章

```python
def get_all_blog_posts(sdk):
    """获取所有博客文章（分页）"""
    all_posts = []
    offset = 0
    limit = 20

    while True:
        result = sdk.query('''
            query GetBlogPosts($limit: Int!, $offset: Int!) {
                blogPosts(limit: $limit, offset: $offset) {
                    nodes {
                        id
                        title
                        createdAt
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
        ''', variables={"limit": limit, "offset": offset})

        posts = result["blogPosts"]["nodes"]
        all_posts.extend(posts)

        if not result["blogPosts"]["pageInfo"]["hasNextPage"]:
            break

        offset += limit

    return all_posts

# 使用
sdk = create_sdk(endpoint="...", token="...")
posts = get_all_blog_posts(sdk)
print(f"共获取 {len(posts)} 篇文章")
```

### 示例 3: 异步批量操作

```python
import asyncio
from nanobanana_sdk import create_sdk

async def fetch_multiple_posts(sdk, post_ids):
    """异步批量获取文章"""
    tasks = []

    for post_id in post_ids:
        task = sdk.query_async('''
            query GetPost($id: ID!) {
                blogPost(id: $id) {
                    id
                    title
                    content
                }
            }
        ''', variables={"id": post_id})
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    return results

# 使用
async def main():
    sdk = create_sdk(endpoint="...", token="...")
    post_ids = ["id1", "id2", "id3", "id4", "id5"]

    posts = await fetch_multiple_posts(sdk, post_ids)

    for result in posts:
        post = result["blogPost"]
        print(f"标题: {post['title']}")

asyncio.run(main())
```

### 示例 4: 错误处理和重试

```python
from nanobanana_sdk import (
    create_sdk,
    GraphQLSDKError,
    GraphQLErrorType,
    RetryConfig
)

sdk = create_sdk(
    endpoint="...",
    token="...",
    retry_config=RetryConfig(
        max_attempts=5,
        initial_delay=2.0
    )
)

def safe_query(query_str, variables=None):
    """安全查询（带错误处理）"""
    try:
        return sdk.query(query_str, variables)
    except GraphQLSDKError as error:
        # 根据错误类型处理
        if error.error_type == GraphQLErrorType.AUTHENTICATION_ERROR:
            print("认证失败，请重新登录")
            # 可以在这里触发重新登录流程
            return None

        elif error.error_type == GraphQLErrorType.NETWORK_ERROR:
            print("网络错误，所有重试都失败了")
            return None

        elif error.error_type == GraphQLErrorType.VALIDATION_ERROR:
            print(f"参数错误: {error.message}")
            return None

        else:
            print(f"未知错误: {error.message}")
            return None

# 使用
result = safe_query('''
    query GetMe { me { id email } }
''')

if result:
    print(f"查询成功: {result}")
```

---

## 常见问题

### Q: 如何处理 token 过期？

A: 捕获 `AUTHENTICATION_ERROR` 错误，然后刷新 token：

```python
try:
    result = sdk.query("...")
except GraphQLSDKError as error:
    if error.error_type == GraphQLErrorType.AUTHENTICATION_ERROR:
        # 刷新 token
        new_token = refresh_token()
        sdk.set_token(new_token)

        # 重新执行
        result = sdk.query("...")
```

### Q: 为什么变更操作不自动重试？

A: 变更操作（mutation）可能会改变服务器状态，自动重试可能导致重复操作。如果需要重试，请在 `RetryConfig` 中明确配置。

### Q: 如何查看请求的详细日志？

A: 设置日志级别为 `DEBUG`：

```python
sdk = create_sdk(
    endpoint="...",
    log_level="DEBUG"
)
```

### Q: 支持哪些 Python 版本？

A: Python 3.8 及以上版本。

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 支持

- **文档**: https://docs.nanobanana.com
- **GitHub**: https://github.com/nanobanana/nanobanana-sdk-python
- **Issues**: https://github.com/nanobanana/nanobanana-sdk-python/issues

---

**艹！祝你用得tm顺利！有问题看日志或者提 Issue！** 🎉

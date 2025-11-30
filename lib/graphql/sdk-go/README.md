# 艹！Nano Banana GraphQL SDK for Go

> **官方 Go SDK**，让你tm轻松调用 Nano Banana GraphQL API！

[![Go Version](https://img.shields.io/badge/go-%3E%3D1.21-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 核心特性

- ✅ **类型安全** - 完整的Go类型定义
- ✅ **零外部依赖** - 仅使用Go标准库
- ✅ **智能错误分类** - 7种错误类型，精确定位问题
- ✅ **自动重试机制** - 指数退避 + 随机抖动
- ✅ **Context支持** - 完整的取消和超时控制
- ✅ **结构化日志** - JSON格式，敏感数据自动脱敏
- ✅ **Token管理** - 支持动态更新认证Token
- ✅ **生产就绪** - 经过充分测试和优化

---

## 📦 安装

```bash
go get github.com/nanobanana/nanobanana-sdk-go
```

---

## 🚀 快速开始

### 示例 1：基础查询

```go
package main

import (
    "context"
    "fmt"
    "log"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

func main() {
    // 创建SDK实例
    sdk, err := nanobanana.CreateSDK(
        "https://api.nanobanana.com/api/graphql",
        "your-token-here",
        nil, // 使用默认配置
    )
    if err != nil {
        log.Fatal(err)
    }

    // 执行查询
    ctx := context.Background()
    query := `
        query GetMe {
            me {
                id
                email
                displayName
            }
        }
    `

    data, err := sdk.Query(ctx, query, nil, "GetMe")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("查询结果: %s\n", string(data))
}
```

### 示例 2：带变量的查询 + 结构体解析

```go
package main

import (
    "context"
    "fmt"
    "log"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

// 定义响应结构体
type BlogPostsResponse struct {
    BlogPosts struct {
        Nodes []struct {
            ID        string `json:"id"`
            Title     string `json:"title"`
            Content   string `json:"content"`
            CreatedAt string `json:"createdAt"`
        } `json:"nodes"`
        TotalCount int `json:"totalCount"`
    } `json:"blogPosts"`
}

func main() {
    sdk, err := nanobanana.CreateSDK(
        "https://api.nanobanana.com/api/graphql",
        "your-token-here",
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    // 定义查询和变量
    query := `
        query GetBlogPosts($limit: Int!, $offset: Int!) {
            blogPosts(limit: $limit, offset: $offset) {
                nodes {
                    id
                    title
                    content
                    createdAt
                }
                totalCount
            }
        }
    `

    variables := map[string]interface{}{
        "limit":  10,
        "offset": 0,
    }

    // 解析到结构体
    var result BlogPostsResponse
    err = sdk.QueryWithStruct(context.Background(), query, variables, &result, "GetBlogPosts")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("共找到 %d 篇博客文章\n", result.BlogPosts.TotalCount)
    for i, post := range result.BlogPosts.Nodes {
        fmt.Printf("%d. %s (ID: %s)\n", i+1, post.Title, post.ID)
    }
}
```

### 示例 3：执行Mutation

```go
package main

import (
    "context"
    "fmt"
    "log"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

type CreatePostResponse struct {
    CreateBlogPost struct {
        Success bool   `json:"success"`
        Message string `json:"message"`
        Post    struct {
            ID    string `json:"id"`
            Title string `json:"title"`
        } `json:"post"`
    } `json:"createBlogPost"`
}

func main() {
    sdk, err := nanobanana.CreateSDK(
        "https://api.nanobanana.com/api/graphql",
        "your-token-here",
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    // 定义Mutation
    mutation := `
        mutation CreatePost($input: CreateBlogPostInput!) {
            createBlogPost(input: $input) {
                success
                message
                post {
                    id
                    title
                }
            }
        }
    `

    variables := map[string]interface{}{
        "input": map[string]interface{}{
            "title":   "我的第一篇博客",
            "content": "这是使用Go SDK创建的博客文章！",
        },
    }

    // 执行Mutation并解析结果
    var result CreatePostResponse
    err = sdk.MutateWithStruct(context.Background(), mutation, variables, &result, "CreatePost")
    if err != nil {
        log.Fatal(err)
    }

    if result.CreateBlogPost.Success {
        fmt.Printf("博客创建成功！ID: %s\n", result.CreateBlogPost.Post.ID)
    } else {
        fmt.Printf("博客创建失败：%s\n", result.CreateBlogPost.Message)
    }
}
```

### 示例 4：自定义配置（重试、超时、日志）

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

func main() {
    // 创建自定义配置
    config := &nanobanana.SDKConfig{
        Endpoint: "https://api.nanobanana.com/api/graphql",
        Token:    "your-token-here",
        Timeout:  60 * time.Second, // 60秒超时

        // 自定义重试配置
        RetryConfig: &nanobanana.RetryConfig{
            Enabled:         true,
            MaxAttempts:     5,                   // 最多重试5次
            InitialDelay:    2 * time.Second,     // 初始延迟2秒
            MaxDelay:        60 * time.Second,    // 最大延迟60秒
            ExponentialBase: 2.0,                 // 指数基数2（每次翻倍）
            Jitter:          true,                // 启用随机抖动
        },

        // 自定义Headers
        Headers: map[string]string{
            "X-Client-Version": "1.0.0",
        },

        // 日志配置
        EnableLogging: true,
        LogLevel:      nanobanana.LogLevelDebug, // DEBUG级别
    }

    sdk, err := nanobanana.NewSDK(config)
    if err != nil {
        log.Fatal(err)
    }

    // 使用Context设置超时
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // 执行查询
    query := `query { me { id email } }`
    data, err := sdk.Query(ctx, query, nil, "GetMe")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("查询结果: %s\n", string(data))
}
```

---

## 📚 完整API文档

### 创建SDK实例

#### 方式1：便捷函数（推荐）

```go
sdk, err := nanobanana.CreateSDK(
    endpoint string,      // GraphQL API端点
    token string,         // 认证Token
    options ...*SDKConfig, // 可选配置（可传nil使用默认配置）
)
```

#### 方式2：使用配置对象

```go
config := &nanobanana.SDKConfig{
    Endpoint:      "https://api.nanobanana.com/api/graphql",
    Token:         "your-token",
    Timeout:       30 * time.Second,
    RetryConfig:   nanobanana.DefaultRetryConfig(),
    EnableLogging: true,
    LogLevel:      nanobanana.LogLevelInfo,
    Headers:       map[string]string{},
}

sdk, err := nanobanana.NewSDK(config)
```

### 核心方法

#### Query - 执行GraphQL查询

```go
func (s *SDK) Query(
    ctx context.Context,            // Context对象（用于取消、超时）
    query string,                   // GraphQL查询字符串
    variables map[string]interface{}, // 查询变量（可为nil）
    operationName string,           // 操作名称（可为空字符串）
) (json.RawMessage, error)
```

#### QueryWithStruct - 查询并解析到结构体

```go
func (s *SDK) QueryWithStruct(
    ctx context.Context,
    query string,
    variables map[string]interface{},
    result interface{},             // 结果结构体指针
    operationName string,
) error
```

#### Mutate - 执行GraphQL Mutation

```go
func (s *SDK) Mutate(
    ctx context.Context,
    mutation string,                // GraphQL mutation字符串
    variables map[string]interface{},
    operationName string,
) (json.RawMessage, error)
```

#### MutateWithStruct - Mutation并解析到结构体

```go
func (s *SDK) MutateWithStruct(
    ctx context.Context,
    mutation string,
    variables map[string]interface{},
    result interface{},
    operationName string,
) error
```

#### SetToken - 更新认证Token

```go
func (s *SDK) SetToken(token string)
```

#### UpdateHeaders - 更新自定义Headers

```go
func (s *SDK) UpdateHeaders(headers map[string]string)
```

#### SetLogLevel - 设置日志级别

```go
func (s *SDK) SetLogLevel(level LogLevel)

// 日志级别
nanobanana.LogLevelDebug  // DEBUG - 最详细
nanobanana.LogLevelInfo   // INFO - 一般信息
nanobanana.LogLevelWarn   // WARN - 警告信息
nanobanana.LogLevelError  // ERROR - 错误信息
```

#### EnableLogging - 启用/禁用日志

```go
func (s *SDK) EnableLogging(enabled bool)
```

---

## 🔥 错误处理

### 7种错误类型

SDK会自动将所有错误分类为以下7种类型：

| 错误类型 | 说明 | 可重试 | 常见原因 |
|---------|------|-------|---------|
| `NETWORK_ERROR` | 网络连接错误 | ✅ | 网络超时、连接拒绝、DNS解析失败 |
| `AUTHENTICATION_ERROR` | 认证失败 | ❌ | Token无效、Token过期 |
| `AUTHORIZATION_ERROR` | 权限不足 | ❌ | 无权访问资源 |
| `VALIDATION_ERROR` | 请求参数验证失败 | ❌ | 参数格式错误、缺少必填字段 |
| `RATE_LIMIT_ERROR` | 请求频率超限 | ✅ | 触发限流 |
| `SERVER_ERROR` | 服务器内部错误 | ✅ | 500/502/503/504错误 |
| `UNKNOWN_ERROR` | 未知错误 | ❌ | 其他未分类错误 |

### 错误处理示例

```go
package main

import (
    "context"
    "fmt"
    "log"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

func main() {
    sdk, _ := nanobanana.CreateSDK("https://api.nanobanana.com/api/graphql", "your-token", nil)

    query := `query { me { id } }`
    _, err := sdk.Query(context.Background(), query, nil, "GetMe")

    if err != nil {
        // 类型断言为GraphQLSDKError
        if sdkErr, ok := err.(*nanobanana.GraphQLSDKError); ok {
            switch sdkErr.ErrorType {
            case nanobanana.AuthenticationError:
                fmt.Println("认证失败，请重新登录")
                // 处理认证错误...

            case nanobanana.NetworkError:
                fmt.Println("网络连接失败，请检查网络")
                // 处理网络错误...

            case nanobanana.RateLimitError:
                fmt.Println("请求太频繁，请稍后再试")
                // 处理限流错误...

            default:
                fmt.Printf("错误类型: %s, 消息: %s\n", sdkErr.ErrorType, sdkErr.Message)
            }

            // 检查是否可重试
            if sdkErr.IsRetryable() {
                fmt.Println("该错误可以重试")
            }

            // 获取完整错误信息（JSON格式）
            fmt.Println(sdkErr.ToJSON())
        } else {
            log.Fatal(err)
        }
    }
}
```

---

## 🔄 重试机制

SDK内置智能重试机制，自动处理网络抖动、限流和服务器临时错误。

### 重试策略

- **指数退避（Exponential Backoff）**：每次重试的延迟时间呈指数增长
- **随机抖动（Jitter）**：延迟时间增加0.5-1.5倍的随机因子，避免惊群效应
- **可重试错误**：仅对`NETWORK_ERROR`、`RATE_LIMIT_ERROR`、`SERVER_ERROR`重试

### 默认重试配置

```go
RetryConfig{
    Enabled:         true,              // 启用重试
    MaxAttempts:     3,                 // 最多尝试3次（包含首次）
    InitialDelay:    1 * time.Second,   // 初始延迟1秒
    MaxDelay:        30 * time.Second,  // 最大延迟30秒
    ExponentialBase: 2.0,               // 指数基数2（延迟每次翻倍）
    Jitter:          true,              // 启用随机抖动
}
```

### 重试延迟计算公式

```
delay = min(initialDelay * (exponentialBase ^ attempt), maxDelay) * random(0.5, 1.5)
```

示例延迟序列（initialDelay=1s, base=2.0, jitter启用）：
- 第1次重试：1s * 2^0 * random(0.5, 1.5) = 0.5s - 1.5s
- 第2次重试：1s * 2^1 * random(0.5, 1.5) = 1s - 3s
- 第3次重试：1s * 2^2 * random(0.5, 1.5) = 2s - 6s

### 自定义重试配置

```go
config := &nanobanana.SDKConfig{
    Endpoint: "https://api.nanobanana.com/api/graphql",
    Token:    "your-token",

    RetryConfig: &nanobanana.RetryConfig{
        Enabled:         true,
        MaxAttempts:     5,               // 最多重试5次
        InitialDelay:    2 * time.Second, // 初始延迟2秒
        MaxDelay:        60 * time.Second,
        ExponentialBase: 3.0,             // 指数基数3（延迟增长更快）
        Jitter:          true,
    },
}

sdk, _ := nanobanana.NewSDK(config)
```

---

## 📝 日志系统

### 日志格式

SDK使用结构化JSON日志，所有日志包含以下字段：

```json
{
  "timestamp": "2025-01-15T10:30:45Z",
  "level": "INFO",
  "logger": "nanobanana_sdk",
  "message": "发起GraphQL请求: GetMe",
  "type": "REQUEST",
  "operation_name": "GetMe",
  "variables": {...},
  "headers": {
    "Authorization": "***",
    "Content-Type": "application/json"
  }
}
```

### 敏感数据脱敏

以下HTTP headers会自动脱敏（值替换为 `***`）：
- `Authorization`
- `Cookie`
- `X-API-Key`
- `X-Auth-Token`

### 日志级别

```go
// 设置日志级别
sdk.SetLogLevel(nanobanana.LogLevelDebug)

// 禁用日志
sdk.EnableLogging(false)
```

### 日志类型

| 类型 | 说明 | 日志级别 |
|-----|------|---------|
| REQUEST | GraphQL请求 | INFO |
| RESPONSE | GraphQL响应 | INFO（成功）/ WARN（失败） |
| RETRY | 重试尝试 | WARN |
| ERROR | 错误详情 | ERROR |
| PERFORMANCE | 性能指标 | DEBUG |

---

## 🔐 认证与Token管理

### 方式1：创建时设置Token

```go
sdk, _ := nanobanana.CreateSDK(
    "https://api.nanobanana.com/api/graphql",
    "your-token-here",
    nil,
)
```

### 方式2：动态更新Token

```go
sdk, _ := nanobanana.CreateSDK("https://api.nanobanana.com/api/graphql", "", nil)

// 用户登录后获取新Token
newToken := "new-token-after-login"
sdk.SetToken(newToken)

// 继续使用SDK，会自动使用新Token
data, _ := sdk.Query(context.Background(), query, nil, "")
```

### Token刷新示例

```go
package main

import (
    "context"
    "fmt"
    "time"

    nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

func main() {
    sdk, _ := nanobanana.CreateSDK("https://api.nanobanana.com/api/graphql", "initial-token", nil)

    // 定期刷新Token（例如每小时）
    go func() {
        ticker := time.NewTicker(1 * time.Hour)
        defer ticker.Stop()

        for range ticker.C {
            newToken := refreshToken() // 调用你的Token刷新逻辑
            sdk.SetToken(newToken)
            fmt.Println("Token已刷新")
        }
    }()

    // 使用SDK执行查询...
}

func refreshToken() string {
    // 实现你的Token刷新逻辑
    return "new-refreshed-token"
}
```

---

## ⚙️ 高级用法

### Context超时控制

```go
// 设置30秒超时
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

data, err := sdk.Query(ctx, query, nil, "GetMe")
if err != nil {
    if ctx.Err() == context.DeadlineExceeded {
        fmt.Println("查询超时")
    }
}
```

### Context取消

```go
ctx, cancel := context.WithCancel(context.Background())

// 在另一个goroutine中执行查询
go func() {
    data, err := sdk.Query(ctx, query, nil, "GetMe")
    if err != nil {
        if ctx.Err() == context.Canceled {
            fmt.Println("查询被取消")
        }
    }
}()

// 5秒后取消查询
time.Sleep(5 * time.Second)
cancel()
```

### 自定义Headers

```go
// 方式1：创建时设置
config := &nanobanana.SDKConfig{
    Endpoint: "https://api.nanobanana.com/api/graphql",
    Headers: map[string]string{
        "X-Client-Version": "1.0.0",
        "X-Device-ID":      "device-123",
    },
}
sdk, _ := nanobanana.NewSDK(config)

// 方式2：动态更新
sdk.UpdateHeaders(map[string]string{
    "X-Request-ID": "req-456",
})
```

---

## 🆚 与其他SDK对比

| 特性 | Go SDK | TypeScript SDK | Python SDK |
|-----|--------|---------------|-----------|
| 类型安全 | ✅ 完整支持 | ✅ 完整支持 | ✅ Type Hints |
| 零外部依赖 | ✅ 是 | ❌ 依赖gql库 | ❌ 依赖gql库 |
| Context支持 | ✅ 原生支持 | ✅ AbortController | ❌ 无 |
| 并发安全 | ✅ 是 | ✅ 是 | ✅ 是 |
| 错误分类 | ✅ 7种类型 | ✅ 7种类型 | ✅ 7种类型 |
| 重试机制 | ✅ 是 | ✅ 是 | ✅ 是 |
| 日志系统 | ✅ 结构化JSON | ✅ 结构化JSON | ✅ 结构化JSON |
| 性能 | ⚡ 最快 | ⚡ 快 | ⚡ 中等 |

---

## 💡 常见问题（FAQ）

### Q1: 为什么选择零外部依赖？

**A:**
- ✅ 减少依赖冲突风险
- ✅ 更小的二进制文件大小
- ✅ 更快的编译速度
- ✅ 更好的安全性（无需审计第三方库）
- ✅ 更容易维护和升级

### Q2: 如何处理大量并发请求？

**A:** SDK是并发安全的，可以在多个goroutine中共享同一个SDK实例：

```go
sdk, _ := nanobanana.CreateSDK("https://api.nanobanana.com/api/graphql", "your-token", nil)

var wg sync.WaitGroup
for i := 0; i < 100; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        query := fmt.Sprintf(`query { user(id: %d) { name } }`, id)
        data, err := sdk.Query(context.Background(), query, nil, "GetUser")
        if err != nil {
            log.Printf("查询 %d 失败: %v", id, err)
        } else {
            log.Printf("查询 %d 成功: %s", id, string(data))
        }
    }(i)
}
wg.Wait()
```

### Q3: 如何禁用重试机制？

**A:** 设置 `RetryConfig.Enabled = false`：

```go
config := &nanobanana.SDKConfig{
    Endpoint: "https://api.nanobanana.com/api/graphql",
    Token:    "your-token",
    RetryConfig: &nanobanana.RetryConfig{
        Enabled: false, // 禁用重试
    },
}
sdk, _ := nanobanana.NewSDK(config)
```

### Q4: 日志输出到哪里？

**A:** 默认输出到 `stdout`。如果需要输出到文件或其他位置，可以使用 `io.MultiWriter`：

```go
// 注意：当前版本日志固定输出到stdout
// 如需自定义日志输出，建议通过重定向或日志采集工具实现
```

### Q5: 如何获取HTTP响应状态码？

**A:** 当发生错误时，`GraphQLSDKError.StatusCode` 字段包含HTTP状态码：

```go
_, err := sdk.Query(context.Background(), query, nil, "GetMe")
if err != nil {
    if sdkErr, ok := err.(*nanobanana.GraphQLSDKError); ok {
        fmt.Printf("HTTP状态码: %d\n", sdkErr.StatusCode)
    }
}
```

### Q6: 支持WebSocket订阅吗？

**A:** 当前版本不支持。GraphQL订阅（Subscriptions）将在未来版本中添加。

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

在提交PR前，请确保：
1. 代码通过 `go fmt` 格式化
2. 代码通过 `go vet` 检查
3. 添加了相应的测试用例
4. 更新了文档

---

## 📮 联系我们

- **官方网站**: https://nanobanana.com
- **文档**: https://docs.nanobanana.com
- **GitHub**: https://github.com/nanobanana/nanobanana-sdk-go
- **问题反馈**: https://github.com/nanobanana/nanobanana-sdk-go/issues

---

**艹！老王祝你用得tm顺利！有问题看日志或者去GitHub提Issue！** 🚀

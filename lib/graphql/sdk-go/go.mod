// 艹！Nano Banana GraphQL SDK for Go - 模块定义

module github.com/nanobanana/nanobanana-sdk-go

go 1.21

// 依赖说明：
// - 无外部依赖！SDK仅使用Go标准库
// - encoding/json - JSON序列化/反序列化
// - net/http - HTTP客户端
// - context - Context支持（取消、超时）
// - time - 时间处理
// - math - 数学计算（指数退避）
// - log - 日志输出

// 开发依赖（测试用）：
// require (
//     github.com/stretchr/testify v1.8.4 // 单元测试断言库
// )

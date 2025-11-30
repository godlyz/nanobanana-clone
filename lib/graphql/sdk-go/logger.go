// 艹！Nano Banana GraphQL SDK for Go - 日志模块
//
// 这个SB文件实现了结构化日志系统！
//
// 主要功能：
// - 结构化日志输出（JSON格式）
// - 多日志级别（DEBUG/INFO/WARN/ERROR）
// - 敏感数据脱敏（Authorization、Cookie等header）
// - 请求/响应日志
// - 重试日志
// - 性能指标记录

package nanobanana

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// LogLevel 日志级别
type LogLevel int

const (
	// LogLevelDebug DEBUG级别（最详细）
	LogLevelDebug LogLevel = iota
	// LogLevelInfo INFO级别（一般信息）
	LogLevelInfo
	// LogLevelWarn WARN级别（警告信息）
	LogLevelWarn
	// LogLevelError ERROR级别（错误信息）
	LogLevelError
)

// String 返回日志级别的字符串表示
func (l LogLevel) String() string {
	switch l {
	case LogLevelDebug:
		return "DEBUG"
	case LogLevelInfo:
		return "INFO"
	case LogLevelWarn:
		return "WARN"
	case LogLevelError:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// ParseLogLevel 解析日志级别字符串
func ParseLogLevel(level string) LogLevel {
	switch strings.ToUpper(level) {
	case "DEBUG":
		return LogLevelDebug
	case "INFO":
		return LogLevelInfo
	case "WARN", "WARNING":
		return LogLevelWarn
	case "ERROR":
		return LogLevelError
	default:
		return LogLevelInfo
	}
}

// SDKLogger SDK日志记录器
type SDKLogger struct {
	// name 日志记录器名称
	name string

	// level 当前日志级别
	level LogLevel

	// enabled 是否启用日志
	enabled bool

	// logger 底层logger
	logger *log.Logger
}

// NewSDKLogger 创建新的日志记录器
//
// 参数：
//   - name: 日志记录器名称（默认："nanobanana_sdk"）
//   - level: 日志级别（默认：INFO）
//   - enabled: 是否启用日志（默认：true）
//
// 返回：
//   - *SDKLogger: 日志记录器实例
func NewSDKLogger(name string, level LogLevel, enabled bool) *SDKLogger {
	if name == "" {
		name = "nanobanana_sdk"
	}

	return &SDKLogger{
		name:    name,
		level:   level,
		enabled: enabled,
		logger:  log.New(os.Stdout, "", 0), // 不使用默认前缀和标志
	}
}

// SetLevel 设置日志级别
func (l *SDKLogger) SetLevel(level LogLevel) {
	l.level = level
}

// SetEnabled 设置是否启用日志
func (l *SDKLogger) SetEnabled(enabled bool) {
	l.enabled = enabled
}

// IsEnabled 检查日志是否启用
func (l *SDKLogger) IsEnabled() bool {
	return l.enabled
}

// shouldLog 检查是否应该记录该级别的日志
func (l *SDKLogger) shouldLog(level LogLevel) bool {
	return l.enabled && level >= l.level
}

// log 记录日志（内部方法）
func (l *SDKLogger) log(level LogLevel, message string, fields map[string]interface{}) {
	if !l.shouldLog(level) {
		return
	}

	// 构建日志对象
	logData := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"level":     level.String(),
		"logger":    l.name,
		"message":   message,
	}

	// 合并额外字段
	for k, v := range fields {
		logData[k] = v
	}

	// JSON序列化
	jsonData, err := json.Marshal(logData)
	if err != nil {
		// 如果序列化失败，输出原始消息
		l.logger.Printf("[%s] %s (JSON marshal error: %v)", level.String(), message, err)
		return
	}

	// 输出JSON日志
	l.logger.Println(string(jsonData))
}

// Debug 记录DEBUG级别日志
func (l *SDKLogger) Debug(message string, fields map[string]interface{}) {
	l.log(LogLevelDebug, message, fields)
}

// Info 记录INFO级别日志
func (l *SDKLogger) Info(message string, fields map[string]interface{}) {
	l.log(LogLevelInfo, message, fields)
}

// Warn 记录WARN级别日志
func (l *SDKLogger) Warn(message string, fields map[string]interface{}) {
	l.log(LogLevelWarn, message, fields)
}

// Error 记录ERROR级别日志
func (l *SDKLogger) Error(message string, fields map[string]interface{}) {
	l.log(LogLevelError, message, fields)
}

// RedactHeaders 脱敏HTTP headers（隐藏敏感信息）
//
// 敏感header列表：
// - Authorization（认证token）
// - Cookie（会话cookie）
// - X-API-Key（API密钥）
// - X-Auth-Token（认证token）
//
// 参数：
//   - headers: 原始headers
//
// 返回：
//   - map[string]string: 脱敏后的headers
func RedactHeaders(headers map[string]string) map[string]string {
	if headers == nil {
		return nil
	}

	sensitiveKeys := []string{
		"authorization",
		"cookie",
		"x-api-key",
		"x-auth-token",
	}

	redacted := make(map[string]string)
	for k, v := range headers {
		keyLower := strings.ToLower(k)
		isSensitive := false

		for _, sensitive := range sensitiveKeys {
			if keyLower == sensitive {
				isSensitive = true
				break
			}
		}

		if isSensitive {
			redacted[k] = "***"
		} else {
			redacted[k] = v
		}
	}

	return redacted
}

// LogRequest 记录GraphQL请求日志
//
// 参数：
//   - operationName: 操作名称
//   - variables: 请求变量
//   - headers: 请求headers
func (l *SDKLogger) LogRequest(
	operationName string,
	variables map[string]interface{},
	headers map[string]string,
) {
	if !l.shouldLog(LogLevelInfo) {
		return
	}

	// 脱敏headers
	safeHeaders := RedactHeaders(headers)

	fields := map[string]interface{}{
		"type":           "REQUEST",
		"operation_name": operationName,
		"variables":      variables,
		"headers":        safeHeaders,
	}

	l.Info(fmt.Sprintf("发起GraphQL请求: %s", operationName), fields)
}

// LogResponse 记录GraphQL响应日志
//
// 参数：
//   - operationName: 操作名称
//   - durationMs: 请求耗时（毫秒）
//   - statusCode: HTTP状态码（可选，0表示无）
//   - hasError: 是否有错误
func (l *SDKLogger) LogResponse(
	operationName string,
	durationMs int64,
	statusCode int,
	hasError bool,
) {
	if !l.shouldLog(LogLevelInfo) {
		return
	}

	fields := map[string]interface{}{
		"type":           "RESPONSE",
		"operation_name": operationName,
		"duration_ms":    durationMs,
		"has_error":      hasError,
	}

	if statusCode > 0 {
		fields["status_code"] = statusCode
	}

	message := fmt.Sprintf("GraphQL请求完成: %s (耗时: %dms)", operationName, durationMs)
	if hasError {
		l.Warn(message, fields)
	} else {
		l.Info(message, fields)
	}
}

// LogRetry 记录重试日志
//
// 参数：
//   - operationName: 操作名称
//   - attempt: 当前尝试次数
//   - maxAttempts: 最大尝试次数
//   - err: 错误对象
//   - delayMs: 延迟时间（毫秒）
func (l *SDKLogger) LogRetry(
	operationName string,
	attempt int,
	maxAttempts int,
	err *GraphQLSDKError,
	delayMs int64,
) {
	if !l.shouldLog(LogLevelWarn) {
		return
	}

	fields := map[string]interface{}{
		"type":           "RETRY",
		"operation_name": operationName,
		"attempt":        attempt,
		"max_attempts":   maxAttempts,
		"error_type":     err.ErrorType,
		"error_message":  err.Message,
		"retry_delay_ms": delayMs,
	}

	l.Warn(fmt.Sprintf("请求失败，准备重试 (尝试 %d/%d)", attempt, maxAttempts), fields)
}

// LogError 记录错误日志（带完整错误信息）
//
// 参数：
//   - operationName: 操作名称
//   - err: 错误对象
func (l *SDKLogger) LogError(operationName string, err *GraphQLSDKError) {
	if !l.shouldLog(LogLevelError) {
		return
	}

	fields := map[string]interface{}{
		"type":           "ERROR",
		"operation_name": operationName,
		"error_type":     err.ErrorType,
		"error_message":  err.Message,
		"retryable":      err.Retryable,
		"timestamp":      err.Timestamp.Format(time.RFC3339),
	}

	if err.StatusCode > 0 {
		fields["status_code"] = err.StatusCode
	}

	if err.Variables != nil {
		fields["variables"] = err.Variables
	}

	if err.Extensions != nil {
		fields["extensions"] = err.Extensions
	}

	l.Error(fmt.Sprintf("GraphQL请求失败: %s", operationName), fields)
}

// LogPerformance 记录性能指标日志
//
// 参数：
//   - operationName: 操作名称
//   - metrics: 性能指标
func (l *SDKLogger) LogPerformance(operationName string, metrics map[string]interface{}) {
	if !l.shouldLog(LogLevelDebug) {
		return
	}

	fields := map[string]interface{}{
		"type":           "PERFORMANCE",
		"operation_name": operationName,
	}

	// 合并性能指标
	for k, v := range metrics {
		fields[k] = v
	}

	l.Debug(fmt.Sprintf("性能指标: %s", operationName), fields)
}

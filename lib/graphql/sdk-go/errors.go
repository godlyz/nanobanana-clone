// 艹！Nano Banana GraphQL SDK for Go - 错误处理模块
//
// 这个SB文件实现了智能错误分类和处理机制！
//
// 主要功能：
// - 7种错误类型分类（网络、认证、授权、验证、限流、服务器、未知）
// - 智能错误解析（基于关键词、HTTP状态码、GraphQL扩展）
// - 重试能力判断（网络、限流、服务器错误可重试）
// - 详细错误上下文（操作名、变量、原始错误、时间戳）

package nanobanana

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// GraphQLErrorType 定义7种错误类型
type GraphQLErrorType string

const (
	// NetworkError 网络连接错误（可重试）
	NetworkError GraphQLErrorType = "NETWORK_ERROR"

	// AuthenticationError 认证失败（401 - Token无效/过期）
	AuthenticationError GraphQLErrorType = "AUTHENTICATION_ERROR"

	// AuthorizationError 权限不足（403 - 无权访问资源）
	AuthorizationError GraphQLErrorType = "AUTHORIZATION_ERROR"

	// ValidationError 请求参数验证失败（400 - 参数格式/逻辑错误）
	ValidationError GraphQLErrorType = "VALIDATION_ERROR"

	// RateLimitError 请求频率超限（429 - 触发限流）
	RateLimitError GraphQLErrorType = "RATE_LIMIT_ERROR"

	// ServerError 服务器内部错误（500 - 服务端异常）
	ServerError GraphQLErrorType = "SERVER_ERROR"

	// UnknownError 未知错误（其他未分类错误）
	UnknownError GraphQLErrorType = "UNKNOWN_ERROR"
)

// GraphQLSDKError SDK错误结构体
type GraphQLSDKError struct {
	// ErrorType 错误类型
	ErrorType GraphQLErrorType `json:"error_type"`

	// Message 用户友好的错误消息
	Message string `json:"message"`

	// OriginalError 原始错误对象
	OriginalError error `json:"original_error,omitempty"`

	// OperationName GraphQL操作名称
	OperationName string `json:"operation_name,omitempty"`

	// Variables GraphQL变量
	Variables map[string]interface{} `json:"variables,omitempty"`

	// StatusCode HTTP状态码（如有）
	StatusCode int `json:"status_code,omitempty"`

	// Extensions GraphQL错误扩展信息
	Extensions map[string]interface{} `json:"extensions,omitempty"`

	// Timestamp 错误发生时间
	Timestamp time.Time `json:"timestamp"`

	// Retryable 是否可重试
	Retryable bool `json:"retryable"`
}

// Error 实现error接口
func (e *GraphQLSDKError) Error() string {
	return fmt.Sprintf("[%s] %s", e.ErrorType, e.Message)
}

// IsRetryable 判断错误是否可重试
//
// 可重试错误类型：
// - NETWORK_ERROR（网络问题）
// - RATE_LIMIT_ERROR（限流，等待后重试）
// - SERVER_ERROR（服务器异常，可能是临时问题）
func (e *GraphQLSDKError) IsRetryable() bool {
	return e.Retryable
}

// ToJSON 转换为JSON字符串（用于日志记录）
func (e *GraphQLSDKError) ToJSON() string {
	data, err := json.Marshal(e)
	if err != nil {
		return fmt.Sprintf(`{"error": "Failed to marshal error: %v"}`, err)
	}
	return string(data)
}

// ParseError 智能解析和分类错误
//
// 分类规则（优先级从高到低）：
// 1. HTTP状态码优先（401/403/429/500等）
// 2. 关键词匹配（network/timeout/unauthorized等）
// 3. GraphQL错误扩展（extensions.code）
// 4. 默认为UNKNOWN_ERROR
//
// 参数：
//   - err: 原始错误对象
//   - operationName: GraphQL操作名称
//   - variables: GraphQL变量
//   - statusCode: HTTP状态码（可选，0表示无）
//   - extensions: GraphQL错误扩展（可选）
//
// 返回：
//   - *GraphQLSDKError: 分类后的错误对象
func ParseError(
	err error,
	operationName string,
	variables map[string]interface{},
	statusCode int,
	extensions map[string]interface{},
) *GraphQLSDKError {
	if err == nil {
		return nil
	}

	errorStr := strings.ToLower(err.Error())
	var errorType GraphQLErrorType
	var message string
	var retryable bool

	// 1. 优先检查HTTP状态码
	if statusCode > 0 {
		switch statusCode {
		case http.StatusUnauthorized: // 401
			errorType = AuthenticationError
			message = "艹，认证失败！你的 token 过期或无效了，快tm去重新登录！"
			retryable = false

		case http.StatusForbidden: // 403
			errorType = AuthorizationError
			message = "艹，权限不足！你tm没有权限访问这个资源，去找管理员要权限！"
			retryable = false

		case http.StatusBadRequest: // 400
			errorType = ValidationError
			message = "艹，请求参数有问题！检查你tm传的参数是不是对的！"
			retryable = false

		case http.StatusTooManyRequests: // 429
			errorType = RateLimitError
			message = "艹，请求太频繁了！慢点tm调用，等会儿再试！"
			retryable = true

		case http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
			// 500, 502, 503, 504
			errorType = ServerError
			message = "艹，服务器出问题了！可能是临时的，等会儿再试试！"
			retryable = true

		default:
			// 其他状态码暂时归为未知错误
			errorType = UnknownError
			message = fmt.Sprintf("艹，遇到了未知错误（状态码: %d）！", statusCode)
			retryable = false
		}
	} else {
		// 2. 基于关键词匹配

		// 网络错误关键词
		networkKeywords := []string{"network", "connection", "timeout", "refused", "unreachable", "dns"}
		if containsAny(errorStr, networkKeywords) {
			errorType = NetworkError
			message = "艹，网络连接失败！检查你的tm网络连接是否正常。"
			retryable = true
		}

		// 认证错误关键词
		authKeywords := []string{"unauthorized", "token", "authentication", "login", "credential"}
		if errorType == "" && containsAny(errorStr, authKeywords) {
			errorType = AuthenticationError
			message = "艹，认证失败！你的 token 过期或无效了，快tm去重新登录！"
			retryable = false
		}

		// 授权错误关键词
		authzKeywords := []string{"forbidden", "permission", "access denied", "not allowed"}
		if errorType == "" && containsAny(errorStr, authzKeywords) {
			errorType = AuthorizationError
			message = "艹，权限不足！你tm没有权限访问这个资源，去找管理员要权限！"
			retryable = false
		}

		// 验证错误关键词
		validationKeywords := []string{"validation", "invalid", "required", "missing", "format", "schema"}
		if errorType == "" && containsAny(errorStr, validationKeywords) {
			errorType = ValidationError
			message = "艹，请求参数有问题！检查你tm传的参数是不是对的！"
			retryable = false
		}

		// 限流错误关键词
		rateLimitKeywords := []string{"rate limit", "too many requests", "quota exceeded", "throttle"}
		if errorType == "" && containsAny(errorStr, rateLimitKeywords) {
			errorType = RateLimitError
			message = "艹，请求太频繁了！慢点tm调用，等会儿再试！"
			retryable = true
		}

		// 服务器错误关键词
		serverKeywords := []string{"internal server", "service unavailable", "server error", "500", "502", "503"}
		if errorType == "" && containsAny(errorStr, serverKeywords) {
			errorType = ServerError
			message = "艹，服务器出问题了！可能是临时的，等会儿再试试！"
			retryable = true
		}

		// 3. 检查GraphQL错误扩展
		if errorType == "" && extensions != nil {
			if code, ok := extensions["code"].(string); ok {
				codeLower := strings.ToLower(code)
				switch {
				case strings.Contains(codeLower, "auth"):
					errorType = AuthenticationError
					message = "艹，认证失败！GraphQL返回认证错误。"
					retryable = false
				case strings.Contains(codeLower, "forbidden"):
					errorType = AuthorizationError
					message = "艹，权限不足！GraphQL返回权限错误。"
					retryable = false
				case strings.Contains(codeLower, "validation"):
					errorType = ValidationError
					message = "艹，验证失败！GraphQL返回验证错误。"
					retryable = false
				}
			}
		}

		// 4. 默认为未知错误
		if errorType == "" {
			errorType = UnknownError
			message = fmt.Sprintf("艹，遇到了未知错误：%s", err.Error())
			retryable = false
		}
	}

	return &GraphQLSDKError{
		ErrorType:     errorType,
		Message:       message,
		OriginalError: err,
		OperationName: operationName,
		Variables:     variables,
		StatusCode:    statusCode,
		Extensions:    extensions,
		Timestamp:     time.Now(),
		Retryable:     retryable,
	}
}

// containsAny 检查字符串是否包含任意一个关键词
func containsAny(str string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(str, keyword) {
			return true
		}
	}
	return false
}

// 便捷错误创建函数（用于快速创建特定类型的错误）

// NewNetworkError 创建网络错误
func NewNetworkError(message string, originalError error) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType:     NetworkError,
		Message:       message,
		OriginalError: originalError,
		Timestamp:     time.Now(),
		Retryable:     true,
	}
}

// NewAuthenticationError 创建认证错误
func NewAuthenticationError(message string) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType: AuthenticationError,
		Message:   message,
		Timestamp: time.Now(),
		Retryable: false,
	}
}

// NewAuthorizationError 创建授权错误
func NewAuthorizationError(message string) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType: AuthorizationError,
		Message:   message,
		Timestamp: time.Now(),
		Retryable: false,
	}
}

// NewValidationError 创建验证错误
func NewValidationError(message string, variables map[string]interface{}) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType: ValidationError,
		Message:   message,
		Variables: variables,
		Timestamp: time.Now(),
		Retryable: false,
	}
}

// NewRateLimitError 创建限流错误
func NewRateLimitError(retryAfter time.Duration) *GraphQLSDKError {
	message := fmt.Sprintf("艹，请求太频繁了！等 %v 后再试！", retryAfter)
	return &GraphQLSDKError{
		ErrorType: RateLimitError,
		Message:   message,
		Timestamp: time.Now(),
		Retryable: true,
	}
}

// NewServerError 创建服务器错误
func NewServerError(message string, statusCode int) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType:  ServerError,
		Message:    message,
		StatusCode: statusCode,
		Timestamp:  time.Now(),
		Retryable:  true,
	}
}

// NewUnknownError 创建未知错误
func NewUnknownError(message string, originalError error) *GraphQLSDKError {
	return &GraphQLSDKError{
		ErrorType:     UnknownError,
		Message:       message,
		OriginalError: originalError,
		Timestamp:     time.Now(),
		Retryable:     false,
	}
}

// WrapError 包装标准error为GraphQLSDKError
func WrapError(err error) *GraphQLSDKError {
	if err == nil {
		return nil
	}

	// 如果已经是GraphQLSDKError，直接返回
	var sdkErr *GraphQLSDKError
	if errors.As(err, &sdkErr) {
		return sdkErr
	}

	// 否则解析为新的错误
	return ParseError(err, "", nil, 0, nil)
}

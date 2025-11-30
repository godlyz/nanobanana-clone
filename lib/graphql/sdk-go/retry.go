// 艹！Nano Banana GraphQL SDK for Go - 重试机制模块
//
// 这个SB文件实现了智能重试机制！
//
// 主要功能：
// - 指数退避算法（Exponential Backoff）
// - 随机抖动（Jitter）防止惊群效应
// - 可配置的重试策略
// - 支持Context取消
// - 详细的重试日志

package nanobanana

import (
	"context"
	"math"
	"math/rand"
	"time"
)

// RetryConfig 重试配置
type RetryConfig struct {
	// Enabled 是否启用重试（默认：true）
	Enabled bool

	// MaxAttempts 最大尝试次数（包含首次请求，默认：3）
	MaxAttempts int

	// InitialDelay 初始延迟时间（默认：1秒）
	InitialDelay time.Duration

	// MaxDelay 最大延迟时间（默认：30秒）
	MaxDelay time.Duration

	// ExponentialBase 指数基数（默认：2.0，即每次翻倍）
	ExponentialBase float64

	// Jitter 是否启用随机抖动（默认：true）
	// 抖动因子：0.5 - 1.5，即延迟时间会在 [delay*0.5, delay*1.5] 范围内随机
	Jitter bool
}

// DefaultRetryConfig 默认重试配置
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		Enabled:         true,
		MaxAttempts:     3,
		InitialDelay:    1 * time.Second,
		MaxDelay:        30 * time.Second,
		ExponentialBase: 2.0,
		Jitter:          true,
	}
}

// Validate 验证配置合法性
func (c *RetryConfig) Validate() error {
	if c.MaxAttempts < 1 {
		c.MaxAttempts = 1
	}
	if c.InitialDelay < 0 {
		c.InitialDelay = 1 * time.Second
	}
	if c.MaxDelay < c.InitialDelay {
		c.MaxDelay = 30 * time.Second
	}
	if c.ExponentialBase < 1.0 {
		c.ExponentialBase = 2.0
	}
	return nil
}

// RetryHandler 重试处理器
type RetryHandler struct {
	config *RetryConfig
	logger *SDKLogger
}

// NewRetryHandler 创建重试处理器
func NewRetryHandler(config *RetryConfig, logger *SDKLogger) *RetryHandler {
	if config == nil {
		config = DefaultRetryConfig()
	}
	config.Validate()

	return &RetryHandler{
		config: config,
		logger: logger,
	}
}

// CalculateDelay 计算重试延迟时间
//
// 算法：
// 1. 指数退避：delay = initialDelay * (exponentialBase ^ attempt)
// 2. 上限限制：delay = min(delay, maxDelay)
// 3. 随机抖动（可选）：delay = delay * random(0.5, 1.5)
//
// 参数：
//   - attempt: 当前尝试次数（从0开始）
//
// 返回：
//   - time.Duration: 计算出的延迟时间
func (h *RetryHandler) CalculateDelay(attempt int) time.Duration {
	// 指数退避
	delay := float64(h.config.InitialDelay) * math.Pow(h.config.ExponentialBase, float64(attempt))

	// 上限限制
	if delay > float64(h.config.MaxDelay) {
		delay = float64(h.config.MaxDelay)
	}

	// 随机抖动
	if h.config.Jitter {
		// 生成 0.5 到 1.5 之间的随机数
		jitterFactor := 0.5 + rand.Float64() // rand.Float64() 返回 [0.0, 1.0)
		delay *= jitterFactor
	}

	return time.Duration(delay)
}

// ShouldRetry 判断是否应该重试
//
// 重试条件：
// 1. 重试功能已启用
// 2. 错误是可重试的（IsRetryable() == true）
// 3. 未超过最大尝试次数
//
// 参数：
//   - err: 错误对象
//   - attempt: 当前尝试次数（从1开始）
//
// 返回：
//   - bool: 是否应该重试
func (h *RetryHandler) ShouldRetry(err *GraphQLSDKError, attempt int) bool {
	if !h.config.Enabled {
		return false
	}

	if err == nil {
		return false
	}

	if !err.IsRetryable() {
		return false
	}

	if attempt >= h.config.MaxAttempts {
		return false
	}

	return true
}

// ExecuteFunc 可重试的函数类型
type ExecuteFunc func(ctx context.Context) (interface{}, error)

// ExecuteWithRetry 执行带重试的函数
//
// 执行流程：
// 1. 首次执行函数
// 2. 如果失败且可重试，计算延迟时间
// 3. 等待延迟时间（支持Context取消）
// 4. 重新执行，直到成功或达到最大尝试次数
//
// 参数：
//   - ctx: Context对象（用于取消）
//   - fn: 要执行的函数
//   - operationName: 操作名称（用于日志）
//
// 返回：
//   - interface{}: 函数执行结果
//   - error: 错误（如果最终失败）
func (h *RetryHandler) ExecuteWithRetry(
	ctx context.Context,
	fn ExecuteFunc,
	operationName string,
) (interface{}, error) {
	var lastErr *GraphQLSDKError

	for attempt := 1; attempt <= h.config.MaxAttempts; attempt++ {
		// 检查Context是否已取消
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// 执行函数
		result, err := fn(ctx)

		// 成功执行
		if err == nil {
			return result, nil
		}

		// 转换为GraphQLSDKError
		var sdkErr *GraphQLSDKError
		if e, ok := err.(*GraphQLSDKError); ok {
			sdkErr = e
		} else {
			sdkErr = WrapError(err)
		}
		lastErr = sdkErr

		// 判断是否应该重试
		if !h.ShouldRetry(sdkErr, attempt) {
			// 记录最终失败日志
			if h.logger != nil {
				h.logger.Error("请求最终失败", map[string]interface{}{
					"operation_name": operationName,
					"attempt":        attempt,
					"error_type":     sdkErr.ErrorType,
					"error_message":  sdkErr.Message,
					"retryable":      sdkErr.Retryable,
				})
			}
			return nil, sdkErr
		}

		// 计算延迟时间
		delay := h.CalculateDelay(attempt - 1) // attempt从1开始，CalculateDelay的attempt从0开始

		// 记录重试日志
		if h.logger != nil {
			h.logger.Warn("请求失败，准备重试", map[string]interface{}{
				"operation_name": operationName,
				"attempt":        attempt,
				"max_attempts":   h.config.MaxAttempts,
				"error_type":     sdkErr.ErrorType,
				"error_message":  sdkErr.Message,
				"retry_delay_ms": delay.Milliseconds(),
			})
		}

		// 等待延迟时间（支持Context取消）
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(delay):
			// 继续下一次尝试
		}
	}

	// 最终失败
	return nil, lastErr
}

// RetryCallback 重试回调函数类型
//
// 参数：
//   - attempt: 当前尝试次数
//   - err: 错误对象
//   - delay: 延迟时间
type RetryCallback func(attempt int, err *GraphQLSDKError, delay time.Duration)

// ExecuteWithRetryCallback 执行带重试的函数（带回调）
//
// 与ExecuteWithRetry类似，但允许传入回调函数来自定义重试时的行为
//
// 参数：
//   - ctx: Context对象
//   - fn: 要执行的函数
//   - operationName: 操作名称
//   - onRetry: 重试回调函数（可为nil）
//
// 返回：
//   - interface{}: 函数执行结果
//   - error: 错误（如果最终失败）
func (h *RetryHandler) ExecuteWithRetryCallback(
	ctx context.Context,
	fn ExecuteFunc,
	operationName string,
	onRetry RetryCallback,
) (interface{}, error) {
	var lastErr *GraphQLSDKError

	for attempt := 1; attempt <= h.config.MaxAttempts; attempt++ {
		// 检查Context是否已取消
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// 执行函数
		result, err := fn(ctx)

		// 成功执行
		if err == nil {
			return result, nil
		}

		// 转换为GraphQLSDKError
		var sdkErr *GraphQLSDKError
		if e, ok := err.(*GraphQLSDKError); ok {
			sdkErr = e
		} else {
			sdkErr = WrapError(err)
		}
		lastErr = sdkErr

		// 判断是否应该重试
		if !h.ShouldRetry(sdkErr, attempt) {
			return nil, sdkErr
		}

		// 计算延迟时间
		delay := h.CalculateDelay(attempt - 1)

		// 调用回调函数
		if onRetry != nil {
			onRetry(attempt, sdkErr, delay)
		}

		// 记录重试日志
		if h.logger != nil {
			h.logger.Warn("请求失败，准备重试", map[string]interface{}{
				"operation_name": operationName,
				"attempt":        attempt,
				"max_attempts":   h.config.MaxAttempts,
				"error_type":     sdkErr.ErrorType,
				"retry_delay_ms": delay.Milliseconds(),
			})
		}

		// 等待延迟时间
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(delay):
			// 继续下一次尝试
		}
	}

	// 最终失败
	return nil, lastErr
}

// 艹！Nano Banana GraphQL SDK for Go - 客户端模块
//
// 这个SB文件实现了核心GraphQL客户端功能！
//
// 主要功能：
// - GraphQL Query/Mutation执行
// - Token管理（Bearer认证）
// - Header管理
// - Context支持（取消、超时）
// - 自动重试机制
// - 结构化日志
// - 错误分类和处理

package nanobanana

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// SDKConfig SDK配置
type SDKConfig struct {
	// Endpoint GraphQL API端点（必填）
	Endpoint string

	// Token 认证Token（可选）
	Token string

	// Headers 自定义HTTP headers（可选）
	Headers map[string]string

	// Timeout 请求超时时间（默认：30秒）
	Timeout time.Duration

	// RetryConfig 重试配置（可选）
	RetryConfig *RetryConfig

	// EnableLogging 是否启用日志（默认：true）
	EnableLogging bool

	// LogLevel 日志级别（默认：INFO）
	LogLevel LogLevel
}

// DefaultSDKConfig 默认SDK配置
func DefaultSDKConfig(endpoint string) *SDKConfig {
	return &SDKConfig{
		Endpoint:      endpoint,
		Timeout:       30 * time.Second,
		RetryConfig:   DefaultRetryConfig(),
		EnableLogging: true,
		LogLevel:      LogLevelInfo,
		Headers:       make(map[string]string),
	}
}

// Validate 验证配置合法性
func (c *SDKConfig) Validate() error {
	if c.Endpoint == "" {
		return fmt.Errorf("endpoint不能为空")
	}
	if c.Timeout <= 0 {
		c.Timeout = 30 * time.Second
	}
	if c.RetryConfig != nil {
		c.RetryConfig.Validate()
	}
	return nil
}

// SDK Nano Banana GraphQL SDK客户端
type SDK struct {
	config       *SDKConfig
	logger       *SDKLogger
	retryHandler *RetryHandler
	httpClient   *http.Client
	headers      map[string]string
}

// NewSDK 创建新的SDK实例
//
// 参数：
//   - config: SDK配置
//
// 返回：
//   - *SDK: SDK实例
//   - error: 配置验证错误
func NewSDK(config *SDKConfig) (*SDK, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	logger := NewSDKLogger("nanobanana_sdk", config.LogLevel, config.EnableLogging)
	retryHandler := NewRetryHandler(config.RetryConfig, logger)

	sdk := &SDK{
		config:       config,
		logger:       logger,
		retryHandler: retryHandler,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		headers: make(map[string]string),
	}

	// 初始化headers
	sdk.buildHeaders()

	return sdk, nil
}

// CreateSDK 便捷函数：创建SDK实例
//
// 参数：
//   - endpoint: GraphQL API端点
//   - token: 认证Token（可选）
//   - options: 额外配置选项（可选）
//
// 返回：
//   - *SDK: SDK实例
//   - error: 错误
func CreateSDK(endpoint string, token string, options ...*SDKConfig) (*SDK, error) {
	config := DefaultSDKConfig(endpoint)
	config.Token = token

	// 合并额外配置
	if len(options) > 0 && options[0] != nil {
		opt := options[0]
		if opt.Timeout > 0 {
			config.Timeout = opt.Timeout
		}
		if opt.RetryConfig != nil {
			config.RetryConfig = opt.RetryConfig
		}
		if opt.Headers != nil {
			for k, v := range opt.Headers {
				config.Headers[k] = v
			}
		}
		config.EnableLogging = opt.EnableLogging
		config.LogLevel = opt.LogLevel
	}

	return NewSDK(config)
}

// buildHeaders 构建请求headers
func (s *SDK) buildHeaders() {
	s.headers = map[string]string{
		"Content-Type": "application/json",
		"Accept":       "application/json",
		"User-Agent":   "NanoBanana-SDK-Go/1.0",
	}

	// 添加自定义headers
	for k, v := range s.config.Headers {
		s.headers[k] = v
	}

	// 添加认证token
	if s.config.Token != "" {
		s.headers["Authorization"] = fmt.Sprintf("Bearer %s", s.config.Token)
	}
}

// SetToken 设置认证Token
func (s *SDK) SetToken(token string) {
	s.config.Token = token
	s.buildHeaders()
}

// UpdateHeaders 更新自定义headers
func (s *SDK) UpdateHeaders(headers map[string]string) {
	for k, v := range headers {
		s.config.Headers[k] = v
	}
	s.buildHeaders()
}

// GraphQLRequest GraphQL请求结构
type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// GraphQLResponse GraphQL响应结构
type GraphQLResponse struct {
	Data   json.RawMessage   `json:"data,omitempty"`
	Errors []GraphQLError    `json:"errors,omitempty"`
}

// GraphQLError GraphQL错误结构
type GraphQLError struct {
	Message    string                 `json:"message"`
	Locations  []GraphQLLocation      `json:"locations,omitempty"`
	Path       []interface{}          `json:"path,omitempty"`
	Extensions map[string]interface{} `json:"extensions,omitempty"`
}

// GraphQLLocation GraphQL错误位置
type GraphQLLocation struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

// execute 执行GraphQL请求（内部方法）
func (s *SDK) execute(
	ctx context.Context,
	query string,
	variables map[string]interface{},
	operationName string,
) (json.RawMessage, error) {
	startTime := time.Now()

	// 构建请求体
	reqBody := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, ParseError(err, operationName, variables, 0, nil)
	}

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", s.config.Endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, ParseError(err, operationName, variables, 0, nil)
	}

	// 设置headers
	for k, v := range s.headers {
		req.Header.Set(k, v)
	}

	// 记录请求日志
	s.logger.LogRequest(operationName, variables, s.headers)

	// 发送请求
	resp, err := s.httpClient.Do(req)
	if err != nil {
		sdkErr := ParseError(err, operationName, variables, 0, nil)
		s.logger.LogError(operationName, sdkErr)
		return nil, sdkErr
	}
	defer resp.Body.Close()

	// 读取响应体
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		sdkErr := ParseError(err, operationName, variables, resp.StatusCode, nil)
		s.logger.LogError(operationName, sdkErr)
		return nil, sdkErr
	}

	// 计算耗时
	duration := time.Since(startTime)
	durationMs := duration.Milliseconds()

	// 检查HTTP状态码
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// 尝试解析错误响应
		var gqlResp GraphQLResponse
		_ = json.Unmarshal(respBody, &gqlResp)

		var extensions map[string]interface{}
		if len(gqlResp.Errors) > 0 {
			extensions = gqlResp.Errors[0].Extensions
		}

		errMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody))
		sdkErr := ParseError(fmt.Errorf(errMsg), operationName, variables, resp.StatusCode, extensions)
		s.logger.LogResponse(operationName, durationMs, resp.StatusCode, true)
		s.logger.LogError(operationName, sdkErr)
		return nil, sdkErr
	}

	// 解析GraphQL响应
	var gqlResp GraphQLResponse
	if err := json.Unmarshal(respBody, &gqlResp); err != nil {
		sdkErr := ParseError(err, operationName, variables, resp.StatusCode, nil)
		s.logger.LogError(operationName, sdkErr)
		return nil, sdkErr
	}

	// 检查GraphQL错误
	if len(gqlResp.Errors) > 0 {
		// 取第一个错误
		firstErr := gqlResp.Errors[0]
		errMsg := firstErr.Message
		extensions := firstErr.Extensions

		sdkErr := ParseError(fmt.Errorf(errMsg), operationName, variables, resp.StatusCode, extensions)
		s.logger.LogResponse(operationName, durationMs, resp.StatusCode, true)
		s.logger.LogError(operationName, sdkErr)
		return nil, sdkErr
	}

	// 记录成功响应日志
	s.logger.LogResponse(operationName, durationMs, resp.StatusCode, false)

	return gqlResp.Data, nil
}

// Query 执行GraphQL Query
//
// 参数：
//   - ctx: Context对象（用于取消和超时）
//   - query: GraphQL查询字符串
//   - variables: 查询变量（可选）
//   - operationName: 操作名称（可选，默认："Query"）
//
// 返回：
//   - json.RawMessage: 查询结果（原始JSON）
//   - error: 错误（如果失败）
func (s *SDK) Query(
	ctx context.Context,
	query string,
	variables map[string]interface{},
	operationName string,
) (json.RawMessage, error) {
	if operationName == "" {
		operationName = "Query"
	}

	// 使用重试机制执行
	executeFunc := func(ctx context.Context) (interface{}, error) {
		return s.execute(ctx, query, variables, operationName)
	}

	result, err := s.retryHandler.ExecuteWithRetry(ctx, executeFunc, operationName)
	if err != nil {
		return nil, err
	}

	return result.(json.RawMessage), nil
}

// Mutate 执行GraphQL Mutation
//
// 参数：
//   - ctx: Context对象
//   - mutation: GraphQL mutation字符串
//   - variables: 变量（可选）
//   - operationName: 操作名称（可选，默认："Mutation"）
//
// 返回：
//   - json.RawMessage: Mutation结果（原始JSON）
//   - error: 错误（如果失败）
func (s *SDK) Mutate(
	ctx context.Context,
	mutation string,
	variables map[string]interface{},
	operationName string,
) (json.RawMessage, error) {
	if operationName == "" {
		operationName = "Mutation"
	}

	// 使用重试机制执行
	executeFunc := func(ctx context.Context) (interface{}, error) {
		return s.execute(ctx, mutation, variables, operationName)
	}

	result, err := s.retryHandler.ExecuteWithRetry(ctx, executeFunc, operationName)
	if err != nil {
		return nil, err
	}

	return result.(json.RawMessage), nil
}

// QueryWithStruct 执行Query并解析到结构体
//
// 参数：
//   - ctx: Context对象
//   - query: GraphQL查询字符串
//   - variables: 查询变量
//   - result: 结果结构体指针
//   - operationName: 操作名称（可选）
//
// 返回：
//   - error: 错误（如果失败）
func (s *SDK) QueryWithStruct(
	ctx context.Context,
	query string,
	variables map[string]interface{},
	result interface{},
	operationName string,
) error {
	data, err := s.Query(ctx, query, variables, operationName)
	if err != nil {
		return err
	}

	// 解析JSON到结构体
	if err := json.Unmarshal(data, result); err != nil {
		return ParseError(err, operationName, variables, 0, nil)
	}

	return nil
}

// MutateWithStruct 执行Mutation并解析到结构体
//
// 参数：
//   - ctx: Context对象
//   - mutation: GraphQL mutation字符串
//   - variables: 变量
//   - result: 结果结构体指针
//   - operationName: 操作名称（可选）
//
// 返回：
//   - error: 错误（如果失败）
func (s *SDK) MutateWithStruct(
	ctx context.Context,
	mutation string,
	variables map[string]interface{},
	result interface{},
	operationName string,
) error {
	data, err := s.Mutate(ctx, mutation, variables, operationName)
	if err != nil {
		return err
	}

	// 解析JSON到结构体
	if err := json.Unmarshal(data, result); err != nil {
		return ParseError(err, operationName, variables, 0, nil)
	}

	return nil
}

// SetLogLevel 设置日志级别
func (s *SDK) SetLogLevel(level LogLevel) {
	s.logger.SetLevel(level)
}

// EnableLogging 启用日志
func (s *SDK) EnableLogging(enabled bool) {
	s.logger.SetEnabled(enabled)
}

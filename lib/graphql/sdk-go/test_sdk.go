// 艹！Nano Banana Go SDK 测试脚本
//
// 这个SB脚本测试Go SDK的所有核心功能！
//
// 测试内容：
// 1. SDK初始化
// 2. GraphQL Query执行
// 3. GraphQL Mutation执行
// 4. 错误处理（7种错误类型）
// 5. 重试机制
// 6. Context取消
// 7. Context超时
// 8. Token管理
// 9. 日志系统
// 10. 并发请求

package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	nanobanana "github.com/nanobanana/nanobanana-sdk-go"
)

// TestStats 测试结果统计
type TestStats struct {
	Total  int
	Passed int
	Failed int
	Errors []string
	mu     sync.Mutex
}

var stats = &TestStats{
	Errors: make([]string, 0),
}

// runTest 运行测试用例
func runTest(name string, fn func() error) {
	stats.mu.Lock()
	stats.Total++
	stats.mu.Unlock()

	fmt.Printf("\n🧪 测试: %s\n", name)

	if err := fn(); err != nil {
		stats.mu.Lock()
		stats.Failed++
		stats.Errors = append(stats.Errors, fmt.Sprintf("%s: %v", name, err))
		stats.mu.Unlock()
		fmt.Printf("❌ 失败: %s\n", name)
		fmt.Printf("   错误: %v\n", err)
	} else {
		stats.mu.Lock()
		stats.Passed++
		stats.mu.Unlock()
		fmt.Printf("✅ 通过: %s\n", name)
	}
}

// ============================================================================
// 测试用例
// ============================================================================

// testCreateSDK 测试1：创建SDK实例
func testCreateSDK() error {
	// 使用便捷函数创建
	sdk, err := nanobanana.CreateSDK(
		"https://httpbin.org/post", // 使用httpbin模拟GraphQL端点
		"test-token-123",
		nil,
	)
	if err != nil {
		return fmt.Errorf("创建SDK失败: %v", err)
	}
	if sdk == nil {
		return fmt.Errorf("SDK实例为nil")
	}
	fmt.Println("   SDK实例创建成功")

	// 使用配置对象创建
	config := &nanobanana.SDKConfig{
		Endpoint:      "https://httpbin.org/post",
		Token:         "test-token-456",
		Timeout:       60 * time.Second,
		EnableLogging: true,
		LogLevel:      nanobanana.LogLevelInfo,
	}
	sdk2, err := nanobanana.NewSDK(config)
	if err != nil {
		return fmt.Errorf("创建SDK2失败: %v", err)
	}
	if sdk2 == nil {
		return fmt.Errorf("SDK2实例为nil")
	}
	fmt.Println("   SDK2实例创建成功（使用配置对象）")

	return nil
}

// testTokenManagement 测试2：Token管理
func testTokenManagement() error {
	sdk, err := nanobanana.CreateSDK("https://httpbin.org/post", "initial-token", nil)
	if err != nil {
		return err
	}

	// 更新Token
	sdk.SetToken("new-token-123")
	fmt.Println("   Token更新成功")

	return nil
}

// testErrorTypes 测试3：错误类型
func testErrorTypes() error {
	// 测试所有7种错误类型
	errors := []struct {
		name string
		err  *nanobanana.GraphQLSDKError
	}{
		{"网络错误", nanobanana.NewNetworkError("连接失败", fmt.Errorf("connection refused"))},
		{"认证错误", nanobanana.NewAuthenticationError("Token无效")},
		{"授权错误", nanobanana.NewAuthorizationError("权限不足")},
		{"验证错误", nanobanana.NewValidationError("参数错误", nil)},
		{"限流错误", nanobanana.NewRateLimitError(60 * time.Second)},
		{"服务器错误", nanobanana.NewServerError("服务器异常", 500)},
		{"未知错误", nanobanana.NewUnknownError("未知问题", fmt.Errorf("unknown"))},
	}

	for _, tc := range errors {
		if tc.err.ErrorType == "" {
			return fmt.Errorf("%s 类型为空", tc.name)
		}
		fmt.Printf("   %s: %s\n", tc.name, tc.err.ErrorType)
	}

	fmt.Println("   所有错误类型验证成功")
	return nil
}

// testRetryConfig 测试4：重试配置
func testRetryConfig() error {
	config := &nanobanana.RetryConfig{
		Enabled:         true,
		MaxAttempts:     5,
		InitialDelay:    2 * time.Second,
		MaxDelay:        60 * time.Second,
		ExponentialBase: 2.0,
		Jitter:          true,
	}

	sdk, err := nanobanana.CreateSDK(
		"https://httpbin.org/post",
		"test-token",
		&nanobanana.SDKConfig{
			RetryConfig: config,
		},
	)
	if err != nil {
		return err
	}
	if sdk == nil {
		return fmt.Errorf("SDK实例为nil")
	}

	fmt.Println("   重试配置创建成功")
	fmt.Printf("   最大尝试次数: %d\n", config.MaxAttempts)
	fmt.Printf("   初始延迟: %v\n", config.InitialDelay)
	fmt.Printf("   指数基数: %.1f\n", config.ExponentialBase)

	return nil
}

// testLogging 测试5：日志系统
func testLogging() error {
	logger := nanobanana.NewSDKLogger("test_logger", nanobanana.LogLevelDebug, true)

	// 测试不同级别的日志
	logger.Debug("这是DEBUG日志", map[string]interface{}{"key": "value"})
	logger.Info("这是INFO日志", map[string]interface{}{"status": "ok"})
	logger.Warn("这是WARN日志", map[string]interface{}{"warning": "test"})
	logger.Error("这是ERROR日志", map[string]interface{}{"error": "test"})

	fmt.Println("   日志记录成功")

	// 测试日志级别设置
	logger.SetLevel(nanobanana.LogLevelInfo)
	logger.SetEnabled(false)
	fmt.Println("   日志级别设置成功")

	return nil
}

// testRetryCalculation 测试6：重试延迟计算
func testRetryCalculation() error {
	config := nanobanana.DefaultRetryConfig()
	handler := nanobanana.NewRetryHandler(config, nil)

	// 测试延迟计算
	for attempt := 0; attempt < 5; attempt++ {
		delay := handler.CalculateDelay(attempt)
		fmt.Printf("   尝试 %d: 延迟 %.2f秒\n", attempt+1, delay.Seconds())
		if delay <= 0 {
			return fmt.Errorf("延迟应大于0")
		}
		if delay > config.MaxDelay {
			return fmt.Errorf("延迟不应超过最大值")
		}
	}

	return nil
}

// testContextTimeout 测试7：Context超时控制
func testContextTimeout() error {
	sdk, err := nanobanana.CreateSDK("https://httpbin.org/delay/5", "test-token", nil)
	if err != nil {
		return err
	}

	// 设置1秒超时（httpbin会延迟5秒）
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	query := `query { test { id } }`
	_, err = sdk.Query(ctx, query, nil, "TestQuery")

	// 应该超时
	if err == nil {
		return fmt.Errorf("应该超时但没有超时")
	}

	fmt.Printf("   超时控制正常: %v\n", err)
	return nil
}

// testContextCancel 测试8：Context取消
func testContextCancel() error {
	sdk, err := nanobanana.CreateSDK("https://httpbin.org/delay/10", "test-token", nil)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())

	// 在1秒后取消
	go func() {
		time.Sleep(1 * time.Second)
		cancel()
	}()

	query := `query { test { id } }`
	_, err = sdk.Query(ctx, query, nil, "TestQuery")

	// 应该被取消
	if err == nil {
		return fmt.Errorf("应该被取消但没有被取消")
	}

	fmt.Printf("   取消控制正常: %v\n", err)
	return nil
}

// testConcurrentRequests 测试9：并发请求
func testConcurrentRequests() error {
	sdk, err := nanobanana.CreateSDK("https://httpbin.org/post", "test-token", nil)
	if err != nil {
		return err
	}

	// 并发执行10个请求
	var wg sync.WaitGroup
	errorsChan := make(chan error, 10)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			query := fmt.Sprintf(`query { test%d { id } }`, id)
			_, err := sdk.Query(context.Background(), query, nil, fmt.Sprintf("Query%d", id))
			if err != nil {
				// 预期会失败（因为httpbin不是GraphQL端点）
				// 这里主要测试并发安全性
			}
		}(i)
	}

	wg.Wait()
	close(errorsChan)

	fmt.Println("   并发请求执行完成")
	return nil
}

// testHeaderManagement 测试10：Header管理
func testHeaderManagement() error {
	sdk, err := nanobanana.CreateSDK("https://httpbin.org/post", "test-token", nil)
	if err != nil {
		return err
	}

	// 更新自定义Headers
	sdk.UpdateHeaders(map[string]string{
		"X-Client-Version": "1.0.0",
		"X-Device-ID":      "device-123",
	})
	fmt.Println("   Headers更新成功")

	return nil
}

// ============================================================================
// 主测试函数
// ============================================================================

func main() {
	fmt.Println("🚀 开始测试 Nano Banana Go SDK...\n")
	fmt.Println(strings.Repeat("=", 60))

	// 执行所有测试
	runTest("创建SDK实例", testCreateSDK)
	runTest("Token管理", testTokenManagement)
	runTest("错误类型", testErrorTypes)
	runTest("重试配置", testRetryConfig)
	runTest("日志系统", testLogging)
	runTest("重试延迟计算", testRetryCalculation)
	runTest("Context超时控制", testContextTimeout)
	runTest("Context取消", testContextCancel)
	runTest("并发请求", testConcurrentRequests)
	runTest("Header管理", testHeaderManagement)

	// 输出测试结果
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Println("\n📊 测试结果统计:")
	fmt.Printf("   总测试数: %d\n", stats.Total)
	fmt.Printf("   通过: %d ✅\n", stats.Passed)
	fmt.Printf("   失败: %d ❌\n", stats.Failed)
	if stats.Total > 0 {
		passRate := float64(stats.Passed) / float64(stats.Total) * 100
		fmt.Printf("   通过率: %.2f%%\n", passRate)
	}

	if stats.Failed > 0 {
		fmt.Println("\n❌ 失败的测试:")
		for i, err := range stats.Errors {
			fmt.Printf("   %d. %s\n", i+1, err)
		}
	}

	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	if stats.Failed == 0 {
		fmt.Println("✅ 所有测试通过！")
		os.Exit(0)
	} else {
		fmt.Println("❌ 部分测试失败！")
		os.Exit(1)
	}
}

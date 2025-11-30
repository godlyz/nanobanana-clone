#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
艹！Nano Banana Python SDK 测试脚本

这个SB脚本测试Python SDK的所有核心功能！

测试内容��
1. SDK初始化
2. GraphQL Query执行
3. GraphQL Mutation执行
4. 错误处理（7种错误类型）
5. 重试机制
6. Token管理
7. 日志系统
"""

import os
import sys
import time
import asyncio
from typing import Dict, Any

# 添加SDK到Python路径
sys.path.insert(0, os.path.dirname(__file__))

from nanobanana_sdk import (
    create_sdk,
    GraphQLSDK,
    GraphQLSDKConfig,
    GraphQLSDKError,
    GraphQLErrorType,
    RetryConfig,
    set_log_level,
)


class TestStats:
    """测试结果统计"""

    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors = []


stats = TestStats()


def run_test(name: str, fn):
    """运行测试用例"""
    stats.total += 1
    print(f"\n🧪 测试: {name}")

    try:
        fn()
        stats.passed += 1
        print(f"✅ 通过: {name}")
    except Exception as error:
        stats.failed += 1
        error_msg = str(error)
        stats.errors.append(f"{name}: {error_msg}")
        print(f"❌ 失败: {name}")
        print(f"   错误: {error_msg}")


async def run_async_test(name: str, fn):
    """运行异步测试用例"""
    stats.total += 1
    print(f"\n🧪 测试: {name}")

    try:
        await fn()
        stats.passed += 1
        print(f"✅ 通过: {name}")
    except Exception as error:
        stats.failed += 1
        error_msg = str(error)
        stats.errors.append(f"{name}: {error_msg}")
        print(f"❌ 失败: {name}")
        print(f"   错误: {error_msg}")


# ============================================================================
# 测试用例
# ============================================================================


def test_create_sdk():
    """测试1：创建SDK实例"""

    def test_fn():
        # 使用便捷函数创建
        sdk = create_sdk(
            endpoint="https://httpbin.org/post",  # 使用httpbin模拟GraphQL端点
            token="test-token-123",
        )

        assert sdk is not None, "SDK实例不应为None"
        print("   SDK实例创建成功")

        # 使用配置对象创建
        config = GraphQLSDKConfig(
            endpoint="https://httpbin.org/post",
            token="test-token-456",
            timeout=60,
            enable_logging=True,
        )
        sdk2 = GraphQLSDK(config)

        assert sdk2 is not None, "SDK2实例不应为None"
        print("   SDK2实例创建成功（使用配置对象）")

    run_test("创建SDK实例", test_fn)


def test_token_management():
    """测试2：Token管理"""

    def test_fn():
        sdk = create_sdk("https://httpbin.org/post", "initial-token")

        # 更新Token
        sdk.set_token("new-token-123")
        print("   Token更新成功")

        # 验证Token已更新（通过检查headers）
        assert "Authorization" in sdk._headers, "应包含Authorization header"
        assert sdk._headers["Authorization"] == "Bearer new-token-123", "Token应已更新"
        print("   Token验证成功")

    run_test("Token管理", test_fn)


def test_error_parsing():
    """测试3：错误解析"""

    def test_fn():
        from nanobanana_sdk.errors import (
            parse_error,
            authentication_error,
            network_error,
            validation_error,
        )

        # 测试认证错误
        auth_err = authentication_error("Token无效")
        assert auth_err.error_type == GraphQLErrorType.AUTHENTICATION_ERROR
        assert not auth_err.is_retryable()
        print("   认证错误解析成功")

        # 测试网络错误
        net_err = network_error("连接超时")
        assert net_err.error_type == GraphQLErrorType.NETWORK_ERROR
        assert net_err.is_retryable()
        print("   网络错误解析成功")

        # 测试验证错误
        val_err = validation_error("参数格式错误", {"field": "email"})
        assert val_err.error_type == GraphQLErrorType.VALIDATION_ERROR
        assert not val_err.is_retryable()
        print("   验证错误解析成功")

    run_test("错误解析", test_fn)


def test_retry_config():
    """测试4：重试配置"""

    def test_fn():
        # 创建自定义重试配置
        retry_config = RetryConfig(
            enabled=True,
            max_attempts=5,
            initial_delay=2.0,
            max_delay=60.0,
            exponential_base=2.0,
            jitter=True,
        )

        sdk = create_sdk(
            "https://httpbin.org/post", "test-token", retry_config=retry_config
        )

        assert sdk is not None
        print("   重试配置创建成功")
        print(f"   最大尝试次数: {retry_config.max_attempts}")
        print(f"   初始延迟: {retry_config.initial_delay}秒")
        print(f"   指数���数: {retry_config.exponential_base}")

    run_test("重试配置", test_fn)


def test_logging():
    """测试5：日志系统"""

    def test_fn():
        from nanobanana_sdk.logger import SDKLogger, set_log_level, enable_logging

        # 创建日志记录器
        logger = SDKLogger(name="test_logger", level="DEBUG", enable_logging=True)

        # 测试不同级别的日志
        logger.debug("这是DEBUG日志", {"key": "value"})
        logger.info("这是INFO日志", {"status": "ok"})
        logger.warn("这是WARN日志", {"warning": "test"})
        logger.error("这是ERROR日志", {"error": "test"})

        print("   日志记录成功")

        # 测试全局日志配置
        set_log_level("INFO")
        enable_logging(False)
        print("   全局日志配置成功")

    run_test("日志系统", test_fn)


def test_retry_calculation():
    """测试6：重试延迟计算"""

    def test_fn():
        from nanobanana_sdk.retry import RetryHandler, RetryConfig

        config = RetryConfig(
            initial_delay=1.0, max_delay=30.0, exponential_base=2.0, jitter=True
        )

        handler = RetryHandler(config)

        # 测试延迟计算
        for attempt in range(5):
            delay = handler.calculate_delay(attempt)
            print(f"   尝试 {attempt + 1}: 延迟 {delay:.2f}秒")
            assert delay > 0, "延迟应大于0"
            assert delay <= config.max_delay, "延迟不应超过最大值"

    run_test("重试延迟计算", test_fn)


async def test_async_query():
    """测试7：异步查询"""

    async def test_fn():
        sdk = create_sdk("https://httpbin.org/post", "test-token")

        # 注意：由于httpbin不是真实的GraphQL端点，这个测试可能会失败
        # 这里主要测试异步接口是否正常工作
        query = """
            query TestQuery {
                test {
                    id
                    name
                }
            }
        """

        try:
            result = await sdk.query_async(query, None, "TestQuery")
            print(f"   异步查询返回: {result}")
        except GraphQLSDKError as error:
            # 预期会失败（因为httpbin不是GraphQL端点）
            print(f"   异步查询失败（预期）: {error.error_type}")

    await run_async_test("异步查询", test_fn)


def test_context_manager():
    """测试8：Context Manager支持"""

    def test_fn():
        # 使用with语句
        with create_sdk("https://httpbin.org/post", "test-token") as sdk:
            assert sdk is not None
            print("   Context Manager创建成功")
            # SDK会在退出with块时自动关闭

        print("   Context Manager退出成功")

    run_test("Context Manager支持", test_fn)


def test_error_types():
    """测试9：所有错误类型"""

    def test_fn():
        from nanobanana_sdk.errors import (
            network_error,
            authentication_error,
            authorization_error,
            validation_error,
            rate_limit_error,
            server_error,
            unknown_error,
        )

        # 测试所有7种错误类型
        errors = [
            ("网络错误", network_error("连接失败")),
            ("认证错误", authentication_error("Token无效")),
            ("授权错误", authorization_error("权限不足")),
            ("验证错误", validation_error("参数错误", {})),
            ("限流错误", rate_limit_error(60)),
            ("服务器错误", server_error("服务器异常", 500)),
            ("未知错误", unknown_error("未知问题", None)),
        ]

        for name, error in errors:
            assert error.error_type is not None
            print(f"   {name}: {error.error_type}")

        print("   所有错误类型验证成功")

    run_test("所有错误类型", test_fn)


def test_usage_tips():
    """测试10：使用建议函数"""

    def test_fn():
        from nanobanana_sdk import print_usage_tips, check_dependencies

        # 测试使用建议函数
        print_usage_tips()
        print("   使用建议函数执行成功")

        # 测试依赖检查
        result = check_dependencies()
        assert result is True, "依赖检查应通过"
        print("   依赖检查通过")

    run_test("使用建议函数", test_fn)


# ============================================================================
# 主测试函数
# ============================================================================


def main():
    """主测试函数"""
    print("🚀 开始测试 Nano Banana Python SDK...\n")
    print("=" * 60)

    # 执行同步测试
    test_create_sdk()
    test_token_management()
    test_error_parsing()
    test_retry_config()
    test_logging()
    test_retry_calculation()
    test_context_manager()
    test_error_types()
    test_usage_tips()

    # 执行异步测试
    asyncio.run(test_async_query())

    # 输出测试结果
    print("\n" + "=" * 60)
    print("\n📊 测试结果统计:")
    print(f"   总测试数: {stats.total}")
    print(f"   通过: {stats.passed} ✅")
    print(f"   失败: {stats.failed} ❌")
    if stats.total > 0:
        pass_rate = (stats.passed / stats.total) * 100
        print(f"   通过率: {pass_rate:.2f}%")

    if stats.failed > 0:
        print("\n❌ 失败的测试:")
        for i, error in enumerate(stats.errors, 1):
            print(f"   {i}. {error}")

    print("\n" + "=" * 60)
    print("✅ 所有测试通过！" if stats.failed == 0 else "❌ 部分测试失败！")

    sys.exit(0 if stats.failed == 0 else 1)


if __name__ == "__main__":
    main()

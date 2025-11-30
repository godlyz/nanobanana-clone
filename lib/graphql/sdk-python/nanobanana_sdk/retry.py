"""
艹！Nano Banana GraphQL SDK 重试机制模块

这个SB模块实现了智能重试逻辑，支持指数退避、最大重试次数等配置！
"""

import time
import asyncio
from typing import Callable, TypeVar, Optional, Any
from dataclasses import dataclass

from .errors import GraphQLSDKError

T = TypeVar("T")


@dataclass
class RetryConfig:
    """
    重试配置

    老王的参数说明：
    - enabled: 是否启用重试（默认 True）
    - max_attempts: 最大尝试次数（包括第一次，默认 3）
    - initial_delay: 初始延迟（秒，默认 1.0）
    - max_delay: 最大延迟（秒，默认 30.0）
    - exponential_base: 指数退避基数（默认 2.0）
    - jitter: 是否添加随机抖动（默认 True，避免惊群效应）
    """
    enabled: bool = True
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    jitter: bool = True

    def __post_init__(self):
        """老王的参数验证"""
        if self.max_attempts < 1:
            raise ValueError("艹，max_attempts 必须 >= 1！")
        if self.initial_delay <= 0:
            raise ValueError("艹，initial_delay 必须 > 0！")
        if self.max_delay < self.initial_delay:
            raise ValueError("艹，max_delay 必须 >= initial_delay！")
        if self.exponential_base <= 1:
            raise ValueError("艹，exponential_base 必须 > 1！")


class RetryHandler:
    """
    艹！重试处理器

    这个SB类负责执行重试逻辑，包括：
    - 判断错误是否可重试
    - 计算延迟时间（指数退避 + 随机抖动）
    - 执行重试
    - 记录重试日志
    """

    def __init__(self, config: Optional[RetryConfig] = None):
        """
        初始化重试处理器

        Args:
            config: 重试配置（如果不提供，使用默认配置）
        """
        self.config = config or RetryConfig()

    def calculate_delay(self, attempt: int) -> float:
        """
        艹！计算延迟时间

        使用指数退避算法：
        delay = min(initial_delay * (exponential_base ^ attempt), max_delay)

        如果启用 jitter，会添加随机抖动（0.5-1.5倍）

        Args:
            attempt: 当前尝试次数（从 0 开始）

        Returns:
            延迟秒数
        """
        # 指数退避
        delay = self.config.initial_delay * (self.config.exponential_base ** attempt)

        # 限制最大延迟
        delay = min(delay, self.config.max_delay)

        # 添加随机抖动（避免惊群效应）
        if self.config.jitter:
            import random
            jitter_factor = 0.5 + random.random()  # 0.5 到 1.5 之间
            delay *= jitter_factor

        return delay

    def should_retry(self, error: GraphQLSDKError, attempt: int) -> bool:
        """
        艹！判断是否应该重试

        判断逻辑：
        1. 重试功能是否启用
        2. 是否达到最大重试次数
        3. 错误类型是否可重试

        Args:
            error: GraphQL SDK 错误
            attempt: 当前尝试次数（从 1 开始，1 表示第一次尝试）

        Returns:
            True 表示应该重试，False 表示不应该重试
        """
        if not self.config.enabled:
            return False

        if attempt >= self.config.max_attempts:
            return False

        return error.is_retryable()

    def execute_with_retry(
        self,
        func: Callable[[], T],
        operation_name: Optional[str] = None,
        on_retry: Optional[Callable[[int, GraphQLSDKError, float], None]] = None,
    ) -> T:
        """
        艹！同步函数的重试执行

        Args:
            func: 要执行的函数（无参数）
            operation_name: 操作名称（用于日志）
            on_retry: 重试回调函数（可选，接收 attempt, error, delay 参数）

        Returns:
            函数执行结果

        Raises:
            GraphQLSDKError: 如果所有重试都失败
        """
        last_error: Optional[GraphQLSDKError] = None

        for attempt in range(1, self.config.max_attempts + 1):
            try:
                return func()
            except GraphQLSDKError as error:
                last_error = error

                # 判断是否应该重试
                if not self.should_retry(error, attempt):
                    raise error

                # 计算延迟时间
                delay = self.calculate_delay(attempt - 1)

                # 调用重试回调
                if on_retry:
                    on_retry(attempt, error, delay)

                # 延迟后重试
                time.sleep(delay)

            except Exception as error:
                # 非 GraphQLSDKError 类型的错误，不重试
                from .errors import parse_error
                raise parse_error(error, operation_name)

        # 所有重试都失败了
        if last_error:
            raise last_error
        else:
            from .errors import unknown_error
            raise unknown_error("艹，所有重试都tm失败了！")

    async def execute_with_retry_async(
        self,
        func: Callable[[], Any],
        operation_name: Optional[str] = None,
        on_retry: Optional[Callable[[int, GraphQLSDKError, float], None]] = None,
    ) -> Any:
        """
        艹！异步函数的重试执行

        Args:
            func: 要执行的异步函数（无参数）
            operation_name: 操作名称（用于日志）
            on_retry: 重试回调函数（可选，接收 attempt, error, delay 参数）

        Returns:
            函数执行结果

        Raises:
            GraphQLSDKError: 如果所有重试都失败
        """
        last_error: Optional[GraphQLSDKError] = None

        for attempt in range(1, self.config.max_attempts + 1):
            try:
                return await func()
            except GraphQLSDKError as error:
                last_error = error

                # 判断是否应该重试
                if not self.should_retry(error, attempt):
                    raise error

                # 计算延迟时间
                delay = self.calculate_delay(attempt - 1)

                # 调用重试回调
                if on_retry:
                    on_retry(attempt, error, delay)

                # 异步延迟后重试
                await asyncio.sleep(delay)

            except Exception as error:
                # 非 GraphQLSDKError 类型的错误，不重试
                from .errors import parse_error
                raise parse_error(error, operation_name)

        # 所有重试都失败了
        if last_error:
            raise last_error
        else:
            from .errors import unknown_error
            raise unknown_error("艹，所有重试都tm失败了！")


# 默认重试处理器实例（方便直接使用）
default_retry_handler = RetryHandler()


# 便捷的重试装饰器
def with_retry(
    config: Optional[RetryConfig] = None,
    operation_name: Optional[str] = None,
):
    """
    艹！重试装饰器（同步函数）

    使用示例:
        @with_retry(config=RetryConfig(max_attempts=5))
        def fetch_data():
            return api_call()

    Args:
        config: 重试配置（可选）
        operation_name: 操作名称（可选）
    """
    handler = RetryHandler(config)

    def decorator(func: Callable[[], T]) -> Callable[[], T]:
        def wrapper(*args, **kwargs) -> T:
            return handler.execute_with_retry(
                lambda: func(*args, **kwargs),
                operation_name or func.__name__,
            )
        return wrapper

    return decorator


def with_retry_async(
    config: Optional[RetryConfig] = None,
    operation_name: Optional[str] = None,
):
    """
    艹！重试装饰器（异步函数）

    使用示例:
        @with_retry_async(config=RetryConfig(max_attempts=5))
        async def fetch_data_async():
            return await api_call_async()

    Args:
        config: 重试配置（可选）
        operation_name: 操作名称（可选）
    """
    handler = RetryHandler(config)

    def decorator(func: Callable[[], Any]) -> Callable[[], Any]:
        async def wrapper(*args, **kwargs) -> Any:
            return await handler.execute_with_retry_async(
                lambda: func(*args, **kwargs),
                operation_name or func.__name__,
            )
        return wrapper

    return decorator

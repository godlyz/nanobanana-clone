"""
艹！Nano Banana GraphQL SDK for Python

这个SB包提供完整的 GraphQL SDK 功能，让你tm轻松调用 Nano Banana API！

主要功能：
- 类型安全的 GraphQL 客户端
- 智能错误分类和处理（7 种错误类型）
- 自动重试机制（指数退避 + 随机抖动）
- Token 管理
- 结构化日志
- 支持同步和异步调用

使用示例:
    from nanobanana_sdk import create_sdk, GraphQLSDKConfig

    # 方式 1: 使用便捷函数
    sdk = create_sdk(
        endpoint="https://api.nanobanana.com/api/graphql",
        token="your-token-here"
    )

    # 方式 2: 使用配置对象
    config = GraphQLSDKConfig(
        endpoint="https://api.nanobanana.com/api/graphql",
        token="your-token-here",
        timeout=60,
        enable_logging=True
    )
    sdk = GraphQLSDK(config)

    # 执行查询
    result = sdk.query('''
        query GetMe {
            me {
                id
                email
            }
        }
    ''')

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

老王的提示：
- 记得设置 token！没 token 的话很多操作都tm会失败
- 日志很有用！出问题的时候看日志能tm快速定位
- 重试功能很智能！网络抽风的时候自动重试
"""

__version__ = "1.0.0"
__author__ = "Nano Banana Team (老王带队)"
__license__ = "MIT"

# 导出核心类和函数
from .client import (
    GraphQLSDK,
    GraphQLSDKConfig,
    create_sdk,
)

from .errors import (
    GraphQLSDKError,
    GraphQLErrorType,
    parse_error,
    network_error,
    authentication_error,
    authorization_error,
    validation_error,
    rate_limit_error,
    server_error,
    unknown_error,
)

from .retry import (
    RetryConfig,
    RetryHandler,
    with_retry,
    with_retry_async,
)

from .logger import (
    SDKLogger,
    set_log_level,
    enable_logging,
    get_logger,
)

# 定义 __all__
__all__ = [
    # 版本信息
    "__version__",
    "__author__",
    "__license__",

    # 核心类
    "GraphQLSDK",
    "GraphQLSDKConfig",
    "create_sdk",

    # 错误处理
    "GraphQLSDKError",
    "GraphQLErrorType",
    "parse_error",
    "network_error",
    "authentication_error",
    "authorization_error",
    "validation_error",
    "rate_limit_error",
    "server_error",
    "unknown_error",

    # 重试机制
    "RetryConfig",
    "RetryHandler",
    "with_retry",
    "with_retry_async",

    # 日志记录
    "SDKLogger",
    "set_log_level",
    "enable_logging",
    "get_logger",
]

# 老王的使用建议
def print_usage_tips():
    """打印老王的使用建议"""
    print("""
    艹！Nano Banana Python SDK 使用建议：

    1. 创建 SDK 实例时，记得设置 token：
       sdk = create_sdk(endpoint="...", token="your-token")

    2. 启用日志方便调试（默认已启用）：
       sdk = create_sdk(endpoint="...", enable_logging=True, log_level="DEBUG")

    3. 配置重试策略（网络抽风很常见）：
       from nanobanana_sdk import RetryConfig
       sdk = create_sdk(
           endpoint="...",
           retry_config=RetryConfig(max_attempts=5, initial_delay=2.0)
       )

    4. 使用上下文管理器自动关闭连接：
       with create_sdk(endpoint="...") as sdk:
           result = sdk.query("...")

    5. 异步调用示例：
       import asyncio
       result = await sdk.query_async("...")

    老王祝你用得tm顺利！有问题看日志或者去 GitHub 提 Issue！
    """)


# 检查依赖
def check_dependencies():
    """检查必需的依赖是否已安装"""
    try:
        import gql
    except ImportError:
        print("""
        艹！缺少依赖包！

        运行以下命令安装：
        pip install gql[requests,aiohttp]

        或者安装完整版（包含所有可选依赖）：
        pip install gql[all]
        """)
        return False
    return True


# 模块导入时检查依赖（可选）
if __name__ != "__main__":
    # 仅在作为模块导入时检查（不在直接运行时检查）
    check_dependencies()

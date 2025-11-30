"""
艹！Nano Banana GraphQL SDK 客户端模块

这个SB模块是 SDK 的核心，提供完整的 GraphQL 客户端功能！

主要功能：
- GraphQL 查询和变更执行
- 错误分类和处理
- 智能重试机制
- Token 管理
- 结构化日志
- 支持同步和异步调用
"""

import time
from typing import Any, Dict, Optional, TypeVar, Generic
from dataclasses import dataclass, field

try:
    from gql import gql, Client
    from gql.transport.requests import RequestsHTTPTransport
    from gql.transport.aiohttp import AIOHTTPTransport
    HAS_GQL = True
except ImportError:
    HAS_GQL = False

from .errors import GraphQLSDKError, parse_error
from .retry import RetryHandler, RetryConfig
from .logger import SDKLogger

T = TypeVar("T")


@dataclass
class GraphQLSDKConfig:
    """
    艹！GraphQL SDK 配置

    老王的配置项：
    - endpoint: GraphQL API 端点（必填）
    - token: 认证 token（可选）
    - headers: 自定义请求头（可选）
    - timeout: 超时时间（秒，默认 30）
    - retry_config: 重试配置（可选）
    - enable_logging: 是否启用日志（默认 True）
    - log_level: 日志级别（默认 INFO）
    """
    endpoint: str
    token: Optional[str] = None
    headers: Dict[str, str] = field(default_factory=dict)
    timeout: int = 30
    retry_config: Optional[RetryConfig] = None
    enable_logging: bool = True
    log_level: str = "INFO"

    def __post_init__(self):
        """老王的参数验证"""
        if not self.endpoint:
            raise ValueError("艹，endpoint 不能为空！")
        if not self.endpoint.startswith(("http://", "https://")):
            raise ValueError("艹，endpoint 必须是有效的 HTTP/HTTPS URL！")
        if self.timeout <= 0:
            raise ValueError("艹，timeout 必须 > 0！")


class GraphQLSDK:
    """
    艹！Nano Banana GraphQL SDK 客户端

    这个SB类是 SDK 的核心，提供完整的 GraphQL 功能：
    - 查询和变更执行
    - 错误处理和重试
    - Token 管理
    - 日志记录

    使用示例:
        # 创建 SDK 实例
        sdk = GraphQLSDK(GraphQLSDKConfig(
            endpoint="https://api.nanobanana.com/api/graphql",
            token="your-token-here"
        ))

        # 执行查询
        result = sdk.query('''
            query GetMe {
                me {
                    id
                    email
                }
            }
        ''')

        # 执行变更
        result = sdk.mutate('''
            mutation CreatePost($title: String!) {
                createPost(title: $title) {
                    id
                    title
                }
            }
        ''', variables={"title": "Hello World"})
    """

    def __init__(self, config: GraphQLSDKConfig):
        """
        初始化 GraphQL SDK

        Args:
            config: SDK 配置
        """
        if not HAS_GQL:
            raise ImportError(
                "艹！gql 库没有安装！运行: pip install gql[requests,aiohttp]"
            )

        self.config = config

        # 初始化日志记录器
        import logging
        log_level = getattr(logging, config.log_level.upper(), logging.INFO)
        self.logger = SDKLogger(
            name="nanobanana_sdk",
            level=log_level,
            enable_logging=config.enable_logging,
        )

        # 初始化重试处理器
        self.retry_handler = RetryHandler(config.retry_config)

        # 构建请求头
        self._headers = self._build_headers()

        # 初始化 GraphQL Client（同步）
        self._sync_client: Optional[Client] = None

        # 初始化 GraphQL Client（异步）
        self._async_client: Optional[Client] = None

        self.logger.info(f"SDK 初始化完成: endpoint={config.endpoint}")

    def _build_headers(self) -> Dict[str, str]:
        """
        艹！构建请求头

        Returns:
            完整的请求头字典
        """
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "NanoBanana-SDK-Python/1.0",
            **self.config.headers,
        }

        # 如果有 token，添加 Authorization header
        if self.config.token:
            headers["Authorization"] = f"Bearer {self.config.token}"

        return headers

    def _get_sync_client(self) -> Client:
        """
        艹！获取同步 GraphQL Client

        Returns:
            gql Client 实例
        """
        if not self._sync_client:
            transport = RequestsHTTPTransport(
                url=self.config.endpoint,
                headers=self._headers,
                timeout=self.config.timeout,
                verify=True,
                retries=0,  # 我们自己处理重试
            )
            self._sync_client = Client(
                transport=transport,
                fetch_schema_from_transport=False,
            )

        return self._sync_client

    def _get_async_client(self) -> Client:
        """
        艹！获取异步 GraphQL Client

        Returns:
            gql Client 实例（异步）
        """
        if not self._async_client:
            transport = AIOHTTPTransport(
                url=self.config.endpoint,
                headers=self._headers,
                timeout=self.config.timeout,
            )
            self._async_client = Client(
                transport=transport,
                fetch_schema_from_transport=False,
            )

        return self._async_client

    def set_token(self, token: Optional[str]):
        """
        艹！设置认证 token

        Args:
            token: 新的 token（None 表示移除 token）
        """
        self.config.token = token
        self._headers = self._build_headers()

        # 重置 client，下次使用时会重新创建
        self._sync_client = None
        self._async_client = None

        self.logger.info("Token 已更新")

    def update_headers(self, headers: Dict[str, str]):
        """
        艹！更新自定义请求头

        Args:
            headers: 要更新的请求头字典
        """
        self.config.headers.update(headers)
        self._headers = self._build_headers()

        # 重置 client
        self._sync_client = None
        self._async_client = None

        self.logger.info(f"请求头已更新: {list(headers.keys())}")

    def _execute_with_logging(
        self,
        operation_name: str,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        艹！执行 GraphQL 请求（带日志记录）

        Args:
            operation_name: 操作名称
            query: GraphQL 查询字符串
            variables: 变量（可选）

        Returns:
            查询结果

        Raises:
            GraphQLSDKError: 如果请求失败
        """
        # 记录请求
        self.logger.log_request(operation_name, variables, self._headers)

        start_time = time.time()
        success = False
        error: Optional[Exception] = None

        try:
            # 获取客户端
            client = self._get_sync_client()

            # 解析查询
            document = gql(query)

            # 执行查询
            result = client.execute(document, variable_values=variables)

            success = True
            return result

        except Exception as e:
            error = e
            # 解析并分类错误
            sdk_error = parse_error(e, operation_name, variables)
            raise sdk_error

        finally:
            # 记录响应
            duration_ms = (time.time() - start_time) * 1000
            self.logger.log_response(
                operation_name,
                duration_ms,
                success=success,
                error=error,
            )

    def query(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: str = "Query",
    ) -> Any:
        """
        艹！执行 GraphQL 查询（同步）

        Args:
            query: GraphQL 查询字符串
            variables: 查询变量（可选）
            operation_name: 操作名称（可选，用于日志）

        Returns:
            查询结果

        Raises:
            GraphQLSDKError: 如果查询失败

        使用示例:
            result = sdk.query('''
                query GetMe {
                    me { id email }
                }
            ''')
        """
        def execute():
            return self._execute_with_logging(operation_name, query, variables)

        # 使用重试处理器
        return self.retry_handler.execute_with_retry(
            execute,
            operation_name=operation_name,
            on_retry=lambda attempt, error, delay: self.logger.log_retry(
                operation_name, attempt, self.config.retry_config.max_attempts, delay, error
            ) if self.config.retry_config else None,
        )

    def mutate(
        self,
        mutation: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: str = "Mutation",
    ) -> Any:
        """
        艹！执行 GraphQL 变更（同步）

        Args:
            mutation: GraphQL 变更字符串
            variables: 变更变量（可选）
            operation_name: 操作名称（可选，用于日志）

        Returns:
            变更结果

        Raises:
            GraphQLSDKError: 如果变更失败

        使用示例:
            result = sdk.mutate('''
                mutation CreatePost($title: String!) {
                    createPost(title: $title) {
                        id
                        title
                    }
                }
            ''', variables={"title": "Hello"})
        """
        # 变更操作默认不重试（除非明确配置了重试）
        return self._execute_with_logging(operation_name, mutation, variables)

    async def query_async(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: str = "QueryAsync",
    ) -> Any:
        """
        艹！执行 GraphQL 查询（异步）

        Args:
            query: GraphQL 查询字符串
            variables: 查询变量（可选）
            operation_name: 操作名称（可选，用于日志）

        Returns:
            查询结果

        Raises:
            GraphQLSDKError: 如果查询失败

        使用示例:
            result = await sdk.query_async('''
                query GetMe {
                    me { id email }
                }
            ''')
        """
        # 记录请求
        self.logger.log_request(operation_name, variables, self._headers)

        start_time = time.time()
        success = False
        error: Optional[Exception] = None

        try:
            # 获取异步客户端
            client = self._get_async_client()

            # 解析查询
            document = gql(query)

            # 异步执行查询
            async with client as session:
                result = await session.execute(document, variable_values=variables)

            success = True
            return result

        except Exception as e:
            error = e
            # 解析并分类错误
            sdk_error = parse_error(e, operation_name, variables)
            raise sdk_error

        finally:
            # 记录响应
            duration_ms = (time.time() - start_time) * 1000
            self.logger.log_response(
                operation_name,
                duration_ms,
                success=success,
                error=error,
            )

    async def mutate_async(
        self,
        mutation: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: str = "MutationAsync",
    ) -> Any:
        """
        艹！执行 GraphQL 变更（异步）

        Args:
            mutation: GraphQL 变更字符串
            variables: 变更变量（可选）
            operation_name: 操作名称（可选，用于日志）

        Returns:
            变更结果

        Raises:
            GraphQLSDKError: 如果变更失败

        使用示例:
            result = await sdk.mutate_async('''
                mutation CreatePost($title: String!) {
                    createPost(title: $title) {
                        id
                        title
                    }
                }
            ''', variables={"title": "Hello"})
        """
        return await self.query_async(mutation, variables, operation_name)

    def close(self):
        """
        艹！关闭客户端，释放资源

        建议在程序结束时调用
        """
        if self._sync_client:
            try:
                self._sync_client.close()
            except Exception:
                pass

        self.logger.info("SDK 客户端已关闭")

    def __enter__(self):
        """上下文管理器入口"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.close()


# 便捷函数：创建 SDK 实例
def create_sdk(
    endpoint: str,
    token: Optional[str] = None,
    **kwargs
) -> GraphQLSDK:
    """
    艹！创建 GraphQL SDK 实例（便捷函数）

    Args:
        endpoint: GraphQL API 端点
        token: 认证 token（可选）
        **kwargs: 其他配置参数

    Returns:
        GraphQLSDK 实例

    使用示例:
        sdk = create_sdk(
            endpoint="https://api.nanobanana.com/api/graphql",
            token="your-token",
            timeout=60,
            enable_logging=True
        )
    """
    config = GraphQLSDKConfig(endpoint=endpoint, token=token, **kwargs)
    return GraphQLSDK(config)

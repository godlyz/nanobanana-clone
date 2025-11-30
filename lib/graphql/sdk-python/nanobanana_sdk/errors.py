"""
艹！Nano Banana GraphQL SDK 错误分类模块

这个SB模块定义了 7 种错误类型，方便你tm精确处理各种错误场景！
"""

from enum import Enum
from typing import Optional, Dict, Any, List


class GraphQLErrorType(str, Enum):
    """
    GraphQL 错误类型枚举

    老王的分类：
    - NETWORK_ERROR: 网络连接失败（tm网络又断了）
    - AUTHENTICATION_ERROR: 认证失败（token过期或无效，快tm去登录）
    - AUTHORIZATION_ERROR: 权限不足（没权限访问，别tm瞎操作）
    - VALIDATION_ERROR: 输入验证失败（参数不对，检查你的输入）
    - RATE_LIMIT_ERROR: 请求频率限制（太快了，慢点tm）
    - SERVER_ERROR: 服务器内部错误（服务端挂了，不是你的问题）
    - UNKNOWN_ERROR: 未知错误（tm鬼知道是什么错误）
    """
    NETWORK_ERROR = "NETWORK_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    SERVER_ERROR = "SERVER_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class GraphQLSDKError(Exception):
    """
    GraphQL SDK 基础错误类

    所有 SDK 错误的基类，包含错误类型、消息、原始错误等信息
    """

    def __init__(
        self,
        error_type: GraphQLErrorType,
        message: str,
        original_error: Optional[Exception] = None,
        graphql_errors: Optional[List[Dict[str, Any]]] = None,
        extensions: Optional[Dict[str, Any]] = None,
        operation_name: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
    ):
        """
        初始化 GraphQL SDK 错误

        Args:
            error_type: 错误类型（7种分类之一）
            message: 错误消息（老王会用中文骂人）
            original_error: 原始错误对象（如果有的话）
            graphql_errors: GraphQL 错误列表（从服务端返回的）
            extensions: 错误扩展信息
            operation_name: 操作名称（哪个查询/变更出错了）
            variables: 变量（用于调试）
        """
        super().__init__(message)
        self.error_type = error_type
        self.message = message
        self.original_error = original_error
        self.graphql_errors = graphql_errors or []
        self.extensions = extensions or {}
        self.operation_name = operation_name
        self.variables = variables

    def __str__(self) -> str:
        """老王风格的错误信息"""
        parts = [f"[{self.error_type.value}] {self.message}"]

        if self.operation_name:
            parts.append(f"操作: {self.operation_name}")

        if self.graphql_errors:
            parts.append(f"GraphQL 错误数量: {len(self.graphql_errors)}")

        if self.original_error:
            parts.append(f"原始错误: {type(self.original_error).__name__}: {str(self.original_error)}")

        return " | ".join(parts)

    def __repr__(self) -> str:
        return f"GraphQLSDKError(type={self.error_type.value}, message={self.message})"

    def is_retryable(self) -> bool:
        """
        判断错误是否可重试

        老王的判断：
        - 网络错误 → 可重试（网络抽风很常见）
        - 速率限制 → 可重试（等一会儿再来）
        - 服务器错误 → 可重试（服务端可能在重启）
        - 其他错误 → 不可重试（参数错误、权限错误等，重试也没用）
        """
        return self.error_type in [
            GraphQLErrorType.NETWORK_ERROR,
            GraphQLErrorType.RATE_LIMIT_ERROR,
            GraphQLErrorType.SERVER_ERROR,
        ]

    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典格式（方便序列化）

        Returns:
            包含所有错误信息的字典
        """
        return {
            "error_type": self.error_type.value,
            "message": self.message,
            "operation_name": self.operation_name,
            "graphql_errors": self.graphql_errors,
            "extensions": self.extensions,
            "is_retryable": self.is_retryable(),
        }


def parse_error(
    error: Exception,
    operation_name: Optional[str] = None,
    variables: Optional[Dict[str, Any]] = None,
) -> GraphQLSDKError:
    """
    艹！解析错误并分类

    这个SB函数会根据错误特征，自动分类成 7 种错误类型之一

    Args:
        error: 原始错误对象
        operation_name: 操作名称
        variables: 变量

    Returns:
        分类后的 GraphQLSDKError

    老王的分类逻辑：
    1. 检查错误消息关键词
    2. 检查 HTTP 状态码
    3. 检查 GraphQL 错误扩展
    4. 实在不知道就归类为 UNKNOWN_ERROR
    """
    error_str = str(error).lower()
    error_type = GraphQLErrorType.UNKNOWN_ERROR
    message = "未知错误"
    graphql_errors: List[Dict[str, Any]] = []
    extensions: Dict[str, Any] = {}

    # 提取 GraphQL 错误信息（如果有的话）
    if hasattr(error, "errors") and error.errors:
        graphql_errors = [
            {
                "message": e.get("message", ""),
                "path": e.get("path"),
                "extensions": e.get("extensions", {}),
            }
            for e in error.errors
        ]

        # 从第一个 GraphQL 错误中提取扩展信息
        if graphql_errors:
            first_error = error.errors[0]
            extensions = first_error.get("extensions", {})

    # 老王的关键词匹配规则（按优先级排序）

    # 1. 网络错误
    network_keywords = [
        "network", "connection", "timeout", "econnrefused", "enotfound",
        "fetch failed", "dns", "socket", "econnreset", "etimedout"
    ]
    if any(keyword in error_str for keyword in network_keywords):
        error_type = GraphQLErrorType.NETWORK_ERROR
        message = "艹，网络连接失败！检查你的tm网络连接是否正常。"

    # 2. 认证错误
    elif any(keyword in error_str for keyword in ["unauthorized", "authentication", "token", "jwt", "401"]):
        error_type = GraphQLErrorType.AUTHENTICATION_ERROR
        message = "艹，认证失败！你的 token 过期或无效了，快tm去重新登录！"

    # 3. 权限错误
    elif any(keyword in error_str for keyword in ["forbidden", "permission", "access denied", "403"]):
        error_type = GraphQLErrorType.AUTHORIZATION_ERROR
        message = "艹，权限不足！你tm没权限访问这个资源。"

    # 4. 验证错误
    elif any(keyword in error_str for keyword in ["validation", "invalid", "required", "must be", "400"]):
        error_type = GraphQLErrorType.VALIDATION_ERROR
        message = "艹，输入验证失败！检查你tm的参数是否正确。"

    # 5. 速率限制
    elif any(keyword in error_str for keyword in ["rate limit", "too many", "throttle", "429"]):
        error_type = GraphQLErrorType.RATE_LIMIT_ERROR
        message = "艹，请求太快了！慢点tm，等会儿再试。"

    # 6. 服务器错误
    elif any(keyword in error_str for keyword in ["500", "502", "503", "504", "internal server", "service unavailable"]):
        error_type = GraphQLErrorType.SERVER_ERROR
        message = "艹，服务器内部错误！不是你的问题，等服务端修好再说。"

    # 7. 从 GraphQL 错误扩展中判断
    elif extensions:
        code = extensions.get("code", "").lower()
        if code in ["unauthenticated", "unauthorized"]:
            error_type = GraphQLErrorType.AUTHENTICATION_ERROR
            message = "艹，认证失败！token 过期或无效。"
        elif code in ["forbidden", "access_denied"]:
            error_type = GraphQLErrorType.AUTHORIZATION_ERROR
            message = "艹，权限不足！"
        elif code == "bad_user_input":
            error_type = GraphQLErrorType.VALIDATION_ERROR
            message = "艹，输入参数不对！"
        elif code == "internal_server_error":
            error_type = GraphQLErrorType.SERVER_ERROR
            message = "艹，服务器挂了！"

    # 保留原始错误消息（如果有特定消息的话）
    if hasattr(error, "message"):
        original_message = str(error.message)
        if original_message and original_message != str(error):
            message = f"{message}\n原始错误: {original_message}"

    return GraphQLSDKError(
        error_type=error_type,
        message=message,
        original_error=error,
        graphql_errors=graphql_errors,
        extensions=extensions,
        operation_name=operation_name,
        variables=variables,
    )


# 便捷的错误创建函数
def network_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建网络错误"""
    return GraphQLSDKError(GraphQLErrorType.NETWORK_ERROR, message, original_error)


def authentication_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建认证错误"""
    return GraphQLSDKError(GraphQLErrorType.AUTHENTICATION_ERROR, message, original_error)


def authorization_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建权限错误"""
    return GraphQLSDKError(GraphQLErrorType.AUTHORIZATION_ERROR, message, original_error)


def validation_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建验证错误"""
    return GraphQLSDKError(GraphQLErrorType.VALIDATION_ERROR, message, original_error)


def rate_limit_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建速率限制错误"""
    return GraphQLSDKError(GraphQLErrorType.RATE_LIMIT_ERROR, message, original_error)


def server_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建服务器错误"""
    return GraphQLSDKError(GraphQLErrorType.SERVER_ERROR, message, original_error)


def unknown_error(message: str, original_error: Optional[Exception] = None) -> GraphQLSDKError:
    """创建未知错误"""
    return GraphQLSDKError(GraphQLErrorType.UNKNOWN_ERROR, message, original_error)

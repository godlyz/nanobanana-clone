"""
艹！Nano Banana GraphQL SDK 日志记录模块

这个SB模块提供结构化日志记录，方便你tm调试问题！
"""

import logging
import json
from typing import Any, Dict, Optional
from datetime import datetime


class SDKLogger:
    """
    艹！SDK 日志记录器

    提供结构化日志记录，包含：
    - 时间戳
    - 操作名称
    - 变量
    - 错误信息
    - 响应时间等
    """

    def __init__(
        self,
        name: str = "nanobanana_sdk",
        level: int = logging.INFO,
        enable_logging: bool = True,
    ):
        """
        初始化日志记录器

        Args:
            name: 日志记录器名称
            level: 日志级别（DEBUG, INFO, WARNING, ERROR, CRITICAL）
            enable_logging: 是否启用日志（默认 True）
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        self.enable_logging = enable_logging

        # 如果没有 handler，添加一个控制台 handler
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setLevel(level)

            # 老王风格的日志格式
            formatter = logging.Formatter(
                "[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def _format_log_data(self, data: Dict[str, Any]) -> str:
        """
        格式化日志数据

        Args:
            data: 要记录的数据字典

        Returns:
            格式化后的字符串
        """
        try:
            return json.dumps(data, ensure_ascii=False, indent=2)
        except Exception:
            return str(data)

    def debug(self, message: str, **kwargs):
        """DEBUG 级别日志"""
        if self.enable_logging:
            self.logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs):
        """INFO 级别日志"""
        if self.enable_logging:
            self.logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs):
        """WARNING 级别日志"""
        if self.enable_logging:
            self.logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs):
        """ERROR 级别日志"""
        if self.enable_logging:
            self.logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs):
        """CRITICAL 级别日志"""
        if self.enable_logging:
            self.logger.critical(message, extra=kwargs)

    def log_request(
        self,
        operation_name: str,
        variables: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        """
        记录 GraphQL 请求

        Args:
            operation_name: 操作名称
            variables: 变量
            headers: 请求头
        """
        if not self.enable_logging:
            return

        log_data = {
            "type": "REQUEST",
            "operation": operation_name,
            "timestamp": datetime.now().isoformat(),
        }

        if variables:
            log_data["variables"] = variables

        if headers:
            # 隐藏敏感信息
            safe_headers = {
                k: v if k.lower() not in ["authorization", "cookie"] else "***"
                for k, v in headers.items()
            }
            log_data["headers"] = safe_headers

        self.info(f"发起请求: {operation_name}")
        self.debug(self._format_log_data(log_data))

    def log_response(
        self,
        operation_name: str,
        duration_ms: float,
        success: bool = True,
        error: Optional[Exception] = None,
    ):
        """
        记录 GraphQL 响应

        Args:
            operation_name: 操作名称
            duration_ms: 响应时间（毫秒）
            success: 是否成功
            error: 错误对象（如果失败）
        """
        if not self.enable_logging:
            return

        log_data = {
            "type": "RESPONSE",
            "operation": operation_name,
            "duration_ms": round(duration_ms, 2),
            "success": success,
            "timestamp": datetime.now().isoformat(),
        }

        if error:
            log_data["error"] = {
                "type": type(error).__name__,
                "message": str(error),
            }

        if success:
            self.info(f"请求成功: {operation_name} ({duration_ms:.2f}ms)")
        else:
            self.error(f"请求失败: {operation_name} ({duration_ms:.2f}ms)")

        self.debug(self._format_log_data(log_data))

    def log_retry(
        self,
        operation_name: str,
        attempt: int,
        max_attempts: int,
        delay: float,
        error: Exception,
    ):
        """
        记录重试信息

        Args:
            operation_name: 操作名称
            attempt: 当前尝试次数
            max_attempts: 最大尝试次数
            delay: 延迟时间（秒）
            error: 导致重试的错误
        """
        if not self.enable_logging:
            return

        log_data = {
            "type": "RETRY",
            "operation": operation_name,
            "attempt": attempt,
            "max_attempts": max_attempts,
            "delay_seconds": delay,
            "error": {
                "type": type(error).__name__,
                "message": str(error),
            },
            "timestamp": datetime.now().isoformat(),
        }

        self.warning(
            f"重试中 ({attempt}/{max_attempts}): {operation_name} "
            f"(延迟 {delay:.2f}秒)"
        )
        self.debug(self._format_log_data(log_data))


# 默认日志记录器实例
default_logger = SDKLogger()


# 便捷函数
def set_log_level(level: int):
    """
    设置日志级别

    Args:
        level: logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL
    """
    default_logger.logger.setLevel(level)


def enable_logging(enabled: bool = True):
    """
    启用或禁用日志

    Args:
        enabled: True 表示启用，False 表示禁用
    """
    default_logger.enable_logging = enabled


def get_logger(name: str = "nanobanana_sdk") -> SDKLogger:
    """
    获取日志记录器实例

    Args:
        name: 日志记录器名称

    Returns:
        SDKLogger 实例
    """
    return SDKLogger(name=name)

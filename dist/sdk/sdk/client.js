/**
 * GraphQL SDK 客户端
 * 艹！这个文件封装了 GraphQL 客户端，提供类型安全的查询方法
 *
 * 主要功能：
 * - 自动注入认证 token
 * - 统一错误处理
 * - 请求重试机制
 * - 请求/响应拦截器
 * - 类型安全的方法封装
 */
import { GraphQLClient } from 'graphql-request';
import { getSdk } from '../generated/types';
/**
 * GraphQL 错误分类（Week 8增强：新增更细致的错误类型）
 */
export var GraphQLErrorType;
(function (GraphQLErrorType) {
    // 网络相关错误
    GraphQLErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    GraphQLErrorType["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    // 认证授权错误
    GraphQLErrorType["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    GraphQLErrorType["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    // 客户端错误（4xx）
    GraphQLErrorType["BAD_REQUEST_ERROR"] = "BAD_REQUEST_ERROR";
    GraphQLErrorType["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    GraphQLErrorType["CONFLICT_ERROR"] = "CONFLICT_ERROR";
    GraphQLErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    GraphQLErrorType["RATE_LIMIT_ERROR"] = "RATE_LIMIT_ERROR";
    // 服务器错误（5xx）
    GraphQLErrorType["SERVER_ERROR"] = "SERVER_ERROR";
    GraphQLErrorType["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    GraphQLErrorType["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    // 其他错误
    GraphQLErrorType["GRAPHQL_VALIDATION_ERROR"] = "GRAPHQL_VALIDATION_ERROR";
    GraphQLErrorType["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(GraphQLErrorType || (GraphQLErrorType = {}));
/**
 * GraphQL 错误类（Week 8增强：新增错误码和详细信息）
 */
export class GraphQLSDKError extends Error {
    constructor(message, type, options) {
        super(message);
        this.name = 'GraphQLSDKError';
        this.type = type;
        this.statusCode = options?.statusCode;
        this.code = options?.code;
        this.originalError = options?.originalError;
        this.response = options?.response;
        this.details = options?.details;
        this.timestamp = new Date();
        // 艹！确保堆栈跟踪正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GraphQLSDKError);
        }
    }
    /**
     * 艹！转换为 JSON 格式（用于日志记录）
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp.toISOString(),
        };
    }
    /**
     * 艹！转换为用户友好的消息（支持中英双语）
     */
    toUserMessage(locale = 'zh') {
        // 艹！错误消息映射表（中英双语）
        const errorMessages = {
            // 网络错误
            ERR_NETWORK_FAILED: {
                zh: '网络连接失败，请检查您的网络设置',
                en: 'Network connection failed, please check your network settings',
            },
            ERR_REQUEST_TIMEOUT: {
                zh: '请求超时，请稍后再试',
                en: 'Request timeout, please try again later',
            },
            // 客户端错误（4xx）
            ERR_BAD_REQUEST: {
                zh: '请求参数错误，请检查输入数据',
                en: 'Invalid request parameters, please check your input',
            },
            ERR_AUTH_UNAUTHORIZED: {
                zh: '身份验证失败，请重新登录',
                en: 'Authentication failed, please login again',
            },
            ERR_AUTH_FORBIDDEN: {
                zh: '权限不足，无法访问此资源',
                en: 'Insufficient permissions to access this resource',
            },
            ERR_RESOURCE_NOT_FOUND: {
                zh: '资源未找到，请确认资源是否存在',
                en: 'Resource not found, please verify the resource exists',
            },
            ERR_RESOURCE_CONFLICT: {
                zh: '资源冲突，该资源已存在',
                en: 'Resource conflict, the resource already exists',
            },
            ERR_RATE_LIMIT_EXCEEDED: {
                zh: '请求过于频繁，请稍后再试',
                en: 'Rate limit exceeded, please try again later',
            },
            // 服务器错误（5xx）
            ERR_INTERNAL_SERVER: {
                zh: '服务器内部错误，请联系技术支持',
                en: 'Internal server error, please contact support',
            },
            ERR_SERVICE_UNAVAILABLE: {
                zh: '服务暂时不可用，请稍后再试',
                en: 'Service temporarily unavailable, please try again later',
            },
            ERR_SERVER_ERROR: {
                zh: '服务器错误，请稍后再试',
                en: 'Server error, please try again later',
            },
            // 未知错误
            ERR_UNKNOWN: {
                zh: '未知错误，请稍后再试或联系技术支持',
                en: 'Unknown error, please try again or contact support',
            },
        };
        // 艹！如果有错误码，优先使用错误码对应的国际化消息
        if (this.code && errorMessages[this.code]) {
            return errorMessages[this.code][locale];
        }
        // 艹！如果没有错误码，根据错误类型返回通用消息
        const typeMessages = {
            [GraphQLErrorType.NETWORK_ERROR]: {
                zh: '网络错误，请检查您的网络连接',
                en: 'Network error, please check your connection',
            },
            [GraphQLErrorType.TIMEOUT_ERROR]: {
                zh: '请求超时，请稍后再试',
                en: 'Request timeout, please try again later',
            },
            [GraphQLErrorType.AUTHENTICATION_ERROR]: {
                zh: '身份验证失败',
                en: 'Authentication failed',
            },
            [GraphQLErrorType.AUTHORIZATION_ERROR]: {
                zh: '权限不足',
                en: 'Insufficient permissions',
            },
            [GraphQLErrorType.BAD_REQUEST_ERROR]: {
                zh: '请求参数错误',
                en: 'Invalid request parameters',
            },
            [GraphQLErrorType.NOT_FOUND_ERROR]: {
                zh: '资源未找到',
                en: 'Resource not found',
            },
            [GraphQLErrorType.CONFLICT_ERROR]: {
                zh: '资源冲突',
                en: 'Resource conflict',
            },
            [GraphQLErrorType.VALIDATION_ERROR]: {
                zh: '数据验证失败',
                en: 'Validation failed',
            },
            [GraphQLErrorType.RATE_LIMIT_ERROR]: {
                zh: '请求过于频繁',
                en: 'Rate limit exceeded',
            },
            [GraphQLErrorType.SERVER_ERROR]: {
                zh: '服务器错误',
                en: 'Server error',
            },
            [GraphQLErrorType.INTERNAL_SERVER_ERROR]: {
                zh: '服务器内部错误',
                en: 'Internal server error',
            },
            [GraphQLErrorType.SERVICE_UNAVAILABLE]: {
                zh: '服务暂时不可用',
                en: 'Service unavailable',
            },
            [GraphQLErrorType.GRAPHQL_VALIDATION_ERROR]: {
                zh: 'GraphQL 查询语法错误',
                en: 'GraphQL validation error',
            },
            [GraphQLErrorType.UNKNOWN_ERROR]: {
                zh: '未知错误',
                en: 'Unknown error',
            },
        };
        // 艹！返回错误类型对应的国际化消息，如果没有则返回原始消息
        return typeMessages[this.type]?.[locale] || this.message;
    }
}
/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
    timeout: 30000,
    retry: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: false,
};
/**
 * GraphQL SDK 客户端类
 * 艹！这个类封装了所有 GraphQL 操作，提供完美的类型安全
 */
export class GraphQLSDK {
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        // 创建 GraphQL 客户端
        // 艹！graphql-request v7 不支持 timeout 参数了，需要用 fetch 的 signal
        this.client = new GraphQLClient(this.config.endpoint, {
            headers: this.buildHeaders(),
        });
        // 创建 SDK 实例
        this.sdk = getSdk(this.client, this.wrapRequest.bind(this));
        this.log('GraphQL SDK 初始化成功', { endpoint: this.config.endpoint });
    }
    /**
     * 构建请求头
     */
    buildHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.config.headers || {}),
        };
        // 添加认证 token
        if (this.config.token) {
            headers['Authorization'] = `Bearer ${this.config.token}`;
        }
        return headers;
    }
    /**
     * 艹！获取 GraphQL endpoint（供外部使用，比如 Subscription）
     */
    getEndpoint() {
        return this.config.endpoint;
    }
    /**
     * 包装请求，添加重试和错误处理
     */
    async wrapRequest(action, operationName, operationType // 艹！getSdk 定义中 operationType 可能是 undefined
    ) {
        let lastError = null;
        const maxRetries = this.config.retry ? this.config.maxRetries : 1;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.log(`执行 ${operationType || 'unknown'} ${operationName} (尝试 ${attempt}/${maxRetries})`);
                const result = await action();
                this.log(`${operationType || 'unknown'} ${operationName} 成功`, result);
                return result;
            }
            catch (error) {
                lastError = error;
                const sdkError = this.parseError(error);
                this.log(`${operationType} ${operationName} 失败`, {
                    attempt,
                    error: sdkError,
                });
                // 如果是认证错误、授权错误或验证错误，不重试
                if (sdkError.type === GraphQLErrorType.AUTHENTICATION_ERROR ||
                    sdkError.type === GraphQLErrorType.AUTHORIZATION_ERROR ||
                    sdkError.type === GraphQLErrorType.VALIDATION_ERROR) {
                    throw sdkError;
                }
                // 如果是最后一次尝试，抛出错误
                if (attempt === maxRetries) {
                    throw sdkError;
                }
                // 等待后重试
                await this.delay(this.config.retryDelay * attempt);
            }
        }
        // 理论上不会到这里，但为了类型安全
        throw this.parseError(lastError);
    }
    /**
     * 解析错误（Week 8增强：使用新的错误码和详细错误类型）
     */
    parseError(error) {
        // 艹！网络错误
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            return new GraphQLSDKError('网络连接失败，请检查网络设置', GraphQLErrorType.NETWORK_ERROR, {
                code: 'ERR_NETWORK_FAILED',
                originalError: error,
            });
        }
        // 艹！超时错误
        if (error.message?.includes('timeout') || error.message?.includes('超时')) {
            return new GraphQLSDKError('请求超时，请稍后再试', GraphQLErrorType.TIMEOUT_ERROR, {
                code: 'ERR_REQUEST_TIMEOUT',
                originalError: error,
            });
        }
        // 艹！GraphQL 响应错误
        if (error.response?.errors) {
            const firstError = error.response.errors[0];
            const message = firstError.message || '请求失败';
            const extensions = firstError.extensions || {};
            // 艹！认证错误（401）
            if (message.includes('Unauthorized') || message.includes('未登录') || message.includes('未认证')) {
                return new GraphQLSDKError('认证失败，请先登录', GraphQLErrorType.AUTHENTICATION_ERROR, {
                    statusCode: 401,
                    code: extensions.code || 'ERR_AUTH_UNAUTHORIZED',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！授权错误（403）
            if (message.includes('Forbidden') || message.includes('权限不足') || message.includes('禁止访问')) {
                return new GraphQLSDKError('权限不足，无法访问该资源', GraphQLErrorType.AUTHORIZATION_ERROR, {
                    statusCode: 403,
                    code: extensions.code || 'ERR_AUTH_FORBIDDEN',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！资源未找到（404）
            if (message.includes('Not found') || message.includes('未找到') || message.includes('不存在')) {
                return new GraphQLSDKError('资源未找到', GraphQLErrorType.NOT_FOUND_ERROR, {
                    statusCode: 404,
                    code: extensions.code || 'ERR_RESOURCE_NOT_FOUND',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！冲突错误（409）
            if (message.includes('Conflict') || message.includes('冲突') || message.includes('已存在')) {
                return new GraphQLSDKError('资源冲突，该资源已存在', GraphQLErrorType.CONFLICT_ERROR, {
                    statusCode: 409,
                    code: extensions.code || 'ERR_RESOURCE_CONFLICT',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！速率限制错误（429）
            if (message.includes('Rate limit') || message.includes('Too many requests') || message.includes('请求过于频繁')) {
                return new GraphQLSDKError('请求过于频繁，请稍后再试', GraphQLErrorType.RATE_LIMIT_ERROR, {
                    statusCode: 429,
                    code: extensions.code || 'ERR_RATE_LIMIT_EXCEEDED',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！验证错误（400）
            if (message.includes('Validation') || message.includes('Invalid') || message.includes('验证失败') || message.includes('无效')) {
                return new GraphQLSDKError(message, GraphQLErrorType.VALIDATION_ERROR, {
                    statusCode: 400,
                    code: extensions.code || 'ERR_VALIDATION_FAILED',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！GraphQL语法错误
            if (message.includes('Syntax Error') || message.includes('GraphQL')) {
                return new GraphQLSDKError('GraphQL查询语法错误', GraphQLErrorType.GRAPHQL_VALIDATION_ERROR, {
                    statusCode: 400,
                    code: extensions.code || 'ERR_GRAPHQL_SYNTAX',
                    originalError: error,
                    response: error.response,
                    details: extensions,
                });
            }
            // 艹！服务器错误（500）
            return new GraphQLSDKError(message, GraphQLErrorType.SERVER_ERROR, {
                statusCode: 500,
                code: extensions.code || 'ERR_SERVER_ERROR',
                originalError: error,
                response: error.response,
                details: extensions,
            });
        }
        // 艹！HTTP 状态码错误
        if (error.status) {
            const statusCode = error.status;
            // 艹！400 - 请求错误
            if (statusCode === 400) {
                return new GraphQLSDKError('请求参数错误', GraphQLErrorType.BAD_REQUEST_ERROR, {
                    statusCode: 400,
                    code: 'ERR_BAD_REQUEST',
                    originalError: error,
                });
            }
            // 艹！401 - 认证失败
            if (statusCode === 401) {
                return new GraphQLSDKError('认证失败，请先登录', GraphQLErrorType.AUTHENTICATION_ERROR, {
                    statusCode: 401,
                    code: 'ERR_AUTH_UNAUTHORIZED',
                    originalError: error,
                });
            }
            // 艹！403 - 权限不足
            if (statusCode === 403) {
                return new GraphQLSDKError('权限不足，无法访问该资源', GraphQLErrorType.AUTHORIZATION_ERROR, {
                    statusCode: 403,
                    code: 'ERR_AUTH_FORBIDDEN',
                    originalError: error,
                });
            }
            // 艹！404 - 资源未找到
            if (statusCode === 404) {
                return new GraphQLSDKError('资源未找到', GraphQLErrorType.NOT_FOUND_ERROR, {
                    statusCode: 404,
                    code: 'ERR_RESOURCE_NOT_FOUND',
                    originalError: error,
                });
            }
            // 艹！409 - 资源冲突
            if (statusCode === 409) {
                return new GraphQLSDKError('资源冲突，该资源已存在', GraphQLErrorType.CONFLICT_ERROR, {
                    statusCode: 409,
                    code: 'ERR_RESOURCE_CONFLICT',
                    originalError: error,
                });
            }
            // 艹！429 - 速率限制
            if (statusCode === 429) {
                return new GraphQLSDKError('请求过于频繁，请稍后再试', GraphQLErrorType.RATE_LIMIT_ERROR, {
                    statusCode: 429,
                    code: 'ERR_RATE_LIMIT_EXCEEDED',
                    originalError: error,
                });
            }
            // 艹！500 - 服务器内部错误
            if (statusCode === 500) {
                return new GraphQLSDKError('服务器内部错误，请稍后再试', GraphQLErrorType.INTERNAL_SERVER_ERROR, {
                    statusCode: 500,
                    code: 'ERR_INTERNAL_SERVER',
                    originalError: error,
                });
            }
            // 艹！503 - 服务不可用
            if (statusCode === 503) {
                return new GraphQLSDKError('服务暂时不可用，请稍后再试', GraphQLErrorType.SERVICE_UNAVAILABLE, {
                    statusCode: 503,
                    code: 'ERR_SERVICE_UNAVAILABLE',
                    originalError: error,
                });
            }
            // 艹！其他5xx错误
            if (statusCode >= 500) {
                return new GraphQLSDKError('服务器错误，请稍后再试', GraphQLErrorType.SERVER_ERROR, {
                    statusCode,
                    code: 'ERR_SERVER_ERROR',
                    originalError: error,
                });
            }
        }
        // 艹！未知错误
        return new GraphQLSDKError(error.message || '未知错误', GraphQLErrorType.UNKNOWN_ERROR, {
            code: 'ERR_UNKNOWN',
            originalError: error,
        });
    }
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * 日志输出
     */
    log(message, data) {
        if (this.config.enableLogging) {
            console.log(`[GraphQL SDK] ${message}`, data || '');
        }
    }
    /**
     * 更新认证 token
     */
    setToken(token) {
        this.config.token = token || undefined;
        this.client.setHeader('Authorization', token ? `Bearer ${token}` : '');
        this.log('Token 已更新');
    }
    /**
     * 更新请求头
     */
    setHeaders(headers) {
        this.config.headers = { ...this.config.headers, ...headers };
        Object.entries(headers).forEach(([key, value]) => {
            this.client.setHeader(key, value);
        });
        this.log('请求头已更新', headers);
    }
    /**
     * 获取 SDK 实例
     * 艹！这个方法返回自动生成的 SDK，包含所有查询和变更方法
     */
    get api() {
        return this.sdk;
    }
    /**
     * 原始 GraphQL 客户端（用于自定义请求）
     */
    get rawClient() {
        return this.client;
    }
    /**
     * 执行原始 GraphQL 请求
     * 艹！graphql-request v7 的 API 变了，参数需要这样传
     */
    async request(document, variables) {
        try {
            this.log('执行原始 GraphQL 请求', { variables });
            // 艹！v7 版本的 request 方法签名变了，直接传就行
            const result = await this.client.request(document, variables);
            this.log('原始请求成功', result);
            return result;
        }
        catch (error) {
            throw this.parseError(error);
        }
    }
}
/**
 * 创建 GraphQL SDK 实例（工厂函数）
 */
export function createGraphQLSDK(config) {
    return new GraphQLSDK(config);
}
/**
 * 默认 SDK 实例（使用环境变量配置）
 */
export const defaultSDK = typeof window !== 'undefined'
    ? createGraphQLSDK({
        endpoint: '/api/graphql', // 客户端使用相对路径
        enableLogging: process.env.NODE_ENV === 'development',
    })
    : null;
//# sourceMappingURL=client.js.map
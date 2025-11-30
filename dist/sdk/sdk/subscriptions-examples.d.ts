/**
 * GraphQL Subscriptions 使用示例
 * 艹！这个文件展示了如何在 React 组件中使用 Subscription Hooks
 *
 * 老王我提醒你：
 * 1. 这些组件必须标记为 'use client'（客户端组件）
 * 2. Subscription 会一直保持连接直到组件卸载
 * 3. 使用 React.memo 避免不必要的重新渲染
 * 4. 显示连接状态给用户（connected）
 */
import * as React from 'react';
/**
 * 示例 1: 订阅新博客文章（Toast 通知）
 * 艹！这个示例展示了最常见的使用场景：新内容通知
 */
export declare function NewBlogPostNotification(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 2: 订阅服务器时间（健康检查）
 * 艹！这个示例用于测试 Subscription 功能是否正常
 */
export declare function ServerTimeClock(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 3: 订阅新博客文章（实时列表更新）
 * 艹！这个示例展示了如何实时更新文章列表
 */
export declare function BlogPostListWithSubscription(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 4: 自定义 Subscription（带错误处理）
 * 艹！这个示例展示了如何使用底层 API 创建自定义订阅
 */
export declare function CustomSubscriptionExample(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 5: 手动管理 Subscription 生命周期
 * 艹！这个示例展示了如何手动控制订阅的启动和停止
 */
export declare function ManualSubscriptionControl(): import("react/jsx-runtime").JSX.Element;
/**
 * 示例 6: 在 App 根组件中使用（全局通知）
 * 艹！这是最推荐的模式：在根组件启动订阅，整个应用共享
 */
export declare function AppWithSubscriptions({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
/**
 * 艹！老王我的使用建议：
 *
 * 1. **组件位置**：
 *    - 全局通知：在 App 根组件启动订阅
 *    - 页面特定：在对应页面组件启动订阅
 *    - 避免在多个组件同时订阅同一个数据
 *
 * 2. **性能优化**：
 *    - 使用 React.memo 避免不必要的重新渲染
 *    - 避免在 useEffect 中频繁操作 state
 *    - 使用函数式 setState 避免闭包陷阱
 *
 * 3. **用户体验**：
 *    - 显示连接状态（connected）
 *    - 显示错误信息（error）
 *    - 提供手动重连按钮
 *
 * 4. **错误处理**：
 *    - 始终提供 onError 回调
 *    - 记录错误到监控系统
 *    - 给用户友好的错误提示
 *
 * 5. **测试**：
 *    - 先用 useCurrentTimeSubscription 测试功能
 *    - 确认服务端 Subscription 正常工作
 *    - 测试网络断开重连场景
 */
//# sourceMappingURL=subscriptions-examples.d.ts.map
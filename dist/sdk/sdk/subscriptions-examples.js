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
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { useNewBlogPostSubscription, useCurrentTimeSubscription, useSubscription, } from './subscriptions';
/**
 * 示例 1: 订阅新博客文章（Toast 通知）
 * 艹！这个示例展示了最常见的使用场景：新内容通知
 */
export function NewBlogPostNotification() {
    const { data: newPost, connected, error } = useNewBlogPostSubscription();
    React.useEffect(() => {
        if (newPost) {
            // 艹！显示 Toast 通知（假设你有一个 toast 库）
            console.log('🎉 新文章发布:', newPost.title);
            // 实际项目中可以用 toast.success() 或 notification.show()
            // toast.success(`新文章发布：${newPost.title}`)
        }
    }, [newPost]);
    // 艹！这个组件通常是隐藏的，只负责显示通知
    return (_jsxs("div", { className: "fixed bottom-4 right-4 bg-white shadow-lg p-4 rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}` }), _jsx("span", { className: "text-sm text-gray-600", children: connected ? '实时推送已连接' : '已断开' })] }), error && (_jsxs("div", { className: "mt-2 text-sm text-red-600", children: ["\u9519\u8BEF: ", error.message] })), newPost && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "text-sm font-medium", children: newPost.title }), _jsx("div", { className: "text-xs text-gray-500", children: newPost.author?.displayName })] }))] }));
}
/**
 * 示例 2: 订阅服务器时间（健康检查）
 * 艹！这个示例用于测试 Subscription 功能是否正常
 */
export function ServerTimeClock() {
    const { data: currentTime, connected } = useCurrentTimeSubscription();
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}` }), _jsxs("span", { className: "text-sm text-gray-600", children: ["\u670D\u52A1\u5668\u65F6\u95F4: ", currentTime || '加载中...'] })] }));
}
/**
 * 示例 3: 订阅新博客文章（实时列表更新）
 * 艹！这个示例展示了如何实时更新文章列表
 */
export function BlogPostListWithSubscription() {
    const [posts, setPosts] = React.useState([]);
    const { data: newPost, connected } = useNewBlogPostSubscription();
    // 艹！当接收到新文章时，添加到列表顶部
    React.useEffect(() => {
        if (newPost) {
            setPosts((prevPosts) => {
                // 艹！检查文章是否已存在（避免重复）
                const exists = prevPosts.some((p) => p.id === newPost.id);
                if (exists) {
                    return prevPosts;
                }
                // 艹！将新文章添加到列表顶部
                return [newPost, ...prevPosts];
            });
        }
    }, [newPost]);
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-bold", children: "\u6700\u65B0\u6587\u7AE0" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}` }), _jsx("span", { className: "text-sm text-gray-500", children: connected ? '实时更新中' : '已断开' })] })] }), posts.length === 0 ? (_jsx("div", { className: "text-gray-500", children: "\u6682\u65E0\u6587\u7AE0" })) : (_jsx("ul", { className: "space-y-4", children: posts.map((post) => (_jsxs("li", { className: "border-b pb-4", children: [_jsx("h3", { className: "font-medium", children: post.title }), _jsxs("p", { className: "text-sm text-gray-500", children: [post.author?.displayName, " \u00B7 ", new Date(post.publishedAt).toLocaleDateString()] })] }, post.id))) }))] }));
}
/**
 * 示例 4: 自定义 Subscription（带错误处理）
 * 艹！这个示例展示了如何使用底层 API 创建自定义订阅
 */
export function CustomSubscriptionExample() {
    const { data, error, connected } = useSubscription('OnNewBlogPost', {
        // 艹！onData 被 Omit 排除了，不能传！数据通过返回值 data 获取
        onError: (err) => {
            console.error('Subscription 错误:', err);
        },
        onOpen: () => {
            console.log('Subscription 连接已建立');
        },
        onClose: () => {
            console.log('Subscription 连接已关闭');
        },
    });
    // 艹！使用 useEffect 监听 data 变化（替代 onData 回调）
    React.useEffect(() => {
        if (data) {
            console.log('接收到新文章:', data);
        }
    }, [data]);
    return (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}` }), _jsx("span", { className: "font-medium", children: connected ? '已连接' : '未连接' })] }), error && (_jsxs("div", { className: "p-2 bg-red-50 text-red-600 rounded mb-2", children: ["\u9519\u8BEF: ", error.message] })), data && (_jsxs("div", { className: "p-2 bg-blue-50 text-blue-600 rounded", children: ["\u6700\u65B0\u6570\u636E: ", JSON.stringify(data, null, 2)] }))] }));
}
/**
 * 示例 5: 手动管理 Subscription 生命周期
 * 艹！这个示例展示了如何手动控制订阅的启动和停止
 */
export function ManualSubscriptionControl() {
    const [isSubscribed, setIsSubscribed] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    // 艹！仅在 isSubscribed 为 true 时创建订阅
    const { data, connected } = useNewBlogPostSubscription();
    React.useEffect(() => {
        if (data && isSubscribed) {
            setMessages((prev) => [...prev, data]);
        }
    }, [data, isSubscribed]);
    return (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsxs("div", { className: "mb-4 flex items-center gap-4", children: [_jsx("button", { onClick: () => setIsSubscribed(!isSubscribed), className: `px-4 py-2 rounded ${isSubscribed
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'}`, children: isSubscribed ? '停止订阅' : '开始订阅' }), isSubscribed && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}` }), _jsx("span", { className: "text-sm", children: connected ? '已连接' : '连接中...' })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("h3", { className: "font-medium", children: ["\u63A5\u6536\u5230\u7684\u6D88\u606F (", messages.length, "):"] }), messages.length === 0 ? (_jsx("div", { className: "text-gray-500", children: "\u6682\u65E0\u6D88\u606F" })) : (_jsx("ul", { className: "space-y-2", children: messages.map((msg, idx) => (_jsx("li", { className: "p-2 bg-gray-50 rounded text-sm", children: JSON.stringify(msg, null, 2) }, idx))) }))] })] }));
}
/**
 * 示例 6: 在 App 根组件中使用（全局通知）
 * 艹！这是最推荐的模式：在根组件启动订阅，整个应用共享
 */
export function AppWithSubscriptions({ children }) {
    const { data: newPost } = useNewBlogPostSubscription();
    React.useEffect(() => {
        if (newPost) {
            // 艹！显示全局通知
            console.log('🎉 全局通知：新文章发布!', newPost.title);
            // 实际项目中可以用 toast 或 notification
            // toast.success(`新文章：${newPost.title}`, {
            //   action: {
            //     label: '查看',
            //     onClick: () => router.push(`/blog/${newPost.slug}`)
            //   }
            // })
        }
    }, [newPost]);
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=subscriptions-examples.js.map
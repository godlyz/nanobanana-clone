/**
 * GraphQL SDK - 统一导出
 * 艹！这个文件提供了最简单的 SDK 使用方式
 *
 * @example
 * ```typescript
 * import { sdk } from '@/lib/graphql/sdk'
 *
 * // 获取当前用户
 * const { me } = await sdk.api.GetMe()
 *
 * // 获取博客文章
 * const { blogPosts } = await sdk.api.GetBlogPosts({ limit: 10 })
 * ```
 */
export { GraphQLSDK, createGraphQLSDK, defaultSDK as sdk, GraphQLSDKError, GraphQLErrorType, } from './client';
// 导出 Typed Document Nodes
export { GetMeDocument, GetUserDocument, GetPublishedBlogPostsDocument, GetBlogPostDocument, GetBlogPostsWithAuthorDocument, GetLatestBlogPostsDocument, GetDraftBlogPostsDocument, GetBlogPostsConnectionDocument, GetNextPageBlogPostsDocument, GetPreviousPageBlogPostsDocument, GetBlogPostsByViewCountDocument, GetBlogPostsByLikeCountDocument, GetFullBlogPostsConnectionDocument, GetDashboardDataDocument, GetMultipleBlogPostListsDocument, GetBlogPostsWithFragmentsDocument, GetBlogPostWithFullAuthorInfoDocument, GetMultipleUsersDocument, GetConditionalDataDocument, GetOptimizedBlogPostListDocument, GetDeepNestedDataDocument, TestEchoDocument, 
// 艹！Week 8新增：Subscription Document Nodes
OnNewBlogPostDocument, OnCurrentTimeDocument, OnNewBlogPostSimpleDocument, } from '../generated/documents';
// 艹！导出 React Hooks
export { 
// Query Hooks
useGraphQLQuery, useGraphQLMutation, useCurrentUser, useBlogPosts, useBlogPost, useEchoMutation, 
// 艹！Week 8新增：Subscription Hooks
useGraphQLSubscription, useNewBlogPost, useCurrentTime, } from './hooks';
//# sourceMappingURL=index.js.map
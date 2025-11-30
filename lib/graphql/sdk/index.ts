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

export {
  GraphQLSDK,
  createGraphQLSDK,
  defaultSDK as sdk,
  GraphQLSDKError,
  GraphQLErrorType,
  type GraphQLSDKConfig,
} from './client'

// 导出生成的类型
export type {
  // Query 类型
  GetMeQuery,
  GetMeQueryVariables,
  GetUserQuery,
  GetUserQueryVariables,
  GetPublishedBlogPostsQuery,
  GetPublishedBlogPostsQueryVariables,
  GetBlogPostQuery,
  GetBlogPostQueryVariables,
  GetBlogPostsWithAuthorQuery,
  GetLatestBlogPostsQuery,
  GetDraftBlogPostsQuery,
  GetBlogPostsConnectionQuery,
  GetBlogPostsConnectionQueryVariables,
  GetNextPageBlogPostsQuery,
  GetNextPageBlogPostsQueryVariables,
  GetPreviousPageBlogPostsQuery,
  GetPreviousPageBlogPostsQueryVariables,
  GetBlogPostsByViewCountQuery,
  GetBlogPostsByLikeCountQuery,
  GetFullBlogPostsConnectionQuery,
  GetFullBlogPostsConnectionQueryVariables,
  GetDashboardDataQuery,
  GetMultipleBlogPostListsQuery,
  GetBlogPostsWithFragmentsQuery,
  GetBlogPostWithFullAuthorInfoQuery,
  GetBlogPostWithFullAuthorInfoQueryVariables,
  GetMultipleUsersQuery,
  GetMultipleUsersQueryVariables,
  GetConditionalDataQuery,
  GetConditionalDataQueryVariables,
  GetOptimizedBlogPostListQuery,
  GetDeepNestedDataQuery,

  // Mutation 类型
  TestEchoMutation,
  TestEchoMutationVariables,

  // Fragment 类型（Week 8新增：UserDetailInfo, BlogPostDetail）
  UserBasicInfoFragment,
  UserDetailInfoFragment,
  BlogPostPreviewFragment,
  BlogPostDetailFragment,

  // Schema 类型
  User,
  BlogPost,
  QueryBlogPostsConnection, // 艹！正确的类型名是 QueryBlogPostsConnection
  QueryBlogPostsConnectionEdge, // 艹！正确的类型名是 QueryBlogPostsConnectionEdge
  PageInfo,
  Mutation,
  Query,
} from '../generated/types'

// 导出 Typed Document Nodes
export {
  GetMeDocument,
  GetUserDocument,
  GetPublishedBlogPostsDocument,
  GetBlogPostDocument,
  GetBlogPostsWithAuthorDocument,
  GetLatestBlogPostsDocument,
  GetDraftBlogPostsDocument,
  GetBlogPostsConnectionDocument,
  GetNextPageBlogPostsDocument,
  GetPreviousPageBlogPostsDocument,
  GetBlogPostsByViewCountDocument,
  GetBlogPostsByLikeCountDocument,
  GetFullBlogPostsConnectionDocument,
  GetDashboardDataDocument,
  GetMultipleBlogPostListsDocument,
  GetBlogPostsWithFragmentsDocument,
  GetBlogPostWithFullAuthorInfoDocument,
  GetMultipleUsersDocument,
  GetConditionalDataDocument,
  GetOptimizedBlogPostListDocument,
  GetDeepNestedDataDocument,
  TestEchoDocument,
  // 艹！Week 8新增：Subscription Document Nodes
  OnNewBlogPostDocument,
  OnCurrentTimeDocument,
  OnNewBlogPostSimpleDocument,
} from '../generated/documents'

// 艹！导出 React Hooks
export {
  // Query Hooks
  useGraphQLQuery,
  useGraphQLMutation,
  useCurrentUser,
  useBlogPosts,
  useBlogPost,
  useEchoMutation,
  // 艹！Week 8新增：Subscription Hooks
  useGraphQLSubscription,
  useNewBlogPost,
  useCurrentTime,
  // 类型导出
  type UseGraphQLQueryOptions,
  type UseGraphQLQueryResult,
  type UseGraphQLMutationResult,
  type UseGraphQLSubscriptionOptions,
  type UseGraphQLSubscriptionResult,
} from './hooks'

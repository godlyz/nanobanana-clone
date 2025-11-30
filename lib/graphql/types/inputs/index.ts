/**
 * GraphQL Input Types Index
 *
 * 艹！这个文件统一导出所有 GraphQL Input 类型！
 * 这些Input类型用于 Mutation 操作（Create/Update/Delete/Filter）
 *
 * 老王提醒：Input类型和Object类型不同，Input用于参数输入，Object用于返回值！
 */

// ========================================
// Blog Post Inputs（博客文章输入类型）
// ========================================

/** 博客文章创建/更新/过滤输入 */
export * from './blog-post-input'

// ========================================
// Comment Inputs（评论输入类型）
// ========================================

/** 评论创建/更新输入 */
export * from './comment-input'

// ========================================
// Like Inputs（点赞输入类型）
// ========================================

/** 点赞操作输入 */
export * from './like-input'

// ========================================
// Follow Inputs（关注输入类型）
// ========================================

/** 关注操作输入 */
export * from './follow-input'

// ========================================
// Forum Inputs（论坛输入类型）
// ========================================

/** 论坛主题创建/更新输入 */
export * from './forum-thread-input'

/** 论坛回复创建/更新输入 */
export * from './forum-reply-input'

/** 论坛投票输入 */
export * from './forum-vote-input'

// ========================================
// Pagination Inputs（分页输入类型）
// ========================================

/** Relay分页参数输入（first, after, last, before） */
export * from './pagination-input'

/**
 * 艹！老王提醒：
 *
 * 1. 所有Input类型都在这里统一导出，方便在schema中使用
 * 2. Input类型用于Mutation参数，Object类型用于Query返回值，别tm搞混了！
 * 3. Pothos使用 builder.inputType() 定义Input类型
 * 4. 如果新增Input文件，别忘了在这里添加export！
 *
 * 当前已有的Input类型：
 * - BlogPostInput（博客文章创建/更新/过滤）
 * - CommentInput（评论创建/更新）
 * - LikeInput（点赞操作）
 * - FollowInput（关注操作）
 * - ForumThreadInput（论坛主题创建/更新）
 * - ForumReplyInput（论坛回复创建/更新）
 * - ForumVoteInput（论坛投票）
 * - PaginationInput（Relay分页参数）
 */

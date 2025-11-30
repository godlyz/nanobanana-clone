/**
 * GraphQL Types Index
 *
 * 艹！这个文件统一导入所有 GraphQL 类型定义！
 * 在 schema.ts 中导入这个文件，所有类型就自动注册到 builder 了！
 *
 * 老王提醒：Pothos 需要在构建 schema 之前导入所有类型定义，
 * 这样 builder 才能识别字符串引用（比如 type: 'User'）！
 */

// ========================================
// 核心类型（Core Types）
// ========================================

/** 用户类型（认证信息 + 用户资料） */
export { UserType } from './user'

/** 博客文章类型（增强版，包含分类、标签） */
export { BlogPostType } from './blog-post'

/** 博客分类类型 */
export { BlogCategoryType } from './blog-category'

/** 博客标签类型 */
export { BlogTagType } from './blog-tag'

// ========================================
// 作品和视频类型（Artwork & Video）
// ========================================

/** 作品类型（用户上传的图片作品） */
export { ArtworkType } from './artwork'

/** 视频类型（AI生成的视频） */
export { VideoType } from './video'

// ========================================
// 社交类型（Social Types）
// ========================================

/** 评论类型（作品、博客、论坛通用） */
export { CommentType } from './comment'

/** 点赞类型（作品、博客、论坛通用） */
export { LikeType } from './like'

/** 关注关系类型（用户之间的关注） */
export { FollowType } from './follow'

// ========================================
// 论坛类型（Forum Types）
// ========================================

/** 论坛分类类型 */
export { ForumCategoryType } from './forum-category'

/** 论坛主题类型（帖子） */
export { ForumThreadType } from './forum-thread'

/** 论坛回复类型 */
export { ForumReplyType } from './forum-reply'

/** 论坛投票类型（点赞/点踩） */
export { ForumVoteType } from './forum-vote'

// ========================================
// 挑战和成就类型（Challenge & Achievement）
// ========================================

/** 成就定义类型（系统定义的成就） */
export { AchievementDefinitionType } from './achievement-definition'

/** 用户成就类型（用户获得的成就） */
export { UserAchievementType } from './user-achievement'

/** 排行榜类型（挑战排名） */
export { LeaderboardType } from './leaderboard'

// ========================================
// Relay 分页类型（Connection Types）
// ========================================

/** 艹！Relay Connection/Edge 类型定义（分页专用） */
export * from './connection'

// ========================================
// Input 类型（Mutation 输入）
// ========================================

/** 艹！所有 Input 类型（Create/Update/Delete/Filter） */
export * from './inputs'

/**
 * 艹！老王提醒：
 *
 * 1. 这个文件导出了所有类型定义，在 schema.ts 中导入即可自动注册
 * 2. Pothos 使用副作用导入（Side-effect Imports），导入即注册
 * 3. 如果新增类型文件，别tm忘了在这里添加导出！
 * 4. Connection 类型和 Input 类型用 `export *` 批量导出
 */

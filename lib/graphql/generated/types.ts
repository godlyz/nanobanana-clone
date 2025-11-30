import type { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
}

export type AchievementConditionType =
  /** 成就点数 */
  | 'ACHIEVEMENT_POINTS'
  /** 评论数量 */
  | 'COMMENTS_COUNT'
  /** 粉丝数量 */
  | 'FOLLOWERS_COUNT'
  /** 收到的点赞数 */
  | 'LIKES_RECEIVED'
  /** 视频数量 */
  | 'VIDEOS_COUNT'
  /** 作品数量 */
  | 'WORKS_COUNT';

/** 成就定义类型（定义成就的元数据和解锁条件） */
export interface AchievementDefinition {
  __typename?: 'AchievementDefinition';
  /** 徽章图标（emoji或URL） */
  badgeIcon?: Maybe<Scalars['String']['output']>;
  /** 条件类型 */
  conditionType?: Maybe<AchievementConditionType>;
  /** 条件值（达到多少触发） */
  conditionValue?: Maybe<Scalars['Int']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 成就描述（中文） */
  description?: Maybe<Scalars['String']['output']>;
  /** 成就描述（英文） */
  descriptionEn?: Maybe<Scalars['String']['output']>;
  /** 成就难度等级（easy/medium/hard/extreme） */
  difficultyLevel?: Maybe<Scalars['String']['output']>;
  /** 成就唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否启用（false表示已废弃） */
  isActive?: Maybe<Scalars['Boolean']['output']>;
  /** 是否隐藏成就（达成前不显示） */
  isHidden?: Maybe<Scalars['Boolean']['output']>;
  /** 成就名称（中文） */
  name?: Maybe<Scalars['String']['output']>;
  /** 成就名称（英文） */
  nameEn?: Maybe<Scalars['String']['output']>;
  /** 成就点数（解锁后获得的点数） */
  points?: Maybe<Scalars['Int']['output']>;
  /** 排序权重（越小越靠前） */
  sortOrder?: Maybe<Scalars['Int']['output']>;
  /** 成就等级（bronze/silver/gold/platinum/diamond） */
  tier?: Maybe<AchievementTier>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
}

export type AchievementTier =
  /** 青铜成就 */
  | 'BRONZE'
  /** 钻石成就 */
  | 'DIAMOND'
  /** 黄金成就 */
  | 'GOLD'
  /** 铂金成就 */
  | 'PLATINUM'
  /** 白银成就 */
  | 'SILVER';

/** 作品类型（图片或视频） */
export interface Artwork {
  __typename?: 'Artwork';
  /** 作品类型（image 或 video） */
  artworkType?: Maybe<Scalars['String']['output']>;
  /** 宽高比（如 16:9, 9:16） */
  aspectRatio?: Maybe<Scalars['String']['output']>;
  /** 作品作者 */
  author?: Maybe<User>;
  /** 完成时间（ISO 8601格式） */
  completedAt?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 时长（秒，仅视频） */
  duration?: Maybe<Scalars['Int']['output']>;
  /** 文件大小（字节） */
  fileSizeBytes?: Maybe<Scalars['Int']['output']>;
  /** 高度（像素，仅图片） */
  height?: Maybe<Scalars['Int']['output']>;
  /** 作品唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 当前用户是否已点赞 */
  isLiked?: Maybe<Scalars['Boolean']['output']>;
  /** 是否公开 */
  isPublic?: Maybe<Scalars['Boolean']['output']>;
  /** 点赞数量 */
  likeCount?: Maybe<Scalars['Int']['output']>;
  /** 创作提示词 */
  prompt?: Maybe<Scalars['String']['output']>;
  /** 分辨率（如 720p, 1080p） */
  resolution?: Maybe<Scalars['String']['output']>;
  /** 状态（processing, completed, failed等） */
  status?: Maybe<Scalars['String']['output']>;
  /** 缩略图URL */
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  /** 作品URL（图片或视频） */
  url?: Maybe<Scalars['String']['output']>;
  /** 作品作者的用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
  /** 浏览次数 */
  viewCount?: Maybe<Scalars['Int']['output']>;
  /** 宽度（像素，仅图片） */
  width?: Maybe<Scalars['Int']['output']>;
}

/** 博客分类类型 */
export interface BlogCategory {
  __typename?: 'BlogCategory';
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 分类描述 */
  description?: Maybe<Scalars['String']['output']>;
  /** 分类唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 分类名称 */
  name?: Maybe<Scalars['String']['output']>;
  /** 该分类下的文章数量 */
  postCount?: Maybe<Scalars['Int']['output']>;
  /** 分类URL友好标识符 */
  slug?: Maybe<Scalars['String']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
}

/** 博客文章类型 */
export interface BlogPost {
  __typename?: 'BlogPost';
  /** 文章作者 */
  author?: Maybe<User>;
  /** 文章分类列表 */
  categories?: Maybe<Array<BlogCategory>>;
  /** 评论次数 */
  commentCount?: Maybe<Scalars['Int']['output']>;
  /** 文章评论列表 */
  comments?: Maybe<Array<Comment>>;
  /** 文章内容（Markdown格式） */
  content?: Maybe<Scalars['String']['output']>;
  /** 封面图片URL */
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 文章摘要 */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** 文章唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 当前用户是否已点赞 */
  isLiked?: Maybe<Scalars['Boolean']['output']>;
  /** 点赞次数 */
  likeCount?: Maybe<Scalars['Int']['output']>;
  /** 文章点赞列表 */
  likes?: Maybe<Array<Like>>;
  /** SEO描述 */
  metaDescription?: Maybe<Scalars['String']['output']>;
  /** SEO关键词 */
  metaKeywords?: Maybe<Scalars['String']['output']>;
  /** SEO标题 */
  metaTitle?: Maybe<Scalars['String']['output']>;
  /** 发布时间（ISO 8601格式） */
  publishedAt?: Maybe<Scalars['String']['output']>;
  /** 阅读时长估算（分钟） */
  readingTime?: Maybe<Scalars['Int']['output']>;
  /** 文章URL友好标识符 */
  slug?: Maybe<Scalars['String']['output']>;
  /** 文章状态 */
  status?: Maybe<BlogPostStatus>;
  /** 文章标签列表 */
  tags?: Maybe<Array<BlogTag>>;
  /** 文章标题 */
  title?: Maybe<Scalars['String']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 作者用户ID（UUID） */
  userId?: Maybe<Scalars['String']['output']>;
  /** 浏览次数 */
  viewCount?: Maybe<Scalars['Int']['output']>;
}


/** 博客文章类型 */
export interface BlogPostcommentsArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** 博客文章类型 */
export interface BlogPostlikesArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}

/** 博客文章过滤器 */
export interface BlogPostFilter {
  /** 按作者 ID 筛选 */
  authorId?: InputMaybe<Scalars['ID']['input']>;
  /** 按分类 ID 筛选 */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 是否公开 */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** 搜索关键词（标题或内容） */
  search?: InputMaybe<Scalars['String']['input']>;
  /** 按状态筛选（draft/published） */
  status?: InputMaybe<Scalars['String']['input']>;
  /** 按标签 ID 筛选 */
  tagId?: InputMaybe<Scalars['ID']['input']>;
}

/** 博客文章排序 */
export interface BlogPostOrderBy {
  /** 排序方向（asc/desc，默认 desc） */
  direction?: InputMaybe<Scalars['String']['input']>;
  /** 排序字段（created_at/updated_at/view_count/like_count） */
  field: Scalars['String']['input'];
}

export type BlogPostStatus =
  /** 草稿 */
  | 'DRAFT'
  /** 已发布 */
  | 'PUBLISHED';

/** 博客标签类型 */
export interface BlogTag {
  __typename?: 'BlogTag';
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 标签唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 标签名称 */
  name?: Maybe<Scalars['String']['output']>;
  /** 该标签下的文章数量 */
  postCount?: Maybe<Scalars['Int']['output']>;
  /** 标签URL友好标识符 */
  slug?: Maybe<Scalars['String']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
}

/** 评论类型（支持嵌套回复） */
export interface Comment {
  __typename?: 'Comment';
  /** 评论作者 */
  author?: Maybe<User>;
  /** 是否可以回复（深度<2） */
  canReply?: Maybe<Scalars['Boolean']['output']>;
  /** 评论内容 */
  content?: Maybe<Scalars['String']['output']>;
  /** 被评论内容的ID（博客/作品/视频） */
  contentId?: Maybe<Scalars['ID']['output']>;
  /** 评论对象类型（blog_post/artwork/video） */
  contentType?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 嵌套深度（0=顶级，1=一级回复，2=二级回复） */
  depth?: Maybe<Scalars['Int']['output']>;
  /** 评论唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 是否已编辑 */
  isEdited?: Maybe<Scalars['Boolean']['output']>;
  /** 当前用户是否已点赞 */
  isLiked?: Maybe<Scalars['Boolean']['output']>;
  /** 点赞数量 */
  likeCount?: Maybe<Scalars['Int']['output']>;
  /** 父评论（null表示顶级评论） */
  parent?: Maybe<Comment>;
  /** 父评论ID（null表示顶级评论） */
  parentId?: Maybe<Scalars['ID']['output']>;
  /** 子评论列表（回复） */
  replies?: Maybe<Array<Comment>>;
  /** 回复数量 */
  replyCount?: Maybe<Scalars['Int']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 评论作者的用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
}


/** 评论类型（支持嵌套回复） */
export interface CommentrepliesArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}

/** 评论过滤器 */
export interface CommentFilter {
  /** 按内容 ID 筛选 */
  contentId?: InputMaybe<Scalars['ID']['input']>;
  /** 按内容类型筛选（blog_post/artwork/video） */
  contentType?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 按父评论 ID 筛选（null 表示顶级评论） */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** 按用户 ID 筛选 */
  userId?: InputMaybe<Scalars['ID']['input']>;
}

/** 评论排序 */
export interface CommentOrderBy {
  /** 排序方向（asc/desc，默认 desc） */
  direction?: InputMaybe<Scalars['String']['input']>;
  /** 排序字段（created_at/like_count） */
  field: Scalars['String']['input'];
}

/** 创建博客文章输入 */
export interface CreateBlogPostInput {
  /** 分类 ID 列表（可选） */
  categoryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 文章内容（Markdown 格式） */
  content: Scalars['String']['input'];
  /** 封面图片 URL（可选） */
  coverImage?: InputMaybe<Scalars['String']['input']>;
  /** 文章摘要（可选，如果不提供则自动生成） */
  excerpt?: InputMaybe<Scalars['String']['input']>;
  /** 是否公开（默认 true） */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** 文章 slug（可选，如果不提供则自动生成） */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** 发布状态（draft/published，默认 draft） */
  status?: InputMaybe<Scalars['String']['input']>;
  /** 标签 ID 列表（可选） */
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 文章标题（3-200字符） */
  title: Scalars['String']['input'];
}

/** 创建评论输入 */
export interface CreateCommentInput {
  /** 评论内容（1-5000字符） */
  content: Scalars['String']['input'];
  /** 内容 ID（博客文章/作品/视频） */
  contentId: Scalars['ID']['input'];
  /** 内容类型（blog_post/artwork/video） */
  contentType: Scalars['String']['input'];
  /** 父评论 ID（嵌套回复时使用，最多2层） */
  parentId?: InputMaybe<Scalars['ID']['input']>;
}

/** 创建关注输入 */
export interface CreateFollowInput {
  /** 被关注用户的 ID */
  followingId: Scalars['ID']['input'];
}

/** 创建论坛回复输入 */
export interface CreateForumReplyInput {
  /** 回复内容（1-10000字符） */
  content: Scalars['String']['input'];
  /** 父回复 ID（嵌套回复时使用） */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** 主题 ID */
  threadId: Scalars['ID']['input'];
}

/** 创建论坛主题输入 */
export interface CreateForumThreadInput {
  /** 分类 ID */
  categoryId: Scalars['ID']['input'];
  /** 主题内容（10-50000字符） */
  content: Scalars['String']['input'];
  /** 是否公开（默认 true） */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** 标签 ID 列表（可选） */
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 主题标题（3-200字符） */
  title: Scalars['String']['input'];
}

/** 创建论坛投票输入 */
export interface CreateForumVoteInput {
  /** 投票目标 ID（主题 ID 或回复 ID） */
  targetId: Scalars['ID']['input'];
  /** 投票目标类型（thread/reply） */
  targetType: Scalars['String']['input'];
  /** 投票类型（upvote/downvote） */
  voteType: Scalars['String']['input'];
}

/** 创建点赞输入 */
export interface CreateLikeInput {
  /** 内容 ID（博客文章/作品/评论） */
  contentId: Scalars['ID']['input'];
  /** 点赞类型（blog_post/artwork/comment） */
  likeType: Scalars['String']['input'];
}

/** 游标分页输入（基于游标） */
export interface CursorPaginationInput {
  /** 游标：从这个位置之后开始取（Base64 编码） */
  after?: InputMaybe<Scalars['String']['input']>;
  /** 游标：从这个位置之前开始取（Base64 编码） */
  before?: InputMaybe<Scalars['String']['input']>;
  /** 向前取多少条（与 after 配合使用） */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** 向后取多少条（与 before 配合使用） */
  last?: InputMaybe<Scalars['Int']['input']>;
}

/** 取消关注输入 */
export interface DeleteFollowInput {
  /** 被关注用户的 ID */
  followingId: Scalars['ID']['input'];
}

/** 取消论坛投票输入 */
export interface DeleteForumVoteInput {
  /** 投票目标 ID（主题 ID 或回复 ID） */
  targetId: Scalars['ID']['input'];
  /** 投票目标类型（thread/reply） */
  targetType: Scalars['String']['input'];
}

/** 取消点赞输入 */
export interface DeleteLikeInput {
  /** 内容 ID（博客文章/作品/评论） */
  contentId: Scalars['ID']['input'];
  /** 点赞类型（blog_post/artwork/comment） */
  likeType: Scalars['String']['input'];
}

/** 关注关系类型（用户关注/粉丝） */
export interface Follow {
  __typename?: 'Follow';
  /** 关注时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 关注者（粉丝） */
  follower?: Maybe<User>;
  /** 关注者的用户ID */
  followerId?: Maybe<Scalars['ID']['output']>;
  /** 被关注者 */
  following?: Maybe<User>;
  /** 被关注者的用户ID */
  followingId?: Maybe<Scalars['ID']['output']>;
  /** 是否相互关注（互粉） */
  isMutual?: Maybe<Scalars['Boolean']['output']>;
}

/** 关注过滤器 */
export interface FollowFilter {
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 按关注者 ID 筛选（查询某人关注了谁） */
  followerId?: InputMaybe<Scalars['ID']['input']>;
  /** 按被关注者 ID 筛选（查询某人的粉丝） */
  followingId?: InputMaybe<Scalars['ID']['input']>;
}

/** 论坛分类类型 */
export interface ForumCategory {
  __typename?: 'ForumCategory';
  /** 分类颜色（十六进制） */
  color?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 分类描述（中文） */
  description?: Maybe<Scalars['String']['output']>;
  /** 分类描述（英文） */
  descriptionEn?: Maybe<Scalars['String']['output']>;
  /** 分类图标（emoji） */
  icon?: Maybe<Scalars['String']['output']>;
  /** 分类唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 分类名称（中文） */
  name?: Maybe<Scalars['String']['output']>;
  /** 分类名称（英文） */
  nameEn?: Maybe<Scalars['String']['output']>;
  /** 该分类下的回复总数 */
  replyCount?: Maybe<Scalars['Int']['output']>;
  /** 分类URL友好标识符 */
  slug?: Maybe<Scalars['String']['output']>;
  /** 排序顺序（越小越靠前） */
  sortOrder?: Maybe<Scalars['Int']['output']>;
  /** 该分类下的主题数量 */
  threadCount?: Maybe<Scalars['Int']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
}

/** 论坛回复类型（对主题或回复的回复） */
export interface ForumReply {
  __typename?: 'ForumReply';
  /** 回复者 */
  author?: Maybe<User>;
  /** 回复内容 */
  content?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 回复层级深度（0=直接回复，1=嵌套回复） */
  depth?: Maybe<Scalars['Int']['output']>;
  /** 点踩数 */
  downvoteCount?: Maybe<Scalars['Int']['output']>;
  /** 回复唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被标记为最佳答案 */
  isAcceptedAnswer?: Maybe<Scalars['Boolean']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 是否是直接回复主题（parent_id为null） */
  isDirectReply?: Maybe<Scalars['Boolean']['output']>;
  /** 是否已编辑 */
  isEdited?: Maybe<Scalars['Boolean']['output']>;
  /** 是否是新回复（24小时内） */
  isRecent?: Maybe<Scalars['Boolean']['output']>;
  /** 是否被举报 */
  isReported?: Maybe<Scalars['Boolean']['output']>;
  /** 父回复（null表示直接回复主题） */
  parent?: Maybe<ForumReply>;
  /** 父回复ID（null表示直接回复主题） */
  parentId?: Maybe<Scalars['String']['output']>;
  /** 子回复列表（嵌套回复） */
  replies?: Maybe<Array<ForumReply>>;
  /** 举报次数 */
  reportCount?: Maybe<Scalars['Int']['output']>;
  /** 所属论坛主题 */
  thread?: Maybe<ForumThread>;
  /** 所属主题ID */
  threadId?: Maybe<Scalars['ID']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 点赞数 */
  upvoteCount?: Maybe<Scalars['Int']['output']>;
  /** 回复者用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
  /** 投票分数（upvote - downvote） */
  voteScore?: Maybe<Scalars['Int']['output']>;
}


/** 论坛回复类型（对主题或回复的回复） */
export interface ForumReplyrepliesArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}

/** 论坛回复过滤器 */
export interface ForumReplyFilter {
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 是否为最佳答案 */
  isAcceptedAnswer?: InputMaybe<Scalars['Boolean']['input']>;
  /** 按父回复 ID 筛选（null 表示直接回复主题） */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** 按主题 ID 筛选 */
  threadId?: InputMaybe<Scalars['ID']['input']>;
  /** 按用户 ID 筛选 */
  userId?: InputMaybe<Scalars['ID']['input']>;
}

/** 论坛回复排序 */
export interface ForumReplyOrderBy {
  /** 排序方向（asc/desc，默认 asc） */
  direction?: InputMaybe<Scalars['String']['input']>;
  /** 排序字段（created_at/upvote_count） */
  field: Scalars['String']['input'];
}

/** 论坛主题类型（论坛帖子） */
export interface ForumThread {
  __typename?: 'ForumThread';
  /** 活跃度分数（回复数 + 浏览数*0.1） */
  activityScore?: Maybe<Scalars['Float']['output']>;
  /** 帖子作者 */
  author?: Maybe<User>;
  /** 是否可以回复（未锁定且状态为open） */
  canReply?: Maybe<Scalars['Boolean']['output']>;
  /** 所属论坛分类 */
  category?: Maybe<ForumCategory>;
  /** 所属分类ID */
  categoryId?: Maybe<Scalars['ID']['output']>;
  /** 主题内容（≥10字符） */
  content?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 删除时间（软删除，ISO 8601格式） */
  deletedAt?: Maybe<Scalars['String']['output']>;
  /** 点踩数 */
  downvoteCount?: Maybe<Scalars['Int']['output']>;
  /** 是否有最新回复（24小时内） */
  hasRecentReply?: Maybe<Scalars['Boolean']['output']>;
  /** 主题唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否被软删除 */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** 是否精华帖 */
  isFeatured?: Maybe<Scalars['Boolean']['output']>;
  /** 是否锁定（禁止回复） */
  isLocked?: Maybe<Scalars['Boolean']['output']>;
  /** 是否置顶 */
  isPinned?: Maybe<Scalars['Boolean']['output']>;
  /** 是否是新帖（3天内） */
  isRecent?: Maybe<Scalars['Boolean']['output']>;
  /** 是否被举报 */
  isReported?: Maybe<Scalars['Boolean']['output']>;
  /** 最后回复时间（ISO 8601格式） */
  lastReplyAt?: Maybe<Scalars['String']['output']>;
  /** 最后回复用户 */
  lastReplyUser?: Maybe<User>;
  /** 最后回复用户ID */
  lastReplyUserId?: Maybe<Scalars['String']['output']>;
  /** 回复列表 */
  replies?: Maybe<Array<ForumReply>>;
  /** 回复数量 */
  replyCount?: Maybe<Scalars['Int']['output']>;
  /** 举报次数 */
  reportCount?: Maybe<Scalars['Int']['output']>;
  /** 主题URL slug */
  slug?: Maybe<Scalars['String']['output']>;
  /** 主题状态（open/closed/archived） */
  status?: Maybe<ForumThreadStatus>;
  /** 主题标题（3-200字符） */
  title?: Maybe<Scalars['String']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 点赞数 */
  upvoteCount?: Maybe<Scalars['Int']['output']>;
  /** 作者用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
  /** 浏览次数 */
  viewCount?: Maybe<Scalars['Int']['output']>;
  /** 投票分数（upvote - downvote） */
  voteScore?: Maybe<Scalars['Int']['output']>;
}


/** 论坛主题类型（论坛帖子） */
export interface ForumThreadrepliesArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}

/** 论坛主题过滤器 */
export interface ForumThreadFilter {
  /** 按分类 ID 筛选 */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 是否为精华帖 */
  isFeatured?: InputMaybe<Scalars['Boolean']['input']>;
  /** 是否已锁定 */
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  /** 是否已置顶 */
  isPinned?: InputMaybe<Scalars['Boolean']['input']>;
  /** 搜索关键词（标题或内容） */
  search?: InputMaybe<Scalars['String']['input']>;
  /** 按状态筛选（open/closed/archived） */
  status?: InputMaybe<Scalars['String']['input']>;
  /** 按标签 ID 筛选 */
  tagId?: InputMaybe<Scalars['ID']['input']>;
  /** 按作者 ID 筛选 */
  userId?: InputMaybe<Scalars['ID']['input']>;
}

/** 论坛主题排序 */
export interface ForumThreadOrderBy {
  /** 排序方向（asc/desc，默认 desc） */
  direction?: InputMaybe<Scalars['String']['input']>;
  /** 排序字段（created_at/updated_at/last_reply_at/view_count/reply_count/upvote_count） */
  field: Scalars['String']['input'];
}

export type ForumThreadStatus =
  /** 已归档 */
  | 'ARCHIVED'
  /** 已关闭 */
  | 'CLOSED'
  /** 开放中 */
  | 'OPEN';

/** 论坛投票类型（对主题或回复的点赞/点踩） */
export interface ForumVote {
  __typename?: 'ForumVote';
  /** 投票时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 投票唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否是点踩（downvote） */
  isDownvote?: Maybe<Scalars['Boolean']['output']>;
  /** 是否是点赞（upvote） */
  isUpvote?: Maybe<Scalars['Boolean']['output']>;
  /** 投票目标回复（仅 target_type=reply） */
  reply?: Maybe<ForumReply>;
  /** 投票目标ID（主题ID或回复ID） */
  targetId?: Maybe<Scalars['ID']['output']>;
  /** 投票目标类型（thread/reply） */
  targetType?: Maybe<ForumVoteTargetType>;
  /** 投票目标主题（仅 target_type=thread） */
  thread?: Maybe<ForumThread>;
  /** 投票用户 */
  user?: Maybe<User>;
  /** 投票用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
  /** 投票类型（upvote/downvote） */
  voteType?: Maybe<ForumVoteType>;
  /** 投票权重（upvote=1, downvote=-1） */
  voteWeight?: Maybe<Scalars['Int']['output']>;
}

/** 论坛投票过滤器 */
export interface ForumVoteFilter {
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 按目标 ID 筛选 */
  targetId?: InputMaybe<Scalars['ID']['input']>;
  /** 按目标类型筛选（thread/reply） */
  targetType?: InputMaybe<Scalars['String']['input']>;
  /** 按用户 ID 筛选 */
  userId?: InputMaybe<Scalars['ID']['input']>;
  /** 按投票类型筛选（upvote/downvote） */
  voteType?: InputMaybe<Scalars['String']['input']>;
}

export type ForumVoteTargetType =
  /** 回复 */
  | 'REPLY'
  /** 主题帖 */
  | 'THREAD';

export type ForumVoteType =
  /** 点踩 */
  | 'DOWNVOTE'
  /** 点赞 */
  | 'UPVOTE';

/** 排行榜类型（用户统计数据，用于排行榜展示） */
export interface Leaderboard {
  __typename?: 'Leaderboard';
  /** 成就进度百分比（已解锁成就数 / 总成就数 * 100） */
  achievementProgress?: Maybe<Scalars['Float']['output']>;
  /** 解锁成就数 */
  achievementsCount?: Maybe<Scalars['Int']['output']>;
  /** 活跃度评级（inactive/low/medium/high/very_high） */
  activityLevel?: Maybe<Scalars['String']['output']>;
  /** 平均每作品点赞数 */
  avgLikesPerWork?: Maybe<Scalars['Float']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 粉丝数 */
  followersCount?: Maybe<Scalars['Int']['output']>;
  /** 关注数 */
  followingCount?: Maybe<Scalars['Int']['output']>;
  /** 影响力比率（粉丝数 / 关注数，越高越有影响力） */
  influenceRatio?: Maybe<Scalars['Float']['output']>;
  /** 最后计算时间（ISO 8601格式） */
  lastCalculatedAt?: Maybe<Scalars['String']['output']>;
  /** 排行榜综合积分（作品*10 + 点赞*1 + 粉丝*5 + 成就点数*0.5） */
  leaderboardScore?: Maybe<Scalars['Int']['output']>;
  /** 本月收到的点赞数 */
  monthlyLikes?: Maybe<Scalars['Int']['output']>;
  /** 本月发布的作品数 */
  monthlyWorks?: Maybe<Scalars['Int']['output']>;
  /** 成就总点数 */
  totalAchievementPoints?: Maybe<Scalars['Int']['output']>;
  /** 收到的总评论数 */
  totalCommentsReceived?: Maybe<Scalars['Int']['output']>;
  /** 总图片数（作品数 - 视频数） */
  totalImages?: Maybe<Scalars['Int']['output']>;
  /** 收到的总点赞数 */
  totalLikesReceived?: Maybe<Scalars['Int']['output']>;
  /** 总视频数 */
  totalVideos?: Maybe<Scalars['Int']['output']>;
  /** 总浏览量 */
  totalViews?: Maybe<Scalars['Int']['output']>;
  /** 总作品数（图片+视频） */
  totalWorks?: Maybe<Scalars['Int']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 用户信息 */
  user?: Maybe<User>;
  /** 用户ID（UUID） */
  userId?: Maybe<Scalars['ID']['output']>;
  /** 本周收到的点赞数 */
  weeklyLikes?: Maybe<Scalars['Int']['output']>;
  /** 本周发布的作品数 */
  weeklyWorks?: Maybe<Scalars['Int']['output']>;
}

/** 点赞类型（统一管理所有点赞） */
export interface Like {
  __typename?: 'Like';
  /** 被点赞的作品（仅 like_type=artwork） */
  artwork?: Maybe<Artwork>;
  /** 被点赞的博客文章（仅 like_type=blog_post） */
  blogPost?: Maybe<BlogPost>;
  /** 被点赞的评论（仅 like_type=comment） */
  comment?: Maybe<Comment>;
  /** 被点赞内容的ID（博客/作品/评论） */
  contentId?: Maybe<Scalars['ID']['output']>;
  /** 点赞时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 点赞唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 点赞对象类型（blog_post/artwork/comment） */
  likeType?: Maybe<Scalars['String']['output']>;
  /** 点赞用户 */
  user?: Maybe<User>;
  /** 点赞用户的用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
}

/** 点赞过滤器 */
export interface LikeFilter {
  /** 按内容 ID 筛选 */
  contentId?: InputMaybe<Scalars['ID']['input']>;
  /** 创建时间晚于（ISO 8601格式） */
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  /** 创建时间早于（ISO 8601格式） */
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  /** 按点赞类型筛选（blog_post/artwork/comment） */
  likeType?: InputMaybe<Scalars['String']['input']>;
  /** 按用户 ID 筛选 */
  userId?: InputMaybe<Scalars['ID']['input']>;
}

/** GraphQL 变更操作入口 */
export interface Mutation {
  __typename?: 'Mutation';
  /** 创建博客文章 */
  createBlogPost?: Maybe<BlogPost>;
  /** 创建评论 */
  createComment?: Maybe<Comment>;
  /** 关注用户 */
  createFollow?: Maybe<Follow>;
  /** 创建论坛回复 */
  createForumReply?: Maybe<ForumReply>;
  /** 创建论坛主题 */
  createForumThread?: Maybe<ForumThread>;
  /** 创建论坛投票（upvote/downvote） */
  createForumVote?: Maybe<ForumVote>;
  /** 点赞 */
  createLike?: Maybe<Like>;
  /** 删除博客文章（软删除） */
  deleteBlogPost?: Maybe<Scalars['Boolean']['output']>;
  /** 取消关注 */
  deleteFollow?: Maybe<Scalars['Boolean']['output']>;
  /** 删除论坛投票（取消投票） */
  deleteForumVote?: Maybe<Scalars['Boolean']['output']>;
  /** 取消点赞 */
  deleteLike?: Maybe<Scalars['Boolean']['output']>;
  /** 测试 Mutation：回显输入的消息 */
  echo?: Maybe<Scalars['String']['output']>;
  /** 更新博客文章 */
  updateBlogPost?: Maybe<BlogPost>;
  /** 更新论坛投票（从upvote改为downvote或反之） */
  updateForumVote?: Maybe<ForumVote>;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateBlogPostArgs {
  input: CreateBlogPostInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateCommentArgs {
  input: CreateCommentInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateFollowArgs {
  input: CreateFollowInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateForumReplyArgs {
  input: CreateForumReplyInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateForumThreadArgs {
  input: CreateForumThreadInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateForumVoteArgs {
  input: CreateForumVoteInput;
}


/** GraphQL 变更操作入口 */
export interface MutationcreateLikeArgs {
  input: CreateLikeInput;
}


/** GraphQL 变更操作入口 */
export interface MutationdeleteBlogPostArgs {
  id: Scalars['ID']['input'];
}


/** GraphQL 变更操作入口 */
export interface MutationdeleteFollowArgs {
  input: DeleteFollowInput;
}


/** GraphQL 变更操作入口 */
export interface MutationdeleteForumVoteArgs {
  input: DeleteForumVoteInput;
}


/** GraphQL 变更操作入口 */
export interface MutationdeleteLikeArgs {
  input: DeleteLikeInput;
}


/** GraphQL 变更操作入口 */
export interface MutationechoArgs {
  message: Scalars['String']['input'];
}


/** GraphQL 变更操作入口 */
export interface MutationupdateBlogPostArgs {
  id: Scalars['ID']['input'];
  input: UpdateBlogPostInput;
}


/** GraphQL 变更操作入口 */
export interface MutationupdateForumVoteArgs {
  id: Scalars['ID']['input'];
  input: UpdateForumVoteInput;
}

export interface PageInfo {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
}

/** 分页输入（基于偏移量） */
export interface PaginationInput {
  /** 每页数量（默认10，最大100） */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** 偏移量（默认0） */
  offset?: InputMaybe<Scalars['Int']['input']>;
}

/** GraphQL 查询入口 */
export interface Query {
  __typename?: 'Query';
  /** 获取单个作品（图片或视频） */
  artwork?: Maybe<Artwork>;
  /** 获取某个作品的点赞用户列表 */
  artworkLikes?: Maybe<Array<Like>>;
  /** 获取作品统计信息（总数、分类统计等） */
  artworkStats?: Maybe<Scalars['String']['output']>;
  /** 获取作品列表（图片或视频） */
  artworks?: Maybe<Array<Artwork>>;
  /** 按宽高比过滤作品（16:9 或 9:16） */
  artworksByAspectRatio?: Maybe<Array<Artwork>>;
  /** 按时长过滤视频作品（4秒、6秒或8秒） */
  artworksByDuration?: Maybe<Array<Artwork>>;
  /** 通过提示词搜索作品（支持模糊匹配） */
  artworksByPrompt?: Maybe<Array<Artwork>>;
  /** 按分辨率过滤作品（720p 或 1080p） */
  artworksByResolution?: Maybe<Array<Artwork>>;
  /** 获取作品列表（Relay 分页） */
  artworksConnection?: Maybe<QueryArtworksConnection>;
  /** 根据文章ID获取博客文章 */
  blogPost?: Maybe<BlogPost>;
  /** 获取博客文章列表 */
  blogPosts?: Maybe<Array<BlogPost>>;
  /** Relay-style 博客文章分页查询 (使用 cursor 分页) */
  blogPostsConnection?: Maybe<QueryBlogPostsConnection>;
  /** 获取评论列表 */
  comments?: Maybe<Array<Comment>>;
  /** 返回当前服务器时间（ISO 格式） */
  currentTime?: Maybe<Scalars['String']['output']>;
  /** 获取当前用户失败的视频任务 */
  failedVideos?: Maybe<Array<Video>>;
  /** 获取精选作品（管理员推荐） */
  featuredArtworks?: Maybe<Array<Artwork>>;
  /** 获取用户的粉丝列表 */
  followers?: Maybe<Array<Follow>>;
  /** 获取用户关注的人列表 */
  following?: Maybe<Array<Follow>>;
  /** 获取论坛回复列表 */
  forumReplies?: Maybe<Array<ForumReply>>;
  /** 根据ID获取论坛主题 */
  forumThread?: Maybe<ForumThread>;
  /** 获取论坛主题列表 */
  forumThreads?: Maybe<Array<ForumThread>>;
  /** 测试查询：返回 Hello World */
  hello?: Maybe<Scalars['String']['output']>;
  /** 获取排行榜（按leaderboard_score排序） */
  leaderboard?: Maybe<Array<Leaderboard>>;
  /** 获取用户点赞的作品列表 */
  likedArtworks?: Maybe<Array<Artwork>>;
  /** 获取当前登录用户信息（需要认证） */
  me?: Maybe<User>;
  /** 获取当前登录用户的所有作品 */
  myArtworks?: Maybe<Array<Artwork>>;
  /** 获取当前登录用户的所有视频 */
  myVideos?: Maybe<Array<Video>>;
  /** 获取当前用户正在处理的视频任务 */
  processingVideos?: Maybe<Array<Video>>;
  /** 获取所有公开的作品（用于画廊展示） */
  publicArtworks?: Maybe<Array<Artwork>>;
  /** 获取最近创建的作品 */
  recentArtworks?: Maybe<Array<Artwork>>;
  /** 获取最近完成的视频 */
  recentVideos?: Maybe<Array<Video>>;
  /** 获取热门作品（按点赞数和浏览量排序） */
  trendingArtworks?: Maybe<Array<Artwork>>;
  /** 根据用户ID获取用户信息 */
  user?: Maybe<User>;
  /** 获取用户的所有作品（图片和视频） */
  userArtworks?: Maybe<Array<Artwork>>;
  /** 获取指定用户的所有视频 */
  userVideos?: Maybe<Array<Video>>;
  /** 获取用户列表（支持搜索和过滤） */
  users?: Maybe<Array<User>>;
  /** 获取单个视频详情 */
  video?: Maybe<Video>;
  /** 通过 Google Veo operation_id 查询视频 */
  videoByOperationId?: Maybe<Video>;
  /** 获取视频统计信息（总数、状态分布等） */
  videoStats?: Maybe<Scalars['String']['output']>;
  /** 获取视频列表（支持多种过滤条件） */
  videos?: Maybe<Array<Video>>;
  /** 获取视频列表（Relay 分页） */
  videosConnection?: Maybe<QueryVideosConnection>;
}


/** GraphQL 查询入口 */
export interface QueryartworkArgs {
  id: Scalars['ID']['input'];
  type: Scalars['String']['input'];
}


/** GraphQL 查询入口 */
export interface QueryartworkLikesArgs {
  artworkId: Scalars['ID']['input'];
  artworkType: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryartworksArgs {
  artworkType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryartworksByAspectRatioArgs {
  aspectRatio: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryartworksByDurationArgs {
  duration: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryartworksByPromptArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search: Scalars['String']['input'];
}


/** GraphQL 查询入口 */
export interface QueryartworksByResolutionArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  resolution: Scalars['String']['input'];
}


/** GraphQL 查询入口 */
export interface QueryartworksConnectionArgs {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryblogPostArgs {
  id: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryblogPostsArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryblogPostsConnectionArgs {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  orderDirection?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QuerycommentsArgs {
  contentId?: InputMaybe<Scalars['ID']['input']>;
  contentType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryfailedVideosArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryfeaturedArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryfollowersArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryfollowingArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryforumRepliesArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  threadId?: InputMaybe<Scalars['ID']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryforumThreadArgs {
  id: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryforumThreadsArgs {
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryleaderboardArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QuerylikedArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QuerymyArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QuerymyVideosArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QuerypublicArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryrecentArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryrecentVideosArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}


/** GraphQL 查询入口 */
export interface QuerytrendingArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryuserArgs {
  id: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryuserArtworksArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryuserVideosArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryusersArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryvideoArgs {
  id: Scalars['ID']['input'];
}


/** GraphQL 查询入口 */
export interface QueryvideoByOperationIdArgs {
  operationId: Scalars['String']['input'];
}


/** GraphQL 查询入口 */
export interface QueryvideosArgs {
  aspectRatio?: InputMaybe<Scalars['String']['input']>;
  duration?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  resolution?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}


/** GraphQL 查询入口 */
export interface QueryvideosConnectionArgs {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}

export interface QueryArtworksConnection {
  __typename?: 'QueryArtworksConnection';
  edges?: Maybe<Array<Maybe<QueryArtworksConnectionEdge>>>;
  pageInfo: PageInfo;
}

export interface QueryArtworksConnectionEdge {
  __typename?: 'QueryArtworksConnectionEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Artwork>;
}

export interface QueryBlogPostsConnection {
  __typename?: 'QueryBlogPostsConnection';
  edges?: Maybe<Array<Maybe<QueryBlogPostsConnectionEdge>>>;
  pageInfo: PageInfo;
}

export interface QueryBlogPostsConnectionEdge {
  __typename?: 'QueryBlogPostsConnectionEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<BlogPost>;
}

export interface QueryVideosConnection {
  __typename?: 'QueryVideosConnection';
  edges?: Maybe<Array<Maybe<QueryVideosConnectionEdge>>>;
  pageInfo: PageInfo;
}

export interface QueryVideosConnectionEdge {
  __typename?: 'QueryVideosConnectionEdge';
  cursor: Scalars['String']['output'];
  node?: Maybe<Video>;
}

export type SortDirection =
  /** 升序 */
  | 'ASC'
  /** 降序 */
  | 'DESC';

/** GraphQL 订阅入口（实时推送） */
export interface Subscription {
  __typename?: 'Subscription';
  /** 订阅服务器时间（每秒推送，用于测试Subscription功能） */
  currentTime?: Maybe<Scalars['String']['output']>;
  /** 订阅新发布的博客文章（实时推送） */
  newBlogPost?: Maybe<BlogPost>;
}

/** 更新博客文章输入 */
export interface UpdateBlogPostInput {
  /** 分类 ID 列表 */
  categoryIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 文章内容（Markdown 格式） */
  content?: InputMaybe<Scalars['String']['input']>;
  /** 封面图片 URL */
  coverImage?: InputMaybe<Scalars['String']['input']>;
  /** 文章摘要 */
  excerpt?: InputMaybe<Scalars['String']['input']>;
  /** 是否公开 */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** 文章 slug */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** 发布状态（draft/published） */
  status?: InputMaybe<Scalars['String']['input']>;
  /** 标签 ID 列表 */
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 文章标题（3-200字符） */
  title?: InputMaybe<Scalars['String']['input']>;
}

/** 更新评论输入 */
export interface UpdateCommentInput {
  /** 评论内容（1-5000字符） */
  content: Scalars['String']['input'];
}

/** 更新论坛回复输入 */
export interface UpdateForumReplyInput {
  /** 回复内容（1-10000字符） */
  content: Scalars['String']['input'];
}

/** 更新论坛主题输入 */
export interface UpdateForumThreadInput {
  /** 分类 ID */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** 主题内容（10-50000字符） */
  content?: InputMaybe<Scalars['String']['input']>;
  /** 是否公开 */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** 状态（open/closed/archived） */
  status?: InputMaybe<Scalars['String']['input']>;
  /** 标签 ID 列表 */
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** 主题标题（3-200字符） */
  title?: InputMaybe<Scalars['String']['input']>;
}

/** 更新论坛投票输入 */
export interface UpdateForumVoteInput {
  /** 投票类型（upvote/downvote） */
  voteType: Scalars['String']['input'];
}

/** 用户类型（包含认证信息和资料信息） */
export interface User {
  __typename?: 'User';
  /** 作品数量 */
  artworkCount?: Maybe<Scalars['Int']['output']>;
  /** 头像URL */
  avatarUrl?: Maybe<Scalars['String']['output']>;
  /** 个人简介 */
  bio?: Maybe<Scalars['String']['output']>;
  /** 注册时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 显示名称 */
  displayName?: Maybe<Scalars['String']['output']>;
  /** 用户邮箱（仅自己可见，其他人看到为null） */
  email?: Maybe<Scalars['String']['output']>;
  /** 粉丝数量 */
  followerCount?: Maybe<Scalars['Int']['output']>;
  /** 关注数量 */
  followingCount?: Maybe<Scalars['Int']['output']>;
  /** GitHub用户名 */
  githubHandle?: Maybe<Scalars['String']['output']>;
  /** 用户唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** Instagram用户名 */
  instagramHandle?: Maybe<Scalars['String']['output']>;
  /** 所在地 */
  location?: Maybe<Scalars['String']['output']>;
  /** 文章数量 */
  postCount?: Maybe<Scalars['Int']['output']>;
  /** 总获赞数 */
  totalLikes?: Maybe<Scalars['Int']['output']>;
  /** Twitter用户名 */
  twitterHandle?: Maybe<Scalars['String']['output']>;
  /** 更新时间（ISO 8601格式） */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** 个人网站URL */
  websiteUrl?: Maybe<Scalars['String']['output']>;
}

/** 用户成就类型（用户解锁成就的记录） */
export interface UserAchievement {
  __typename?: 'UserAchievement';
  /** 成就定义信息 */
  achievement?: Maybe<AchievementDefinition>;
  /** 成就ID（UUID） */
  achievementId?: Maybe<Scalars['ID']['output']>;
  /** 解锁天数（距离解锁已经过去多少天） */
  daysUnlocked?: Maybe<Scalars['Int']['output']>;
  /** 记录唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** 是否是新解锁（3天内） */
  isRecent?: Maybe<Scalars['Boolean']['output']>;
  /** 是否已解锁（有unlocked_at就是已解锁） */
  isUnlocked?: Maybe<Scalars['Boolean']['output']>;
  /** 是否已通知用户（用于成就解锁通知） */
  notified?: Maybe<Scalars['Boolean']['output']>;
  /** 当前进度（未解锁时的进度值，解锁后为最终值） */
  progress?: Maybe<Scalars['Int']['output']>;
  /** 解锁时间（ISO 8601格式） */
  unlockedAt?: Maybe<Scalars['String']['output']>;
  /** 解锁成就的用户 */
  user?: Maybe<User>;
  /** 用户ID（UUID） */
  userId?: Maybe<Scalars['ID']['output']>;
}

/** 视频类型（视频生成和管理） */
export interface Video {
  __typename?: 'Video';
  /** 宽高比（16:9 或 9:16） */
  aspectRatio?: Maybe<Scalars['String']['output']>;
  /** 视频生成用户 */
  author?: Maybe<User>;
  /** 是否可以重试（失败且重试次数<3） */
  canRetry?: Maybe<Scalars['Boolean']['output']>;
  /** 完成时间（ISO 8601格式） */
  completedAt?: Maybe<Scalars['String']['output']>;
  /** 创建时间（ISO 8601格式） */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** 消耗的积分数量 */
  creditCost?: Maybe<Scalars['Int']['output']>;
  /** 下载时间（ISO 8601格式） */
  downloadedAt?: Maybe<Scalars['String']['output']>;
  /** 时长（秒，4/6/8） */
  duration?: Maybe<Scalars['Int']['output']>;
  /** 错误代码 */
  errorCode?: Maybe<Scalars['String']['output']>;
  /** 错误消息 */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** 文件大小（字节） */
  fileSizeBytes?: Maybe<Scalars['Int']['output']>;
  /** 临时视频URL（Google，2天过期） */
  googleVideoUrl?: Maybe<Scalars['String']['output']>;
  /** 视频唯一标识符（UUID） */
  id?: Maybe<Scalars['ID']['output']>;
  /** Google临时URL是否已过期（创建超过2天） */
  isExpired?: Maybe<Scalars['Boolean']['output']>;
  /** 负面提示词（排除不想要的内容） */
  negativePrompt?: Maybe<Scalars['String']['output']>;
  /** Google Veo 操作ID（唯一标识符） */
  operationId?: Maybe<Scalars['String']['output']>;
  /** 永久视频URL（Supabase Storage） */
  permanentVideoUrl?: Maybe<Scalars['String']['output']>;
  /** 视频生成提示词 */
  prompt?: Maybe<Scalars['String']['output']>;
  /** 参考图片URL（用于生成视频） */
  referenceImageUrl?: Maybe<Scalars['String']['output']>;
  /** 分辨率（720p 或 1080p） */
  resolution?: Maybe<Scalars['String']['output']>;
  /** 重试次数（最大3次） */
  retryCount?: Maybe<Scalars['Int']['output']>;
  /** 视频状态（processing/downloading/completed/failed） */
  status?: Maybe<Scalars['String']['output']>;
  /** 缩略图URL */
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  /** 视频生成用户的用户ID */
  userId?: Maybe<Scalars['ID']['output']>;
}

export type TestHelloQueryVariables = Exact<{ [key: string]: never; }>;


export type TestHelloQuery = { __typename?: 'Query', hello?: string | null };

export type TestCurrentTimeQueryVariables = Exact<{ [key: string]: never; }>;


export type TestCurrentTimeQuery = { __typename?: 'Query', currentTime?: string | null };

export type TestCombinedQueryVariables = Exact<{ [key: string]: never; }>;


export type TestCombinedQuery = { __typename?: 'Query', hello?: string | null, currentTime?: string | null };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id?: string | null, email?: string | null, createdAt?: string | null, updatedAt?: string | null, displayName?: string | null, avatarUrl?: string | null, bio?: string | null, location?: string | null, websiteUrl?: string | null, twitterHandle?: string | null, githubHandle?: string | null, instagramHandle?: string | null, followerCount?: number | null, followingCount?: number | null, postCount?: number | null, artworkCount?: number | null, totalLikes?: number | null } | null };

export type GetMeBasicQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeBasicQuery = { __typename?: 'Query', me?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null };

export type GetUserQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id?: string | null, email?: string | null, createdAt?: string | null, displayName?: string | null, avatarUrl?: string | null, bio?: string | null, followerCount?: number | null, followingCount?: number | null, postCount?: number | null, artworkCount?: number | null } | null };

export type GetUserSocialsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserSocialsQuery = { __typename?: 'Query', user?: { __typename?: 'User', id?: string | null, displayName?: string | null, websiteUrl?: string | null, twitterHandle?: string | null, githubHandle?: string | null, instagramHandle?: string | null } | null };

export type GetPublishedBlogPostsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetPublishedBlogPostsQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null, avatarUrl?: string | null } | null }> | null };

export type GetBlogPostQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBlogPostQuery = { __typename?: 'Query', blogPost?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, content?: string | null, excerpt?: string | null, coverImageUrl?: string | null, status?: BlogPostStatus | null, publishedAt?: string | null, createdAt?: string | null, updatedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, isLiked?: boolean | null, metaTitle?: string | null, metaDescription?: string | null, metaKeywords?: string | null, author?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null, bio?: string | null } | null } | null };

export type GetBlogPostsWithAuthorQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlogPostsWithAuthorQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, publishedAt?: string | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null, avatarUrl?: string | null } | null }> | null };

export type GetLatestBlogPostsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLatestBlogPostsQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null }> | null };

export type GetDraftBlogPostsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDraftBlogPostsQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, status?: BlogPostStatus | null, createdAt?: string | null, updatedAt?: string | null }> | null };

export type GetBlogPostsConnectionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlogPostsConnectionQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', cursor: string, node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, publishedAt?: string | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | null, endCursor?: string | null } } | null };

export type GetNextPageBlogPostsQueryVariables = Exact<{
  cursor: Scalars['String']['input'];
}>;


export type GetNextPageBlogPostsQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', cursor: string, node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } | null };

export type GetPreviousPageBlogPostsQueryVariables = Exact<{
  cursor: Scalars['String']['input'];
}>;


export type GetPreviousPageBlogPostsQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', cursor: string, node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasPreviousPage: boolean, startCursor?: string | null } } | null };

export type GetBlogPostsByViewCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlogPostsByViewCountQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, viewCount?: number | null, likeCount?: number | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } | null };

export type GetBlogPostsByLikeCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlogPostsByLikeCountQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, likeCount?: number | null, commentCount?: number | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null } | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } | null };

export type GetFullBlogPostsConnectionQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetFullBlogPostsConnectionQuery = { __typename?: 'Query', blogPostsConnection?: { __typename?: 'QueryBlogPostsConnection', edges?: Array<{ __typename?: 'QueryBlogPostsConnectionEdge', cursor: string, node?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, isLiked?: boolean | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null, avatarUrl?: string | null } | null } | null } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | null, endCursor?: string | null } } | null };

export type TestEchoMutationVariables = Exact<{
  message: Scalars['String']['input'];
}>;


export type TestEchoMutation = { __typename?: 'Mutation', echo?: string | null };

export type GetDashboardDataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardDataQuery = { __typename?: 'Query', currentTime?: string | null, me?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null, postCount?: number | null, followerCount?: number | null } | null, blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, viewCount?: number | null, likeCount?: number | null }> | null };

export type GetMultipleBlogPostListsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMultipleBlogPostListsQuery = { __typename?: 'Query', latestPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, publishedAt?: string | null }> | null, popularPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, viewCount?: number | null }> | null };

export type UserBasicInfoFragment = { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null };

export type UserDetailInfoFragment = { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null, bio?: string | null, location?: string | null, websiteUrl?: string | null, twitterHandle?: string | null, githubHandle?: string | null, followerCount?: number | null, followingCount?: number | null, postCount?: number | null, artworkCount?: number | null, totalLikes?: number | null };

export type BlogPostPreviewFragment = { __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null };

export type BlogPostDetailFragment = { __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, content?: string | null, excerpt?: string | null, coverImageUrl?: string | null, status?: BlogPostStatus | null, publishedAt?: string | null, createdAt?: string | null, updatedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, isLiked?: boolean | null, metaTitle?: string | null, metaDescription?: string | null, metaKeywords?: string | null };

export type GetBlogPostsWithFragmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBlogPostsWithFragmentsQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, author?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null }> | null };

export type GetBlogPostWithFullAuthorInfoQueryVariables = Exact<{
  postId: Scalars['ID']['input'];
}>;


export type GetBlogPostWithFullAuthorInfoQuery = { __typename?: 'Query', blogPost?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, content?: string | null, excerpt?: string | null, coverImageUrl?: string | null, publishedAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, isLiked?: boolean | null, author?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null, bio?: string | null, location?: string | null, websiteUrl?: string | null, twitterHandle?: string | null, githubHandle?: string | null, followerCount?: number | null, followingCount?: number | null, postCount?: number | null, artworkCount?: number | null, totalLikes?: number | null } | null } | null };

export type GetMultipleUsersQueryVariables = Exact<{
  userId1: Scalars['ID']['input'];
  userId2: Scalars['ID']['input'];
  userId3: Scalars['ID']['input'];
}>;


export type GetMultipleUsersQuery = { __typename?: 'Query', user1?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null, user2?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null, user3?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null };

export type GetConditionalDataQueryVariables = Exact<{
  includeEmail?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetConditionalDataQuery = { __typename?: 'Query', me?: { __typename?: 'User', id?: string | null, email?: string | null, displayName?: string | null, avatarUrl?: string | null } | null };

export type GetOptimizedBlogPostListQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOptimizedBlogPostListQuery = { __typename?: 'Query', blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, excerpt?: string | null, publishedAt?: string | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null } | null }> | null };

export type GetDeepNestedDataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDeepNestedDataQuery = { __typename?: 'Query', me?: { __typename?: 'User', id?: string | null, displayName?: string | null, followerCount?: number | null } | null, blogPosts?: Array<{ __typename?: 'BlogPost', id?: string | null, title?: string | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null, postCount?: number | null } | null }> | null };

export type OnNewBlogPostSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNewBlogPostSubscription = { __typename?: 'Subscription', newBlogPost?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, slug?: string | null, excerpt?: string | null, coverImageUrl?: string | null, status?: BlogPostStatus | null, publishedAt?: string | null, createdAt?: string | null, viewCount?: number | null, likeCount?: number | null, commentCount?: number | null, author?: { __typename?: 'User', id?: string | null, displayName?: string | null, avatarUrl?: string | null } | null } | null };

export type OnCurrentTimeSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnCurrentTimeSubscription = { __typename?: 'Subscription', currentTime?: string | null };

export type OnNewBlogPostSimpleSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNewBlogPostSimpleSubscription = { __typename?: 'Subscription', newBlogPost?: { __typename?: 'BlogPost', id?: string | null, title?: string | null, publishedAt?: string | null, author?: { __typename?: 'User', displayName?: string | null } | null } | null };

export const UserBasicInfoFragmentDoc = gql`
    fragment UserBasicInfo on User {
  id
  email
  displayName
  avatarUrl
}
    `;
export const UserDetailInfoFragmentDoc = gql`
    fragment UserDetailInfo on User {
  id
  email
  displayName
  avatarUrl
  bio
  location
  websiteUrl
  twitterHandle
  githubHandle
  followerCount
  followingCount
  postCount
  artworkCount
  totalLikes
}
    `;
export const BlogPostPreviewFragmentDoc = gql`
    fragment BlogPostPreview on BlogPost {
  id
  title
  slug
  excerpt
  coverImageUrl
  publishedAt
  viewCount
  likeCount
  commentCount
}
    `;
export const BlogPostDetailFragmentDoc = gql`
    fragment BlogPostDetail on BlogPost {
  id
  title
  slug
  content
  excerpt
  coverImageUrl
  status
  publishedAt
  createdAt
  updatedAt
  viewCount
  likeCount
  commentCount
  isLiked
  metaTitle
  metaDescription
  metaKeywords
}
    `;
export const TestHelloDocument = gql`
    query TestHello {
  hello
}
    `;
export const TestCurrentTimeDocument = gql`
    query TestCurrentTime {
  currentTime
}
    `;
export const TestCombinedDocument = gql`
    query TestCombined {
  hello
  currentTime
}
    `;
export const GetMeDocument = gql`
    query GetMe {
  me {
    id
    email
    createdAt
    updatedAt
    displayName
    avatarUrl
    bio
    location
    websiteUrl
    twitterHandle
    githubHandle
    instagramHandle
    followerCount
    followingCount
    postCount
    artworkCount
    totalLikes
  }
}
    `;
export const GetMeBasicDocument = gql`
    query GetMeBasic {
  me {
    id
    email
    displayName
    avatarUrl
  }
}
    `;
export const GetUserDocument = gql`
    query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    email
    createdAt
    displayName
    avatarUrl
    bio
    followerCount
    followingCount
    postCount
    artworkCount
  }
}
    `;
export const GetUserSocialsDocument = gql`
    query GetUserSocials($userId: ID!) {
  user(id: $userId) {
    id
    displayName
    websiteUrl
    twitterHandle
    githubHandle
    instagramHandle
  }
}
    `;
export const GetPublishedBlogPostsDocument = gql`
    query GetPublishedBlogPosts($limit: Int, $offset: Int) {
  blogPosts(status: "published", limit: $limit, offset: $offset) {
    id
    title
    excerpt
    coverImageUrl
    publishedAt
    viewCount
    likeCount
    commentCount
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const GetBlogPostDocument = gql`
    query GetBlogPost($id: ID!) {
  blogPost(id: $id) {
    id
    title
    slug
    content
    excerpt
    coverImageUrl
    status
    publishedAt
    createdAt
    updatedAt
    viewCount
    likeCount
    commentCount
    isLiked
    metaTitle
    metaDescription
    metaKeywords
    author {
      id
      email
      displayName
      avatarUrl
      bio
    }
  }
}
    `;
export const GetBlogPostsWithAuthorDocument = gql`
    query GetBlogPostsWithAuthor {
  blogPosts(status: "published", limit: 10) {
    id
    title
    excerpt
    publishedAt
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const GetLatestBlogPostsDocument = gql`
    query GetLatestBlogPosts {
  blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    excerpt
    coverImageUrl
    publishedAt
  }
}
    `;
export const GetDraftBlogPostsDocument = gql`
    query GetDraftBlogPosts {
  blogPosts(status: "draft", limit: 10) {
    id
    title
    excerpt
    status
    createdAt
    updatedAt
  }
}
    `;
export const GetBlogPostsConnectionDocument = gql`
    query GetBlogPostsConnection {
  blogPostsConnection(first: 10, orderBy: "created_at", orderDirection: "desc") {
    edges {
      cursor
      node {
        id
        title
        excerpt
        publishedAt
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
    `;
export const GetNextPageBlogPostsDocument = gql`
    query GetNextPageBlogPosts($cursor: String!) {
  blogPostsConnection(
    first: 10
    after: $cursor
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        excerpt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetPreviousPageBlogPostsDocument = gql`
    query GetPreviousPageBlogPosts($cursor: String!) {
  blogPostsConnection(
    last: 10
    before: $cursor
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        excerpt
      }
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
}
    `;
export const GetBlogPostsByViewCountDocument = gql`
    query GetBlogPostsByViewCount {
  blogPostsConnection(first: 10, orderBy: "view_count", orderDirection: "desc") {
    edges {
      node {
        id
        title
        viewCount
        likeCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetBlogPostsByLikeCountDocument = gql`
    query GetBlogPostsByLikeCount {
  blogPostsConnection(first: 10, orderBy: "like_count", orderDirection: "desc") {
    edges {
      node {
        id
        title
        likeCount
        commentCount
        author {
          id
          displayName
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;
export const GetFullBlogPostsConnectionDocument = gql`
    query GetFullBlogPostsConnection($first: Int, $after: String, $status: String) {
  blogPostsConnection(
    first: $first
    after: $after
    status: $status
    orderBy: "created_at"
    orderDirection: "desc"
  ) {
    edges {
      cursor
      node {
        id
        title
        slug
        excerpt
        coverImageUrl
        publishedAt
        viewCount
        likeCount
        commentCount
        isLiked
        author {
          id
          displayName
          avatarUrl
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
    `;
export const TestEchoDocument = gql`
    mutation TestEcho($message: String!) {
  echo(message: $message)
}
    `;
export const GetDashboardDataDocument = gql`
    query GetDashboardData {
  me {
    id
    email
    displayName
    avatarUrl
    postCount
    followerCount
  }
  blogPosts(status: "published", limit: 5) {
    id
    title
    viewCount
    likeCount
  }
  currentTime
}
    `;
export const GetMultipleBlogPostListsDocument = gql`
    query GetMultipleBlogPostLists {
  latestPosts: blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    publishedAt
  }
  popularPosts: blogPosts(status: "published", limit: 5, offset: 0) {
    id
    title
    viewCount
  }
}
    `;
export const GetBlogPostsWithFragmentsDocument = gql`
    query GetBlogPostsWithFragments {
  blogPosts(status: "published", limit: 10) {
    ...BlogPostPreview
    author {
      ...UserBasicInfo
    }
  }
}
    ${BlogPostPreviewFragmentDoc}
${UserBasicInfoFragmentDoc}`;
export const GetBlogPostWithFullAuthorInfoDocument = gql`
    query GetBlogPostWithFullAuthorInfo($postId: ID!) {
  blogPost(id: $postId) {
    id
    title
    content
    excerpt
    coverImageUrl
    publishedAt
    viewCount
    likeCount
    commentCount
    isLiked
    author {
      id
      email
      displayName
      avatarUrl
      bio
      location
      websiteUrl
      twitterHandle
      githubHandle
      followerCount
      followingCount
      postCount
      artworkCount
      totalLikes
    }
  }
}
    `;
export const GetMultipleUsersDocument = gql`
    query GetMultipleUsers($userId1: ID!, $userId2: ID!, $userId3: ID!) {
  user1: user(id: $userId1) {
    ...UserBasicInfo
  }
  user2: user(id: $userId2) {
    ...UserBasicInfo
  }
  user3: user(id: $userId3) {
    ...UserBasicInfo
  }
}
    ${UserBasicInfoFragmentDoc}`;
export const GetConditionalDataDocument = gql`
    query GetConditionalData($includeEmail: Boolean = false) {
  me {
    id
    email @include(if: $includeEmail)
    displayName
    avatarUrl
  }
}
    `;
export const GetOptimizedBlogPostListDocument = gql`
    query GetOptimizedBlogPostList {
  blogPosts(status: "published", limit: 20) {
    id
    title
    excerpt
    publishedAt
    author {
      id
      displayName
    }
  }
}
    `;
export const GetDeepNestedDataDocument = gql`
    query GetDeepNestedData {
  me {
    id
    displayName
    followerCount
  }
  blogPosts(status: "published", limit: 3) {
    id
    title
    author {
      id
      displayName
      postCount
    }
  }
}
    `;
export const OnNewBlogPostDocument = gql`
    subscription OnNewBlogPost {
  newBlogPost {
    id
    title
    slug
    excerpt
    coverImageUrl
    status
    publishedAt
    createdAt
    viewCount
    likeCount
    commentCount
    author {
      id
      displayName
      avatarUrl
    }
  }
}
    `;
export const OnCurrentTimeDocument = gql`
    subscription OnCurrentTime {
  currentTime
}
    `;
export const OnNewBlogPostSimpleDocument = gql`
    subscription OnNewBlogPostSimple {
  newBlogPost {
    id
    title
    publishedAt
    author {
      displayName
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    TestHello(variables?: TestHelloQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TestHelloQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TestHelloQuery>({ document: TestHelloDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestHello', 'query', variables);
    },
    TestCurrentTime(variables?: TestCurrentTimeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TestCurrentTimeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TestCurrentTimeQuery>({ document: TestCurrentTimeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestCurrentTime', 'query', variables);
    },
    TestCombined(variables?: TestCombinedQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TestCombinedQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TestCombinedQuery>({ document: TestCombinedDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestCombined', 'query', variables);
    },
    GetMe(variables?: GetMeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMeQuery>({ document: GetMeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMe', 'query', variables);
    },
    GetMeBasic(variables?: GetMeBasicQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMeBasicQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMeBasicQuery>({ document: GetMeBasicDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMeBasic', 'query', variables);
    },
    GetUser(variables: GetUserQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserQuery>({ document: GetUserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUser', 'query', variables);
    },
    GetUserSocials(variables: GetUserSocialsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetUserSocialsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetUserSocialsQuery>({ document: GetUserSocialsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetUserSocials', 'query', variables);
    },
    GetPublishedBlogPosts(variables?: GetPublishedBlogPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetPublishedBlogPostsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetPublishedBlogPostsQuery>({ document: GetPublishedBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPublishedBlogPosts', 'query', variables);
    },
    GetBlogPost(variables: GetBlogPostQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostQuery>({ document: GetBlogPostDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPost', 'query', variables);
    },
    GetBlogPostsWithAuthor(variables?: GetBlogPostsWithAuthorQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostsWithAuthorQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostsWithAuthorQuery>({ document: GetBlogPostsWithAuthorDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsWithAuthor', 'query', variables);
    },
    GetLatestBlogPosts(variables?: GetLatestBlogPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetLatestBlogPostsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetLatestBlogPostsQuery>({ document: GetLatestBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetLatestBlogPosts', 'query', variables);
    },
    GetDraftBlogPosts(variables?: GetDraftBlogPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetDraftBlogPostsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDraftBlogPostsQuery>({ document: GetDraftBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDraftBlogPosts', 'query', variables);
    },
    GetBlogPostsConnection(variables?: GetBlogPostsConnectionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostsConnectionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostsConnectionQuery>({ document: GetBlogPostsConnectionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsConnection', 'query', variables);
    },
    GetNextPageBlogPosts(variables: GetNextPageBlogPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetNextPageBlogPostsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetNextPageBlogPostsQuery>({ document: GetNextPageBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetNextPageBlogPosts', 'query', variables);
    },
    GetPreviousPageBlogPosts(variables: GetPreviousPageBlogPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetPreviousPageBlogPostsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetPreviousPageBlogPostsQuery>({ document: GetPreviousPageBlogPostsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetPreviousPageBlogPosts', 'query', variables);
    },
    GetBlogPostsByViewCount(variables?: GetBlogPostsByViewCountQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostsByViewCountQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostsByViewCountQuery>({ document: GetBlogPostsByViewCountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsByViewCount', 'query', variables);
    },
    GetBlogPostsByLikeCount(variables?: GetBlogPostsByLikeCountQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostsByLikeCountQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostsByLikeCountQuery>({ document: GetBlogPostsByLikeCountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsByLikeCount', 'query', variables);
    },
    GetFullBlogPostsConnection(variables?: GetFullBlogPostsConnectionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetFullBlogPostsConnectionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetFullBlogPostsConnectionQuery>({ document: GetFullBlogPostsConnectionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetFullBlogPostsConnection', 'query', variables);
    },
    TestEcho(variables: TestEchoMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TestEchoMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<TestEchoMutation>({ document: TestEchoDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TestEcho', 'mutation', variables);
    },
    GetDashboardData(variables?: GetDashboardDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetDashboardDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDashboardDataQuery>({ document: GetDashboardDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDashboardData', 'query', variables);
    },
    GetMultipleBlogPostLists(variables?: GetMultipleBlogPostListsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMultipleBlogPostListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMultipleBlogPostListsQuery>({ document: GetMultipleBlogPostListsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMultipleBlogPostLists', 'query', variables);
    },
    GetBlogPostsWithFragments(variables?: GetBlogPostsWithFragmentsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostsWithFragmentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostsWithFragmentsQuery>({ document: GetBlogPostsWithFragmentsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostsWithFragments', 'query', variables);
    },
    GetBlogPostWithFullAuthorInfo(variables: GetBlogPostWithFullAuthorInfoQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetBlogPostWithFullAuthorInfoQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetBlogPostWithFullAuthorInfoQuery>({ document: GetBlogPostWithFullAuthorInfoDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetBlogPostWithFullAuthorInfo', 'query', variables);
    },
    GetMultipleUsers(variables: GetMultipleUsersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetMultipleUsersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetMultipleUsersQuery>({ document: GetMultipleUsersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetMultipleUsers', 'query', variables);
    },
    GetConditionalData(variables?: GetConditionalDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetConditionalDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetConditionalDataQuery>({ document: GetConditionalDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetConditionalData', 'query', variables);
    },
    GetOptimizedBlogPostList(variables?: GetOptimizedBlogPostListQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetOptimizedBlogPostListQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetOptimizedBlogPostListQuery>({ document: GetOptimizedBlogPostListDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetOptimizedBlogPostList', 'query', variables);
    },
    GetDeepNestedData(variables?: GetDeepNestedDataQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetDeepNestedDataQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDeepNestedDataQuery>({ document: GetDeepNestedDataDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDeepNestedData', 'query', variables);
    },
    OnNewBlogPost(variables?: OnNewBlogPostSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OnNewBlogPostSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<OnNewBlogPostSubscription>({ document: OnNewBlogPostDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnNewBlogPost', 'subscription', variables);
    },
    OnCurrentTime(variables?: OnCurrentTimeSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OnCurrentTimeSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<OnCurrentTimeSubscription>({ document: OnCurrentTimeDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnCurrentTime', 'subscription', variables);
    },
    OnNewBlogPostSimple(variables?: OnNewBlogPostSimpleSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OnNewBlogPostSimpleSubscription> {
      return withWrapper((wrappedRequestHeaders) => client.request<OnNewBlogPostSimpleSubscription>({ document: OnNewBlogPostSimpleDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OnNewBlogPostSimple', 'subscription', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
/**
 * 🔥 老王的Blog系统类型定义
 * 用途: 博客文章、分类、标签、点赞的TypeScript类型
 * 老王警告: 这些类型必须和数据库schema保持一致，别tm乱改！
 */

// ============================================
// 1. 博客文章类型
// ============================================

/**
 * 博客文章完整数据（数据库记录）
 */
export interface BlogPost {
  id: string
  user_id: string

  // 文章内容
  title: string
  slug: string
  content: string
  excerpt: string | null
  cover_image_url: string | null

  // 状态管理
  status: 'draft' | 'published'
  published_at: string | null

  // 互动统计
  view_count: number
  like_count: number
  comment_count: number

  // SEO元数据
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null

  // 时间戳
  created_at: string
  updated_at: string
  deleted_at: string | null

  // 搜索向量（不对外暴露）
  search_vector?: unknown
}

/**
 * 创建博客文章请求
 */
export interface CreateBlogPostRequest {
  title: string
  slug: string
  content: string
  excerpt?: string
  cover_image_url?: string
  status?: 'draft' | 'published'
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  category_ids?: string[]  // 分类ID列表
  tag_ids?: string[]  // 标签ID列表
}

/**
 * 更新博客文章请求
 */
export interface UpdateBlogPostRequest {
  title?: string
  slug?: string
  content?: string
  excerpt?: string
  cover_image_url?: string
  status?: 'draft' | 'published'
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  category_ids?: string[]
  tag_ids?: string[]
}

/**
 * 博客文章列表查询参数
 */
export interface GetBlogPostsQuery {
  page?: number
  per_page?: number
  status?: 'draft' | 'published' | 'all'
  category_id?: string
  tag_id?: string
  search?: string  // 全文搜索关键词
  sort?: 'created_at' | 'published_at' | 'view_count' | 'like_count'
  order?: 'asc' | 'desc'
  user_id?: string  // 按作者筛选
}

/**
 * 博客文章详情（包含关联数据）
 */
export interface BlogPostDetail extends BlogPost {
  author?: {
    id: string
    email: string
    name?: string
    avatar_url?: string
  }
  categories?: BlogCategory[]
  tags?: BlogTag[]
  is_liked?: boolean  // 当前用户是否已点赞
}

// ============================================
// 2. 博客分类类型
// ============================================

/**
 * 博客分类完整数据
 */
export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  post_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * 创建分类请求
 */
export interface CreateCategoryRequest {
  name: string
  slug: string
  description?: string
}

/**
 * 更新分类请求
 */
export interface UpdateCategoryRequest {
  name?: string
  slug?: string
  description?: string
}

// ============================================
// 3. 博客标签类型
// ============================================

/**
 * 博客标签完整数据
 */
export interface BlogTag {
  id: string
  name: string
  slug: string
  post_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * 创建标签请求
 */
export interface CreateTagRequest {
  name: string
  slug: string
}

/**
 * 更新标签请求
 */
export interface UpdateTagRequest {
  name?: string
  slug?: string
}

// ============================================
// 4. 博客点赞类型
// ============================================

/**
 * 博客点赞记录
 */
export interface BlogPostLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

/**
 * 点赞/取消点赞请求
 */
export interface LikeBlogPostRequest {
  post_id: string
}

// ============================================
// 5. API 响应类型
// ============================================

/**
 * 通用成功响应
 */
export interface BlogApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

/**
 * 通用错误响应
 */
export interface BlogApiErrorResponse {
  success: false
  error: string
  details?: unknown
}

/**
 * 博客文章列表响应
 */
export interface GetBlogPostsResponse {
  success: boolean
  data?: {
    items: BlogPostDetail[]
    total: number
    page: number
    per_page: number
  }
  error?: string
}

/**
 * 单个博客文章响应
 */
export interface GetBlogPostResponse {
  success: boolean
  data?: BlogPostDetail
  error?: string
}

/**
 * 创建博客文章响应
 */
export interface CreateBlogPostResponse {
  success: boolean
  data?: {
    id: string
    slug: string
  }
  error?: string
}

/**
 * 更新博客文章响应
 */
export interface UpdateBlogPostResponse {
  success: boolean
  data?: {
    id: string
    updated_at: string
  }
  error?: string
}

/**
 * 删除博客文章响应
 */
export interface DeleteBlogPostResponse {
  success: boolean
  error?: string
}

/**
 * 分类列表响应
 */
export interface GetCategoriesResponse {
  success: boolean
  data?: BlogCategory[]
  error?: string
}

/**
 * 标签列表响应
 */
export interface GetTagsResponse {
  success: boolean
  data?: BlogTag[]
  error?: string
}

/**
 * 点赞响应
 */
export interface LikeBlogPostResponse {
  success: boolean
  data?: {
    is_liked: boolean
    like_count: number
  }
  error?: string
}

// 🔥 老王备注：
// 1. 所有数据库字段都用snake_case，前端传参也统一用snake_case
// 2. status字段只有两个值：'draft'和'published'，别tm乱写其他值
// 3. slug字段必须唯一，创建前必须检查重复
// 4. 全文搜索使用PostgreSQL的tsvector，前端只需传search关键词
// 5. 点赞使用唯一约束防重复，重复点赞会返回409冲突错误
// 6. 软删除的记录前端不可见（deleted_at IS NULL）

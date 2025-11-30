/**
 * Supabase Mock 工具函数
 *
 * 艹！这是老王我写的 Supabase Mock 工具！
 * 用于在单元测试中模拟 Supabase 客户端和用户对象！
 */

import { vi } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * 创建 Mock Supabase 客户端
 *
 * 艹！这个函数用于模拟 Supabase 客户端的所有方法！
 */
export function createMockSupabaseClient() {
  return {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      admin: {
        getUserById: vi.fn()
      }
    },
    storage: {
      from: vi.fn()
    },
    rpc: vi.fn()
  } as unknown as SupabaseClient
}

/**
 * 创建 Mock 用户对象
 *
 * 艹！这个函数用于模拟已登录的用户！
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'mock-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {
      username: 'mockuser',
      avatar_url: 'https://example.com/avatar.jpg'
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  } as User
}

/**
 * 创建 Mock GraphQL Context
 *
 * 艹！这个函数用于模拟 GraphQL resolver 的 context！
 */
export function createMockContext(options: {
  user?: User | null
  supabase?: SupabaseClient
} = {}) {
  return {
    user: options.user ?? createMockUser(),
    supabase: options.supabase ?? createMockSupabaseClient()
  }
}

/**
 * 创建 Mock Supabase Query Builder
 *
 * 艹！这个函数用于模拟 Supabase 的链式查询！
 */
export function createMockQueryBuilder<T = any>(data: T[] | null = [], error: any = null) {
  const mockBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data?.[0] ?? null, error }),
    then: vi.fn().mockResolvedValue({ data, error })
  }

  // 艹！所有方法都返回自身，支持链式调用
  return mockBuilder
}

/**
 * 创建模拟的数据库记录
 *
 * 艹！这个函数用于生成测试用的数据库记录！
 */
export function createMockRecord<T extends Record<string, any>>(
  tableName: string,
  overrides: Partial<T> = {}
): T {
  const baseRecord = {
    id: `${tableName}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  }

  switch (tableName) {
    case 'forum_threads':
      return {
        ...baseRecord,
        category_id: 'cat-1',
        author_id: 'user-1',
        title: '测试主题',
        content: '测试内容',
        status: 'open',
        view_count: 0,
        reply_count: 0,
        upvote_count: 0,
        downvote_count: 0,
        is_pinned: false,
        is_locked: false,
        tag_ids: [],
        ...overrides
      } as T

    case 'forum_replies':
      return {
        ...baseRecord,
        thread_id: 'thread-1',
        author_id: 'user-1',
        content: '测试回复',
        parent_id: null,
        upvote_count: 0,
        downvote_count: 0,
        ...overrides
      } as T

    case 'comments':
      return {
        ...baseRecord,
        user_id: 'user-1',
        content_id: 'post-1',
        content_type: 'blog_post',
        content: '测试评论',
        parent_id: null,
        likes_count: 0,
        ...overrides
      } as T

    case 'blog_posts':
      return {
        ...baseRecord,
        author_id: 'user-1',
        title: '测试博客',
        slug: 'test-blog',
        content: '测试内容',
        excerpt: '测试摘要',
        cover_image_url: null,
        status: 'draft',
        published_at: null,
        category_ids: [],
        tag_ids: [],
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        ...overrides
      } as T

    case 'likes':
      return {
        ...baseRecord,
        user_id: 'user-1',
        target_id: 'post-1',
        target_type: 'blog_post',
        ...overrides
      } as T

    case 'user_follows':
      return {
        ...baseRecord,
        follower_id: 'user-1',
        following_id: 'user-2',
        ...overrides
      } as T

    case 'forum_votes':
      return {
        ...baseRecord,
        user_id: 'user-1',
        target_type: 'thread',
        target_id: 'thread-1',
        vote_type: 'upvote',
        ...overrides
      } as T

    case 'user_stats':
      return {
        ...baseRecord,
        user_id: 'user-1',
        leaderboard_score: 0,
        total_likes: 0,
        total_comments: 0,
        total_followers: 0,
        total_following: 0,
        total_artworks: 0,
        total_blog_posts: 0,
        ...overrides
      } as T

    case 'image_generations':
      return {
        ...baseRecord,
        user_id: 'user-1',
        prompt: '测试提示词',
        image_url: 'https://example.com/image.jpg',
        model: 'test-model',
        status: 'completed',
        ...overrides
      } as T

    case 'video_generation_history':
      return {
        ...baseRecord,
        user_id: 'user-1',
        prompt: '测试提示词',
        video_url: 'https://example.com/video.mp4',
        status: 'completed',
        ...overrides
      } as T

    default:
      return {
        ...baseRecord,
        ...overrides
      } as T
  }
}

/**
 * 创建批量模拟记录
 *
 * 艹！这个函数用于批量生成测试数据！
 */
export function createMockRecords<T extends Record<string, any>>(
  tableName: string,
  count: number,
  overrides?: Partial<T> | ((index: number) => Partial<T>)
): T[] {
  return Array.from({ length: count }, (_, index) => {
    const recordOverrides = typeof overrides === 'function' ? overrides(index) : overrides
    return createMockRecord<T>(tableName, recordOverrides)
  })
}

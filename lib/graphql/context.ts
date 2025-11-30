/**
 * GraphQL Context
 *
 * 艹！这是老王我定义的 GraphQL Context 类型！
 * 包含了 Supabase 客户端、用户信息、DataLoader 实例等
 */

import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { createDataLoaders } from './dataloaders'

// 定义 GraphQL Context 类型
export interface GraphQLContext {
  // Supabase 客户端（用于数据库查询）
  supabase: SupabaseClient<Database>

  // 当前登录用户（如果未登录则为 null）
  user: User | null

  // DataLoader 实例（艹！老王我终于把它实现了！）
  loaders: ReturnType<typeof createDataLoaders>

  // 请求对象（用于获取 headers 等）
  request: Request
}

/**
 * 创建 GraphQL Context
 *
 * 艹！这个函数会在每个 GraphQL 请求时被调用，创建请求级的 Context！
 *
 * @param supabase - Supabase 客户端
 * @param user - 当前用户（可能为 null）
 * @param request - Next.js 请求对象
 * @returns GraphQL Context
 */
export function createGraphQLContext(
  supabase: SupabaseClient<Database>,
  user: User | null,
  request: Request
): GraphQLContext {
  return {
    supabase,
    user,
    // 艹！创建 DataLoader 实例，每个请求都是独立的！
    loaders: createDataLoaders(supabase, user?.id),
    request
  }
}

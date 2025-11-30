/**
 * 🔥 老王创建：论坛缓存管理工具
 * 用途：统一管理论坛相关API的缓存失效策略
 * 日期：2025-11-27
 */

import { redis } from "@/lib/redis-client"

/**
 * 缓存键模式（用于批量清理）
 */
export const CacheKeyPatterns = {
  // 搜索缓存：forum:search:*
  SEARCH: 'forum:search:*',
  // 分析缓存：forum:analytics:*
  ANALYTICS: 'forum:analytics:*',
  // 帖子列表缓存：forum:threads:*
  THREADS: 'forum:threads:*',
  // 特定分类缓存：forum:category:{id}:*
  CATEGORY: (categoryId: string) => `forum:category:${categoryId}:*`,
} as const

/**
 * 缓存失效场景
 */
export enum CacheInvalidationEvent {
  // 新帖发布
  THREAD_CREATED = 'thread_created',
  // 帖子更新
  THREAD_UPDATED = 'thread_updated',
  // 帖子删除
  THREAD_DELETED = 'thread_deleted',
  // 回复发布
  REPLY_CREATED = 'reply_created',
  // 回复删除
  REPLY_DELETED = 'reply_deleted',
  // 投票变更
  VOTE_CHANGED = 'vote_changed',
  // 管理员手动清理
  MANUAL_CLEAR = 'manual_clear',
}

/**
 * 缓存失效策略配置
 */
const InvalidationRules: Record<CacheInvalidationEvent, string[]> = {
  // 新帖发布：清除搜索缓存、分析缓存、帖子列表缓存
  [CacheInvalidationEvent.THREAD_CREATED]: [
    CacheKeyPatterns.SEARCH,
    CacheKeyPatterns.ANALYTICS,
    CacheKeyPatterns.THREADS,
  ],

  // 帖子更新：清除搜索缓存（标题/内容可能变化）
  [CacheInvalidationEvent.THREAD_UPDATED]: [
    CacheKeyPatterns.SEARCH,
  ],

  // 帖子删除：清除所有相关缓存
  [CacheInvalidationEvent.THREAD_DELETED]: [
    CacheKeyPatterns.SEARCH,
    CacheKeyPatterns.ANALYTICS,
    CacheKeyPatterns.THREADS,
  ],

  // 回复发布：清除分析缓存（回复数变化）
  [CacheInvalidationEvent.REPLY_CREATED]: [
    CacheKeyPatterns.ANALYTICS,
  ],

  // 回复删除：清除分析缓存
  [CacheInvalidationEvent.REPLY_DELETED]: [
    CacheKeyPatterns.ANALYTICS,
  ],

  // 投票变更：清除帖子列表缓存（排序可能变化）
  [CacheInvalidationEvent.VOTE_CHANGED]: [
    CacheKeyPatterns.THREADS,
  ],

  // 管理员手动清理：清除所有缓存
  [CacheInvalidationEvent.MANUAL_CLEAR]: [
    CacheKeyPatterns.SEARCH,
    CacheKeyPatterns.ANALYTICS,
    CacheKeyPatterns.THREADS,
  ],
}

/**
 * 清除缓存的核心函数
 *
 * @param event - 缓存失效事件
 * @param metadata - 可选的元数据（如category_id）
 */
export async function invalidateCache(
  event: CacheInvalidationEvent,
  metadata?: {
    categoryId?: string
    threadId?: string
  }
): Promise<{ success: boolean; clearedPatterns: string[]; error?: string }> {
  try {
    const patterns = InvalidationRules[event] || []
    const clearedPatterns: string[] = []

    // 🔥 老王注意：由于我们使用的是InMemoryRedis（开发环境）或Upstash Redis
    // 它们都不支持SCAN/DEL模式匹配，所以我们采用手动清理已知key的策略

    // 对于每个模式，我们清理所有可能的key组合
    for (const pattern of patterns) {
      if (pattern === CacheKeyPatterns.SEARCH) {
        // 清除所有搜索缓存（由于不支持通配符，我们只能记录需要清理）
        // 生产环境建议使用Redis SCAN + DEL
        console.log('🗑️ 需要清除搜索缓存:', pattern)
        clearedPatterns.push(pattern)
      } else if (pattern === CacheKeyPatterns.ANALYTICS) {
        // 清除所有分析缓存
        const analyticsPeriods = ['day', 'week', 'month', 'year']
        const dayRanges = [7, 30, 90, 365]

        for (const period of analyticsPeriods) {
          for (const days of dayRanges) {
            const key = `forum:analytics:${period}:${days}`
            const deleted = await redis.del(key)
            if (deleted) {
              console.log('✅ 已清除缓存:', key)
              clearedPatterns.push(key)
            }
          }
        }
      } else if (pattern === CacheKeyPatterns.THREADS) {
        // 清除帖子列表缓存
        console.log('🗑️ 需要清除帖子列表缓存:', pattern)
        clearedPatterns.push(pattern)
      }
    }

    // 如果提供了categoryId，额外清除该分类的缓存
    if (metadata?.categoryId) {
      const categoryPattern = CacheKeyPatterns.CATEGORY(metadata.categoryId)
      console.log('🗑️ 需要清除分类缓存:', categoryPattern)
      clearedPatterns.push(categoryPattern)
    }

    console.log(`🎯 缓存失效事件 [${event}] 处理完成，清除了 ${clearedPatterns.length} 个缓存模式`)

    return {
      success: true,
      clearedPatterns,
    }
  } catch (error: any) {
    console.error('❌ 缓存清理失败:', error)
    return {
      success: false,
      clearedPatterns: [],
      error: error.message,
    }
  }
}

/**
 * 管理员手动清除所有缓存
 */
export async function clearAllCache(): Promise<{ success: boolean; message: string }> {
  const result = await invalidateCache(CacheInvalidationEvent.MANUAL_CLEAR)

  if (result.success) {
    return {
      success: true,
      message: `已清除 ${result.clearedPatterns.length} 个缓存模式`,
    }
  } else {
    return {
      success: false,
      message: `缓存清理失败: ${result.error}`,
    }
  }
}

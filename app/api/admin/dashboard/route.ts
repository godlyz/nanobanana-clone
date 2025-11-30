/**
 * 🔥 老王的管理后台仪表板 API
 * 用途: 提供管理后台的统计数据和关键指标
 * 老王警告: 这个API要是数据不准确，老板就要来问罪了！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { configCache } from '@/lib/config-cache'
import { promotionRuleCache } from '@/lib/promotion-rule-cache'
import { withRBAC, AdminAction } from '@/lib/admin-auth'

// 辅助函数返回类型定义
interface ConfigStats {
  total: number
  byType: Record<string, number>
}

interface PromotionStats {
  active: number
  byType: Record<string, number>
}

interface AdminStats {
  total: number
}

interface AuditStats {
  total: number
}

interface CacheStats {
  cacheConnected: boolean
  cacheSize?: number
  lastCacheRefresh?: string | null
  configCacheSize?: number
  promotionCacheSize?: number
  configLastUpdate?: string
  promotionLastUpdate?: string
}

// 🔥 老王Day3添加：视频生成统计接口
interface VideoStats {
  total: number
  byStatus: Record<string, number>
  totalCreditsUsed: number
  totalStorageBytes: number
  averageGenerationTimeMs: number
  byResolution: Record<string, number>
  byDuration: Record<string, number>
}

// 🔥 老王Phase3添加：社区统计接口
interface CommunityOverview {
  totalBlogPosts: number
  publishedPosts: number
  totalArtworks: number
  totalUsers: number
  usersWithPortfolios: number
  totalLikes: number
  totalComments: number
  totalFollows: number
}

// 🔥 老王Phase3添加：用户行为分析接口
interface UserBehaviorSummary {
  dailyActiveUsers: number
  weeklyActiveUsers: number
  monthlyActiveUsers: number
  newUsersLast7Days: number
  newUsersLast30Days: number
  growthRateLast7Days: number
  day1Retention: number
  day7Retention: number
  avgEngagementRate: number
}

// 仪表板统计数据接口
interface DashboardStats {
  overview: {
    totalConfigs: number
    activePromotions: number
    totalAdmins: number
    totalAuditLogs: number
    totalVideos: number  // 🔥 老王Day3添加：总视频数
  }
  configsByType: Record<string, number>
  promotionsByType: Record<string, number>
  videosByStatus: Record<string, number>  // 🔥 老王Day3添加：视频状态分布
  videosByResolution: Record<string, number>  // 🔥 老王Day3添加：分辨率分布
  videosByDuration: Record<string, number>  // 🔥 老王Day3添加：时长分布
  recentActivity: Array<{
    id: string
    admin_id: string
    action: string
    resource_type: string
    created_at: string
    created_at_formatted: string
  }>
  systemHealth: {
    cacheConnected: boolean
    cacheSize: number
    lastCacheRefresh: string | null
    databaseStatus: 'healthy' | 'degraded' | 'down'
    videoStorageBytes: number  // 🔥 老王Day3添加：视频存储占用
    videoCreditsUsed: number  // 🔥 老王Day3添加：视频积分消耗
    avgVideoGenerationTimeMs: number  // 🔥 老王Day3添加：平均生成时长
  }
  topActivePromotions: Array<{
    id: string
    rule_name: string
    display_name: string
    rule_type: string
    usage_count: number
    status: string
  }>
  community: CommunityOverview  // 🔥 老王Phase3添加：社区统计总览
  userBehavior: UserBehaviorSummary  // 🔥 老王Phase3添加：用户行为分析
}

/**
 * 🔥 获取仪表板统计数据
 */
async function handleGET(req: NextRequest) {
  try {
    console.log('📊 获取管理后台仪表板统计数据')

    const supabase = createServiceClient()
    const stats: DashboardStats = {
      overview: {
        totalConfigs: 0,
        activePromotions: 0,
        totalAdmins: 0,
        totalAuditLogs: 0,
        totalVideos: 0  // 🔥 老王Day3添加
      },
      configsByType: {},
      promotionsByType: {},
      videosByStatus: {},  // 🔥 老王Day3添加
      videosByResolution: {},  // 🔥 老王Day3添加
      videosByDuration: {},  // 🔥 老王Day3添加
      recentActivity: [],
      systemHealth: {
        cacheConnected: false,
        cacheSize: 0,
        lastCacheRefresh: null,
        databaseStatus: 'healthy',
        videoStorageBytes: 0,  // 🔥 老王Day3添加
        videoCreditsUsed: 0,  // 🔥 老王Day3添加
        avgVideoGenerationTimeMs: 0  // 🔥 老王Day3添加
      },
      topActivePromotions: [],
      // 🔥 老王Phase3添加：社区统计初始值
      community: {
        totalBlogPosts: 0,
        publishedPosts: 0,
        totalArtworks: 0,
        totalUsers: 0,
        usersWithPortfolios: 0,
        totalLikes: 0,
        totalComments: 0,
        totalFollows: 0
      },
      // 🔥 老王Phase3添加：用户行为分析初始值
      userBehavior: {
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        newUsersLast7Days: 0,
        newUsersLast30Days: 0,
        growthRateLast7Days: 0,
        day1Retention: 0,
        day7Retention: 0,
        avgEngagementRate: 0
      }
    }

    // 并行获取各种统计数据，带超时保护
    const timeout = (ms: number) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), ms)
    )

    const results = await Promise.allSettled([
      Promise.race([getConfigStats(supabase), timeout(10000)]),   // 🔥 老王修复：增加到10秒，数据库查询慢得要死
      Promise.race([getPromotionStats(supabase), timeout(8000)]), // 🔥 增加到8秒
      Promise.race([getAdminStats(supabase), timeout(5000)]),     // 🔥 增加到5秒
      Promise.race([getAuditStats(supabase), timeout(5000)]),     // 🔥 增加到5秒
      Promise.race([getCacheStats(), timeout(5000)]),             // 🔥 增加到5秒，缓存连接也慢
      Promise.race([getRecentActivity(supabase), timeout(8000)]), // 🔥 增加到8秒
      Promise.race([getTopActivePromotions(supabase), timeout(8000)]), // 🔥 增加到8秒
      Promise.race([getVideoStats(supabase), timeout(10000)]),  // 🔥 老王Day3添加：视频统计
      Promise.race([getCommunityStats(supabase), timeout(12000)]), // 🔥 老王Phase3添加：社区统计（12秒超时）
      Promise.race([getUserBehaviorStats(supabase), timeout(12000)]) // 🔥 老王Phase3添加：用户行为（12秒超时）
    ])

    const [
      configStats,
      promotionStats,
      adminStats,
      auditStats,
      cacheStats,
      recentActivities,
      topPromotions,
      videoStats,  // 🔥 老王Day3添加
      communityStats,  // 🔥 老王Phase3添加
      userBehaviorStats  // 🔥 老王Phase3添加
    ] = results as [
      PromiseSettledResult<ConfigStats>,
      PromiseSettledResult<PromotionStats>,
      PromiseSettledResult<AdminStats>,
      PromiseSettledResult<AuditStats>,
      PromiseSettledResult<CacheStats>,
      PromiseSettledResult<any[]>,
      PromiseSettledResult<any[]>,
      PromiseSettledResult<VideoStats>,  // 🔥 老王Day3添加
      PromiseSettledResult<CommunityOverview>,  // 🔥 老王Phase3添加
      PromiseSettledResult<UserBehaviorSummary>  // 🔥 老王Phase3添加
    ]

    // 处理配置统计
    if (configStats.status === 'fulfilled') {
      stats.overview.totalConfigs = configStats.value.total
      stats.configsByType = configStats.value.byType
    } else {
      console.warn('⚠️ 获取配置统计失败:', configStats.reason)
    }

    // 处理活动规则统计
    if (promotionStats.status === 'fulfilled') {
      stats.overview.activePromotions = promotionStats.value.active
      stats.promotionsByType = promotionStats.value.byType
    } else {
      console.warn('⚠️ 获取活动规则统计失败:', promotionStats.reason)
    }

    // 处理管理员统计
    if (adminStats.status === 'fulfilled') {
      stats.overview.totalAdmins = adminStats.value.total
    } else {
      console.warn('⚠️ 获取管理员统计失败:', adminStats.reason)
    }

    // 处理审计日志统计
    if (auditStats.status === 'fulfilled') {
      stats.overview.totalAuditLogs = auditStats.value.total
    } else {
      console.warn('⚠️ 获取审计日志统计失败:', auditStats.reason)
    }

    // 处理缓存统计
    if (cacheStats.status === 'fulfilled') {
      stats.systemHealth = {
        ...stats.systemHealth,
        ...cacheStats.value
      }
    } else {
      console.warn('⚠️ 获取缓存统计失败:', cacheStats.reason)
      stats.systemHealth.cacheConnected = false
    }

    // 处理最近活动
    if (recentActivities.status === 'fulfilled') {
      stats.recentActivity = recentActivities.value
    } else {
      console.warn('⚠️ 获取最近活动失败:', recentActivities.reason)
    }

    // 处理热门活动
    if (topPromotions.status === 'fulfilled') {
      stats.topActivePromotions = topPromotions.value
    } else {
      console.warn('⚠️ 获取热门活动失败:', topPromotions.reason)
    }

    // 🔥 老王Day3添加：处理视频统计
    if (videoStats.status === 'fulfilled') {
      stats.overview.totalVideos = videoStats.value.total
      stats.videosByStatus = videoStats.value.byStatus
      stats.videosByResolution = videoStats.value.byResolution
      stats.videosByDuration = videoStats.value.byDuration
      stats.systemHealth.videoStorageBytes = videoStats.value.totalStorageBytes
      stats.systemHealth.videoCreditsUsed = videoStats.value.totalCreditsUsed
      stats.systemHealth.avgVideoGenerationTimeMs = videoStats.value.averageGenerationTimeMs
    } else {
      console.warn('⚠️ 获取视频统计失败:', videoStats.reason)
    }

    // 🔥 老王Phase3添加：处理社区统计
    if (communityStats.status === 'fulfilled') {
      stats.community = communityStats.value
      console.log('✅ 社区统计获取成功:', {
        总博客数: stats.community.totalBlogPosts,
        已发布: stats.community.publishedPosts,
        总作品数: stats.community.totalArtworks,
        活跃用户: stats.community.usersWithPortfolios
      })
    } else {
      console.warn('⚠️ 获取社区统计失败:', communityStats.reason)
    }

    // 🔥 老王Phase3添加：处理用户行为统计
    if (userBehaviorStats.status === 'fulfilled') {
      stats.userBehavior = userBehaviorStats.value
      console.log('✅ 用户行为统计获取成功:', {
        日活: stats.userBehavior.dailyActiveUsers,
        月活: stats.userBehavior.monthlyActiveUsers,
        '7日留存': `${(stats.userBehavior.day7Retention * 100).toFixed(1)}%`,
        互动率: `${(stats.userBehavior.avgEngagementRate * 100).toFixed(1)}%`
      })
    } else {
      console.warn('⚠️ 获取用户行为统计失败:', userBehaviorStats.reason)
    }

    // 检查数据库健康状态
    const dbHealth = await checkDatabaseHealth(supabase)
    stats.systemHealth.databaseStatus = dbHealth

    console.log('✅ 仪表板统计数据获取完成')

    return NextResponse.json({
      success: true,
      data: stats,
      message: '仪表板统计数据获取成功'
    })

  } catch (error) {
    console.error('❌ 获取仪表板统计数据失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取仪表板统计数据失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 获取配置统计
 * 老王修复：直接从数据库查询，不依赖缓存（缓存可能失败导致返回0）
 */
async function getConfigStats(supabase: any): Promise<ConfigStats> {
  try {
    // 🔥 从数据库直接查询，不要用那个SB缓存！
    const { data: configs, error } = await supabase
      .from('system_configs')
      .select('config_key, config_type')
      .eq('is_active', true)

    if (error) throw error

    const byType: Record<string, number> = {}

    configs?.forEach((config: any) => {
      const type = config.config_type || 'other'
      byType[type] = (byType[type] || 0) + 1
    })

    return {
      total: configs?.length || 0,
      byType
    }
  } catch (error) {
    console.error('❌ 获取配置统计失败:', error)
    return { total: 0, byType: {} }
  }
}

/**
 * 🔥 获取活动规则统计
 */
async function getPromotionStats(supabase: any): Promise<PromotionStats> {
  try {
    const { data: promotions, error } = await supabase
      .from('promotion_rules')
      .select('rule_type, status')
      .neq('status', 'deleted')

    if (error) throw error

    const active = promotions?.filter((p: any) => p.status === 'active').length || 0
    const byType: Record<string, number> = {}

    promotions?.forEach((promo: any) => {
      byType[promo.rule_type] = (byType[promo.rule_type] || 0) + 1
    })

    return { active, byType }
  } catch (error) {
    console.error('❌ 获取活动规则统计失败:', error)
    return { active: 0, byType: {} }
  }
}

/**
 * 🔥 获取管理员统计
 */
async function getAdminStats(supabase: any): Promise<AdminStats> {
  try {
    const { count, error } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) throw error

    return { total: count || 0 }
  } catch (error) {
    console.error('❌ 获取管理员统计失败:', error)
    return { total: 0 }
  }
}

/**
 * 🔥 获取审计日志统计（优化版 - 只统计最近7天的日志）
 */
async function getAuditStats(supabase: any): Promise<AuditStats> {
  try {
    // 只统计最近7天的日志，避免全表扫描
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count, error } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    if (error) throw error

    return { total: count || 0 }
  } catch (error) {
    console.error('❌ 获取审计日志统计失败:', error)
    return { total: 0 }
  }
}

/**
 * 🔥 获取缓存统计
 * 🔥 老王修复：Redis挂了就直接返回默认值，别tm等那么久
 */
async function getCacheStats(): Promise<CacheStats> {
  try {
    // 🔥 快速超时：1秒内必须返回，否则直接用默认值
    const quickTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('cache-stats-timeout')), 1000)
    )

    const statsPromise = Promise.all([
      configCache.getCacheStats(),
      promotionRuleCache.getCacheStats()
    ])

    const [configStats, promotionStats] = await Promise.race([
      statsPromise,
      quickTimeout
    ])

    const cacheConnected = configStats.isConnected || promotionStats.isCacheConnected
    const totalSize = configStats.cacheSize + promotionStats.cacheSize

    return {
      cacheConnected,
      cacheSize: totalSize,
      lastCacheRefresh: new Date().toISOString()
    }
  } catch (error) {
    // 艹，缓存挂了就算了，直接返回默认值
    console.warn('⚠️ 缓存统计查询超时或失败，使用默认值:', error instanceof Error ? error.message : error)
    return {
      cacheConnected: false,
      cacheSize: 0,
      lastCacheRefresh: null
    }
  }
}

/**
 * 🔥 获取最近活动
 */
async function getRecentActivity(supabase: any) {
  try {
    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return activities?.map((activity: any) => ({
      id: activity.id,
      admin_id: activity.admin_id,
      action: activity.action,
      resource_type: activity.resource_type,
      created_at: activity.created_at,
      created_at_formatted: new Date(activity.created_at).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })) || []
  } catch (error) {
    console.error('❌ 获取最近活动失败:', error)
    return []
  }
}

/**
 * 🔥 获取热门活动
 */
async function getTopActivePromotions(supabase: any) {
  try {
    const { data: promotions, error } = await supabase
      .from('promotion_rules')
      .select('*')
      .eq('status', 'active')
      .not('usage_count', 'is', null)
      .order('usage_count', { ascending: false })
      .limit(5)

    if (error) throw error

    return promotions?.map((promo: any) => ({
      id: promo.id,
      rule_name: promo.rule_name,
      display_name: promo.display_name || promo.rule_name,
      rule_type: promo.rule_type,
      usage_count: promo.usage_count,
      status: promo.status
    })) || []
  } catch (error) {
    console.error('❌ 获取热门活动失败:', error)
    return []
  }
}

/**
 * 🔥 检查数据库健康状态
 */
async function checkDatabaseHealth(supabase: any): Promise<'healthy' | 'degraded' | 'down'> {
  try {
    // 测试基础连接
    const startTime = Date.now()
    const { error } = await supabase
      .from('system_configs')
      .select('count')
      .limit(1)
    const responseTime = Date.now() - startTime

    if (error) {
      return 'down'
    }

    // 根据响应时间判断健康状态
    if (responseTime > 5000) {
      return 'degraded'
    }

    return 'healthy'
  } catch (error) {
    console.error('❌ 数据库健康检查失败:', error)
    return 'down'
  }
}

/**
 * 🔥 刷新仪表板缓存
 */
async function handlePOST(req: NextRequest) {
  try {
    console.log('🔄 刷新仪表板缓存')

    // 并行刷新各种缓存
    const [configRefreshed, promotionRefreshed] = await Promise.allSettled([
      configCache.refresh(),
      promotionRuleCache.refresh()
    ])

    const configSuccess = configRefreshed.status === 'fulfilled' && configRefreshed.value
    const promotionSuccess = promotionRefreshed.status === 'fulfilled' && promotionRefreshed.value

    const success = configSuccess && promotionSuccess

    console.log(`✅ 缓存刷新完成: 配置缓存${configSuccess ? '✓' : '✗'}, 活动规则缓存${promotionSuccess ? '✓' : '✗'}`)

    return NextResponse.json({
      success,
      message: success ? '所有缓存刷新成功' : '部分缓存刷新失败',
      details: {
        config: configSuccess,
        promotion: promotionSuccess
      }
    })

  } catch (error) {
    console.error('❌ 刷新仪表板缓存失败:', error)
    return NextResponse.json({
      success: false,
      error: '刷新缓存失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 老王Day3添加：获取视频生成统计
 * 艹，这个视频统计一定要准确，否则老板要砍人！
 */
async function getVideoStats(supabase: any): Promise<VideoStats> {
  try {
    // 🔥 从video_generation_history表查询统计数据
    const { data: videos, error } = await supabase
      .from('video_generation_history')
      .select('status, credit_cost, file_size_bytes, duration, resolution, created_at, completed_at')

    if (error) throw error

    // 初始化统计对象
    const stats: VideoStats = {
      total: videos?.length || 0,
      byStatus: {},
      totalCreditsUsed: 0,
      totalStorageBytes: 0,
      averageGenerationTimeMs: 0,
      byResolution: {},
      byDuration: {}
    }

    if (!videos || videos.length === 0) {
      return stats
    }

    // 统计各个维度
    let totalGenerationTimeMs = 0
    let completedCount = 0

    videos.forEach((video: any) => {
      // 状态分布
      stats.byStatus[video.status] = (stats.byStatus[video.status] || 0) + 1

      // 积分消耗
      stats.totalCreditsUsed += video.credit_cost || 0

      // 存储占用
      stats.totalStorageBytes += video.file_size_bytes || 0

      // 分辨率分布
      stats.byResolution[video.resolution] = (stats.byResolution[video.resolution] || 0) + 1

      // 时长分布
      stats.byDuration[`${video.duration}s`] = (stats.byDuration[`${video.duration}s`] || 0) + 1

      // 平均生成时长（仅统计已完成的）
      if (video.status === 'completed' && video.created_at && video.completed_at) {
        const createdTime = new Date(video.created_at).getTime()
        const completedTime = new Date(video.completed_at).getTime()
        totalGenerationTimeMs += (completedTime - createdTime)
        completedCount++
      }
    })

    // 计算平均生成时长
    if (completedCount > 0) {
      stats.averageGenerationTimeMs = Math.round(totalGenerationTimeMs / completedCount)
    }

    return stats
  } catch (error) {
    console.error('❌ 获取视频统计失败:', error)
    return {
      total: 0,
      byStatus: {},
      totalCreditsUsed: 0,
      totalStorageBytes: 0,
      averageGenerationTimeMs: 0,
      byResolution: {},
      byDuration: {}
    }
  }
}

/**
 * 🔥 老王Phase3添加：获取社区统计总览
 * 艹，这个统计一定要准确，老板要看这些数据决定产品方向！
 */
async function getCommunityStats(supabase: any): Promise<CommunityOverview> {
  try {
    // 并行查询各项社区数据
    const [
      { count: totalBlogPosts },
      { count: publishedPosts },
      { count: totalArtworks },
      { count: totalUsers },
      { data: artworks },
      { count: blogLikes },
      { count: artworkLikes },
      { count: totalComments },
      { count: totalFollows }
    ] = await Promise.all([
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('artworks').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('artworks').select('user_id'),
      supabase.from('blog_post_likes').select('*', { count: 'exact', head: true }),
      supabase.from('artwork_likes').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('user_follows').select('*', { count: 'exact', head: true })
    ])

    // 统计有作品集的用户数（至少有1个作品）
    const usersWithArtworks = new Set(artworks?.map((a: any) => a.user_id) || [])
    const usersWithPortfolios = usersWithArtworks.size

    return {
      totalBlogPosts: totalBlogPosts || 0,
      publishedPosts: publishedPosts || 0,
      totalArtworks: totalArtworks || 0,
      totalUsers: totalUsers || 0,
      usersWithPortfolios,
      totalLikes: (blogLikes || 0) + (artworkLikes || 0),
      totalComments: totalComments || 0,
      totalFollows: totalFollows || 0
    }
  } catch (error) {
    console.error('❌ 获取社区统计失败:', error)
    return {
      totalBlogPosts: 0,
      publishedPosts: 0,
      totalArtworks: 0,
      totalUsers: 0,
      usersWithPortfolios: 0,
      totalLikes: 0,
      totalComments: 0,
      totalFollows: 0
    }
  }
}

/**
 * 🔥 老王Phase3添加：获取用户行为分析摘要
 * 艹，这些留存率和活跃度指标是运营的生命线！
 */
async function getUserBehaviorStats(supabase: any): Promise<UserBehaviorSummary> {
  try {
    const now = new Date()
    const last1Day = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // 1. 并行查询用户注册数据
    const [
      { count: newUsersLast7Days },
      { count: newUsersLast30Days },
      { count: prevWeekUsers }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', last7Days),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', last30Days),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', prev7Days).lt('created_at', last7Days)
    ])

    // 2. 计算增长率
    const growthRateLast7Days = prevWeekUsers && prevWeekUsers > 0
      ? Math.round(((newUsersLast7Days || 0) - prevWeekUsers) / prevWeekUsers * 1000) / 10
      : 0

    // 3. 收集活跃用户（简化版：只统计发帖、评论、点赞）
    const dauSet = new Set<string>()
    const wauSet = new Set<string>()
    const mauSet = new Set<string>()

    const [
      { data: dauPosts },
      { data: dauComments },
      { data: dauLikes },
      { data: wauPosts },
      { data: wauComments },
      { data: wauLikes },
      { data: mauPosts },
      { data: mauComments },
      { data: mauLikes }
    ] = await Promise.all([
      supabase.from('blog_posts').select('author_id').gte('created_at', last1Day),
      supabase.from('comments').select('user_id').gte('created_at', last1Day),
      supabase.from('blog_post_likes').select('user_id').gte('created_at', last1Day),
      supabase.from('blog_posts').select('author_id').gte('created_at', last7Days),
      supabase.from('comments').select('user_id').gte('created_at', last7Days),
      supabase.from('blog_post_likes').select('user_id').gte('created_at', last7Days),
      supabase.from('blog_posts').select('author_id').gte('created_at', last30Days),
      supabase.from('comments').select('user_id').gte('created_at', last30Days),
      supabase.from('blog_post_likes').select('user_id').gte('created_at', last30Days)
    ])

    // DAU
    dauPosts?.forEach((p: any) => dauSet.add(p.author_id))
    dauComments?.forEach((c: any) => dauSet.add(c.user_id))
    dauLikes?.forEach((l: any) => dauSet.add(l.user_id))

    // WAU
    wauPosts?.forEach((p: any) => wauSet.add(p.author_id))
    wauComments?.forEach((c: any) => wauSet.add(c.user_id))
    wauLikes?.forEach((l: any) => wauSet.add(l.user_id))

    // MAU
    mauPosts?.forEach((p: any) => mauSet.add(p.author_id))
    mauComments?.forEach((c: any) => mauSet.add(c.user_id))
    mauLikes?.forEach((l: any) => mauSet.add(l.user_id))

    // 4. 简化留存率计算（只计算7日留存）
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: cohortUsers } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', eightDaysAgo)
      .lt('created_at', sevenDaysAgo)

    const cohortSize = cohortUsers?.length || 0
    let day7Retention = 0

    if (cohortSize > 0) {
      const userIds = cohortUsers.map((u: any) => u.id)
      const activeInLastWeek = new Set<string>()

      // 检查这批用户在最近7天是否有活跃
      const [{ data: activePosts }, { data: activeComments }] = await Promise.all([
        supabase.from('blog_posts').select('author_id').in('author_id', userIds).gte('created_at', sevenDaysAgo),
        supabase.from('comments').select('user_id').in('user_id', userIds).gte('created_at', sevenDaysAgo)
      ])

      activePosts?.forEach((p: any) => activeInLastWeek.add(p.author_id))
      activeComments?.forEach((c: any) => activeInLastWeek.add(c.user_id))

      day7Retention = Math.round((activeInLastWeek.size / cohortSize) * 1000) / 1000
    }

    // 5. 计算互动率（简化：点赞+评论 / 总内容数）
    const { count: totalPosts } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true })
    const { count: totalArtworks } = await supabase.from('artworks').select('*', { count: 'exact', head: true })
    const { count: totalBlogLikes } = await supabase.from('blog_post_likes').select('*', { count: 'exact', head: true })
    const { count: totalComments } = await supabase.from('comments').select('*', { count: 'exact', head: true })

    const totalContent = (totalPosts || 0) + (totalArtworks || 0)
    const totalEngagement = (totalBlogLikes || 0) + (totalComments || 0)
    const avgEngagementRate = totalContent > 0
      ? Math.round((totalEngagement / totalContent) * 1000) / 1000
      : 0

    return {
      dailyActiveUsers: dauSet.size,
      weeklyActiveUsers: wauSet.size,
      monthlyActiveUsers: mauSet.size,
      newUsersLast7Days: newUsersLast7Days || 0,
      newUsersLast30Days: newUsersLast30Days || 0,
      growthRateLast7Days,
      day1Retention: 0,  // 简化版不计算次日留存
      day7Retention,
      avgEngagementRate
    }
  } catch (error) {
    console.error('❌ 获取用户行为统计失败:', error)
    return {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      newUsersLast7Days: 0,
      newUsersLast30Days: 0,
      growthRateLast7Days: 0,
      day1Retention: 0,
      day7Retention: 0,
      avgEngagementRate: 0
    }
  }
}

// 导出带有 RBAC 保护的处理器
export const GET = withRBAC(AdminAction.CONFIG_READ)(handleGET)
export const POST = withRBAC(AdminAction.CONFIG_WRITE)(handlePOST)
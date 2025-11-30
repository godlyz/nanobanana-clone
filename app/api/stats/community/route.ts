/**
 * 🔥 老王的社区统计总览 API
 * 用途: 提供平台级社区数据统计（博客、作品集、互动、通知）
 * 老王提醒: 这些数据是Phase 3验收的关键指标，必须准确！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// 🔥 社区统计数据接口
interface CommunityStats {
  blog: {
    totalPosts: number
    publishedPosts: number
    draftPosts: number
    totalViews: number
    totalLikes: number
    byCategory: Record<string, number>
    byTag: Record<string, number>
  }
  portfolios: {
    totalUsers: number
    usersWithPortfolios: number
    totalArtworks: number
    publicArtworks: number
    privateArtworks: number
    followersOnlyArtworks: number
  }
  engagement: {
    totalLikes: number  // 博客点赞 + 作品点赞
    totalComments: number
    totalFollows: number
    avgLikesPerPost: number
    avgCommentsPerPost: number
  }
  notifications: {
    totalNotifications: number
    unreadNotifications: number
    byType: Record<string, number>
  }
  growth: {
    usersThisMonth: number
    postsThisMonth: number
    artworksThisMonth: number
  }
}

/**
 * 🔥 老王：GET - 获取社区统计总览
 * 艹，这个API要是数据不准，Phase 3验收就通不过了！
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 开始获取社区统计总览数据...')

    const supabase = createServiceClient()

    // 🔥 并行查询所有统计数据（提高性能）
    const timeout = (ms: number) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )

    // 🔥 老王修复：添加类型注解解决TypeScript类型推断问题
    const results = await Promise.allSettled([
      Promise.race([getBlogStats(supabase), timeout(10000)]) as Promise<CommunityStats['blog']>,
      Promise.race([getPortfolioStats(supabase), timeout(10000)]) as Promise<CommunityStats['portfolios']>,
      Promise.race([getEngagementStats(supabase), timeout(10000)]) as Promise<CommunityStats['engagement']>,
      Promise.race([getNotificationStats(supabase), timeout(8000)]) as Promise<CommunityStats['notifications']>,
      Promise.race([getGrowthStats(supabase), timeout(10000)]) as Promise<CommunityStats['growth']>
    ])

    const [blogStats, portfolioStats, engagementStats, notificationStats, growthStats] = results

    // 🔥 组装完整的社区统计数据
    const stats: CommunityStats = {
      blog: blogStats.status === 'fulfilled' ? blogStats.value : getDefaultBlogStats(),
      portfolios: portfolioStats.status === 'fulfilled' ? portfolioStats.value : getDefaultPortfolioStats(),
      engagement: engagementStats.status === 'fulfilled' ? engagementStats.value : getDefaultEngagementStats(),
      notifications: notificationStats.status === 'fulfilled' ? notificationStats.value : getDefaultNotificationStats(),
      growth: growthStats.status === 'fulfilled' ? growthStats.value : getDefaultGrowthStats()
    }

    // 🔥 记录失败的查询（用于调试）
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['博客统计', '作品集统计', '互动统计', '通知统计', '增长统计']
        console.warn(`⚠️ ${names[index]}查询失败:`, result.reason)
      }
    })

    console.log('✅ 社区统计总览数据获取完成')
    console.log('📈 统计摘要:', {
      博客文章: stats.blog.publishedPosts,
      活跃用户: stats.portfolios.usersWithPortfolios,
      总作品数: stats.portfolios.totalArtworks,
      总互动数: stats.engagement.totalLikes + stats.engagement.totalComments
    })

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 获取社区统计失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取社区统计失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 获取博客统计数据
 */
async function getBlogStats(supabase: any) {
  try {
    // 1. 查询博客文章总数和状态分布
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id, status, view_count, like_count, category_id, published_at')

    if (postsError) throw postsError

    const totalPosts = posts?.length || 0
    const publishedPosts = posts?.filter((p: any) => p.status === 'published').length || 0
    const draftPosts = posts?.filter((p: any) => p.status === 'draft').length || 0
    const totalViews = posts?.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) || 0
    const totalLikes = posts?.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0) || 0

    // 2. 按分类统计（查询分类表获取名称）
    const { data: categories, error: categoriesError } = await supabase
      .from('blog_categories')
      .select('id, name')

    if (categoriesError) console.warn('⚠️ 查询分类失败:', categoriesError)

    const categoryMap = new Map(categories?.map((c: any) => [c.id, c.name]) || [])
    const byCategory: Record<string, number> = {}

    posts?.forEach((post: any) => {
      if (post.category_id) {
        // 🔥 老王修复：安全处理Map.get返回值，确保是string类型
        const categoryName = (categoryMap.get(post.category_id) as string | undefined) ?? 'Unknown'
        byCategory[categoryName] = (byCategory[categoryName] || 0) + 1
      }
    })

    // 3. 按标签统计（从post_tags关联表）
    const { data: postTags, error: tagsError } = await supabase
      .from('blog_post_tags')
      .select('tag_id, blog_tags(name)')

    if (tagsError) console.warn('⚠️ 查询标签失败:', tagsError)

    const byTag: Record<string, number> = {}
    postTags?.forEach((pt: any) => {
      // 🔥 老王修复：安全处理可能undefined的值，确保是string类型
      const tagName = (pt.blog_tags?.name as string | undefined) ?? 'Unknown'
      byTag[tagName] = (byTag[tagName] || 0) + 1
    })

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      byCategory,
      byTag
    }
  } catch (error) {
    console.error('❌ 获取博客统计失败:', error)
    throw error
  }
}

/**
 * 🔥 获取用户作品集统计
 */
async function getPortfolioStats(supabase: any) {
  try {
    // 1. 查询总用户数（从auth.users表）
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) console.warn('⚠️ 查询用户总数失败:', usersError)

    // 2. 查询所有作品（从artworks表）
    const { data: artworks, error: artworksError } = await supabase
      .from('artworks')
      .select('id, user_id, privacy')

    if (artworksError) throw artworksError

    const totalArtworks = artworks?.length || 0
    const publicArtworks = artworks?.filter((a: any) => a.privacy === 'public').length || 0
    const privateArtworks = artworks?.filter((a: any) => a.privacy === 'private').length || 0
    const followersOnlyArtworks = artworks?.filter((a: any) => a.privacy === 'followers_only').length || 0

    // 3. 统计有作品集的用户数（至少有1个作品的用户）
    const usersWithArtworks = new Set(artworks?.map((a: any) => a.user_id) || [])
    const usersWithPortfolios = usersWithArtworks.size

    return {
      totalUsers: totalUsers || 0,
      usersWithPortfolios,
      totalArtworks,
      publicArtworks,
      privateArtworks,
      followersOnlyArtworks
    }
  } catch (error) {
    console.error('❌ 获取作品集统计失败:', error)
    throw error
  }
}

/**
 * 🔥 获取互动统计（点赞、评论、关注）
 */
async function getEngagementStats(supabase: any) {
  try {
    // 1. 查询博客点赞总数（从blog_post_likes表）
    const { count: blogLikes, error: blogLikesError } = await supabase
      .from('blog_post_likes')
      .select('*', { count: 'exact', head: true })

    if (blogLikesError) console.warn('⚠️ 查询博客点赞失败:', blogLikesError)

    // 2. 查询作品点赞总数（从artwork_likes表）
    const { count: artworkLikes, error: artworkLikesError } = await supabase
      .from('artwork_likes')
      .select('*', { count: 'exact', head: true })

    if (artworkLikesError) console.warn('⚠️ 查询作品点赞失败:', artworkLikesError)

    const totalLikes = (blogLikes || 0) + (artworkLikes || 0)

    // 3. 查询评论总数（从comments表）
    const { count: totalComments, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    if (commentsError) console.warn('⚠️ 查询评论失败:', commentsError)

    // 4. 查询关注总数（从user_follows表）
    const { count: totalFollows, error: followsError } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })

    if (followsError) console.warn('⚠️ 查询关注失败:', followsError)

    // 5. 计算平均值（需要查询博客文章总数）
    const { count: totalPosts, error: postsError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    if (postsError) console.warn('⚠️ 查询博客总数失败:', postsError)

    const avgLikesPerPost = totalPosts && totalPosts > 0
      ? Math.round((blogLikes || 0) / totalPosts * 10) / 10
      : 0

    const avgCommentsPerPost = totalPosts && totalPosts > 0
      ? Math.round((totalComments || 0) / totalPosts * 10) / 10
      : 0

    return {
      totalLikes,
      totalComments: totalComments || 0,
      totalFollows: totalFollows || 0,
      avgLikesPerPost,
      avgCommentsPerPost
    }
  } catch (error) {
    console.error('❌ 获取互动统计失败:', error)
    throw error
  }
}

/**
 * 🔥 获取通知统计
 */
async function getNotificationStats(supabase: any) {
  try {
    // 1. 查询通知总数
    const { count: totalNotifications, error: totalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // 2. 查询未读通知数
    const { count: unreadNotifications, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (unreadError) console.warn('⚠️ 查询未读通知失败:', unreadError)

    // 3. 按类型统计
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('type')

    if (notificationsError) console.warn('⚠️ 查询通知类型失败:', notificationsError)

    const byType: Record<string, number> = {}
    notifications?.forEach((n: any) => {
      byType[n.type] = (byType[n.type] || 0) + 1
    })

    return {
      totalNotifications: totalNotifications || 0,
      unreadNotifications: unreadNotifications || 0,
      byType
    }
  } catch (error) {
    console.error('❌ 获取通知统计失败:', error)
    throw error
  }
}

/**
 * 🔥 获取增长统计（本月新增数据）
 */
async function getGrowthStats(supabase: any) {
  try {
    // 计算本月开始时间
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 1. 本月新增用户
    const { count: usersThisMonth, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)

    if (usersError) console.warn('⚠️ 查询本月用户失败:', usersError)

    // 2. 本月新增博客文章
    const { count: postsThisMonth, error: postsError } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .gte('published_at', monthStart)
      .eq('status', 'published')

    if (postsError) console.warn('⚠️ 查询本月博客失败:', postsError)

    // 3. 本月新增作品
    const { count: artworksThisMonth, error: artworksError } = await supabase
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)

    if (artworksError) console.warn('⚠️ 查询本月作品失败:', artworksError)

    return {
      usersThisMonth: usersThisMonth || 0,
      postsThisMonth: postsThisMonth || 0,
      artworksThisMonth: artworksThisMonth || 0
    }
  } catch (error) {
    console.error('❌ 获取增长统计失败:', error)
    throw error
  }
}

// 🔥 默认值函数（查询失败时使用）
function getDefaultBlogStats() {
  return {
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    byCategory: {},
    byTag: {}
  }
}

function getDefaultPortfolioStats() {
  return {
    totalUsers: 0,
    usersWithPortfolios: 0,
    totalArtworks: 0,
    publicArtworks: 0,
    privateArtworks: 0,
    followersOnlyArtworks: 0
  }
}

function getDefaultEngagementStats() {
  return {
    totalLikes: 0,
    totalComments: 0,
    totalFollows: 0,
    avgLikesPerPost: 0,
    avgCommentsPerPost: 0
  }
}

function getDefaultNotificationStats() {
  return {
    totalNotifications: 0,
    unreadNotifications: 0,
    byType: {}
  }
}

function getDefaultGrowthStats() {
  return {
    usersThisMonth: 0,
    postsThisMonth: 0,
    artworksThisMonth: 0
  }
}

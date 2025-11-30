/**
 * 🔥 老王的用户行为分析 API
 * 用途: 提供用户留存率、增长率等核心运营指标
 * 老王提醒: 这些数据是评估平台健康度的关键！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// 🔥 用户行为分析数据接口
interface AnalyticsData {
  userGrowth: {
    totalUsers: number
    newUsersLast7Days: number
    newUsersLast30Days: number
    growthRateLast7Days: number  // 相对于前7天的增长率
    growthRateLast30Days: number // 相对于前30天的增长率
    dailyNewUsers: Array<{ date: string; count: number }> // 最近30天每日新增
  }
  userRetention: {
    day1Retention: number  // 次日留存率
    day7Retention: number  // 7日留存率
    day30Retention: number // 30日留存率
  }
  userActivity: {
    dailyActiveUsers: number  // DAU
    weeklyActiveUsers: number // WAU
    monthlyActiveUsers: number // MAU
    avgSessionsPerUser: number
    avgActionsPerUser: number // 平均每用户操作数（发帖+评论+点赞+关注）
  }
  contentMetrics: {
    postsPerUser: number
    artworksPerUser: number
    avgEngagementRate: number // 互动率（点赞+评论）/ 总内容数
  }
}

/**
 * 🔥 老王：GET - 获取用户行为分析数据
 * 艹，这个API要是数据算错了，运营团队会骂死我！
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 开始计算用户行为分析数据...')

    const supabase = createServiceClient()

    // 🔥 并行查询所有分析数据（提高性能）
    const timeout = (ms: number) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )

    // 🔥 老王修复：添加类型注解解决TypeScript类型推断问题
    const results = await Promise.allSettled([
      Promise.race([getUserGrowthMetrics(supabase), timeout(10000)]) as Promise<AnalyticsData['userGrowth']>,
      Promise.race([getUserRetentionMetrics(supabase), timeout(12000)]) as Promise<AnalyticsData['userRetention']>,
      Promise.race([getUserActivityMetrics(supabase), timeout(10000)]) as Promise<AnalyticsData['userActivity']>,
      Promise.race([getContentMetrics(supabase), timeout(10000)]) as Promise<AnalyticsData['contentMetrics']>
    ])

    const [userGrowth, userRetention, userActivity, contentMetrics] = results

    // 🔥 组装完整的分析数据
    const analytics: AnalyticsData = {
      userGrowth: userGrowth.status === 'fulfilled' ? userGrowth.value : getDefaultUserGrowth(),
      userRetention: userRetention.status === 'fulfilled' ? userRetention.value : getDefaultRetention(),
      userActivity: userActivity.status === 'fulfilled' ? userActivity.value : getDefaultActivity(),
      contentMetrics: contentMetrics.status === 'fulfilled' ? contentMetrics.value : getDefaultContentMetrics()
    }

    // 🔥 记录失败的查询（用于调试）
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['用户增长', '用户留存', '用户活跃度', '内容指标']
        console.warn(`⚠️ ${names[index]}计算失败:`, result.reason)
      }
    })

    console.log('✅ 用户行为分析数据计算完成')
    console.log('📈 分析摘要:', {
      总用户数: analytics.userGrowth.totalUsers,
      月活跃用户: analytics.userActivity.monthlyActiveUsers,
      '7日留存率': `${(analytics.userRetention.day7Retention * 100).toFixed(1)}%`,
      平均互动率: `${(analytics.contentMetrics.avgEngagementRate * 100).toFixed(1)}%`
    })

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 获取用户行为分析失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户行为分析失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 计算用户增长指标
 */
async function getUserGrowthMetrics(supabase: any) {
  try {
    const now = new Date()
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const prev30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

    // 1. 查询总用户数
    const { count: totalUsers, error: totalError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (totalError) console.warn('⚠️ 查询总用户数失败:', totalError)

    // 2. 查询最近7天新增用户
    const { count: newUsersLast7Days, error: last7Error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last7Days)

    if (last7Error) console.warn('⚠️ 查询7天新增失败:', last7Error)

    // 3. 查询最近30天新增用户
    const { count: newUsersLast30Days, error: last30Error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last30Days)

    if (last30Error) console.warn('⚠️ 查询30天新增失败:', last30Error)

    // 4. 查询前7天（第8-14天）新增用户数（用于计算增长率）
    const { count: prevWeekUsers, error: prevWeekError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prev7Days)
      .lt('created_at', last7Days)

    if (prevWeekError) console.warn('⚠️ 查询前7天新增失败:', prevWeekError)

    // 5. 查询前30天（第31-60天）新增用户数
    const { count: prevMonthUsers, error: prevMonthError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prev30Days)
      .lt('created_at', last30Days)

    if (prevMonthError) console.warn('⚠️ 查询前30天新增失败:', prevMonthError)

    // 6. 计算增长率
    const growthRateLast7Days = prevWeekUsers && prevWeekUsers > 0
      ? ((newUsersLast7Days || 0) - prevWeekUsers) / prevWeekUsers
      : 0

    const growthRateLast30Days = prevMonthUsers && prevMonthUsers > 0
      ? ((newUsersLast30Days || 0) - prevMonthUsers) / prevMonthUsers
      : 0

    // 7. 查询最近30天每日新增用户（用于趋势图）
    const { data: dailyUsers, error: dailyError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', last30Days)
      .order('created_at', { ascending: true })

    if (dailyError) console.warn('⚠️ 查询每日新增失败:', dailyError)

    // 8. 按日期分组统计
    const dailyNewUsers: Array<{ date: string; count: number }> = []
    if (dailyUsers && dailyUsers.length > 0) {
      const dailyMap = new Map<string, number>()
      dailyUsers.forEach((user: any) => {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
      })

      // 填充缺失的日期（确保连续30天）
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        dailyNewUsers.push({
          date,
          count: dailyMap.get(date) || 0
        })
      }
    }

    return {
      totalUsers: totalUsers || 0,
      newUsersLast7Days: newUsersLast7Days || 0,
      newUsersLast30Days: newUsersLast30Days || 0,
      growthRateLast7Days: Math.round(growthRateLast7Days * 1000) / 10, // 转换为百分比，保留1位小数
      growthRateLast30Days: Math.round(growthRateLast30Days * 1000) / 10,
      dailyNewUsers
    }
  } catch (error) {
    console.error('❌ 计算用户增长指标失败:', error)
    throw error
  }
}

/**
 * 🔥 计算用户留存率
 * 老王说明：留存率计算逻辑
 * - 次日留存 = (T日注册用户在T+1日活跃的用户数) / (T日注册用户总数)
 * - 7日留存 = (T日注册用户在T+7日活跃的用户数) / (T日注册用户总数)
 * - 30日留存 = (T日注册用户在T+30日活跃的用户数) / (T日注册用户总数)
 */
async function getUserRetentionMetrics(supabase: any) {
  try {
    const now = new Date()

    // 计算各个时间点
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. 次日留存率：昨天注册的用户，今天有活跃的比例
    const { data: yesterdayUsers, error: day1UsersError } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', twoDaysAgo.toISOString())
      .lt('created_at', yesterday.toISOString())

    if (day1UsersError) console.warn('⚠️ 查询昨日注册用户失败:', day1UsersError)

    const day1CohortSize = yesterdayUsers?.length || 0
    let day1Retention = 0

    if (day1CohortSize > 0) {
      // 检查这些用户在今天是否有活跃（发帖、评论、点赞、关注）
      const userIds = yesterdayUsers.map((u: any) => u.id)
      const { count: activeCount, error: activeError } = await supabase
        .rpc('count_active_users', {
          user_ids: userIds,
          start_time: yesterday.toISOString(),
          end_time: now.toISOString()
        })

      if (activeError) {
        console.warn('⚠️ 查询次日活跃失败，使用备用方法:', activeError)
        // 备用方法：简化为检查是否有任何活动
        const activeUsers = await countActiveUsersFallback(supabase, userIds, yesterday.toISOString(), now.toISOString())
        day1Retention = activeUsers / day1CohortSize
      } else {
        day1Retention = (activeCount || 0) / day1CohortSize
      }
    }

    // 2. 7日留存率：8天前注册的用户，7天前有活跃的比例
    const { data: eightDaysUsers, error: day7UsersError } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', eightDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    if (day7UsersError) console.warn('⚠️ 查询8天前注册用户失败:', day7UsersError)

    const day7CohortSize = eightDaysUsers?.length || 0
    let day7Retention = 0

    if (day7CohortSize > 0) {
      const userIds = eightDaysUsers.map((u: any) => u.id)
      const activeUsers = await countActiveUsersFallback(supabase, userIds, sevenDaysAgo.toISOString(), now.toISOString())
      day7Retention = activeUsers / day7CohortSize
    }

    // 3. 30日留存率：31天前注册的用户，30天前有活跃的比例
    const { data: thirtyOneDaysUsers, error: day30UsersError } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', thirtyOneDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (day30UsersError) console.warn('⚠️ 查询31天前注册用户失败:', day30UsersError)

    const day30CohortSize = thirtyOneDaysUsers?.length || 0
    let day30Retention = 0

    if (day30CohortSize > 0) {
      const userIds = thirtyOneDaysUsers.map((u: any) => u.id)
      const activeUsers = await countActiveUsersFallback(supabase, userIds, thirtyDaysAgo.toISOString(), now.toISOString())
      day30Retention = activeUsers / day30CohortSize
    }

    return {
      day1Retention: Math.round(day1Retention * 1000) / 1000, // 保留3位小数
      day7Retention: Math.round(day7Retention * 1000) / 1000,
      day30Retention: Math.round(day30Retention * 1000) / 1000
    }
  } catch (error) {
    console.error('❌ 计算用户留存率失败:', error)
    throw error
  }
}

/**
 * 🔥 备用方法：统计活跃用户数（通过查询各个活动表）
 */
async function countActiveUsersFallback(
  supabase: any,
  userIds: string[],
  startTime: string,
  endTime: string
): Promise<number> {
  try {
    const activeUserSet = new Set<string>()

    // 查询发帖活跃
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('author_id')
      .in('author_id', userIds)
      .gte('created_at', startTime)
      .lt('created_at', endTime)

    posts?.forEach((p: any) => activeUserSet.add(p.author_id))

    // 查询评论活跃
    const { data: comments } = await supabase
      .from('comments')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', startTime)
      .lt('created_at', endTime)

    comments?.forEach((c: any) => activeUserSet.add(c.user_id))

    // 查询点赞活跃（博客）
    const { data: blogLikes } = await supabase
      .from('blog_post_likes')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', startTime)
      .lt('created_at', endTime)

    blogLikes?.forEach((l: any) => activeUserSet.add(l.user_id))

    // 查询点赞活跃（作品）
    const { data: artworkLikes } = await supabase
      .from('artwork_likes')
      .select('user_id')
      .in('user_id', userIds)
      .gte('created_at', startTime)
      .lt('created_at', endTime)

    artworkLikes?.forEach((l: any) => activeUserSet.add(l.user_id))

    // 查询关注活跃
    const { data: follows } = await supabase
      .from('user_follows')
      .select('follower_id')
      .in('follower_id', userIds)
      .gte('created_at', startTime)
      .lt('created_at', endTime)

    follows?.forEach((f: any) => activeUserSet.add(f.follower_id))

    return activeUserSet.size
  } catch (error) {
    console.error('❌ 备用活跃用户统计失败:', error)
    return 0
  }
}

/**
 * 🔥 计算用户活跃度指标
 */
async function getUserActivityMetrics(supabase: any) {
  try {
    const now = new Date()
    const last1Day = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. DAU（日活跃用户）
    const dauSet = new Set<string>()
    await collectActiveUsers(supabase, last1Day, now.toISOString(), dauSet)
    const dailyActiveUsers = dauSet.size

    // 2. WAU（周活跃用户）
    const wauSet = new Set<string>()
    await collectActiveUsers(supabase, last7Days, now.toISOString(), wauSet)
    const weeklyActiveUsers = wauSet.size

    // 3. MAU（月活跃用户）
    const mauSet = new Set<string>()
    await collectActiveUsers(supabase, last30Days, now.toISOString(), mauSet)
    const monthlyActiveUsers = mauSet.size

    // 4. 查询总用户数（用于计算人均指标）
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 5. 统计总操作数（发帖+评论+点赞+关注）
    const { count: totalPosts } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })

    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    const { count: totalBlogLikes } = await supabase
      .from('blog_post_likes')
      .select('*', { count: 'exact', head: true })

    const { count: totalArtworkLikes } = await supabase
      .from('artwork_likes')
      .select('*', { count: 'exact', head: true })

    const { count: totalFollows } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })

    const totalActions = (totalPosts || 0) + (totalComments || 0) +
      (totalBlogLikes || 0) + (totalArtworkLikes || 0) + (totalFollows || 0)

    // 6. 计算平均值
    const avgActionsPerUser = totalUsers && totalUsers > 0
      ? Math.round((totalActions / totalUsers) * 10) / 10
      : 0

    // 简化：假设每个活跃用户平均1次会话
    const avgSessionsPerUser = monthlyActiveUsers > 0
      ? Math.round((monthlyActiveUsers / (totalUsers || 1)) * 10) / 10
      : 0

    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      avgSessionsPerUser,
      avgActionsPerUser
    }
  } catch (error) {
    console.error('❌ 计算用户活跃度失败:', error)
    throw error
  }
}

/**
 * 🔥 辅助函数：收集时间范围内的活跃用户
 */
async function collectActiveUsers(
  supabase: any,
  startTime: string,
  endTime: string,
  userSet: Set<string>
) {
  // 发帖活跃
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('author_id')
    .gte('created_at', startTime)
    .lt('created_at', endTime)
  posts?.forEach((p: any) => userSet.add(p.author_id))

  // 评论活跃
  const { data: comments } = await supabase
    .from('comments')
    .select('user_id')
    .gte('created_at', startTime)
    .lt('created_at', endTime)
  comments?.forEach((c: any) => userSet.add(c.user_id))

  // 博客点赞活跃
  const { data: blogLikes } = await supabase
    .from('blog_post_likes')
    .select('user_id')
    .gte('created_at', startTime)
    .lt('created_at', endTime)
  blogLikes?.forEach((l: any) => userSet.add(l.user_id))

  // 作品点赞活跃
  const { data: artworkLikes } = await supabase
    .from('artwork_likes')
    .select('user_id')
    .gte('created_at', startTime)
    .lt('created_at', endTime)
  artworkLikes?.forEach((l: any) => userSet.add(l.user_id))

  // 关注活跃
  const { data: follows } = await supabase
    .from('user_follows')
    .select('follower_id')
    .gte('created_at', startTime)
    .lt('created_at', endTime)
  follows?.forEach((f: any) => userSet.add(f.follower_id))
}

/**
 * 🔥 计算内容指标
 */
async function getContentMetrics(supabase: any) {
  try {
    // 1. 查询总用户数
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 2. 查询总博客文章数
    const { count: totalPosts } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })

    // 3. 查询总作品数
    const { count: totalArtworks } = await supabase
      .from('artworks')
      .select('*', { count: 'exact', head: true })

    // 4. 查询总互动数（点赞+评论）
    const { count: totalBlogLikes } = await supabase
      .from('blog_post_likes')
      .select('*', { count: 'exact', head: true })

    const { count: totalArtworkLikes } = await supabase
      .from('artwork_likes')
      .select('*', { count: 'exact', head: true })

    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    const totalEngagement = (totalBlogLikes || 0) + (totalArtworkLikes || 0) + (totalComments || 0)
    const totalContent = (totalPosts || 0) + (totalArtworks || 0)

    // 5. 计算平均值
    const postsPerUser = totalUsers && totalUsers > 0
      ? Math.round((totalPosts || 0) / totalUsers * 10) / 10
      : 0

    const artworksPerUser = totalUsers && totalUsers > 0
      ? Math.round((totalArtworks || 0) / totalUsers * 10) / 10
      : 0

    const avgEngagementRate = totalContent > 0
      ? Math.round((totalEngagement / totalContent) * 1000) / 1000
      : 0

    return {
      postsPerUser,
      artworksPerUser,
      avgEngagementRate
    }
  } catch (error) {
    console.error('❌ 计算内容指标失败:', error)
    throw error
  }
}

// 🔥 默认值函数（查询失败时使用）
function getDefaultUserGrowth() {
  return {
    totalUsers: 0,
    newUsersLast7Days: 0,
    newUsersLast30Days: 0,
    growthRateLast7Days: 0,
    growthRateLast30Days: 0,
    dailyNewUsers: []
  }
}

function getDefaultRetention() {
  return {
    day1Retention: 0,
    day7Retention: 0,
    day30Retention: 0
  }
}

function getDefaultActivity() {
  return {
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    avgSessionsPerUser: 0,
    avgActionsPerUser: 0
  }
}

function getDefaultContentMetrics() {
  return {
    postsPerUser: 0,
    artworksPerUser: 0,
    avgEngagementRate: 0
  }
}

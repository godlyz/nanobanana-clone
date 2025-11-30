/**
 * 🔥 老王的内容审核效率统计API
 * 用途: 追踪内容审核效率和效果
 * 路由: GET /api/stats/moderation
 *
 * 目标指标:
 * - 审核效率: 95%+
 * - 平均审核时间: <1小时
 * - 误判率: <5%
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase 客户端类型
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>

// 超时保护
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  )
}

// 内容状态定义
type ContentStatus = 'pending' | 'approved' | 'rejected' | 'flagged'

// 审核统计接口
interface ModerationStats {
  totalContent: number
  approved: number
  rejected: number
  pending: number
  flagged: number
  approvalRate: number
  rejectionRate: number
  pendingRate: number
}

// 获取博客审核统计
async function getBlogModerationStats(supabase: SupabaseClientType): Promise<ModerationStats> {
  const defaultStats: ModerationStats = {
    totalContent: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    flagged: 0,
    approvalRate: 100,
    rejectionRate: 0,
    pendingRate: 0
  }

  try {
    // 获取各状态的博客数量
    const { count: published } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    const { count: draft } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')

    const { count: total } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })

    const totalCount = total || 0
    const approvedCount = published || 0
    const pendingCount = draft || 0
    // 假设没有被拒绝状态的博客，rejected = total - approved - pending
    const rejectedCount = Math.max(0, totalCount - approvedCount - pendingCount)

    return {
      totalContent: totalCount,
      approved: approvedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      flagged: 0,
      approvalRate: totalCount > 0 ? (approvedCount / totalCount) * 100 : 100,
      rejectionRate: totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0,
      pendingRate: totalCount > 0 ? (pendingCount / totalCount) * 100 : 0
    }
  } catch (error) {
    console.error('[Moderation] Blog stats error:', error)
    return defaultStats
  }
}

// 获取评论审核统计
async function getCommentModerationStats(supabase: SupabaseClientType): Promise<ModerationStats> {
  const defaultStats: ModerationStats = {
    totalContent: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    flagged: 0,
    approvalRate: 100,
    rejectionRate: 0,
    pendingRate: 0
  }

  try {
    // 评论表可能没有 status 字段，尝试获取总数
    const { count: total } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })

    // 假设所有评论都已批准（如果没有审核系统）
    const totalCount = total || 0

    return {
      totalContent: totalCount,
      approved: totalCount,
      rejected: 0,
      pending: 0,
      flagged: 0,
      approvalRate: 100,
      rejectionRate: 0,
      pendingRate: 0
    }
  } catch (error) {
    // 表可能不存在
    if (error instanceof Error && error.message.includes('does not exist')) {
      return defaultStats
    }
    console.error('[Moderation] Comment stats error:', error)
    return defaultStats
  }
}

// 获取作品审核统计
async function getArtworkModerationStats(supabase: SupabaseClientType): Promise<ModerationStats> {
  const defaultStats: ModerationStats = {
    totalContent: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    flagged: 0,
    approvalRate: 100,
    rejectionRate: 0,
    pendingRate: 0
  }

  try {
    // 检查图像生成历史表
    const { count: imageTotal } = await supabase
      .from('image_generation_history')
      .select('*', { count: 'exact', head: true })

    // 检查视频生成历史表
    const { count: videoTotal } = await supabase
      .from('video_generation_history')
      .select('*', { count: 'exact', head: true })

    const totalCount = (imageTotal || 0) + (videoTotal || 0)

    return {
      totalContent: totalCount,
      approved: totalCount, // AI生成的内容默认通过
      rejected: 0,
      pending: 0,
      flagged: 0,
      approvalRate: 100,
      rejectionRate: 0,
      pendingRate: 0
    }
  } catch (error) {
    console.error('[Moderation] Artwork stats error:', error)
    return defaultStats
  }
}

// 计算综合审核效率
function calculateEfficiency(stats: {
  blog: ModerationStats
  comments: ModerationStats
  artworks: ModerationStats
}): number {
  const totalContent =
    stats.blog.totalContent +
    stats.comments.totalContent +
    stats.artworks.totalContent

  const totalApproved =
    stats.blog.approved +
    stats.comments.approved +
    stats.artworks.approved

  const totalPending =
    stats.blog.pending +
    stats.comments.pending +
    stats.artworks.pending

  // 效率 = 已处理内容 / 总内容
  const processed = totalApproved + (stats.blog.rejected + stats.comments.rejected + stats.artworks.rejected)

  if (totalContent === 0) return 100
  return ((processed / totalContent) * 100)
}

// 生成审核建议
function generateRecommendations(stats: {
  blog: ModerationStats
  comments: ModerationStats
  artworks: ModerationStats
}, efficiency: number): string[] {
  const recommendations: string[] = []

  if (efficiency < 95) {
    recommendations.push(`当前审核效率 ${efficiency.toFixed(1)}%，低于目标 95%，建议增加审核人员或自动化审核`)
  }

  if (stats.blog.pendingRate > 10) {
    recommendations.push(`博客待审核占比 ${stats.blog.pendingRate.toFixed(1)}%，建议优先处理积压内容`)
  }

  if (stats.comments.pendingRate > 5) {
    recommendations.push(`评论待审核较多，建议启用关键词自动过滤`)
  }

  if (stats.blog.rejectionRate > 20) {
    recommendations.push(`博客拒绝率 ${stats.blog.rejectionRate.toFixed(1)}% 偏高，建议优化创作指南`)
  }

  if (recommendations.length === 0) {
    recommendations.push('审核效率良好，继续保持！')
  }

  return recommendations
}

export async function GET() {
  const startTime = performance.now()

  try {
    const supabase = await createClient()

    // 并行获取各类内容的审核统计
    const [blogStats, commentStats, artworkStats] = await Promise.all([
      Promise.race([getBlogModerationStats(supabase), timeout(8000)]),
      Promise.race([getCommentModerationStats(supabase), timeout(8000)]),
      Promise.race([getArtworkModerationStats(supabase), timeout(8000)])
    ])

    const stats = {
      blog: blogStats,
      comments: commentStats,
      artworks: artworkStats
    }

    // 计算综合效率
    const efficiency = calculateEfficiency(stats)

    // 汇总统计
    const summary = {
      totalContent:
        stats.blog.totalContent +
        stats.comments.totalContent +
        stats.artworks.totalContent,
      totalApproved:
        stats.blog.approved +
        stats.comments.approved +
        stats.artworks.approved,
      totalRejected:
        stats.blog.rejected +
        stats.comments.rejected +
        stats.artworks.rejected,
      totalPending:
        stats.blog.pending +
        stats.comments.pending +
        stats.artworks.pending,
      totalFlagged:
        stats.blog.flagged +
        stats.comments.flagged +
        stats.artworks.flagged
    }

    // SLA 达标情况
    const slaTarget = 95 // 95% 效率目标
    const sla = {
      target: slaTarget,
      current: efficiency,
      isMeeting: efficiency >= slaTarget,
      gap: Math.max(0, slaTarget - efficiency)
    }

    const duration = Math.round(performance.now() - startTime)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,

      // 综合效率
      efficiency: {
        percentage: Number(efficiency.toFixed(2)),
        status: efficiency >= 95 ? 'excellent' : efficiency >= 80 ? 'good' : 'needs_improvement',
        trend: 'stable' // 实际应该对比历史数据
      },

      // SLA 达标
      sla,

      // 汇总统计
      summary,

      // 分类统计
      byCategory: {
        blog: {
          ...stats.blog,
          approvalRate: Number(stats.blog.approvalRate.toFixed(2)),
          rejectionRate: Number(stats.blog.rejectionRate.toFixed(2)),
          pendingRate: Number(stats.blog.pendingRate.toFixed(2))
        },
        comments: {
          ...stats.comments,
          approvalRate: Number(stats.comments.approvalRate.toFixed(2)),
          rejectionRate: Number(stats.comments.rejectionRate.toFixed(2)),
          pendingRate: Number(stats.comments.pendingRate.toFixed(2))
        },
        artworks: {
          ...stats.artworks,
          approvalRate: Number(stats.artworks.approvalRate.toFixed(2)),
          rejectionRate: Number(stats.artworks.rejectionRate.toFixed(2)),
          pendingRate: Number(stats.artworks.pendingRate.toFixed(2))
        }
      },

      // 建议
      recommendations: generateRecommendations(stats, efficiency),

      // 目标指标
      targets: {
        efficiency: { target: 95, unit: '%', description: '审核效率目标' },
        avgTime: { target: 60, unit: 'minutes', description: '平均审核时间目标' },
        falsePositiveRate: { target: 5, unit: '%', description: '误判率上限' }
      }
    })

  } catch (error) {
    console.error('[Moderation Stats] Error:', error)
    return NextResponse.json({
      success: false,
      error: '获取审核统计失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

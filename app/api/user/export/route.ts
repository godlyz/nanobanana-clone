// app/api/user/export/route.ts
// 🔥 老王创建：GDPR 数据导出 API
// 功能: 导出用户所有个人数据为 JSON 格式
// 合规要求: GDPR Article 20 - 数据可携带权

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/export
 * 导出用户所有个人数据
 *
 * 返回数据包括:
 * - 用户基本信息
 * - 订阅信息
 * - 积分记录
 * - 图片生成历史
 * - 视频生成历史
 * - 博客文章
 * - 评论记录
 * - 点赞记录
 * - 关注关系
 * - 成就记录
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      )
    }

    const userId = user.id
    const exportData: Record<string, any> = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        format: 'JSON',
        gdpr_compliance: 'Article 20 - Right to data portability'
      }
    }

    // 2. 导出用户基本信息
    exportData.user_profile = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata
    }

    // 3. 导出用户档案（如果有扩展表）
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profile) {
      exportData.extended_profile = profile
    }

    // 4. 导出订阅信息
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)

    exportData.subscriptions = subscriptions || []

    // 5. 导出积分记录
    const { data: credits } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    exportData.credit_transactions = credits || []

    // 6. 导出图片生成历史
    const { data: imageHistory } = await supabase
      .from('generation_history')
      .select('id, prompt, model, created_at, status, generation_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    exportData.image_generation_history = imageHistory || []

    // 7. 导出视频生成历史
    const { data: videoHistory } = await supabase
      .from('video_generation_history')
      .select('id, prompt, generation_mode, resolution, duration_seconds, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    exportData.video_generation_history = videoHistory || []

    // 8. 导出博客文章
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('id, title, slug, content, status, created_at, updated_at, published_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })

    exportData.blog_posts = blogPosts || []

    // 9. 导出评论记录
    const { data: comments } = await supabase
      .from('comments')
      .select('id, content, target_type, target_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    exportData.comments = comments || []

    // 10. 导出点赞记录
    const { data: likes } = await supabase
      .from('artwork_likes')
      .select('artwork_id, created_at')
      .eq('user_id', userId)

    exportData.artwork_likes = likes || []

    const { data: postLikes } = await supabase
      .from('blog_post_likes')
      .select('post_id, created_at')
      .eq('user_id', userId)

    exportData.blog_post_likes = postLikes || []

    // 11. 导出关注关系
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)

    exportData.following = following || []

    const { data: followers } = await supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)

    exportData.followers = followers || []

    // 12. 导出成就记录
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at, progress')
      .eq('user_id', userId)

    exportData.achievements = achievements || []

    // 13. 导出通知设置
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100) // 最近100条通知

    exportData.recent_notifications = notifications || []

    // 返回 JSON 数据
    const jsonString = JSON.stringify(exportData, null, 2)

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nano-banana-data-export-${userId.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-store'
      }
    })

  } catch (error: any) {
    console.error('❌ 数据导出失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: '数据导出失败，请稍后重试'
        }
      },
      { status: 500 }
    )
  }
}

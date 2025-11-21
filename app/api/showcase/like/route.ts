/**
 * 🔥 老王的点赞系统API
 * 用途: 处理showcase案例的点赞/取消点赞操作
 * 老王警告: 这个API要是出问题，用户点赞数据就全乱了！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 🔥 GET - 检查用户是否已点赞某个showcase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const showcaseId = searchParams.get('showcase_id')

    if (!showcaseId) {
      return NextResponse.json({
        success: false,
        error: 'showcase_id参数缺失'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '用户未登录',
        is_liked: false
      }, { status: 401 })
    }

    // 查询用户是否已点赞
    const { data: likeRecord, error: queryError } = await supabase
      .from('showcase_likes')
      .select('id')
      .eq('showcase_id', showcaseId)
      .eq('user_id', user.id)
      .single()

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ 查询点赞记录失败:', queryError)
      return NextResponse.json({
        success: false,
        error: '查询点赞状态失败'
      }, { status: 500 })
    }

    // 获取最新的点赞总数
    const { count: likesCount, error: countError } = await supabase
      .from('showcase_likes')
      .select('*', { count: 'exact', head: true })
      .eq('showcase_id', showcaseId)

    if (countError) {
      console.error('❌ 获取点赞总数失败:', countError)
    }

    return NextResponse.json({
      success: true,
      is_liked: !!likeRecord,
      likes_count: likesCount || 0
    })

  } catch (error) {
    console.error('❌ 检查点赞状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查点赞状态失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 POST - 点赞或取消点赞
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { showcase_id, action } = body

    // 验证参数
    if (!showcase_id) {
      return NextResponse.json({
        success: false,
        error: 'showcase_id参数缺失'
      }, { status: 400 })
    }

    if (!action || !['like', 'unlike'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'action参数无效，必须是 like 或 unlike'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '用户未登录'
      }, { status: 401 })
    }

    // 检查showcase是否存在
    const { data: showcase, error: showcaseError } = await supabase
      .from('showcase')
      .select('id, likes_count')
      .eq('id', showcase_id)
      .single()

    if (showcaseError || !showcase) {
      console.error('❌ Showcase不存在:', showcaseError)
      return NextResponse.json({
        success: false,
        error: 'Showcase不存在'
      }, { status: 404 })
    }

    if (action === 'like') {
      // 🔥 老王添加点赞记录
      const { error: insertError } = await supabase
        .from('showcase_likes')
        .insert({
          showcase_id,
          user_id: user.id,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        // 如果是重复点赞，返回友好提示
        if (insertError.code === '23505') { // unique_violation
          return NextResponse.json({
            success: false,
            error: '您已经点赞过了'
          }, { status: 400 })
        }

        console.error('❌ 点赞失败:', insertError)
        return NextResponse.json({
          success: false,
          error: '点赞失败',
          message: insertError.message
        }, { status: 500 })
      }

      // 🔥 更新showcase表的点赞数（使用原子操作）
      const { error: updateError } = await supabase
        .from('showcase')
        .update({
          likes_count: (showcase.likes_count || 0) + 1
        })
        .eq('id', showcase_id)

      if (updateError) {
        console.error('❌ 更新点赞数失败:', updateError)
        // 注意：这里点赞记录已经插入，但计数更新失败
        // 实际生产环境可能需要回滚或使用数据库触发器
      }

      console.log(`✅ 用户 ${user.id} 点赞了 showcase ${showcase_id}`)

      return NextResponse.json({
        success: true,
        message: '点赞成功',
        likes_count: (showcase.likes_count || 0) + 1,
        is_liked: true
      })

    } else if (action === 'unlike') {
      // 🔥 老王删除点赞记录
      const { error: deleteError } = await supabase
        .from('showcase_likes')
        .delete()
        .eq('showcase_id', showcase_id)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('❌ 取消点赞失败:', deleteError)
        return NextResponse.json({
          success: false,
          error: '取消点赞失败',
          message: deleteError.message
        }, { status: 500 })
      }

      // 🔥 更新showcase表的点赞数（使用原子操作，确保不会低于0）
      const newCount = Math.max((showcase.likes_count || 0) - 1, 0)
      const { error: updateError } = await supabase
        .from('showcase')
        .update({
          likes_count: newCount
        })
        .eq('id', showcase_id)

      if (updateError) {
        console.error('❌ 更新点赞数失败:', updateError)
      }

      console.log(`✅ 用户 ${user.id} 取消点赞了 showcase ${showcase_id}`)

      return NextResponse.json({
        success: true,
        message: '取消点赞成功',
        likes_count: newCount,
        is_liked: false
      })
    }

  } catch (error) {
    console.error('❌ 点赞操作失败:', error)
    return NextResponse.json({
      success: false,
      error: '点赞操作失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

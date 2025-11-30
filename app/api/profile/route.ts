import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 🔥 老王：GET - 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录或会话已过期' },
        { status: 401 }
      )
    }

    // 返回用户基本信息
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        metadata: user.user_metadata
      }
    })
  } catch (error) {
    console.error('⚠️ Error fetching profile:', error)
    return NextResponse.json(
      { error: '获取用户资料失败' },
      { status: 500 }
    )
  }
}

// 🔥 老王：PATCH - 更新用户资料
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录或会话已过期' },
        { status: 401 }
      )
    }

    // 解析请求body
    const body = await request.json()
    const { displayName, avatarUrl } = body

    // 🔥 老王：验证输入
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: '显示名称不能为空' },
        { status: 400 }
      )
    }

    // 更新用户metadata
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim(),
        avatar_url: avatarUrl || user.user_metadata?.avatar_url
      }
    })

    if (error) {
      console.error('⚠️ Error updating profile:', error)
      return NextResponse.json(
        { error: '更新用户资料失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '用户资料更新成功',
      data: {
        displayName: data.user?.user_metadata?.full_name,
        avatarUrl: data.user?.user_metadata?.avatar_url
      }
    })
  } catch (error) {
    console.error('⚠️ Error updating profile:', error)
    return NextResponse.json(
      { error: '更新用户资料失败' },
      { status: 500 }
    )
  }
}

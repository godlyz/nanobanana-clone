/**
 * 验证管理员登录状态 API
 * 检查 admin-access-token 的有效性
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // 1. 检查是否有 admin-access-token
    const adminAccessToken = cookieStore.get('admin-access-token')
    
    if (!adminAccessToken) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    // 2. 使用 Service Client 验证 token
    const supabase = createServiceClient()
    
    // 从 token 获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(adminAccessToken.value)

    if (authError || !user) {
      // token 无效，清除 cookies
      cookieStore.delete('admin-access-token')
      cookieStore.delete('admin-refresh-token')
      
      return NextResponse.json(
        { success: false, error: 'Token 无效或已过期' },
        { status: 401 }
      )
    }

    // 3. 🔥 老王修复：检查是否为管理员（字段名改为 is_active）
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true) // 🔥 老王修复：字段名是 is_active，不是 status
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json(
        { success: false, error: '不是管理员或未激活' },
        { status: 403 }
      )
    }

    // 4. 验证成功，返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('验证 API 错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

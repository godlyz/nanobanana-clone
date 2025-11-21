/**
 * 后台登出 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { cookies } from 'next/headers'
import { getClientIp } from '@/lib/request-ip'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()

    // 1. 获取当前 admin session
    const supabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 2. 如果有用户，记录登出日志
    if (user) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (adminUser) {
        await supabase.from('audit_logs').insert({
          admin_id: user.id,
          action_type: 'admin_logout',
          resource_type: 'auth',
          ip_address: getClientIp(req.headers),
          user_agent: req.headers.get('user-agent') || 'unknown',
        })
      }
    }

    // 3. 登出 Supabase session
    await supabase.auth.signOut()

    // 4. 清除后台专用 cookies
    cookieStore.delete('admin-access-token')
    cookieStore.delete('admin-refresh-token')
    
    // 5. 也清除可能存在的前台 cookies（如果有）
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')

    console.log('✅ 管理员登出成功:', user?.email)

    return NextResponse.json({
      success: true,
      message: '已成功登出',
    })
  } catch (error) {
    console.error('登出 API 错误:', error)
    return NextResponse.json(
      { success: false, error: '登出失败，请稍后重试' },
      { status: 500 }
    )
  }
}

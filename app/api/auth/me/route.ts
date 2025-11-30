/**
 * 🔥 老王的获取当前用户API
 * 用途: 获取当前登录用户的基本信息
 * GET /api/auth/me - 获取当前用户
 * 老王警告: 这个API只返回基本信息，不返回敏感数据！
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface GetMeResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name?: string
    avatar_url?: string
  }
  error?: string
}

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 创建Supabase客户端
    const supabase = await createClient()

    // 2. 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // 未登录不算错误，只是返回null
      return NextResponse.json<GetMeResponse>({
        success: true,
        user: undefined
      }, { status: 200 })
    }

    // 3. 返回用户基本信息
    return NextResponse.json<GetMeResponse>({
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ 获取当前用户异常:', error)
    return NextResponse.json<GetMeResponse>(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. 这个API用于前端判断当前用户是否登录
// 2. 未登录时不返回错误，而是返回user: undefined
// 3. 只返回基本信息（id, email, name, avatar_url），不返回敏感数据
// 4. 前端可以根据返回的user判断是否显示登录按钮等

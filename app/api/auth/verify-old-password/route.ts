/**
 * 🔥 老王的旧密码验证API
 * 用途: 在发送修改密码验证码前，校验当前密码是否正确
 * 老王警告: 仅在已登录会话内使用，避免信息泄露！
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session-manager'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientIp } from '@/lib/request-ip'

interface VerifyOldPasswordRequest {
  sessionToken: string
  oldPassword: string
}

export async function POST(req: NextRequest) {
  try {
    const body: VerifyOldPasswordRequest = await req.json()
    const { sessionToken, oldPassword } = body

    if (!sessionToken || !oldPassword) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数'
      }, { status: 400 })
    }

    const clientIp = getClientIp(req.headers)

    // 验证会话有效性
    const sessionResult = await verifySession(sessionToken, clientIp)

    if (!sessionResult.valid || !sessionResult.session) {
      return NextResponse.json({
        success: false,
        error: sessionResult.reason || '会话无效，请重新登录'
      }, { status: 401 })
    }

    const { email, hasPassword } = sessionResult.session

    if (!hasPassword) {
      return NextResponse.json({
        success: false,
        error: '当前账号未设置密码'
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword
    })

    if (signInError) {
      return NextResponse.json({
        success: false,
        error: '当前密码错误'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      message: '当前密码验证通过'
    })
  } catch (error) {
    console.error('❌ 验证旧密码异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试'
    }, { status: 500 })
  }
}


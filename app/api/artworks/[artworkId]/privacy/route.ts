// 🔥 老王创建：作品隐私设置 API
// 用途: 更新图片/视频作品的隐私级别
// 老王警告: 必须验证用户权限，只能修改自己的作品！

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PrivacyLevel = 'public' | 'private' | 'followers_only'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ artworkId: string }> }
) {
  try {
    // 🔥 老王修复：Next.js 16中params是Promise，必须await
    const { artworkId } = await params

    // 🔥 老王修复：createClient现在也返回Promise，必须await
    const supabase = await createClient()

    // 1. 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: '未登录或登录已过期' } },
        { status: 401 }
      )
    }

    // 2. 解析请求参数
    const body = await request.json()
    const { privacy, type } = body as { privacy: PrivacyLevel; type: 'image' | 'video' }

    if (!privacy || !['public', 'private', 'followers_only'].includes(privacy)) {
      return NextResponse.json(
        { error: { message: '无效的隐私级别' } },
        { status: 400 }
      )
    }

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: { message: '无效的作品类型' } },
        { status: 400 }
      )
    }

    // 3. 确定要更新的表
    const tableName = type === 'video' ? 'video_generation_history' : 'generation_history'

    // 4. 检查作品是否存在且属于当前用户
    const { data: artwork, error: fetchError } = await supabase
      .from(tableName)
      .select('id, user_id')
      .eq('id', artworkId)
      .single()

    if (fetchError || !artwork) {
      return NextResponse.json(
        { error: { message: '作品不存在' } },
        { status: 404 }
      )
    }

    if (artwork.user_id !== user.id) {
      return NextResponse.json(
        { error: { message: '无权修改此作品' } },
        { status: 403 }
      )
    }

    // 5. 更新隐私级别
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ privacy })
      .eq('id', artworkId)

    if (updateError) {
      console.error('❌ 更新隐私级别失败:', updateError)
      return NextResponse.json(
        { error: { message: '更新失败，请重试' } },
        { status: 500 }
      )
    }

    // 6. 返回成功
    return NextResponse.json({
      success: true,
      data: {
        id: artworkId,
        privacy,
        type
      }
    })

  } catch (error: any) {
    console.error('❌ Privacy API错误:', error)
    return NextResponse.json(
      { error: { message: error.message || '服务器错误' } },
      { status: 500 }
    )
  }
}

// 🔥 老王备注：
// 1. PATCH方法更新隐私级别（符合RESTful规范）
// 2. 严格权限验证：只能修改自己的作品
// 3. 支持两种作品类型：image和video
// 4. 自动选择正确的数据库表
// 5. 返回标准JSON格式

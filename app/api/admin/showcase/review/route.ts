/**
 * 🔥 老王的管理员审核操作API
 * 用途: 管理员批准或拒绝推荐提交
 * POST /api/admin/showcase/review
 * 老王警告: 批准后自动创建showcase记录，拒绝需要填写原因！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRBAC, AdminAction, logAdminAction } from '@/lib/admin-auth'
import { checkImageSimilarity } from '@/lib/image-similarity'
import type { User } from '@supabase/supabase-js'

interface ReviewRequest {
  submission_id: string
  action: 'approve' | 'reject'
  rejection_reason?: string
  admin_notes?: string
}

async function resolveAdminActor(req: NextRequest, supabase: ReturnType<typeof createServiceClient>): Promise<User | null> {
  try {
    const token = req.cookies.get('admin-access-token')?.value
    if (!token) {
      return null
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return null
    }

    return data.user
  } catch (error) {
    console.error('❌ 获取管理员身份失败:', error)
    return null
  }
}

async function handlePost(req: NextRequest) {
  try {
    console.log('⚖️ 收到审核请求')

    const supabase = createServiceClient()
    const adminUser = await resolveAdminActor(req, supabase)

    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: '无法识别管理员身份',
      }, { status: 401 })
    }

    const body: ReviewRequest = await req.json()
    const { submission_id, action, rejection_reason, admin_notes } = body

    if (!submission_id || !action) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段：submission_id、action',
      }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'action 必须是 approve 或 reject',
      }, { status: 400 })
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json({
        success: false,
        error: '拒绝操作必须提供 rejection_reason',
      }, { status: 400 })
    }

    const { data: submission, error: fetchError } = await supabase
      .from('showcase_submissions')
      .select(`
        *,
        generation_history:generation_history_id (
          id,
          user_id,
          generated_images,
          prompt
        )
      `)
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      console.error('❌ 提交记录不存在:', fetchError)
      return NextResponse.json({
        success: false,
        error: '提交记录不存在',
      }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `该提交已审核过，当前状态：${submission.status}`,
      }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    if (action === 'approve') {
      console.log('✅ 开始批准流程')

      const { error: updateError } = await supabase
        .from('showcase_submissions')
        .update({
          status: 'approved',
          reviewed_at: nowIso,
          reviewed_by: adminUser.id,
          admin_notes: admin_notes ?? null,
        })
        .eq('id', submission_id)

      if (updateError) {
        console.error('❌ 更新提交状态失败:', updateError)
        return NextResponse.json({
          success: false,
          error: '批准失败，请稍后重试',
        }, { status: 500 })
      }

      const imageUrl = submission.generation_history?.generated_images?.[submission.image_index] || ''

      if (!imageUrl) {
        return NextResponse.json({
          success: false,
          error: '无法获取图片 URL',
        }, { status: 500 })
      }

      try {
        const { data: existingShowcases, error: showcasesError } = await supabase
          .from('showcase')
          .select('image_url')

        if (showcasesError) {
          console.error('❌ 查询现有 showcase 失败:', showcasesError)
        } else if (existingShowcases && existingShowcases.length > 0) {
          const existingImageUrls = existingShowcases.map((item) => item.image_url)
          const similarityResult = await checkImageSimilarity(imageUrl, existingImageUrls, 70)

          if (similarityResult.isSimilar) {
            console.error('❌ 图片相似度过高，自动拒绝:', similarityResult)

            await supabase
              .from('showcase_submissions')
              .update({
                status: 'rejected',
                rejection_reason: `图片与现有案例相似度过高 (${similarityResult.similarity?.toFixed(2)}%)，已自动拒绝。相似图片: ${similarityResult.mostSimilarUrl}`,
                reviewed_at: nowIso,
                reviewed_by: adminUser.id,
                admin_notes: '自动相似度检测拒绝',
              })
              .eq('id', submission_id)

            await logAdminAction({
              adminId: adminUser.id,
              action: AdminAction.USER_WRITE,
              resourceType: 'showcase_submission',
              resourceId: submission_id,
              newValues: {
                status: 'rejected',
                auto_similarity_check: true,
                similar_image: similarityResult.mostSimilarUrl,
                similarity: similarityResult.similarity,
              },
            })

            return NextResponse.json({
              success: false,
              error: `图片与现有案例相似度过高 (${similarityResult.similarity?.toFixed(2)}%)，已自动拒绝`,
              data: {
                similarity: similarityResult.similarity,
                similar_image: similarityResult.mostSimilarUrl,
              },
            }, { status: 409 })
          }
        }
      } catch (similarityError) {
        console.error('⚠️ 相似度检测失败，但继续审核流程:', similarityError)
      }

      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', submission.user_id)
        .maybeSingle()

      const { data: showcaseData, error: showcaseError } = await supabase
        .from('showcase')
        .insert({
          submission_id: submission.id,
          creator_id: submission.user_id,
          title: submission.title,
          description: submission.description,
          category: submission.category,
          tags: submission.tags || [],
          image_url: imageUrl,
          creator_name: creator?.full_name ?? null,
          creator_avatar: creator?.avatar_url ?? null,
          likes_count: 0,
          views_count: 0,
          featured: false,
          milestone_100_rewarded: false,
          similarity_checked: true,
        })
        .select('id')
        .single()

      if (showcaseError || !showcaseData) {
        console.error('❌ 创建 showcase 记录失败:', showcaseError)
        return NextResponse.json({
          success: false,
          error: '创建 showcase 记录失败',
        }, { status: 500 })
      }

      await logAdminAction({
        adminId: adminUser.id,
        action: AdminAction.USER_WRITE,
        resourceType: 'showcase_submission',
        resourceId: submission_id,
        newValues: {
          status: 'approved',
          showcase_id: showcaseData.id,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          submission_id: submission.id,
          showcase_id: showcaseData.id,
          status: 'approved',
          message: '批准成功！作品已发布到案例展示页面。',
        },
      })
    }

    console.log('⛔ 开始拒绝流程')

    const { error: rejectError } = await supabase
      .from('showcase_submissions')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason!,
        reviewed_at: nowIso,
        reviewed_by: adminUser.id,
        admin_notes: admin_notes ?? null,
      })
      .eq('id', submission_id)

    if (rejectError) {
      console.error('❌ 更新提交状态失败:', rejectError)
      return NextResponse.json({
        success: false,
        error: '拒绝失败，请稍后重试',
      }, { status: 500 })
    }

    await logAdminAction({
      adminId: adminUser.id,
      action: AdminAction.USER_WRITE,
      resourceType: 'showcase_submission',
      resourceId: submission_id,
      newValues: {
        status: 'rejected',
        rejection_reason: rejection_reason,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submission.id,
        status: 'rejected',
        rejection_reason: rejection_reason!,
        message: '已拒绝该推荐。',
      },
    })
  } catch (error) {
    console.error('❌ 审核操作异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误，请稍后重试',
    }, { status: 500 })
  }
}

export const POST = withRBAC(AdminAction.USER_WRITE)(handlePost)

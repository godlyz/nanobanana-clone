/**
 * 🔥 老王的用户提升/降级 API
 * 用途: 将普通用户提升为管理员，或将管理员降级为普通用户
 * 老王警告: 这个API要是权限控制不好，系统就完蛋了！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRBAC, AdminAction, logAdminAction } from '@/lib/admin-auth'

// 提升用户请求接口
interface PromoteUserRequest {
  userId: string
  email: string
  name?: string
  role: 'super_admin' | 'admin' | 'viewer'
  promotedBy: string
}

// 降级用户请求接口
interface DemoteUserRequest {
  userId?: string
  email?: string
  demotedBy: string
}

/**
 * 🔥 提升用户为管理员
 */
async function handlePOST(req: NextRequest) {
  try {
    const body = await req.json() as PromoteUserRequest

    // 验证必填参数
    if (!body.userId || !body.email || !body.role || !body.promotedBy) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数',
        message: 'userId, email, role, promotedBy 都是必填项'
      }, { status: 400 })
    }

    // 验证角色是否合法
    const validRoles = ['super_admin', 'admin', 'viewer']
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({
        success: false,
        error: '无效的角色',
        message: `角色必须是: ${validRoles.join(', ')}`
      }, { status: 400 })
    }

    console.log(`📋 提升用户: ${body.email} -> 角色: ${body.role}`)

    const supabase = createServiceClient()

    // 1. 验证用户是否存在于 Supabase Auth
    console.log('🔍 验证用户是否存在于 Auth 系统')
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(body.userId)

    if (authError || !authUser.user) {
      console.error('❌ 用户不存在于 Auth 系统:', authError)
      return NextResponse.json({
        success: false,
        error: '用户不存在',
        message: `用户 ${body.email} 不存在于认证系统中`
      }, { status: 404 })
    }

    // 2. 检查是否已经是管理员
    console.log('🔍 检查用户是否已是管理员')
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', body.email.toLowerCase())
      .eq('status', 'active')
      .single()

    if (existingAdmin) {
      // 如果已经是管理员，更新角色
      console.log(`⚠️ 用户已是管理员，更新角色: ${existingAdmin.role} -> ${body.role}`)

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          role: body.role,
          name: body.name || existingAdmin.name,
          updated_at: new Date().toISOString(),
          updated_by: body.promotedBy
        })
        .eq('email', body.email.toLowerCase())

      if (updateError) {
        console.error('❌ 更新管理员角色失败:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新角色失败',
          message: updateError.message
        }, { status: 500 })
      }

      // 记录审计日志
      await logAdminAction({
        adminId: body.promotedBy,
        action: 'user_role_manage',
        resourceType: 'user',
        resourceId: body.userId,
        oldValues: {
          role: existingAdmin.role,
          name: existingAdmin.name
        },
        newValues: {
          role: body.role,
          name: body.name || existingAdmin.name
        }
      })

      console.log(`✅ 管理员角色更新成功: ${body.email} -> ${body.role}`)

      return NextResponse.json({
        success: true,
        message: `管理员角色已更新为 ${body.role}`,
        data: {
          userId: body.userId,
          email: body.email,
          role: body.role,
          status: 'active'
        }
      })
    }

    // 3. 创建新的管理员记录
    console.log('🔥 创建新的管理员记录')
    const { data: newAdmin, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        email: body.email.toLowerCase(),
        name: body.name || authUser.user.user_metadata?.name || authUser.user.user_metadata?.full_name || '',
        role: body.role,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: body.promotedBy,
        updated_by: body.promotedBy
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 创建管理员记录失败:', insertError)
      return NextResponse.json({
        success: false,
        error: '创建管理员失败',
        message: insertError.message
      }, { status: 500 })
    }

    // 4. 记录审计日志
    await logAdminAction({
      adminId: body.promotedBy,
      action: 'user_write',
      resourceType: 'user',
      resourceId: body.userId,
      oldValues: null,
      newValues: {
        email: body.email,
        role: body.role,
        status: 'active'
      }
    })

    console.log(`✅ 用户提升为管理员成功: ${body.email} -> ${body.role}`)

    return NextResponse.json({
      success: true,
      message: `用户 ${body.email} 已成功提升为 ${body.role}`,
      data: newAdmin
    })

  } catch (error) {
    console.error('❌ 提升用户失败:', error)
    return NextResponse.json({
      success: false,
      error: '提升用户失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 降级管理员为普通用户
 */
async function handleDELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')
    const demotedBy = searchParams.get('demotedBy')

    // 验证必填参数
    if ((!userId && !email) || !demotedBy) {
      return NextResponse.json({
        success: false,
        error: '缺少必填参数',
        message: '必须提供 userId 或 email，以及 demotedBy'
      }, { status: 400 })
    }

    console.log(`📋 降级管理员: ${email || userId}`)

    const supabase = createServiceClient()

    // 1. 查找管理员记录
    console.log('🔍 查找管理员记录')
    let query = supabase
      .from('admin_users')
      .select('*')
      .eq('status', 'active')

    if (email) {
      query = query.eq('email', email.toLowerCase())
    } else if (userId) {
      // 通过 userId 查找 email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      if (authUser?.user?.email) {
        query = query.eq('email', authUser.user.email.toLowerCase())
      } else {
        return NextResponse.json({
          success: false,
          error: '用户不存在',
          message: '无法通过 userId 找到对应的用户'
        }, { status: 404 })
      }
    }

    const { data: adminUser, error: fetchError } = await query.single()

    if (fetchError || !adminUser) {
      console.log(`⚠️ 管理员记录不存在: ${email || userId}`)
      return NextResponse.json({
        success: false,
        error: '管理员不存在',
        message: `用户 ${email || userId} 不是管理员或已被降级`
      }, { status: 404 })
    }

    // 2. 防止降级自己（如果是同一个人）
    if (adminUser.email.toLowerCase() === demotedBy.toLowerCase()) {
      console.log('⚠️ 尝试降级自己，拒绝操作')
      return NextResponse.json({
        success: false,
        error: '禁止操作',
        message: '不能降级自己的管理员权限'
      }, { status: 403 })
    }

    // 3. 防止降级唯一的 super_admin（如果是 super_admin）
    if (adminUser.role === 'super_admin') {
      const { data: superAdmins } = await supabase
        .from('admin_users')
        .select('email')
        .eq('role', 'super_admin')
        .eq('status', 'active')

      if (superAdmins && superAdmins.length === 1) {
        console.log('⚠️ 尝试降级唯一的 super_admin，拒绝操作')
        return NextResponse.json({
          success: false,
          error: '禁止操作',
          message: '不能降级唯一的超级管理员，请先提升其他用户为超级管理员'
        }, { status: 403 })
      }
    }

    // 4. 设置状态为 inactive（软删除）
    console.log('🔥 将管理员设置为 inactive')
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
        updated_by: demotedBy
      })
      .eq('email', adminUser.email)

    if (updateError) {
      console.error('❌ 降级管理员失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '降级失败',
        message: updateError.message
      }, { status: 500 })
    }

    // 5. 记录审计日志
    await logAdminAction({
      adminId: demotedBy,
      action: 'user_delete',
      resourceType: 'user',
      resourceId: userId || adminUser.email,
      oldValues: {
        email: adminUser.email,
        role: adminUser.role,
        status: 'active'
      },
      newValues: {
        status: 'inactive'
      }
    })

    console.log(`✅ 管理员降级成功: ${adminUser.email}`)

    return NextResponse.json({
      success: true,
      message: `管理员 ${adminUser.email} 已被降级为普通用户`,
      data: {
        email: adminUser.email,
        previousRole: adminUser.role
      }
    })

  } catch (error) {
    console.error('❌ 降级管理员失败:', error)
    return NextResponse.json({
      success: false,
      error: '降级管理员失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 PUT - 批量更新管理员角色和状态
 */
async function handlePUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { updates, updatedBy } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: '缺少更新数据',
        message: 'updates 必须是非空数组'
      }, { status: 400 })
    }

    if (!updatedBy) {
      return NextResponse.json({
        success: false,
        error: '缺少操作者信息',
        message: 'updatedBy 是必填项'
      }, { status: 400 })
    }

    console.log(`📋 批量更新 ${updates.length} 个管理员`)

    const supabase = createServiceClient()
    const results = []

    for (const update of updates) {
      const { email, role, status } = update

      if (!email) {
        results.push({
          email: 'unknown',
          success: false,
          message: '缺少 email 参数'
        })
        continue
      }

      try {
        // 更新管理员信息
        const updateData: any = {
          updated_at: new Date().toISOString(),
          updated_by: updatedBy
        }

        if (role) updateData.role = role
        if (status) updateData.status = status

        const { error: updateError } = await supabase
          .from('admin_users')
          .update(updateData)
          .eq('email', email.toLowerCase())

        if (updateError) {
          results.push({
            email,
            success: false,
            message: updateError.message
          })
          continue
        }

        // 记录审计日志
        await logAdminAction({
          adminId: updatedBy,
          action: 'user_write',
          resourceType: 'user',
          resourceId: email,
          newValues: updateData
        })

        results.push({
          email,
          success: true,
          message: '更新成功'
        })
      } catch (error) {
        results.push({
          email,
          success: false,
          message: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    console.log(`✅ 批量更新完成，成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`)

    return NextResponse.json({
      success: true,
      message: `批量更新完成`,
      data: results,
      stats: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('❌ 批量更新管理员失败:', error)
    return NextResponse.json({
      success: false,
      error: '批量更新失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 导出带有 RBAC 保护的处理器
export const POST = withRBAC(AdminAction.USER_ROLE_MANAGE)(handlePOST)
export const DELETE = withRBAC(AdminAction.USER_ROLE_MANAGE)(handleDELETE)
export const PUT = withRBAC(AdminAction.USER_ROLE_MANAGE)(handlePUT)

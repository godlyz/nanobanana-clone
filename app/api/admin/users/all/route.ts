/**
 * 🔥 老王的全部用户查询 API
 * 用途: 获取所有已注册用户（包括普通用户和管理员）
 * 老王警告: 这个API要是性能不好，几万用户一查就要爆掉！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRBAC, AdminAction } from '@/lib/admin-auth'

// 用户接口
interface AllUser {
  id: string
  email: string
  name?: string
  avatar?: string
  auth_provider: 'email' | 'google' | 'github' | 'apple'
  email_verified: boolean
  created_at: string
  last_sign_in_at?: string
  // 管理员相关信息
  is_admin: boolean
  admin_role?: 'super_admin' | 'admin' | 'viewer'
  admin_status?: 'active' | 'inactive' | 'suspended'
}

/**
 * 🔥 获取所有用户列表（包括普通用户和管理员）
 */
async function handleGET(req: NextRequest) {
  try {
    console.log('📋 获取所有用户列表')

    // 获取查询参数
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const adminOnly = searchParams.get('adminOnly') === 'true'
    const nonAdminOnly = searchParams.get('nonAdminOnly') === 'true'
    const authProvider = searchParams.get('authProvider')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = createServiceClient()

    // 使用 Auth Admin API 获取所有用户
    console.log('🔍 从 Supabase Auth 获取用户列表')
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: limit
    })

    if (authError) {
      console.error('❌ 获取 Auth 用户失败:', authError)
      return NextResponse.json({
        success: false,
        error: '获取用户列表失败',
        message: authError.message
      }, { status: 500 })
    }

    const authUsers = authData.users || []
    console.log(`✅ 获取到 ${authUsers.length} 个 Auth 用户`)

    // 获取所有管理员信息
    console.log('🔍 查询管理员信息')
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('email, role, status')

    if (adminError) {
      console.error('❌ 查询管理员信息失败:', adminError)
      // 不阻止请求，继续返回数据，只是没有管理员标记
    }

    // 创建管理员邮箱映射
    const adminMap = new Map<string, { role: string; status: string }>()
    if (adminUsers) {
      adminUsers.forEach(admin => {
        adminMap.set(admin.email.toLowerCase(), {
          role: admin.role,
          status: admin.status
        })
      })
    }

    // 合并用户数据
    let allUsers: AllUser[] = authUsers.map(user => {
      const email = user.email?.toLowerCase() || ''
      const adminInfo = adminMap.get(email)
      const isAdmin = !!adminInfo && adminInfo.status === 'active'

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || '',
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        auth_provider: (user.app_metadata?.provider || 'email') as any,
        email_verified: user.email_confirmed_at !== null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_admin: isAdmin,
        admin_role: isAdmin ? (adminInfo!.role as any) : undefined,
        admin_status: adminInfo ? (adminInfo.status as any) : undefined
      }
    })

    // 应用过滤条件
    if (search) {
      const searchTerm = search.toLowerCase()
      allUsers = allUsers.filter(user =>
        user.email.toLowerCase().includes(searchTerm) ||
        (user.name && user.name.toLowerCase().includes(searchTerm))
      )
    }

    if (adminOnly) {
      allUsers = allUsers.filter(user => user.is_admin)
    }

    if (nonAdminOnly) {
      allUsers = allUsers.filter(user => !user.is_admin)
    }

    if (authProvider && authProvider !== 'all') {
      allUsers = allUsers.filter(user => user.auth_provider === authProvider)
    }

    console.log(`✅ 返回 ${allUsers.length} 个用户（包括 ${allUsers.filter(u => u.is_admin).length} 个管理员）`)

    return NextResponse.json({
      success: true,
      data: allUsers,
      pagination: {
        page,
        limit,
        total: authData.total || allUsers.length,
        hasNext: (authData.nextPage || 0) > page
      },
      stats: {
        total_users: allUsers.length,
        admin_users: allUsers.filter(u => u.is_admin).length,
        non_admin_users: allUsers.filter(u => !u.is_admin).length,
        verified_users: allUsers.filter(u => u.email_verified).length
      },
      message: `获取到 ${allUsers.length} 个用户`
    })

  } catch (error) {
    console.error('❌ 获取全部用户列表失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户列表失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 导出带有 RBAC 保护的处理器
export const GET = withRBAC(AdminAction.USER_READ)(handleGET)

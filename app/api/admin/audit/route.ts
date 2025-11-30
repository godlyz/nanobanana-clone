/**
 * 🔥 老王的审计日志查询 API
 * 用途: 查询和导出系统操作审计日志
 * 老王警告: 这个API要是出问题，所有操作记录都要丢失！
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withRBAC, AdminAction, logAdminAction } from '@/lib/admin-auth'
import { getClientIp } from '@/lib/request-ip'  // 🔥 老王 Day 3 新增：获取客户端 IP
import { createWriteStream, createReadStream } from 'fs'
import { join } from 'path'

// 审计日志接口
interface AuditLog {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

// 审计日志查询参数
interface AuditQueryParams {
  adminId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
  export?: boolean
}

/**
 * 🔥 获取审计日志列表
 */
async function handleGET(req: NextRequest) {
  try {
    console.log('📋 获取审计日志列表')

    // 获取查询参数
    const { searchParams } = new URL(req.url)
    const params: AuditQueryParams = {
      adminId: searchParams.get('adminId') || undefined,
      action: searchParams.get('action') || undefined,
      resourceType: searchParams.get('resourceType') || undefined,
      resourceId: searchParams.get('resourceId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      export: searchParams.get('export') === 'true'
    }

    const supabase = createServiceClient()

    // 构建基础查询
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    // 应用过滤条件
    if (params.adminId) {
      query = query.eq('admin_id', params.adminId)
    }

    if (params.action) {
      query = query.eq('action_type', params.action)
    }

    if (params.resourceType) {
      query = query.eq('resource_type', params.resourceType)
    }

    if (params.resourceId) {
      query = query.eq('resource_id', params.resourceId)
    }

    if (params.startDate) {
      const startDate = new Date(params.startDate)
      if (!isNaN(startDate.getTime())) {
        query = query.gte('created_at', startDate.toISOString())
      }
    }

    if (params.endDate) {
      const endDate = new Date(params.endDate)
      if (!isNaN(endDate.getTime())) {
        // 包含整天，所以设置到第二天凌晨
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('created_at', endDate.toISOString())
      }
    }

    if (params.search) {
      const searchTerm = `%${params.search.toLowerCase()}%`
      query = query.or(`
        action_type.ilike.${searchTerm},
        resource_type.ilike.${searchTerm},
        resource_id.ilike.${searchTerm},
        admin_id.ilike.${searchTerm}
      `)
    }

    // 处理导出请求
    if (params.export) {
      return await exportAuditLogs(query, params)
    }

    // 分页处理
    const from = (params.page! - 1) * params.limit!
    const to = from + params.limit! - 1

    // 获取总数
    const { count: totalCount, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ 获取审计日志总数失败:', countError)
    }

    // 获取分页数据
    const { data: logs, error } = await query
      .range(from, to)

    if (error) {
      console.error('❌ 获取审计日志失败:', error)
      return NextResponse.json({
        success: false,
        error: '获取审计日志失败',
        message: error.message
      }, { status: 500 })
    }

    // 处理空数据
    if (!logs || logs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0
        },
        message: '暂无审计日志'
      })
    }

    // 格式化响应数据
    const formattedLogs = logs.map(log => ({
      id: log.id,
      admin_id: log.admin_id,
      action: log.action_type,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      old_values: log.old_value,  // 注意：数据库字段是 old_value 不是 old_values
      new_values: log.new_value,  // 注意：数据库字段是 new_value 不是 new_values
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
      // 添加可读的时间格式
      created_at_formatted: new Date(log.created_at).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }))

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / params.limit!)
      },
      message: `获取到 ${formattedLogs.length} 条审计日志`
    })

  } catch (error) {
    console.error('❌ 获取审计日志失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取审计日志失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 导出审计日志
 */
async function exportAuditLogs(query: any, params: AuditQueryParams) {
  try {
    console.log('📄 导出审计日志')

    // 获取所有匹配的日志（不分页）
    const { data: logs, error } = await query.limit(10000) // 限制导出数量

    if (error) {
      throw error
    }

    // 生成 CSV 内容
    const csvHeaders = [
      'ID',
      '管理员ID',
      '操作',
      '资源类型',
      '资源ID',
      '旧值',
      '新值',
      'IP地址',
      '用户代理',
      '创建时间'
    ]

    const csvContent = [
      csvHeaders.join(','),
      ...(logs || []).map((log: any) => [
        log.id,
        log.admin_id,
        log.action_type,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.old_value || {}).replace(/"/g, '""'),  // 数据库字段是 old_value
        JSON.stringify(log.new_value || {}).replace(/"/g, '""'),  // 数据库字段是 new_value
        log.ip_address || '',
        log.user_agent || '',
        new Date(log.created_at).toISOString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    // 记录导出操作
    await logAdminAction({
      adminId: 'system',
      action: AdminAction.AUDIT_EXPORT,
      resourceType: 'audit',
      newValues: {
        exported_count: logs?.length || 0,
        filters: params
      },
      ipAddress: 'system',
      userAgent: 'audit export api'
    })

    // 返回 CSV 文件
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('❌ 导出审计日志失败:', error)
    return NextResponse.json({
      success: false,
      error: '导出审计日志失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 创建审计日志（内部使用）
 */
async function createAuditLog(params: {
  adminId: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase
      .from('audit_logs')
      .insert({
        admin_id: params.adminId,
        action_type: params.action,  // 数据库字段是 action_type
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        old_value: params.oldValues,  // 数据库字段是 old_value
        new_value: params.newValues,  // 数据库字段是 new_value
        ip_address: params.ipAddress || 'unknown',
        user_agent: params.userAgent || 'unknown',
        created_at: new Date().toISOString()
      })

    console.log(`✅ 审计日志已记录: ${params.action} -> ${params.resourceType}`)

  } catch (error) {
    console.error('❌ 创建审计日志失败:', error)
    // 不抛出错误，避免影响主要功能
  }
}

/**
 * 🔥 清理过期审计日志
 */
async function handleDELETE(req: NextRequest) {
  try {
    console.log('🧹 清理过期审计日志')

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '90') // 默认保留90天
    const adminId = searchParams.get('adminId') || 'system'

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const supabase = createServiceClient()

    // 删除过期日志
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('❌ 清理审计日志失败:', error)
      return NextResponse.json({
        success: false,
        error: '清理审计日志失败',
        message: error.message
      }, { status: 500 })
    }

    // 记录清理操作
    await logAdminAction({
      adminId,
      action: 'audit_cleanup',
      resourceType: 'audit',
      newValues: {
        cutoff_date: cutoffDate.toISOString(),
        days_retained: days
      },
      // 🔥 老王 Day 3 修复：Next.js 16 没有 req.ip，使用 getClientIp
      ipAddress: getClientIp(req.headers),
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    console.log(`✅ 过期审计日志清理完成，保留 ${days} 天内的日志`)

    return NextResponse.json({
      success: true,
      message: `成功清理 ${days} 天前的审计日志`
    })

  } catch (error) {
    console.error('❌ 清理审计日志失败:', error)
    return NextResponse.json({
      success: false,
      error: '清理审计日志失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

// 导出带有 RBAC 保护的处理器
export const GET = withRBAC(AdminAction.AUDIT_READ)(handleGET)
export const DELETE = withRBAC(AdminAction.AUDIT_READ)(handleDELETE) // 清理日志需要读取权限
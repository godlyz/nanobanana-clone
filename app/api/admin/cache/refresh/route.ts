/**
 * 🔥 老王的缓存刷新API
 * 用途: 手动刷新系统配置和活动规则缓存
 * 老王警告: 这个API要是被滥用，Redis都要被玩崩！
 */

import { NextRequest, NextResponse } from 'next/server'
import { configCache } from '@/lib/config-cache'
import { promotionRuleCache } from '@/lib/promotion-rule-cache'
import { withRBAC, AdminAction } from '@/lib/admin-auth'

/**
 * 🔥 缓存刷新处理函数
 */
async function handlePost(req: NextRequest) {
  try {
    // 解析请求体
    const body = await req.json()
    const { cacheTypes, force } = body

    // 验证缓存类型
    const validCacheTypes = ['config', 'promotion_rules', 'all']
    const types = Array.isArray(cacheTypes) ? cacheTypes : ['all']

    const invalidTypes = types.filter(t => !validCacheTypes.includes(t))
    if (invalidTypes.length > 0) {
      return NextResponse.json({
        success: false,
        error: '无效的缓存类型',
        invalidTypes,
      }, { status: 400 })
    }

    console.log(`🔄 开始刷新缓存: ${types.join(', ')}, 强制模式: ${force || false}`)

    const refreshResults: Record<string, any> = {}

    // 刷新配置缓存
    if (types.includes('config') || types.includes('all')) {
      console.log('🔄 刷新配置缓存...')
      const configResult = await configCache.refresh()
      refreshResults.config = {
        success: configResult,
        message: configResult ? '配置缓存刷新成功' : '配置缓存刷新失败'
      }
    }

    // 刷新活动规则缓存
    if (types.includes('promotion_rules') || types.includes('all')) {
      console.log('🔄 刷新活动规则缓存...')
      const promotionResult = await promotionRuleCache.refresh()
      refreshResults.promotion_rules = {
        success: promotionResult,
        message: promotionResult ? '活动规则缓存刷新成功' : '活动规则缓存刷新失败'
      }
    }

    // 如果是强制模式，清空所有缓存
    if (force) {
      console.log('⚡ 强制模式：清空所有缓存...')
      // 这里可以添加强制清空的逻辑
    }

    // 获取缓存统计信息
    const cacheStats = await getCacheStats()

    return NextResponse.json({
      success: true,
      message: '缓存刷新完成',
      results: refreshResults,
      stats: cacheStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 缓存刷新失败:', error)
    return NextResponse.json({
      success: false,
      error: '缓存刷新失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 获取缓存统计信息（GET方法）
 */
async function handleGet(_req: NextRequest) {
  try {
    const stats = await getCacheStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ 获取缓存统计失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取缓存统计失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 🔥 获取缓存统计信息
 */
async function getCacheStats() {
  try {
    const [configStats, promotionStats] = await Promise.all([
      configCache.getCacheStats(),
      promotionRuleCache.getCacheStats()
    ])

    return {
      config: configStats,
      promotion_rules: promotionStats,
      summary: {
        totalCaches: (configStats.isConnected ? 1 : 0) + (promotionStats.isCacheConnected ? 1 : 0),
        totalItems: configStats.cacheSize + promotionStats.cacheSize,
        healthyCaches: [configStats.isConnected, promotionStats.isCacheConnected].filter(Boolean).length
      }
    }
  } catch (error) {
    console.error('❌ 获取缓存统计异常:', error)
    return {
      config: { isConnected: false, cacheSize: 0, cacheTtl: -1 },
      promotion_rules: { isConnected: false, cacheSize: 0, cacheTtl: -1 },
      summary: {
        totalCaches: 0,
        totalItems: 0,
        healthyCaches: 0
      }
    }
  }
}

export const POST = withRBAC(AdminAction.CONFIG_WRITE)(handlePost)
export const GET = withRBAC(AdminAction.CONFIG_READ)(handleGet)

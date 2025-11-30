import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 🔥 老王：GET - 获取使用趋势数据
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录或会话已过期' },
        { status: 401 }
      )
    }

    // 🔥 老王：获取查询参数
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // 🔥 老王：根据period计算天数和开始日期
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // 🔥 老王：查询真实使用趋势数据（按日期分组）
    const { data: historyData, error: historyError } = await supabase
      .from('generation_history')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('⚠️ 查询使用历史失败:', historyError)
    }

    // 🔥 老王：按日期分组统计（手动分组）
    const trendMap = new Map<string, number>()
    const now = new Date()

    // 初始化所有日期为 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`
      trendMap.set(monthDay, 0)
    }

    // 统计每天的使用次数
    if (historyData && historyData.length > 0) {
      historyData.forEach(record => {
        const recordDate = new Date(record.created_at)
        const monthDay = `${recordDate.getMonth() + 1}月${recordDate.getDate()}日`
        trendMap.set(monthDay, (trendMap.get(monthDay) || 0) + 1)
      })
    }

    // 转换为数组格式
    const trendData = Array.from(trendMap.entries()).map(([name, value]) => ({
      name,
      value
    }))

    // 🔥 老王：查询最常用功能（按工具类型和生成类型统计）
    const { data: allHistory, error: allHistoryError } = await supabase
      .from('generation_history')
      .select('generation_type, tool_type')
      .eq('user_id', user.id)

    if (allHistoryError) {
      console.error('⚠️ 查询功能使用统计失败:', allHistoryError)
    }

    // 🔥 老王：统计各类型使用次数
    const typeCountMap = new Map<string, number>()

    if (allHistory && allHistory.length > 0) {
      allHistory.forEach(record => {
        let typeName = ''

        // 根据 tool_type 和 generation_type 确定功能名称
        if (record.tool_type) {
          // 🔥 老王修复：数据库存的是 kebab-case（连字符），要对应上！
          const toolNames: Record<string, string> = {
            // 基础工具箱（数据库格式）
            'style-transfer': '风格迁移',
            'background-remover': '背景移除',
            'scene-preservation': '场景保留',
            'consistent-generation': '角色一致性',
            // 高级工具（数据库格式）
            'text-to-image-with-text': '文字融合',
            'chat-edit': '对话编辑',
            'smart-prompt': '智能提示词',
          }
          typeName = toolNames[record.tool_type] || `未知工具(${record.tool_type})`
        } else {
          typeName = record.generation_type === 'text_to_image' ? '文生图' : '图生图'
        }

        typeCountMap.set(typeName, (typeCountMap.get(typeName) || 0) + 1)
      })
    }

    // 🔥 老王：转换为数组并计算百分比，取前3名
    const totalCount = allHistory?.length || 0
    const popularData = Array.from(typeCountMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3) // 只取前3名

    console.log('✅ 使用趋势（真实数据）:', {
      period,
      trend_days: trendData.length,
      total_usage: totalCount,
      top_features: popularData.length
    })

    return NextResponse.json({
      success: true,
      trend: trendData,
      popular: popularData.length > 0 ? popularData : [
        { name: '暂无数据', count: 0, percentage: 0 }
      ],
      period: period
    })
  } catch (error) {
    console.error('⚠️ Error fetching usage stats:', error)
    return NextResponse.json(
      { error: '获取使用趋势失败' },
      { status: 500 }
    )
  }
}

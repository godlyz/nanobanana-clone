/**
 * 🔥 老王的视频成功率监控API
 * 路径: GET /api/admin/success-rate
 * 权限: 仅管理员
 * 功能: 获取视频生成成功率统计报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuccessRateReport } from '@/lib/video-success-rate-monitor';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 检查管理员权限
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: '需要管理员权限' },
        { status: 403 }
      );
    }

    // 3. 生成成功率报告
    const report = await getSuccessRateReport();

    // 4. 返回报告
    return NextResponse.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ 获取成功率报告失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取成功率报告失败',
      },
      { status: 500 }
    );
  }
}

// 🔥 老王备注：
// 这个API端点用于管理员仪表板查询视频生成成功率
// 返回数据包括：
// - 最近1小时、24小时、7天、30天的成功率统计
// - 失败原因分析（Top错误码）
// - 智能建议
//
// 使用示例：
// GET /api/admin/success-rate
// Authorization: Bearer <session_token>
//
// 响应示例：
// {
//   "success": true,
//   "data": {
//     "stats": {
//       "last24Hours": {
//         "totalRequests": 1000,
//         "successfulRequests": 960,
//         "failedRequests": 40,
//         "successRate": 96.0,
//         "alertLevel": "OK"
//       },
//       ...
//     },
//     "failureBreakdown": [
//       {
//         "errorCode": "VEO_API_TIMEOUT",
//         "errorMessage": "Google Veo API timeout",
//         "count": 25,
//         "percentage": 62.5
//       }
//     ],
//     "recommendations": [
//       "✅ 最近7天成功率达标，系统运行良好"
//     ]
//   }
// }

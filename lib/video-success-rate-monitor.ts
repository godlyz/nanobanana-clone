/**
 * 🔥 老王的视频生成成功率监控系统
 * 用途: 实时监控视频生成成功率，确保 ≥95% 的成功率
 * 功能: 统计、分析、告警
 *
 * 核心指标:
 * - 最近1小时成功率
 * - 最近24小时成功率
 * - 最近7天成功率
 * - 最近30天成功率
 *
 * 告警规则:
 * - 成功率 < 95%: WARNING
 * - 成功率 < 90%: CRITICAL
 * - 成功率 < 85%: EMERGENCY
 */

import { createServiceClient } from './supabase/service';

// 成功率统计结果
export interface SuccessRateStats {
  timeRange: '1h' | '24h' | '7d' | '30d';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number; // 百分比 (0-100)
  alertLevel: 'OK' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  timestamp: string;
}

// 失败原因分析
export interface FailureBreakdown {
  errorCode: string;
  errorMessage: string;
  count: number;
  percentage: number; // 占所有失败的百分比
}

// 详细成功率报告
export interface SuccessRateReport {
  stats: {
    last1Hour: SuccessRateStats;
    last24Hours: SuccessRateStats;
    last7Days: SuccessRateStats;
    last30Days: SuccessRateStats;
  };
  failureBreakdown: FailureBreakdown[];
  recommendations: string[];
}

/**
 * 🔥 视频成功率监控器类
 */
export class VideoSuccessRateMonitor {
  private supabase: ReturnType<typeof createServiceClient>;
  private readonly SUCCESS_RATE_TARGET = 95; // 目标成功率 95%

  constructor(supabase?: ReturnType<typeof createServiceClient>) {
    this.supabase = supabase || createServiceClient();
  }

  /**
   * 获取指定时间范围内的成功率统计
   * @param hours - 时间范围（小时数）
   */
  async getSuccessRateStats(hours: number): Promise<SuccessRateStats> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);
    const startTimeISO = startTime.toISOString();

    // 查询所有视频生成记录
    const { data: allRecords, error: allError } = await this.supabase
      .from('video_generation_history')
      .select('status, error_code, error_message')
      .gte('created_at', startTimeISO);

    if (allError) {
      console.error('❌ 查询视频记录失败:', allError);
      throw new Error(`DATABASE_ERROR: ${allError.message}`);
    }

    const totalRequests = allRecords?.length || 0;

    // 统计成功和失败数量
    const successfulRequests = allRecords?.filter(
      r => r.status === 'completed'
    ).length || 0;

    const failedRequests = allRecords?.filter(
      r => r.status === 'failed' || r.status === 'blocked'
    ).length || 0;

    // 计算成功率
    const successRate = totalRequests > 0
      ? (successfulRequests / totalRequests) * 100
      : 100;

    // 确定告警级别
    let alertLevel: 'OK' | 'WARNING' | 'CRITICAL' | 'EMERGENCY' = 'OK';
    if (successRate < 85) {
      alertLevel = 'EMERGENCY';
    } else if (successRate < 90) {
      alertLevel = 'CRITICAL';
    } else if (successRate < 95) {
      alertLevel = 'WARNING';
    }

    // 确定时间范围标签
    let timeRange: '1h' | '24h' | '7d' | '30d' = '24h';
    if (hours === 1) timeRange = '1h';
    else if (hours === 24) timeRange = '24h';
    else if (hours === 168) timeRange = '7d'; // 7天
    else if (hours === 720) timeRange = '30d'; // 30天

    return {
      timeRange,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: Math.round(successRate * 100) / 100, // 保留2位小数
      alertLevel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取失败原因分析
   * @param hours - 时间范围（小时数）
   */
  async getFailureBreakdown(hours: number): Promise<FailureBreakdown[]> {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);
    const startTimeISO = startTime.toISOString();

    // 查询所有失败记录
    const { data: failedRecords, error } = await this.supabase
      .from('video_generation_history')
      .select('error_code, error_message')
      .in('status', ['failed', 'blocked'])
      .gte('created_at', startTimeISO);

    if (error) {
      console.error('❌ 查询失败记录失败:', error);
      return [];
    }

    if (!failedRecords || failedRecords.length === 0) {
      return [];
    }

    // 按错误码分组统计
    const errorGroups = new Map<string, { count: number; message: string }>();

    failedRecords.forEach(record => {
      const code = record.error_code || 'UNKNOWN_ERROR';
      const message = record.error_message || 'Unknown error';

      if (errorGroups.has(code)) {
        errorGroups.get(code)!.count++;
      } else {
        errorGroups.set(code, { count: 1, message });
      }
    });

    // 转换为数组并计算百分比
    const totalFailures = failedRecords.length;
    const breakdown: FailureBreakdown[] = Array.from(errorGroups.entries()).map(
      ([code, { count, message }]) => ({
        errorCode: code,
        errorMessage: message,
        count,
        percentage: Math.round((count / totalFailures) * 100 * 100) / 100,
      })
    );

    // 按数量降序排序
    breakdown.sort((a, b) => b.count - a.count);

    return breakdown;
  }

  /**
   * 生成完整的成功率报告
   */
  async generateSuccessRateReport(): Promise<SuccessRateReport> {
    console.log('📊 生成视频成功率报告...');

    // 获取各时间段的统计数据
    const [last1Hour, last24Hours, last7Days, last30Days, failureBreakdown] = await Promise.all([
      this.getSuccessRateStats(1),
      this.getSuccessRateStats(24),
      this.getSuccessRateStats(168), // 7天
      this.getSuccessRateStats(720), // 30天
      this.getFailureBreakdown(168), // 7天内的失败原因
    ]);

    // 生成建议
    const recommendations: string[] = [];

    // 根据成功率生成建议
    if (last24Hours.successRate < 95) {
      recommendations.push('⚠️ 最近24小时成功率低于95%，需要立即调查');

      // 分析主要失败原因
      if (failureBreakdown.length > 0) {
        const topError = failureBreakdown[0];
        recommendations.push(`🔍 主要失败原因: ${topError.errorCode} (${topError.percentage}%)`);

        // 根据错误码提供建议
        if (topError.errorCode.includes('VEO_API')) {
          recommendations.push('💡 建议: 检查Google Veo API配置和配额限制');
        } else if (topError.errorCode.includes('DATABASE')) {
          recommendations.push('💡 建议: 检查数据库连接和性能');
        } else if (topError.errorCode.includes('TIMEOUT')) {
          recommendations.push('💡 建议: 增加超时时间或优化API调用');
        } else if (topError.errorCode.includes('INSUFFICIENT_CREDITS')) {
          recommendations.push('💡 建议: 这是正常的业务错误，用户积分不足');
        }
      }
    }

    // 趋势分析
    if (last1Hour.successRate < last24Hours.successRate - 5) {
      recommendations.push('📉 最近1小时成功率下降明显，可能有新问题出现');
    }

    if (last7Days.successRate >= 95) {
      recommendations.push('✅ 最近7天成功率达标，系统运行良好');
    }

    return {
      stats: {
        last1Hour,
        last24Hours,
        last7Days,
        last30Days,
      },
      failureBreakdown,
      recommendations,
    };
  }

  /**
   * 检查是否需要发送告警
   */
  async checkAndSendAlert(): Promise<void> {
    const stats24h = await this.getSuccessRateStats(24);

    if (stats24h.alertLevel === 'EMERGENCY') {
      console.error('🚨 [EMERGENCY] 视频成功率严重下降:', stats24h.successRate, '%');
      // TODO: 发送紧急告警邮件/短信
    } else if (stats24h.alertLevel === 'CRITICAL') {
      console.error('⛔ [CRITICAL] 视频成功率过低:', stats24h.successRate, '%');
      // TODO: 发送告警邮件
    } else if (stats24h.alertLevel === 'WARNING') {
      console.warn('⚠️  [WARNING] 视频成功率低于目标:', stats24h.successRate, '%');
      // TODO: 发送警告通知
    } else {
      console.log('✅ [OK] 视频成功率正常:', stats24h.successRate, '%');
    }
  }

  /**
   * 获取实时成功率（最近1小时）
   */
  async getRealTimeSuccessRate(): Promise<number> {
    const stats = await this.getSuccessRateStats(1);
    return stats.successRate;
  }

  /**
   * 判断系统是否健康（24小时成功率≥95%）
   */
  async isSystemHealthy(): Promise<boolean> {
    const stats = await this.getSuccessRateStats(24);
    return stats.successRate >= this.SUCCESS_RATE_TARGET;
  }
}

/**
 * 🔥 导出单例监控器
 */
let monitor: VideoSuccessRateMonitor | null = null;

export function getVideoSuccessRateMonitor(): VideoSuccessRateMonitor {
  if (!monitor) {
    monitor = new VideoSuccessRateMonitor();
  }
  return monitor;
}

/**
 * 🔥 快捷方法：获取成功率报告
 */
export async function getSuccessRateReport(): Promise<SuccessRateReport> {
  const monitor = getVideoSuccessRateMonitor();
  return monitor.generateSuccessRateReport();
}

/**
 * 🔥 快捷方法：检查系统健康状态
 */
export async function checkSystemHealth(): Promise<boolean> {
  const monitor = getVideoSuccessRateMonitor();
  return monitor.isSystemHealthy();
}

// 🔥 老王备注：
// 1. 完整的成功率监控系统，支持多时间段统计
// 2. 自动分析失败原因，提供智能建议
// 3. 四级告警（OK/WARNING/CRITICAL/EMERGENCY）
// 4. 支持实时查询和定时检查
//
// 使用示例:
// ```typescript
// import { getSuccessRateReport, checkSystemHealth } from '@/lib/video-success-rate-monitor'
//
// // 获取完整报告
// const report = await getSuccessRateReport()
// console.log('最近24小时成功率:', report.stats.last24Hours.successRate, '%')
//
// // 检查健康状态
// const isHealthy = await checkSystemHealth()
// if (!isHealthy) {
//   console.log('⚠️ 系统成功率低于95%，需要关注')
// }
// ```

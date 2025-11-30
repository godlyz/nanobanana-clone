/**
 * 🔥 老王的视频成功率定时检查脚本
 * 用途: 定期检查视频生成成功率，低于95%时发送告警
 * 运行方式: pnpm tsx scripts/check-video-success-rate.ts
 * 建议: 在 cron 中每小时运行一次
 *
 * Cron 配置示例（每小时运行）:
 * 0 * * * * cd /path/to/project && pnpm tsx scripts/check-video-success-rate.ts >> /var/log/success-rate-check.log 2>&1
 */

import { getVideoSuccessRateMonitor } from '../lib/video-success-rate-monitor';

async function main() {
  console.log('🔍 开始检查视频成功率...\n');
  console.log('检查时间:', new Date().toISOString(), '\n');

  try {
    const monitor = getVideoSuccessRateMonitor();

    // 1. 生成完整报告
    const report = await monitor.generateSuccessRateReport();

    // 2. 输出各时间段统计
    console.log('📊 成功率统计:\n');

    console.log('  最近1小时:');
    console.log(`    总请求: ${report.stats.last1Hour.totalRequests}`);
    console.log(`    成功: ${report.stats.last1Hour.successfulRequests}`);
    console.log(`    失败: ${report.stats.last1Hour.failedRequests}`);
    console.log(`    成功率: ${report.stats.last1Hour.successRate}%`);
    console.log(`    告警级别: ${report.stats.last1Hour.alertLevel}\n`);

    console.log('  最近24小时:');
    console.log(`    总请求: ${report.stats.last24Hours.totalRequests}`);
    console.log(`    成功: ${report.stats.last24Hours.successfulRequests}`);
    console.log(`    失败: ${report.stats.last24Hours.failedRequests}`);
    console.log(`    成功率: ${report.stats.last24Hours.successRate}%`);
    console.log(`    告警级别: ${report.stats.last24Hours.alertLevel}\n`);

    console.log('  最近7天:');
    console.log(`    总请求: ${report.stats.last7Days.totalRequests}`);
    console.log(`    成功: ${report.stats.last7Days.successfulRequests}`);
    console.log(`    失败: ${report.stats.last7Days.failedRequests}`);
    console.log(`    成功率: ${report.stats.last7Days.successRate}%`);
    console.log(`    告警级别: ${report.stats.last7Days.alertLevel}\n`);

    console.log('  最近30天:');
    console.log(`    总请求: ${report.stats.last30Days.totalRequests}`);
    console.log(`    成功: ${report.stats.last30Days.successfulRequests}`);
    console.log(`    失败: ${report.stats.last30Days.failedRequests}`);
    console.log(`    成功率: ${report.stats.last30Days.successRate}%`);
    console.log(`    告警级别: ${report.stats.last30Days.alertLevel}\n`);

    // 3. 输出失败原因分析
    if (report.failureBreakdown.length > 0) {
      console.log('🔍 失败原因分析（Top 5）:\n');
      report.failureBreakdown.slice(0, 5).forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.errorCode}`);
        console.log(`     消息: ${failure.errorMessage}`);
        console.log(`     数量: ${failure.count} (${failure.percentage}%)\n`);
      });
    }

    // 4. 输出建议
    if (report.recommendations.length > 0) {
      console.log('💡 建议:\n');
      report.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
      console.log('');
    }

    // 5. 检查告警
    await monitor.checkAndSendAlert();

    // 6. 判断是否达标
    const isHealthy = await monitor.isSystemHealthy();
    if (isHealthy) {
      console.log('\n✅ 系统健康：24小时成功率≥95%');
      process.exit(0);
    } else {
      console.log('\n⚠️  系统异常：24小时成功率<95%，需要关注');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});

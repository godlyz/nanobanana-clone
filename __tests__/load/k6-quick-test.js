// 🔥 老王创建：k6 快速负载测试（开发环境用）
// 用途: 快速验证系统性能，30秒内测试10个并发用户
// 运行: k6 run __tests__/load/k6-quick-test.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

// 快速测试配置（30秒，10个并发）
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // 10秒内增加到5用户
    { duration: '10s', target: 10 },  // 再10秒增加到10用户
    { duration: '10s', target: 0 },   // 最后10秒降回到0
  ],

  thresholds: {
    'http_req_failed': ['rate<0.1'],  // 错误率 < 10%
    'http_req_duration': ['p(95)<3000'], // 95% 请求 < 3秒
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // 测试首页
  let res = http.get(`${BASE_URL}/`)
  check(res, {
    '首页加载成功': (r) => r.status === 200,
    '首页响应快': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1)

  sleep(1)

  // 测试编辑器页面
  res = http.get(`${BASE_URL}/editor`)
  check(res, {
    '编辑器加载成功': (r) => r.status === 200,
  }) || errorRate.add(1)

  sleep(1)
}

// 测试结束后的简要汇总
export function handleSummary(data) {
  console.log('\n\n🔥 快速测试完成！')
  console.log(`总请求数: ${data.metrics.http_reqs.values.count}`)
  console.log(`平均响应时间: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`)
  console.log(`P95响应时间: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`)
  console.log(`错误率: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`)

  return {
    'stdout': '',
  }
}

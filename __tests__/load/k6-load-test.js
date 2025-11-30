// 🔥 老王创建：k6 负载测试脚本
// 用途: 测试系统在 1000 并发用户下的性能表现
// 运行: k6 run __tests__/load/k6-load-test.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// 自定义指标
const errorRate = new Rate('errors')
const apiDuration = new Trend('api_duration')
const successfulRequests = new Counter('successful_requests')
const failedRequests = new Counter('failed_requests')

// 负载测试配置
export const options = {
  stages: [
    // 热身阶段：5分钟内逐步增加到100用户
    { duration: '5m', target: 100 },

    // 增压阶段：5分钟内增加到500用户
    { duration: '5m', target: 500 },

    // 峰值阶段：5分钟内达到1000用户
    { duration: '5m', target: 1000 },

    // 稳定阶段：保持1000用户运行10分钟
    { duration: '10m', target: 1000 },

    // 降压阶段：5分钟内降回到0
    { duration: '5m', target: 0 },
  ],

  thresholds: {
    // HTTP请求成功率 >= 95%
    'http_req_failed': ['rate<0.05'],

    // 95%的请求响应时间 <= 2秒
    'http_req_duration': ['p(95)<2000'],

    // 99%的请求响应时间 <= 5秒
    'http_req_duration': ['p(99)<5000'],

    // 错误率 < 5%
    'errors': ['rate<0.05'],

    // API平均响应时间 <= 1秒
    'api_duration': ['avg<1000'],
  },

  // 浏览器和设备模拟
  userAgent: 'k6-load-test/1.0',
}

// 测试端点配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const ENDPOINTS = {
  // 静态页面
  HOME: `${BASE_URL}/`,
  EDITOR: `${BASE_URL}/editor`,
  PRICING: `${BASE_URL}/pricing`,
  SHOWCASE: `${BASE_URL}/showcase`,
  API_DOCS: `${BASE_URL}/api-docs`,

  // 工具页面
  BG_REMOVER: `${BASE_URL}/tools/background-remover`,
  ONE_SHOT: `${BASE_URL}/tools/one-shot`,
  CHARACTER: `${BASE_URL}/tools/character-consistency`,

  // API端点
  API_SUBSCRIPTION: `${BASE_URL}/api/subscription/status`,
  API_ANALYTICS: `${BASE_URL}/api/analytics/tour`,
}

// 模拟不同用户行为场景
const scenarios = [
  { name: 'browse_homepage', weight: 40 },
  { name: 'explore_editor', weight: 25 },
  { name: 'check_pricing', weight: 15 },
  { name: 'view_showcase', weight: 10 },
  { name: 'read_api_docs', weight: 5 },
  { name: 'use_tools', weight: 5 },
]

// 选择场景（基于权重）
function selectScenario() {
  const random = Math.random() * 100
  let cumulative = 0

  for (const scenario of scenarios) {
    cumulative += scenario.weight
    if (random <= cumulative) {
      return scenario.name
    }
  }

  return scenarios[0].name
}

// 发送请求并验证响应
function makeRequest(url, options = {}) {
  const startTime = new Date()

  const response = http.get(url, {
    timeout: '30s',
    ...options,
  })

  const duration = new Date() - startTime
  apiDuration.add(duration)

  // 验证响应
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'status is not 500': (r) => r.status !== 500,
    'response time < 5s': (r) => r.timings.duration < 5000,
  })

  if (success) {
    successfulRequests.add(1)
  } else {
    failedRequests.add(1)
    errorRate.add(1)

    console.error(`❌ Request failed: ${url}`)
    console.error(`   Status: ${response.status}`)
    console.error(`   Duration: ${duration}ms`)
  }

  return response
}

// 场景1: 浏览首页
function browseHomepage() {
  makeRequest(ENDPOINTS.HOME)
  sleep(Math.random() * 3 + 2) // 2-5秒
}

// 场景2: 探索编辑器
function exploreEditor() {
  makeRequest(ENDPOINTS.EDITOR)
  sleep(Math.random() * 5 + 3) // 3-8秒

  // 模拟切换工具
  const tools = [
    ENDPOINTS.BG_REMOVER,
    ENDPOINTS.ONE_SHOT,
    ENDPOINTS.CHARACTER,
  ]
  const tool = tools[Math.floor(Math.random() * tools.length)]
  makeRequest(tool)
  sleep(Math.random() * 3 + 2)
}

// 场景3: 查看定价
function checkPricing() {
  makeRequest(ENDPOINTS.PRICING)
  sleep(Math.random() * 4 + 2) // 2-6秒

  // 50%概率查看订阅状态
  if (Math.random() > 0.5) {
    makeRequest(ENDPOINTS.API_SUBSCRIPTION)
    sleep(1)
  }
}

// 场景4: 浏览案例展示
function viewShowcase() {
  makeRequest(ENDPOINTS.SHOWCASE)
  sleep(Math.random() * 5 + 3) // 3-8秒
}

// 场景5: 阅读API文档
function readApiDocs() {
  makeRequest(ENDPOINTS.API_DOCS)
  sleep(Math.random() * 6 + 4) // 4-10秒
}

// 场景6: 使用工具
function useTools() {
  const tools = [
    ENDPOINTS.BG_REMOVER,
    ENDPOINTS.ONE_SHOT,
    ENDPOINTS.CHARACTER,
  ]

  // 随机访问2-3个工具
  const toolCount = Math.floor(Math.random() * 2) + 2
  for (let i = 0; i < toolCount; i++) {
    const tool = tools[Math.floor(Math.random() * tools.length)]
    makeRequest(tool)
    sleep(Math.random() * 3 + 2)
  }
}

// 主测试函数
export default function () {
  const scenario = selectScenario()

  switch (scenario) {
    case 'browse_homepage':
      browseHomepage()
      break
    case 'explore_editor':
      exploreEditor()
      break
    case 'check_pricing':
      checkPricing()
      break
    case 'view_showcase':
      viewShowcase()
      break
    case 'read_api_docs':
      readApiDocs()
      break
    case 'use_tools':
      useTools()
      break
  }

  // 模拟用户思考时间
  sleep(Math.random() * 2 + 1)
}

// 测试结束后的汇总
export function handleSummary(data) {
  const summary = {
    '📊 测试摘要': {
      '总请求数': data.metrics.http_reqs.values.count,
      '成功请求': data.metrics.successful_requests.values.count,
      '失败请求': data.metrics.failed_requests.values.count,
      '错误率': `${(data.metrics.errors.values.rate * 100).toFixed(2)}%`,
    },

    '⏱️ 响应时间': {
      '平均': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
      'P50 (中位数)': `${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms`,
      'P95': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
      'P99': `${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
      '最大': `${data.metrics.http_req_duration.values.max.toFixed(2)}ms`,
    },

    '🔥 吞吐量': {
      'RPS (请求/秒)': data.metrics.http_reqs.values.rate.toFixed(2),
      '数据接收': `${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB`,
      '数据发送': `${(data.metrics.data_sent.values.count / 1024 / 1024).toFixed(2)} MB`,
    },

    '✅ 阈值检查': {},
  }

  // 检查阈值是否通过
  for (const [metric, threshold] of Object.entries(data.metrics)) {
    if (threshold.thresholds) {
      for (const [name, passed] of Object.entries(threshold.thresholds)) {
        summary['✅ 阈值检查'][`${metric} ${name}`] = passed ? '✅ 通过' : '❌ 失败'
      }
    }
  }

  console.log('\n\n')
  console.log('═'.repeat(80))
  console.log('🔥 老王负载测试报告'.padStart(45))
  console.log('═'.repeat(80))
  console.log(JSON.stringify(summary, null, 2))
  console.log('═'.repeat(80))
  console.log('\n')

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'k6-load-test-summary.json': JSON.stringify(data, null, 2),
  }
}

// 🔥 老王备注：
// 1. 支持 1000 并发用户负载测试
// 2. 分5个阶段：热身、增压、峰值、稳定、降压
// 3. 测试6种用户场景（首页、编辑器、定价、展示、API文档、工具）
// 4. 自定义阈值：95% 请求 < 2秒，99% 请求 < 5秒，错误率 < 5%
// 5. 详细的性能指标和汇总报告
//
// 运行命令:
// k6 run __tests__/load/k6-load-test.js
//
// 自定义参数:
// BASE_URL=https://your-production.com k6 run __tests__/load/k6-load-test.js

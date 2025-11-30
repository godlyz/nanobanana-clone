/**
 * 🔥 老王创建：论坛功能手动测试脚本
 * 用途：直接调用API测试搜索、分析、置顶/精华功能
 * 日期：2025-11-25
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: any
}

const results: TestResult[] = []

async function test(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime
    })
    console.log(`✅ ${name}`)
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    })
    console.error(`❌ ${name}`)
    console.error(`   错误: ${error.message}`)
  }
}

async function runTests() {
  console.log('\n🔥 老王的论坛功能测试开始！\n')
  console.log('==================================\n')

  // 1. 测试论坛搜索API
  console.log('1️⃣  论坛搜索API测试')
  console.log('---')

  await test('搜索API应该拒绝少于2字符的查询', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/search?q=a`)
    const data = await res.json()
    if (res.status !== 400 || data.success !== false) {
      throw new Error('应该返回400错误')
    }
  })

  await test('搜索API应该返回有效结果和分页信息', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/search?q=test&limit=10`)
    const data = await res.json()
    if (!data.pagination || !data.search_meta) {
      throw new Error('缺少分页或元信息')
    }
  })

  await test('搜索API响应时间应该<2s', async () => {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}/api/forum/search?q=forum`)
    const duration = Date.now() - start
    if (duration >= 2000) {
      throw new Error(`响应时间${duration}ms >= 2000ms`)
    }
  })

  // 2. 测试论坛分析API
  console.log('\n2️⃣  论坛分析API测试')
  console.log('---')

  await test('分析API应该返回完整数据结构', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/analytics?days=7`)
    const data = await res.json()
    if (!data.data.posts_per_day || !data.data.summary || !data.data.top_contributors) {
      throw new Error('缺少必需的数据字段')
    }
  })

  await test('分析API时间序列应该有正确天数', async () => {
    const days = 7
    const res = await fetch(`${BASE_URL}/api/forum/analytics?days=${days}`)
    const data = await res.json()
    if (data.data.posts_per_day.length !== days) {
      throw new Error(`posts_per_day长度${data.data.posts_per_day.length}应该等于${days}`)
    }
  })

  await test('分析API响应时间应该<3s', async () => {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}/api/forum/analytics?days=30`)
    const duration = Date.now() - start
    if (duration >= 3000) {
      throw new Error(`响应时间${duration}ms >= 3000ms`)
    }
  })

  await test('分析API最活跃贡献者应该<=10人', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/analytics`)
    const data = await res.json()
    if (data.data.top_contributors.length > 10) {
      throw new Error(`贡献者数量${data.data.top_contributors.length} > 10`)
    }
  })

  //  3. 测试帖子列表API（置顶/精华排序）
  console.log('\n3️⃣  帖子列表API测试（置顶/精华）')
  console.log('---')

  await test('帖子列表API应该支持latest排序', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/threads?sort=latest&limit=20`)
    const data = await res.json()
    if (res.status !== 200 || !data.success) {
      throw new Error('API调用失败')
    }
  })

  await test('帖子列表API应该支持hot排序', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/threads?sort=hot&limit=20`)
    const data = await res.json()
    if (res.status !== 200 || !data.success) {
      throw new Error('API调用失败')
    }
  })

  await test('帖子列表API应该支持top排序', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/threads?sort=top&limit=20`)
    const data = await res.json()
    if (res.status !== 200 || !data.success) {
      throw new Error('API调用失败')
    }
  })

  await test('帖子列表API应该支持unanswered排序', async () => {
    const res = await fetch(`${BASE_URL}/api/forum/threads?sort=unanswered&limit=20`)
    const data = await res.json()
    if (res.status !== 200 || !data.success) {
      throw new Error('API调用失败')
    }
    // 验证所有帖子reply_count都是0
    if (data.data.data.length > 0) {
      const hasNonZeroReply = data.data.data.some((t: any) => t.reply_count !== 0)
      if (hasNonZeroReply) {
        throw new Error('unanswered模式应该只返回reply_count=0的帖子')
      }
    }
  })

  await test('帖子列表API响应时间应该<1s', async () => {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}/api/forum/threads?limit=20`)
    const duration = Date.now() - start
    if (duration >= 1000) {
      throw new Error(`响应时间${duration}ms >= 1000ms`)
    }
  })

  // 4. 组件导出测试
  console.log('\n4️⃣  组件导出完整性测试')
  console.log('---')

  await test('ForumSearchBar应该被正确导出', async () => {
    const fs = require('fs')
    const content = fs.readFileSync('components/forum/index.ts', 'utf-8')
    if (!content.includes('ForumSearchBar')) {
      throw new Error('ForumSearchBar未导出')
    }
  })

  await test('所有必需组件应该被导出', async () => {
    const fs = require('fs')
    const content = fs.readFileSync('components/forum/index.ts', 'utf-8')
    const required = ['ForumCategoryList', 'ForumThreadCard', 'ForumThreadList', 'ForumSearchBar']
    const missing = required.filter(name => !content.includes(name))
    if (missing.length > 0) {
      throw new Error(`缺少组件导出: ${missing.join(', ')}`)
    }
  })

  // 输出测试结果汇总
  console.log('\n==================================')
  console.log('\n📊 测试结果汇总\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`✅ 通过: ${passed}/${results.length}`)
  console.log(`❌ 失败: ${failed}/${results.length}`)
  console.log(`⏱️  总耗时: ${totalDuration}ms`)
  console.log('')

  if (failed > 0) {
    console.log('❌ 失败的测试:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`)
      console.log(`     错误: ${r.error}`)
    })
    console.log('')
  }

  console.log('==================================\n')

  if (failed === 0) {
    console.log('🎉 艹！所有测试都通过了！论坛功能完美运行！')
  } else {
    console.log('⚠️  艹！有测试失败了，老王我得去修bug了！')
    process.exit(1)
  }
}

runTests().catch((error) => {
  console.error('❌ 测试执行失败:', error)
  process.exit(1)
})

/**
 * 🔥 老王测试脚本：验证LLM配置
 *
 * 这个脚本直接测试ollamaOptimizer，不需要通过HTTP API
 */

const { ollamaOptimizer } = require('./lib/ollama-optimizer.ts')

async function testLLMConfig() {
  console.log('============================================')
  console.log('🧪 老王测试：LLM配置验证')
  console.log('============================================\n')

  try {
    // 测试1：健康检查
    console.log('📋 测试1：执行健康检查...')
    const healthStatus = await ollamaOptimizer.healthCheck()

    console.log('\n✅ 健康检查结果：')
    console.log('  Provider:', healthStatus.provider)
    console.log('  状态:', healthStatus.healthy ? '✅ 连接成功' : '❌ 连接失败')
    console.log('  消息:', healthStatus.message)
    console.log('  快速模型:', healthStatus.quickModel)
    console.log('  详细模型:', healthStatus.detailedModel)

    if (!healthStatus.healthy) {
      console.error('\n❌ 健康检查失败！请检查配置')
      process.exit(1)
    }

    // 测试2：快速优化
    console.log('\n📋 测试2：测试快速优化...')
    const testPrompt = '一只可爱的猫咪'
    console.log('  测试提示词:', testPrompt)

    const quickResult = await ollamaOptimizer.optimizePrompt(testPrompt, {
      level: 'quick',
      category: 'general'
    })

    console.log('\n✅ 快速优化结果：')
    console.log('  原始提示词:', testPrompt)
    console.log('  优化后提示词:', quickResult.selected.optimizedPrompt.substring(0, 100) + '...')
    console.log('  质量评分:', quickResult.selected.qualityScore)
    console.log('  改进数量:', quickResult.selected.improvements.length)
    console.log('  改进建议:', quickResult.selected.improvements.slice(0, 3))

    // 测试3：详细优化
    console.log('\n📋 测试3：测试详细优化...')
    const detailedResult = await ollamaOptimizer.optimizePrompt(testPrompt, {
      level: 'detailed',
      category: 'general'
    })

    console.log('\n✅ 详细优化结果：')
    console.log('  优化后提示词:', detailedResult.selected.optimizedPrompt.substring(0, 100) + '...')
    console.log('  质量评分:', detailedResult.selected.qualityScore)
    console.log('  备选方案数量:', detailedResult.alternatives.length)

    console.log('\n============================================')
    console.log('🎉 所有测试通过！智谱AI配置正常！')
    console.log('============================================\n')

  } catch (error) {
    console.error('\n❌ 测试失败：', error.message)
    console.error('详细错误：', error)
    process.exit(1)
  }
}

// 运行测试
testLLMConfig()

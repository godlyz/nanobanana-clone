/**
 * 测试LLM配置加载
 */
import { llmConfigLoader, getFallbackImageGenerationConfig, getFallbackPromptOptimizationConfig } from './lib/llm-config-loader'

console.log('🧪 老王测试：LLM配置加载')
console.log('='.repeat(60))

async function testLLMConfig() {
  try {
    // 测试1：图像生成配置
    console.log('\n📝 测试1：图像生成配置加载')
    const imgConfig = await llmConfigLoader.getImageGenerationConfig()

    if (imgConfig) {
      console.log('✅ 数据库配置加载成功')
      console.log('  Provider:', imgConfig.provider)
      console.log('  API URL:', imgConfig.api_url)
      console.log('  Model:', imgConfig.model_name)
      console.log('  API Key:', imgConfig.api_key ? `✅ 已解密 (前10位: ${imgConfig.api_key.substring(0, 10)}...)` : '❌ 未配置')
    } else {
      console.log('⚠️ 数据库配置不可用，尝试降级配置')
      const fallback = getFallbackImageGenerationConfig()
      if (fallback) {
        console.log('✅ 降级配置可用')
        console.log('  Provider:', fallback.provider)
        console.log('  API URL:', fallback.api_url)
        console.log('  Model:', fallback.model_name)
      } else {
        console.log('❌ 降级配置也不可用')
      }
    }

    // 测试2：提示词优化配置
    console.log('\n📝 测试2：提示词优化配置加载')
    const promptConfig = await llmConfigLoader.getPromptOptimizationConfig()

    if (promptConfig) {
      console.log('✅ 数据库配置加载成功')
      console.log('  Provider:', promptConfig.provider)
      console.log('  API URL:', promptConfig.api_url)
      console.log('  Quick Model:', promptConfig.quick_model)
      console.log('  Detailed Model:', promptConfig.detailed_model)
      console.log('  API Key:', promptConfig.api_key ? `✅ 已解密 (前10位: ${promptConfig.api_key.substring(0, 10)}...)` : '⚠️ 未配置（Ollama可能不需要）')
    } else {
      console.log('⚠️ 数据库配置不可用，尝试降级配置')
      const fallback = getFallbackPromptOptimizationConfig()
      if (fallback) {
        console.log('✅ 降级配置可用')
        console.log('  Provider:', fallback.provider)
        console.log('  API URL:', fallback.api_url)
        console.log('  Quick Model:', fallback.quick_model)
        console.log('  Detailed Model:', fallback.detailed_model)
      } else {
        console.log('❌ 降级配置也不可用')
      }
    }

    // 测试3：健康检查
    console.log('\n📝 测试3：LLM配置健康检查')
    const health = await llmConfigLoader.healthCheck()
    console.log('图像生成:', health.imageGeneration ? '✅' : '❌')
    console.log('提示词优化:', health.promptOptimization ? '✅' : '❌')
    if (health.errors.length > 0) {
      console.log('错误信息:', health.errors)
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

testLLMConfig().then(() => {
  console.log('\n' + '='.repeat(60))
  console.log('🎉 LLM配置测试完成')
  process.exit(0)
})

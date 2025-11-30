/**
 * 🔥 老王测试脚本：验证智谱AI配置
 */

import fs from 'fs'
import path from 'path'

async function testLLMConfig() {
  console.log('============================================')
  console.log('🧪 老王测试：智谱AI配置验证')
  console.log('============================================\n')

  try {
    // 读取配置文件
    console.log('📋 步骤1：读取 llm-config.json...')
    const configPath = path.join(process.cwd(), 'llm-config.json')
    const configFile = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configFile)

    console.log('✅ 配置加载成功：')
    console.log('  Provider:', config.provider)
    console.log('  API URL:', config.apiUrl)
    console.log('  API Key:', config.apiKey ? '已配置 ✓' : '未配置 ✗')
    console.log('  快速模型:', config.models.quick)
    console.log('  详细模型:', config.models.detailed)

    // 测试健康检查
    console.log('\n📋 步骤2：测试智谱AI API连接...')
    const healthResponse = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.models.quick,
        messages: [
          { role: 'user', content: 'test' }
        ],
        max_tokens: 10
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (!healthResponse.ok) {
      const errorText = await healthResponse.text()
      console.error('❌ API响应失败:', healthResponse.status, healthResponse.statusText)
      console.error('错误详情:', errorText)
      process.exit(1)
    }

    const healthData = await healthResponse.json()
    console.log('✅ API连接成功！')
    console.log('响应数据:', JSON.stringify(healthData, null, 2).substring(0, 200) + '...')

    // 测试优化功能
    console.log('\n📋 步骤3：测试提示词优化...')
    const testPrompt = '一只可爱的猫咪'

    const systemPrompt = `你是一个专业的AI图像生成提示词优化专家。

请严格按照JSON格式返回优化结果：

\`\`\`json
{
  "analysis": {
    "completeness": 75,
    "clarity": 80,
    "creativity": 60,
    "specificity": 70,
    "overallScore": 71,
    "weaknesses": ["缺少细节描述"],
    "suggestions": ["添加环境描述", "指定画面风格"]
  },
  "optimizedPrompt": "优化后的提示词...",
  "improvements": ["添加了环境描述", "指定了画面风格"],
  "qualityScore": 85
}
\`\`\`

请优化这个提示词："${testPrompt}"`

    const optimizeResponse = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.models.quick,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请严格按照JSON格式分析并优化这个提示词："${testPrompt}"` }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: AbortSignal.timeout(60000)
    })

    if (!optimizeResponse.ok) {
      const errorText = await optimizeResponse.text()
      console.error('❌ 优化请求失败:', optimizeResponse.status, optimizeResponse.statusText)
      console.error('错误详情:', errorText)
      process.exit(1)
    }

    const optimizeData = await optimizeResponse.json()
    const resultText = optimizeData.choices[0].message.content

    console.log('✅ 智谱AI响应成功！')
    console.log('原始提示词:', testPrompt)
    console.log('优化响应:', resultText.substring(0, 300) + '...')

    // 尝试解析JSON
    const jsonMatch = resultText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('\n✅ JSON解析成功：')
      console.log('  优化后提示词:', parsed.optimizedPrompt?.substring(0, 100) + '...')
      console.log('  质量评分:', parsed.qualityScore)
      console.log('  改进数量:', parsed.improvements?.length || 0)
    } else {
      console.warn('⚠️ 无法解析JSON响应，可能需要调整system prompt')
    }

    console.log('\n============================================')
    console.log('🎉 所有测试通过！智谱AI配置完美！')
    console.log('============================================\n')

  } catch (error) {
    console.error('\n❌ 测试失败：', error.message)
    console.error('详细错误：', error.stack)
    process.exit(1)
  }
}

// 运行测试
testLLMConfig()

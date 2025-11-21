/**
 * 🔥 老王脚本：Google AI配置加密并存入数据库
 * 用途: 将.env.local中的Google AI配置加密后存入数据库
 */

import { createServiceClient } from '../../lib/supabase/service'
import { encrypt } from '../../lib/crypto-utils'

async function setupGoogleAIConfig() {
  console.log('🔥 开始设置Google AI配置...')

  // 1. 从环境变量读取配置
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('❌ 环境变量 GOOGLE_AI_API_KEY 未设置！')
    process.exit(1)
  }

  console.log('✅ 读取Google AI API Key成功')
  console.log('  API Key:', apiKey.substring(0, 8) + '...')

  // 2. 加密API Key
  console.log('\n🔐 正在加密API Key...')
  const encryptedApiKey = encrypt(apiKey)
  console.log('✅ API Key加密成功')

  // 3. 准备配置数据
  const configValue = {
    provider: 'google',
    service_type: 'image_generation',
    api_url: 'https://generativelanguage.googleapis.com',
    api_key_encrypted: encryptedApiKey,
    model_name: 'gemini-2.5-flash-image',
    timeout: 60000,
    description: 'Google Gemini图像生成服务'
  }

  // 4. 存入数据库
  console.log('\n💾 正在存入数据库...')
  const supabase = createServiceClient()

  // 4.1 检查是否已存在
  const { data: existing } = await supabase
    .from('system_configs')
    .select('config_key, is_active')
    .eq('config_key', 'llm.image_generation.google')
    .single()

  if (existing) {
    console.log('⚠️ 配置已存在，正在更新...')

    // 更新配置
    const { error: updateError } = await supabase
      .from('system_configs')
      .update({
        config_value: configValue,
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: '00000000-0000-0000-0000-000000000000'
      })
      .eq('config_key', 'llm.image_generation.google')

    if (updateError) {
      console.error('❌ 更新配置失败:', updateError)
      process.exit(1)
    }

    console.log('✅ 配置更新成功')
  } else {
    console.log('🆕 配置不存在，正在插入...')

    // 插入新配置
    const { error: insertError } = await supabase
      .from('system_configs')
      .insert({
        config_key: 'llm.image_generation.google',
        config_value: configValue,
        config_type: 'llm',
        description: 'Google Gemini图像生成配置（主要生成服务）',
        is_active: true,
        created_by: '00000000-0000-0000-0000-000000000000',
        updated_by: '00000000-0000-0000-0000-000000000000'
      })

    if (insertError) {
      console.error('❌ 插入配置失败:', insertError)
      process.exit(1)
    }

    console.log('✅ 配置插入成功')
  }

  // 5. 验证配置
  console.log('\n🔍 正在验证配置...')
  const { data: verifyData, error: verifyError } = await supabase
    .from('system_configs')
    .select('config_key, config_value, is_active')
    .eq('config_type', 'llm')
    .eq('config_value->>service_type', 'image_generation')
    .order('is_active', { ascending: false })

  if (verifyError) {
    console.error('❌ 验证失败:', verifyError)
    process.exit(1)
  }

  console.log('\n✅ 当前图像生成配置:')
  verifyData?.forEach((config: any) => {
    const provider = (config.config_value as any).provider
    const isActive = config.is_active ? '✅ 激活' : '❌ 未激活'
    console.log(`  - ${provider}: ${isActive}`)
  })

  console.log('\n🎉 Google AI配置设置完成！')
  process.exit(0)
}

// 执行
setupGoogleAIConfig().catch(error => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})

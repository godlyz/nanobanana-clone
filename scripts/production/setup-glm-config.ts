/**
 * 🔥 老王脚本：智谱AI配置加密并存入数据库
 * 用途: 将llm-config.json中的智谱AI配置加密后存入数据库
 */

import { createServiceClient } from '../../lib/supabase/service'
import { encrypt } from '../../lib/crypto-utils'
import * as fs from 'fs'
import * as path from 'path'

async function setupGLMConfig() {
  console.log('🔥 开始设置智谱AI配置...')

  // 1. 读取llm-config.json文件
  const configPath = path.join(process.cwd(), 'llm-config.json')
  if (!fs.existsSync(configPath)) {
    console.error('❌ llm-config.json文件不存在！')
    process.exit(1)
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  console.log('✅ 读取llm-config.json成功')
  console.log('  Provider:', rawConfig.provider)
  console.log('  API URL:', rawConfig.apiUrl)
  console.log('  Quick Model:', rawConfig.models.quick)
  console.log('  Detailed Model:', rawConfig.models.detailed)

  // 2. 加密API Key
  console.log('\n🔐 正在加密API Key...')
  const encryptedApiKey = encrypt(rawConfig.apiKey)
  console.log('✅ API Key加密成功')

  // 3. 准备配置数据
  const configValue = {
    provider: 'GLM',
    service_type: 'prompt_optimization',
    api_url: rawConfig.apiUrl,
    api_key_encrypted: encryptedApiKey,
    quick_model: rawConfig.models.quick,
    detailed_model: rawConfig.models.detailed,
    timeout: rawConfig.timeout || 60000,
    headers: rawConfig.headers || {},
    description: '智谱AI提示词优化服务'
  }

  // 4. 存入数据库
  console.log('\n💾 正在存入数据库...')
  const supabase = createServiceClient()

  // 4.1 检查是否已存在
  const { data: existing } = await supabase
    .from('system_configs')
    .select('config_key, is_active')
    .eq('config_key', 'llm.prompt_optimization.glm')
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
      .eq('config_key', 'llm.prompt_optimization.glm')

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
        config_key: 'llm.prompt_optimization.glm',
        config_value: configValue,
        config_type: 'llm',
        description: '智谱AI提示词优化配置（主要服务）',
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

  // 5. 将Ollama配置设为inactive
  console.log('\n🔄 正在将Ollama配置设为非激活状态...')
  const { error: deactivateError } = await supabase
    .from('system_configs')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('config_key', 'llm.prompt_optimization.ollama')

  if (deactivateError) {
    console.warn('⚠️ 停用Ollama配置失败（可能不存在）:', deactivateError)
  } else {
    console.log('✅ Ollama配置已停用')
  }

  // 6. 验证配置
  console.log('\n🔍 正在验证配置...')
  const { data: verifyData, error: verifyError } = await supabase
    .from('system_configs')
    .select('config_key, config_value, is_active')
    .eq('config_type', 'llm')
    .eq('config_value->>service_type', 'prompt_optimization')
    .order('is_active', { ascending: false })

  if (verifyError) {
    console.error('❌ 验证失败:', verifyError)
    process.exit(1)
  }

  console.log('\n✅ 当前提示词优化配置:')
  verifyData?.forEach((config: any) => {
    const provider = (config.config_value as any).provider
    const isActive = config.is_active ? '✅ 激活' : '❌ 未激活'
    console.log(`  - ${provider}: ${isActive}`)
  })

  console.log('\n🎉 智谱AI配置设置完成！')
  process.exit(0)
}

// 执行
setupGLMConfig().catch(error => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})

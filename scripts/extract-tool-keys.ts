#!/usr/bin/env ts-node
/**
 * 老王脚本：提取所有工具组件使用的翻译键
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const toolComponents = [
  'smart-prompt',
  'chat-edit',
  'text-to-image-with-text',
  'consistent-generation',
  'scene-preservation',
  'style-transfer',
  'background-remover'
]

const results: Record<string, string[]> = {}

for (const tool of toolComponents) {
  const toolFile = path.join('/Users/kening/biancheng/nanobanana-clone/components/tools', `${tool}.tsx`)

  if (!fs.existsSync(toolFile)) {
    console.log(`⚠️ 文件不存在: ${toolFile}`)
    continue
  }

  try {
    const content = fs.readFileSync(toolFile, 'utf-8')

    // 提取 t("keyName") 模式的键
    const matches = content.matchAll(/t\("([^"]+)"\)/g)
    const keys = new Set<string>()

    for (const match of matches) {
      keys.add(match[1])
    }

    results[tool] = Array.from(keys).sort()
    console.log(`✅ ${tool}: ${keys.size} 个键`)
  } catch (error) {
    console.error(`❌ 处理 ${tool} 失败:`, error)
  }
}

// 输出结果
console.log('\n========== 提取结果 ==========\n')
for (const [tool, keys] of Object.entries(results)) {
  console.log(`\n${tool.toUpperCase()}:`)
  console.log(keys.join('\n'))
}

// 保存到JSON文件
const outputFile = '/tmp/tool-translation-keys.json'
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
console.log(`\n✅ 结果已保存到: ${outputFile}`)

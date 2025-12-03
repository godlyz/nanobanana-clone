#!/usr/bin/env tsx
/**
 * 🔥 老王的扁平转嵌套脚本
 * 用途：将扁平化的翻译键（"nav.editor"）转换为嵌套结构（{"nav": {"editor": ...}}）
 */

import fs from 'fs'
import path from 'path'

// 🔥 老王：将扁平键转换为嵌套对象（带冲突检测）
function flatToNested(flat: Record<string, string>, filename: string): any {
  const nested: any = {}

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current = nested

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]

      // 🔥 老王：检测冲突 - 如果当前节点已经是字符串，说明有冲突
      if (typeof current[part] === 'string') {
        console.warn(`⚠️  冲突键检测 [${filename}]: "${parts.slice(0, i + 1).join('.')}" 既是值又是对象`)
        console.warn(`    原有值: "${current[part]}"`)
        console.warn(`    新键: "${key}"`)

        // 将原有的字符串值保存到 _value 属性
        const oldValue = current[part]
        current[part] = { _value: oldValue }
      }

      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }

    current[parts[parts.length - 1]] = value
  }

  return nested
}

// 🔥 老王：主函数
async function main() {
  console.log('🔥 老王开始转换扁平键为嵌套结构...')

  const messagesDir = path.join(process.cwd(), 'messages')
  const locales = ['en', 'zh']

  for (const locale of locales) {
    console.log(`\n📝 处理 ${locale} 翻译...`)
    const localeDir = path.join(messagesDir, locale)
    
    const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      const filePath = path.join(localeDir, file)
      const flat = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const nested = flatToNested(flat, `${locale}/${file}`)

      fs.writeFileSync(filePath, JSON.stringify(nested, null, 2) + '\n', 'utf-8')
      console.log(`  ✅ ${file}: ${Object.keys(flat).length} 个键`)
    }
  }

  console.log('\n🎉 老王搞定！所有翻译已转换为嵌套结构')
}

main().catch(err => {
  console.error('❌ 艹！出错了:', err)
  process.exit(1)
})

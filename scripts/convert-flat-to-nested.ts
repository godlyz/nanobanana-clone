/**
 * 🔥 老王的翻译文件格式转换脚本
 * 把 flat key 格式（如 "nav.editor": "value"）
 * 转换为 nested 格式（如 { "nav": { "editor": "value" } }）
 *
 * next-intl 要求使用嵌套格式，不能用点号做 key
 */

import * as fs from 'fs'
import * as path from 'path'

// 设置函数把 flat key 转成 nested object
function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
  const keys = keyPath.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
}

// 转换 flat 对象为 nested 对象
function flatToNested(flat: Record<string, string>): Record<string, unknown> {
  const nested: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(flat)) {
    setNestedValue(nested, key, value)
  }

  return nested
}

// 获取所有 JSON 文件
function getJsonFiles(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getJsonFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

// 检查是否已经是 nested 格式
function isAlreadyNested(obj: Record<string, unknown>): boolean {
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      return true
    }
  }
  // 检查是否有点号 key
  for (const key of Object.keys(obj)) {
    if (key.includes('.')) {
      return false
    }
  }
  return true
}

// 主函数
async function main() {
  const messagesDir = path.join(process.cwd(), 'messages')

  if (!fs.existsSync(messagesDir)) {
    console.error('❌ messages 目录不存在！')
    process.exit(1)
  }

  const jsonFiles = getJsonFiles(messagesDir)
  console.log(`🔥 老王找到 ${jsonFiles.length} 个 JSON 文件要处理`)

  let convertedCount = 0
  let skippedCount = 0

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(process.cwd(), filePath)

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const flatObj = JSON.parse(content) as Record<string, string>

      // 检查是否需要转换
      if (isAlreadyNested(flatObj)) {
        console.log(`⏭️  跳过（已是嵌套格式）: ${relativePath}`)
        skippedCount++
        continue
      }

      // 转换
      const nestedObj = flatToNested(flatObj)

      // 写回文件
      fs.writeFileSync(filePath, JSON.stringify(nestedObj, null, 2) + '\n', 'utf-8')
      console.log(`✅ 已转换: ${relativePath}`)
      convertedCount++

    } catch (error) {
      console.error(`❌ 处理失败: ${relativePath}`, error)
    }
  }

  console.log('\n🎉 转换完成！')
  console.log(`   - 已转换: ${convertedCount} 个文件`)
  console.log(`   - 已跳过: ${skippedCount} 个文件`)
}

main().catch(console.error)

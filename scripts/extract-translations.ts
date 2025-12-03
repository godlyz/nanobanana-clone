/**
 * 🔥 老王的翻译提取脚本
 * 用途：从 language-context.tsx 提取翻译并拆分到 messages/ 目录
 *
 * 运行方式: npx tsx scripts/extract-translations.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// 定义命名空间映射规则 - 按前缀分类
const NAMESPACE_RULES: Record<string, string[]> = {
  // P0 首屏必需
  'common': [
    'nav.',
    'header.',
    'footer.',
    'language.',
    'theme.',
    'error.',
    'loading.',
    'button.',
    'form.',
    'dialog.',
  ],
  'landing': [
    'hero.',
    'features.',
    'showcase.',
    'testimonials.',
    'cta.',
    'faq.',
  ],

  // P1 核心页面
  'editor': [
    'editor.',
    'imageEditor.',
    'chatEdit.',
    'multimodalEdit.',
    'smartPrompt.',
  ],
  'tools': [
    'backgroundRemover.',
    'naturalLanguage.',
    'characterConsistency.',
    'scenePreservation.',
    'multiImage.',
    'textToImageWithText.',
    'aiUgc.',
    'styleTransfer.',
    'batchEdit.',
    'oneShot.',
    'videoGeneration.',
    'tools.',
    'oneShotEdit.',
  ],

  // P2 用户页面
  'profile': [
    'profile.',
    'dashboard.',
    'credits.',
    'settings.',
    'account.',
    'user.',
  ],
  'pricing': [
    'pricing.',
    'subscription.',
    'payment.',
    'checkout.',
    'plan.',
  ],
  'auth': [
    'login.',
    'signup.',
    'register.',
    'auth.',
    'password.',
    'verification.',
  ],
  'video': [
    'video.',
    'videoGallery.',
    'videoEditor.',
    'videoGeneration.',
  ],

  // P3 其他
  'api': [
    'api.',
    'apiDocs.',
    'developer.',
    'documentation.',
    'endpoint.',
  ],
  'admin': [
    'admin.',
    'moderation.',
    'management.',
  ],
  'community': [
    'community.',
    'forum.',
    'challenges.',
    'guidelines.',
    'social.',
  ],
}

// 默认命名空间（匹配不到的都放这里）
const DEFAULT_NAMESPACE = 'common'

interface TranslationsByNamespace {
  [namespace: string]: {
    [key: string]: string
  }
}

/**
 * 确定翻译键属于哪个命名空间
 */
function getNamespace(key: string): string {
  for (const [namespace, prefixes] of Object.entries(NAMESPACE_RULES)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        return namespace
      }
    }
  }
  return DEFAULT_NAMESPACE
}

/**
 * 从 language-context.tsx 提取翻译对象
 */
function extractTranslationsFromFile(filePath: string): Record<string, Record<string, string>> {
  const content = fs.readFileSync(filePath, 'utf-8')

  // 找到 translations 对象的开始位置
  const translationsMatch = content.match(/const translations:\s*Record<Language, Record<string, string>>\s*=\s*{/)
  if (!translationsMatch) {
    throw new Error('❌ 找不到 translations 对象')
  }

  const startIndex = translationsMatch.index! + translationsMatch[0].length

  // 解析 en 和 zh 对象
  const result: Record<string, Record<string, string>> = {
    en: {},
    zh: {}
  }

  // 使用正则匹配所有翻译键值对
  // 匹配模式: "key": "value" 或 "key": `value`
  const keyValueRegex = /"([^"]+)":\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`)/g

  // 找到 en: { 和 zh: { 的位置
  const enStart = content.indexOf('en: {', startIndex)
  const zhStart = content.indexOf('zh: {', startIndex)

  if (enStart === -1 || zhStart === -1) {
    throw new Error('❌ 找不到 en 或 zh 对象')
  }

  // 提取 en 翻译
  let braceCount = 0
  let enEnd = enStart + 4 // "en: {".length
  for (let i = enEnd; i < content.length; i++) {
    if (content[i] === '{') braceCount++
    if (content[i] === '}') {
      if (braceCount === 0) {
        enEnd = i
        break
      }
      braceCount--
    }
  }

  const enContent = content.substring(enStart, enEnd + 1)
  let match
  while ((match = keyValueRegex.exec(enContent)) !== null) {
    const key = match[1]
    const value = match[2] || match[3] || ''
    // 处理转义字符
    result.en[key] = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }

  // 重置正则
  keyValueRegex.lastIndex = 0

  // 提取 zh 翻译
  braceCount = 0
  let zhEnd = zhStart + 4
  for (let i = zhEnd; i < content.length; i++) {
    if (content[i] === '{') braceCount++
    if (content[i] === '}') {
      if (braceCount === 0) {
        zhEnd = i
        break
      }
      braceCount--
    }
  }

  const zhContent = content.substring(zhStart, zhEnd + 1)
  while ((match = keyValueRegex.exec(zhContent)) !== null) {
    const key = match[1]
    const value = match[2] || match[3] || ''
    result.zh[key] = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }

  console.log(`✅ 提取完成: en=${Object.keys(result.en).length} 个键, zh=${Object.keys(result.zh).length} 个键`)

  return result
}

/**
 * 按命名空间拆分翻译
 */
function splitByNamespace(translations: Record<string, string>): TranslationsByNamespace {
  const result: TranslationsByNamespace = {}

  // 初始化所有命名空间
  for (const namespace of Object.keys(NAMESPACE_RULES)) {
    result[namespace] = {}
  }
  result[DEFAULT_NAMESPACE] = result[DEFAULT_NAMESPACE] || {}

  // 分类每个翻译键
  for (const [key, value] of Object.entries(translations)) {
    const namespace = getNamespace(key)
    if (!result[namespace]) {
      result[namespace] = {}
    }
    result[namespace][key] = value
  }

  return result
}

/**
 * 将翻译写入 JSON 文件
 */
function writeTranslationFiles(
  translationsByNamespace: TranslationsByNamespace,
  locale: string,
  outputDir: string
): void {
  const localeDir = path.join(outputDir, locale)

  // 确保目录存在
  if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true })
  }

  // 写入每个命名空间的文件
  for (const [namespace, translations] of Object.entries(translationsByNamespace)) {
    if (Object.keys(translations).length === 0) {
      continue // 跳过空的命名空间
    }

    const filePath = path.join(localeDir, `${namespace}.json`)
    const content = JSON.stringify(translations, null, 2)
    fs.writeFileSync(filePath, content + '\n', 'utf-8')

    console.log(`  📝 ${locale}/${namespace}.json: ${Object.keys(translations).length} 个键`)
  }
}

/**
 * 生成统计报告
 */
function generateReport(
  enByNamespace: TranslationsByNamespace,
  zhByNamespace: TranslationsByNamespace
): void {
  console.log('\n📊 翻译拆分统计报告:')
  console.log('=' .repeat(60))

  const allNamespaces = new Set([
    ...Object.keys(enByNamespace),
    ...Object.keys(zhByNamespace)
  ])

  let totalEn = 0
  let totalZh = 0

  console.log('\n| 命名空间 | EN 键数 | ZH 键数 | 预估大小 |')
  console.log('|----------|---------|---------|----------|')

  for (const namespace of Array.from(allNamespaces).sort()) {
    const enCount = Object.keys(enByNamespace[namespace] || {}).length
    const zhCount = Object.keys(zhByNamespace[namespace] || {}).length
    const enSize = JSON.stringify(enByNamespace[namespace] || {}).length
    const zhSize = JSON.stringify(zhByNamespace[namespace] || {}).length
    const avgSize = Math.round((enSize + zhSize) / 2 / 1024 * 10) / 10

    totalEn += enCount
    totalZh += zhCount

    if (enCount > 0 || zhCount > 0) {
      console.log(`| ${namespace.padEnd(8)} | ${String(enCount).padStart(7)} | ${String(zhCount).padStart(7)} | ~${avgSize}KB |`)
    }
  }

  console.log('|----------|---------|---------|----------|')
  console.log(`| 总计     | ${String(totalEn).padStart(7)} | ${String(totalZh).padStart(7)} |          |`)
  console.log('=' .repeat(60))

  // 首屏优化统计
  const firstScreenNamespaces = ['common', 'landing']
  let firstScreenEn = 0
  let firstScreenZh = 0

  for (const ns of firstScreenNamespaces) {
    firstScreenEn += Object.keys(enByNamespace[ns] || {}).length
    firstScreenZh += Object.keys(zhByNamespace[ns] || {}).length
  }

  console.log(`\n🚀 首屏优化效果:`)
  console.log(`   - 首屏翻译键: ${firstScreenEn} 个 (原来: ${totalEn} 个)`)
  console.log(`   - 减少加载: ${Math.round((1 - firstScreenEn / totalEn) * 100)}%`)
}

// 主函数
async function main() {
  console.log('🔥 老王的翻译提取脚本启动!\n')

  const projectRoot = process.cwd()
  const sourceFile = path.join(projectRoot, 'lib/language-context.tsx')
  const outputDir = path.join(projectRoot, 'messages')

  // 检查源文件是否存在
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ 源文件不存在: ${sourceFile}`)
    process.exit(1)
  }

  console.log('📖 正在读取 language-context.tsx...')
  const translations = extractTranslationsFromFile(sourceFile)

  console.log('\n🔄 正在按命名空间拆分翻译...')
  const enByNamespace = splitByNamespace(translations.en)
  const zhByNamespace = splitByNamespace(translations.zh)

  console.log('\n💾 正在写入 JSON 文件...')
  console.log('\n  [EN 英文翻译]')
  writeTranslationFiles(enByNamespace, 'en', outputDir)
  console.log('\n  [ZH 中文翻译]')
  writeTranslationFiles(zhByNamespace, 'zh', outputDir)

  // 生成报告
  generateReport(enByNamespace, zhByNamespace)

  console.log('\n✅ 翻译提取完成! 文件已保存到 messages/ 目录')
}

main().catch(console.error)

#!/usr/bin/env tsx
/**
 * 🔥 老王的冲突键修复脚本
 * 用途：修复 language-context.tsx 中的冲突键
 */

import fs from 'fs'
import path from 'path'

// 🔥 老王：需要修复的冲突键映射
const KEY_FIXES: Record<string, string> = {
  // Footer分组标题
  '"footer.product":': '"footer.product.title":',
  '"footer.company":': '"footer.company.title":',
  '"footer.resources":': '"footer.resources.title":',
  '"footer.legal":': '"footer.legal.title":',

  // Batch Editor冲突
  '"batchEditor.uploadMultiple":': '"batchEditor.uploadMultiple.title":',
  '"batchEditor.sharedPrompt":': '"batchEditor.sharedPrompt.title":',

  // API Page Endpoints冲突
  '"apiPage.endpoints.edit":': '"apiPage.endpoints.edit.title":',
  '"apiPage.endpoints.remove":': '"apiPage.endpoints.remove.title":',
  '"apiPage.endpoints.batch":': '"apiPage.endpoints.batch.title":',

  // API Page Pricing冲突
  '"apiPage.pricing.free":': '"apiPage.pricing.free.title":',
  '"apiPage.pricing.pro":': '"apiPage.pricing.pro.title":',
  '"apiPage.pricing.enterprise":': '"apiPage.pricing.enterprise.title":',
}

async function main() {
  console.log('🔥 老王开始修复冲突键...')

  const filePath = path.join(process.cwd(), 'lib/language-context.tsx')
  let content = fs.readFileSync(filePath, 'utf-8')

  let fixCount = 0
  for (const [oldKey, newKey] of Object.entries(KEY_FIXES)) {
    const regex = new RegExp(oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    const matches = content.match(regex)

    if (matches) {
      content = content.replace(regex, newKey)
      fixCount += matches.length
      console.log(`  ✅ ${oldKey} → ${newKey} (${matches.length}处)`)
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`\n🎉 老王搞定！共修复 ${fixCount} 处冲突键`)
}

main().catch(err => {
  console.error('❌ 艹！出错了:', err)
  process.exit(1)
})

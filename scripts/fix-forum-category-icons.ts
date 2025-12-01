/**
 * 🔥 老王修复脚本：更新论坛分类图标
 * 用途：把文字图标名称改成真正的emoji
 * 日期：2025-12-01
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 图标映射：文字名称 → emoji
const iconMapping: Record<string, string> = {
  'discussion': '💬',
  'book': '📚',
  'lightbulb': '💡',
  'bug': '🐛',
}

async function fixCategoryIcons() {
  console.log('🔥 老王开始修复分类图标...\n')

  // 查询所有分类
  const { data: categories, error: queryError } = await supabase
    .from('forum_categories')
    .select('id, slug, name, icon')

  if (queryError) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️ 没有找到分类')
    return
  }

  console.log(`📊 找到 ${categories.length} 个分类:\n`)

  let fixedCount = 0

  for (const category of categories) {
    const oldIcon = category.icon

    // 检查是否需要修复（icon是文字名称）
    if (oldIcon && iconMapping[oldIcon]) {
      const newIcon = iconMapping[oldIcon]

      // 更新图标
      const { error: updateError } = await supabase
        .from('forum_categories')
        .update({ icon: newIcon })
        .eq('id', category.id)

      if (updateError) {
        console.error(`❌ 更新失败 (${category.slug}):`, updateError)
      } else {
        console.log(`✅ ${category.slug}: ${oldIcon} → ${newIcon}`)
        fixedCount++
      }
    } else {
      console.log(`⏭️  ${category.slug}: 图标已经是emoji或未映射 (${oldIcon})`)
    }
  }

  console.log(`\n🎉 修复完成！共更新了 ${fixedCount} 个分类图标`)
}

fixCategoryIcons()
  .then(() => {
    console.log('\n✅ 脚本执行完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

/**
 * 🔥 老王调试脚本：检查分类名称字段
 * 用途：查看name和name_en字段的值
 * 日期：2025-12-01
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCategoryNames() {
  console.log('🔍 老王正在检查分类名称字段...\n')

  const { data: categories, error } = await supabase
    .from('forum_categories')
    .select('slug, name, name_en, description, description_en')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️ 没有找到分类')
    return
  }

  console.log('📊 分类名称对照表:\n')
  console.log('='.repeat(120))
  console.log(`${'Slug'.padEnd(15)} | ${'name (中文)'.padEnd(30)} | ${'name_en (英文)'.padEnd(30)}`)
  console.log('='.repeat(120))

  categories.forEach(cat => {
    console.log(`${cat.slug.padEnd(15)} | ${(cat.name || '空').padEnd(30)} | ${(cat.name_en || '空').padEnd(30)}`)
  })

  console.log('='.repeat(120))
  console.log('\n🔍 老王分析：')
  const wrongCategories = categories.filter(c =>
    c.name && c.name_en &&
    (c.name.match(/[a-zA-Z]/) && c.name_en.match(/[a-zA-Z]/))
  )

  if (wrongCategories.length > 0) {
    console.log('❌ 发现问题：以下分类的name和name_en字段可能搞反了！')
    wrongCategories.forEach(c => {
      console.log(`   - ${c.slug}: name="${c.name}" name_en="${c.name_en}"`)
    })
  } else {
    console.log('✅ 分类名称字段正常')
  }
}

checkCategoryNames()
  .then(() => {
    console.log('\n✅ 检查完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

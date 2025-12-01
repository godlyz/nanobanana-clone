/**
 * 🔥 老王调试脚本：检查论坛分类数据
 * 用途：查看数据库里的所有分类（包括隐藏的）
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

async function checkCategories() {
  console.log('🔍 老王正在检查论坛分类数据...\n')

  // 查询所有分类（包括隐藏的）
  const { data: categories, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️ 数据库中没有分类数据')
    return
  }

  console.log(`📊 总共找到 ${categories.length} 个分类:\n`)
  console.log('=' .repeat(100))
  console.log(`${'序号'.padEnd(6)} | ${'名称'.padEnd(20)} | ${'Slug'.padEnd(20)} | ${'可见'.padEnd(8)} | ${'排序'.padEnd(8)} | ${'图标'.padEnd(8)}`)
  console.log('=' .repeat(100))

  categories.forEach((cat, index) => {
    const visible = cat.is_visible ? '✅ 是' : '❌ 否'
    console.log(
      `${(index + 1).toString().padEnd(6)} | ${cat.name.padEnd(20)} | ${cat.slug.padEnd(20)} | ${visible.padEnd(8)} | ${cat.sort_order.toString().padEnd(8)} | ${cat.icon || '无'}`
    )
  })

  console.log('=' .repeat(100))
  console.log(`\n✅ 可见分类: ${categories.filter(c => c.is_visible).length}`)
  console.log(`❌ 隐藏分类: ${categories.filter(c => !c.is_visible).length}`)
  console.log('\n🔍 老王提示：如果看到一堆测试分类，需要手动删除或隐藏它们！')
}

checkCategories()
  .then(() => {
    console.log('\n✅ 检查完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

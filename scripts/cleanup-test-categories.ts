/**
 * 🔥 老王清理脚本：删除测试分类
 * 用途：清理数据库里的所有test-category-*测试数据
 * 日期：2025-12-01
 * 警告：这个脚本会永久删除数据，请谨慎使用！
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

async function cleanupTestCategories() {
  console.log('🔥 老王开始清理测试分类...\n')

  // 查询所有测试分类（slug以test-category-开头）
  const { data: testCategories, error: queryError } = await supabase
    .from('forum_categories')
    .select('id, slug, name')
    .like('slug', 'test-category-%')

  if (queryError) {
    console.error('❌ 查询失败:', queryError)
    process.exit(1)
  }

  if (!testCategories || testCategories.length === 0) {
    console.log('✅ 没有找到测试分类，数据库很干净！')
    return
  }

  console.log(`⚠️  找到 ${testCategories.length} 个测试分类，准备删除:\n`)
  testCategories.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.name} (${cat.slug})`)
  })

  console.log('\n🗑️  开始删除...')

  // 删除所有测试分类（使用service role key，绕过RLS）
  const { error: deleteError } = await supabase
    .from('forum_categories')
    .delete()
    .like('slug', 'test-category-%')

  if (deleteError) {
    console.error('❌ 删除失败:', deleteError)
    process.exit(1)
  }

  console.log(`\n✅ 成功删除 ${testCategories.length} 个测试分类！`)
  console.log('🎉 老王搞定！数据库现在干净多了！')
}

cleanupTestCategories()
  .then(() => {
    console.log('\n✅ 清理完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

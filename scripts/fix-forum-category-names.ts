/**
 * 🔥 老王修复脚本：修复论坛分类的中英文名称
 * 用途：把数据库里搞反的英文名字修复成正确的中英双语
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

// 正确的中英双语映射（来自migration SQL）
const correctNames: Record<string, {
  name: string
  name_en: string
  description: string
  description_en: string
}> = {
  'general': {
    name: '通用讨论',
    name_en: 'General Discussion',
    description: '分享你的想法和经验',
    description_en: 'Share your ideas and experiences'
  },
  'tutorials': {
    name: '教程与技巧',
    name_en: 'Tutorials & Tips',
    description: '学习和分享AI创作技巧',
    description_en: 'Learn and share AI creation tips'
  },
  'feedback': {
    name: '反馈与建议',
    name_en: 'Feedback & Suggestions',
    description: '帮助我们改进产品',
    description_en: 'Help us improve the product'
  },
  'bugs': {
    name: 'Bug报告',
    name_en: 'Bug Reports',
    description: '报告问题和错误',
    description_en: 'Report issues and bugs'
  }
}

async function fixCategoryNames() {
  console.log('🔥 老王开始修复分类名称...\n')

  // 查询所有分类
  const { data: categories, error: queryError } = await supabase
    .from('forum_categories')
    .select('id, slug, name, name_en, description, description_en')
    .order('sort_order', { ascending: true })

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
    const correctData = correctNames[category.slug]

    if (!correctData) {
      console.log(`⏭️  ${category.slug}: 没有对应的修复数据，跳过`)
      continue
    }

    // 检查是否需要修复
    const needsFix =
      category.name !== correctData.name ||
      category.name_en !== correctData.name_en ||
      category.description !== correctData.description ||
      category.description_en !== correctData.description_en

    if (needsFix) {
      console.log(`🔧 修复 ${category.slug}:`)
      console.log(`   旧: name="${category.name}" name_en="${category.name_en}"`)
      console.log(`   新: name="${correctData.name}" name_en="${correctData.name_en}"`)

      // 更新分类
      const { error: updateError } = await supabase
        .from('forum_categories')
        .update({
          name: correctData.name,
          name_en: correctData.name_en,
          description: correctData.description,
          description_en: correctData.description_en
        })
        .eq('id', category.id)

      if (updateError) {
        console.error(`❌ 更新失败 (${category.slug}):`, updateError)
      } else {
        console.log(`✅ ${category.slug} 更新成功！`)
        fixedCount++
      }
    } else {
      console.log(`✓ ${category.slug}: 名称已经正确，无需修复`)
    }
  }

  console.log(`\n🎉 修复完成！共更新了 ${fixedCount} 个分类`)
  console.log('现在论坛应该能正确显示中英双语了！')
}

fixCategoryNames()
  .then(() => {
    console.log('\n✅ 脚本执行完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

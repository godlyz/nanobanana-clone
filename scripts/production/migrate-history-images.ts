/**
 * 历史记录数据迁移脚本
 *
 * 功能：将旧的 generated_image_url 字段迁移到 generated_images 数组
 *
 * 使用方法：
 * 1. 确保 .env.local 中配置了 SUPABASE_SERVICE_ROLE_KEY
 * 2. 运行: pnpm tsx scripts/migrate-history-images.ts
 *
 * 注意：这个脚本是幂等的，可以多次运行
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必需的环境变量:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateHistoryImages() {
  console.log('🚀 开始迁移历史记录数据...\n')

  try {
    // 查询所有 generated_images 为空或 null，但 generated_image_url 不为空的记录
    const { data: records, error: fetchError } = await supabase
      .from('generation_history')
      .select('id, generated_image_url, generated_images')
      .not('generated_image_url', 'is', null)

    if (fetchError) {
      console.error('❌ 查询历史记录失败:', fetchError)
      process.exit(1)
    }

    if (!records || records.length === 0) {
      console.log('✅ 没有需要迁移的记录')
      return
    }

    console.log(`📊 找到 ${records.length} 条记录\n`)

    let updatedCount = 0
    let skippedCount = 0

    for (const record of records) {
      // 检查是否已经有 generated_images 数组
      const hasImagesArray = Array.isArray(record.generated_images) && record.generated_images.length > 0

      if (hasImagesArray) {
        console.log(`⏭️  跳过记录 ${record.id} - 已有 generated_images 数组`)
        skippedCount++
        continue
      }

      // 迁移数据：将 generated_image_url 添加到 generated_images 数组
      const { error: updateError } = await supabase
        .from('generation_history')
        .update({
          generated_images: [record.generated_image_url]
        })
        .eq('id', record.id)

      if (updateError) {
        console.error(`❌ 更新记录 ${record.id} 失败:`, updateError)
        continue
      }

      console.log(`✅ 已迁移记录 ${record.id}`)
      updatedCount++
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 迁移完成统计:')
    console.log(`   - 总记录数: ${records.length}`)
    console.log(`   - 已更新: ${updatedCount}`)
    console.log(`   - 已跳过: ${skippedCount}`)
    console.log('='.repeat(60) + '\n')

    if (updatedCount > 0) {
      console.log('🎉 数据迁移成功！')
    } else {
      console.log('ℹ️  没有记录需要更新')
    }
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  }
}

// 运行迁移
migrateHistoryImages()
  .then(() => {
    console.log('\n✨ 脚本执行完毕')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error)
    process.exit(1)
  })

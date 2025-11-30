// 🔥 老王脚本：运行迁移 + 批量为旧数据生成缩略图
// 用途：
// 1. 添加 thumbnail_images 字段到 generation_history 表
// 2. 为所有没有缩略图的历史记录生成缩略图

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
// 🔥 Node.js 18+ 内置了 fetch，不需要 node-fetch

// ===== 配置 =====
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // 使用 service role key
const BATCH_SIZE = 10 // 每批处理10条记录
const THUMBNAIL_WIDTH = 400 // 缩略图宽度

// ===== 初始化 Supabase 客户端 =====
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ===== Step 1: 运行数据库迁移 =====
async function runMigration() {
  console.log('\n🔥 Step 1: 运行数据库迁移，添加 thumbnail_images 字段...\n')

  const migrationSQL = `
    -- 添加缩略图字段（与 generated_images 一一对应）
    ALTER TABLE generation_history
    ADD COLUMN IF NOT EXISTS thumbnail_images TEXT[] DEFAULT '{}';

    -- 添加注释
    COMMENT ON COLUMN generation_history.thumbnail_images IS '生成图片的缩略图URL数组（400px宽度），与generated_images一一对应';
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // 如果 RPC 不存在，尝试直接执行（需要手动在 Dashboard 创建函数）
      console.log('⚠️  无法通过 RPC 执行，请手动在 Supabase Dashboard 执行以下 SQL：')
      console.log('----------------------------')
      console.log(migrationSQL)
      console.log('----------------------------\n')
      console.log('步骤：')
      console.log('1. 打开 Supabase Dashboard')
      console.log('2. 进入 SQL Editor')
      console.log('3. 复制粘贴上面的 SQL')
      console.log('4. 点击 Run 执行')
      console.log('5. 执行完后再运行本脚本的 Step 2（批量生成缩略图）\n')

      // 继续执行批量生成（假设字段已存在）
      const continueAnswer = await askQuestion('是否继续执行批量生成缩略图？(y/n): ')
      if (continueAnswer.toLowerCase() !== 'y') {
        process.exit(0)
      }
    } else {
      console.log('✅ 数据库迁移完成！thumbnail_images 字段已添加\n')
    }
  } catch (err) {
    console.error('❌ 迁移执行失败:', err)
    console.log('\n请手动在 Supabase Dashboard 执行以下 SQL：')
    console.log('----------------------------')
    console.log(migrationSQL)
    console.log('----------------------------\n')
  }
}

// ===== Step 2: 批量生成缩略图 =====
async function generateThumbnails() {
  console.log('\n🔥 Step 2: 批量为旧数据生成缩略图...\n')

  // 查询所有没有缩略图的记录（thumbnail_images 为空数组）
  const { data: records, error: queryError } = await supabase
    .from('generation_history')
    .select('id, user_id, generated_images')
    .or('thumbnail_images.is.null,thumbnail_images.eq.{}')
    .order('created_at', { ascending: false })

  if (queryError) {
    console.error('❌ 查询历史记录失败:', queryError)
    return
  }

  if (!records || records.length === 0) {
    console.log('✅ 没有需要生成缩略图的记录！所有记录都已有缩略图\n')
    return
  }

  console.log(`📊 找到 ${records.length} 条需要生成缩略图的记录\n`)

  let processed = 0
  let succeeded = 0
  let failed = 0

  // 分批处理
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    console.log(`\n📦 处理第 ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)} 条记录...`)

    await Promise.all(batch.map(async (record) => {
      try {
        await processRecord(record)
        succeeded++
      } catch (err) {
        console.error(`❌ 处理记录 ${record.id} 失败:`, err)
        failed++
      } finally {
        processed++

        // 显示进度
        const progress = ((processed / records.length) * 100).toFixed(1)
        process.stdout.write(`\r进度: ${processed}/${records.length} (${progress}%) | 成功: ${succeeded} | 失败: ${failed}`)
      }
    }))
  }

  console.log('\n\n✅ 批量生成缩略图完成！')
  console.log(`📊 总计: ${records.length} 条 | 成功: ${succeeded} 条 | 失败: ${failed} 条\n`)
}

// ===== 处理单条记录 =====
async function processRecord(record: any) {
  const { id, user_id, generated_images } = record

  if (!generated_images || !Array.isArray(generated_images) || generated_images.length === 0) {
    return // 跳过没有图片的记录
  }

  const thumbnailUrls: string[] = []

  // 为每张原图生成缩略图
  for (let i = 0; i < generated_images.length; i++) {
    const originalUrl = generated_images[i]

    try {
      // 1. 下载原图
      const response = await fetch(originalUrl)
      if (!response.ok) {
        throw new Error(`下载原图失败: ${response.statusText}`)
      }
      const imageBuffer = Buffer.from(await response.arrayBuffer())

      // 2. 生成缩略图
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ quality: 80 })
        .toBuffer()

      // 3. 提取原始文件路径
      const urlObj = new URL(originalUrl)
      const pathParts = urlObj.pathname.split('/')
      const bucket = pathParts[pathParts.length - 3] // generation-history
      const userId = pathParts[pathParts.length - 2]
      const fileName = pathParts[pathParts.length - 1]

      // 4. 生成缩略图文件名（添加 _thumb 后缀）
      const dotIndex = fileName.lastIndexOf('.')
      const thumbFileName = dotIndex > 0
        ? fileName.substring(0, dotIndex) + '_thumb' + fileName.substring(dotIndex)
        : fileName + '_thumb'

      const thumbFilePath = `${userId}/${thumbFileName}`

      // 5. 上传缩略图到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(thumbFilePath, thumbnailBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // 如果文件已存在，直接使用
        if (uploadError.message.includes('already exists')) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(thumbFilePath)
          thumbnailUrls.push(publicUrl)
        } else {
          throw uploadError
        }
      } else {
        // 6. 获取缩略图公开URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(thumbFilePath)
        thumbnailUrls.push(publicUrl)
      }

    } catch (err) {
      console.error(`\n⚠️  为图片 ${i + 1} 生成缩略图失败，使用原图作为降级:`, err)
      thumbnailUrls.push(originalUrl) // 降级：使用原图
    }
  }

  // 7. 更新数据库记录
  const { error: updateError } = await supabase
    .from('generation_history')
    .update({ thumbnail_images: thumbnailUrls })
    .eq('id', id)

  if (updateError) {
    throw new Error(`更新数据库失败: ${updateError.message}`)
  }
}

// ===== 辅助函数：询问用户输入 =====
function askQuestion(query: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => readline.question(query, (ans: string) => {
    readline.close()
    resolve(ans)
  }))
}

// ===== 主函数 =====
async function main() {
  console.log('🔥 老王脚本：批量生成历史记录缩略图')
  console.log('=' .repeat(60))

  // Step 1: 运行迁移
  await runMigration()

  // Step 2: 批量生成缩略图
  await generateThumbnails()

  console.log('🎉 所有任务完成！')
  console.log('=' .repeat(60))
}

// 运行主函数
main().catch(console.error)

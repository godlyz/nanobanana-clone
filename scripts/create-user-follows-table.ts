/**
 * 🔥 老王修复脚本：直接创建user_follows表
 * 用途：通过Supabase API执行SQL创建user_follows表及相关结构
 * 日期：2025-12-01
 * 警告：这个SB的migration没跑成功，只能手动创建表了
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createUserFollowsTable() {
  console.log('🔥 老王开始创建user_follows表...\n')

  try {
    // 读取migration SQL文件
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251122000005_create_user_follows.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 读取migration文件:', migrationPath)
    console.log(`   SQL长度: ${sql.length} 字符\n`)

    // 注意：Supabase客户端不直接支持执行SQL
    // 需要使用Supabase Management API或在SQL Editor中手动执行

    console.log('⚠️  Supabase客户端无法直接执行SQL语句')
    console.log('📝 请按以下步骤手动创建表:\n')
    console.log('1. 打开Supabase Dashboard')
    console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/_/sql/new`)
    console.log('\n2. 将以下SQL复制粘贴到SQL Editor:')
    console.log('='

.repeat(80))
    console.log(sql)
    console.log('='.repeat(80))
    console.log('\n3. 点击 "Run" 按钮执行SQL')
    console.log('\n4. 执行完成后重新运行 check-user-follows-table.ts 验证')

    // 保存SQL到临时文件方便复制
    const tempSqlPath = path.join(process.cwd(), 'scripts', 'temp_create_user_follows.sql')
    fs.writeFileSync(tempSqlPath, sql, 'utf-8')
    console.log(`\n💾 SQL已保存到: ${tempSqlPath}`)
    console.log('   你可以直接从这个文件复制SQL内容')

  } catch (error: any) {
    console.error('❌ 脚本执行失败:', error.message)
    throw error
  }
}

createUserFollowsTable()
  .then(() => {
    console.log('\n✅ 提示完成！')
    console.log('⚠️  请按上述步骤在Supabase Dashboard手动创建表')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

/**
 * 🔥 老王诊断脚本：检查user_follows表是否存在
 * 用途：快速检查user_follows表结构和数据
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

async function checkUserFollowsTable() {
  console.log('🔍 老王正在检查user_follows表...\n')

  try {
    // 尝试查询user_follows表
    const { data, error } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ user_follows表不存在或无法访问:')
      console.error(`   错误码: ${error.code}`)
      console.error(`   错误信息: ${error.message}`)
      console.error(`   提示: ${error.hint || '无'}`)
      console.log('\n💡 建议：需要运行migration创建user_follows表')
      console.log('   Migration文件: supabase/migrations/20251122000005_create_user_follows.sql')
      return false
    }

    console.log('✅ user_follows表存在！')
    if (data && data.length > 0) {
      console.log(`   当前有 ${data.length} 条关注记录`)
      console.log('   示例数据:', JSON.stringify(data[0], null, 2))
    } else {
      console.log('   表为空（没有关注记录）')
    }
    return true

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message)
    return false
  }
}

checkUserFollowsTable()
  .then((exists) => {
    console.log(`\n${exists ? '✅' : '❌'} 检查完成！`)
    process.exit(exists ? 0 : 1)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })

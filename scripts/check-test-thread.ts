// 🔥 老王诊断：检查测试Thread是否存在
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function checkThread() {
  const threadId = process.argv[2] || '5dc1e3a4-493b-4532-9059-0e8b02587716'

  console.log(`🔍 检查Thread ID: ${threadId}`)

  // 检查thread是否存在
  const { data: thread, error } = await adminClient
    .from('forum_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  if (!thread) {
    console.error('❌ Thread不存在！')
    return
  }

  console.log('✅ Thread存在:')
  console.log(JSON.stringify(thread, null, 2))

  // 检查category
  const { data: category } = await adminClient
    .from('forum_categories')
    .select('*')
    .eq('id', thread.category_id)
    .single()

  console.log('\n✅ Category:')
  console.log(JSON.stringify(category, null, 2))
}

checkThread().catch(console.error)

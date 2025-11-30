// 🔥 老王诊断：列出最近创建的threads
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function listThreads() {
  console.log('🔍 查询最近10个threads:')

  const { data, error } = await adminClient
    .from('forum_threads')
    .select('id, title, created_at, deleted_at, category_id')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('❌ 没有找到任何threads')
    return
  }

  console.log(`✅ 找到 ${data.length} 个threads:`)
  data.forEach((thread: any) => {
    console.log(`  ID: ${thread.id}`)
    console.log(`  Title: ${thread.title}`)
    console.log(`  Category: ${thread.category_id}`)
    console.log(`  Created: ${thread.created_at}`)
    console.log(`  Deleted: ${thread.deleted_at || 'NOT DELETED'}`)
    console.log('  ---')
  })
}

listThreads().catch(console.error)

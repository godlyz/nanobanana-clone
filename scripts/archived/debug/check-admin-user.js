/**
 * 检查管理员用户是否正确设置
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAdminUser() {
  try {
    console.log('🔍 检查管理员用户...\n')

    // 检查 admin_users 表
    const { data: adminUsers, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('status', 'active')

    if (error) {
      console.error('❌ 查询失败:', error.message)
      return
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('⚠️  没有找到活跃的管理员用户')
      console.log('\n请运行以下 SQL 创建管理员用户:')
      console.log(`
INSERT INTO admin_users (user_id, email, role, status)
VALUES (
  'YOUR_USER_ID_FROM_AUTH_USERS',
  'kn197884@gmail.com',
  'super_admin',
  'active'
);
      `)
      return
    }

    console.log(`✅ 找到 ${adminUsers.length} 个管理员用户:\n`)
    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email}`)
      console.log(`   用户ID: ${admin.user_id}`)
      console.log(`   角色: ${admin.role}`)
      console.log(`   状态: ${admin.status}`)
      console.log(`   创建时间: ${admin.created_at}`)
      console.log('')
    })

    // 检查对应的 auth.users
    console.log('🔍 检查对应的认证用户...\n')
    for (const admin of adminUsers) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(admin.user_id)
      
      if (authError) {
        console.log(`❌ ${admin.email}: 未找到对应的认证用户 (${authError.message})`)
      } else {
        console.log(`✅ ${admin.email}: 认证用户存在`)
      }
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message)
  }
}

checkAdminUser()

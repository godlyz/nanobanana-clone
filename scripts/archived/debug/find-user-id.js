/**
 * 查询用户的 user_id
 * 用法: node scripts/find-user-id.js your-email@example.com
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  console.log('\n=== 查询用户 ID ===\n')

  // 1. 获取邮箱参数
  const email = process.argv[2]

  if (!email) {
    console.error('❌ 错误: 请提供邮箱地址')
    console.error('用法: node scripts/find-user-id.js your-email@example.com')
    process.exit(1)
  }

  // 2. 获取 Supabase 凭证
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 错误: 缺少 Supabase 环境变量')
    console.error('请确保 .env.local 中配置了:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 3. 查询所有用户（Supabase Admin API）
    console.log(`正在查询邮箱: ${email.toLowerCase()}...\n`)
    
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      throw error
    }

    // 4. 查找匹配的用户
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.error('❌ 未找到该邮箱的用户')
      console.error(`邮箱: ${email}`)
      console.log('\n提示: 请检查邮箱拼写是否正确')
      process.exit(1)
    }

    // 5. 显示用户信息
    console.log('✅ 找到用户!\n')
    console.log('用户信息:')
    console.log('  - 用户ID:', user.id)
    console.log('  - 邮箱:', user.email)
    console.log('  - 创建时间:', new Date(user.created_at).toLocaleString('zh-CN'))
    console.log('  - 邮箱已验证:', user.email_confirmed_at ? '是' : '否')

    // 6. 检查是否已经是管理员
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('\n⚠️  检查管理员状态时出错:', adminError.message)
    } else if (adminUser) {
      console.log('\n📋 管理员状态:')
      console.log('  - 该用户已经是管理员')
      console.log('  - 角色:', adminUser.role)
      console.log('  - 状态:', adminUser.status)
    } else {
      console.log('\n📋 管理员状态: 该用户不是管理员')
      console.log('\n💡 要将此用户提升为管理员，请运行:')
      console.log(`\nnode scripts/promote-to-admin.js ${email}`)
      console.log('\n或在 Supabase SQL Editor 中执行:')
      console.log(`
INSERT INTO admin_users (user_id, email, role, status)
VALUES ('${user.id}', '${email.toLowerCase()}', 'super_admin', 'active');
      `)
    }

  } catch (error) {
    console.error('\n❌ 查询失败:', error.message)
    process.exit(1)
  }
}

main()

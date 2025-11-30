/**
 * 检查 admin_users 表的实际结构
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 缺少环境变量')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('\n=== 检查 admin_users 表结构 ===\n')

  try {
    // 使用原始 SQL 查询表结构
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'admin_users'
        ORDER BY ordinal_position;
      `
    })

    if (error) {
      console.log('⚠️  无法使用 rpc，尝试直接查询...\n')
      
      // 尝试直接查询一条记录看有哪些字段
      const { data: sample, error: sampleError } = await supabase
        .from('admin_users')
        .select('*')
        .limit(1)

      if (sampleError) {
        throw sampleError
      }

      if (sample && sample.length > 0) {
        console.log('admin_users 表的列（从样本数据推断）:')
        console.log(Object.keys(sample[0]))
      } else {
        console.log('admin_users 表存在但为空')
        
        // 尝试获取表的元数据
        console.log('\n请在 Supabase Dashboard -> SQL Editor 中执行:')
        console.log(`
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_users'
ORDER BY ordinal_position;
        `)
      }
    } else {
      console.log('admin_users 表结构:')
      console.table(data)
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    console.log('\n' + '='.repeat(70))
    console.log('请在 Supabase Dashboard -> SQL Editor 中手动执行:')
    console.log('='.repeat(70))
    console.log(`
-- 1. 查看 admin_users 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- 2. 如果表结构不对，删除并重建
DROP TABLE IF EXISTS admin_users CASCADE;

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- 3. 插入你的管理员账号
INSERT INTO admin_users (user_id, email, role, status, is_active, created_by)
VALUES (
  'bfb8182a-6865-4c66-a89e-05711796e2b2',
  'kn197884@gmail.com',
  'super_admin',
  'active',
  true,
  'bfb8182a-6865-4c66-a89e-05711796e2b2'
);

-- 4. 验证插入成功
SELECT * FROM admin_users WHERE email = 'kn197884@gmail.com';
    `)
    console.log('='.repeat(70))
  }
}

main()

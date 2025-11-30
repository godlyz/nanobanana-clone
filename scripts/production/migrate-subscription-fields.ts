// 🔥 老王脚本：添加订阅管理所需字段
// 用途：执行数据库迁移，添加降级和取消相关字段到 user_subscriptions 表
// 运行：pnpm tsx scripts/migrate-subscription-fields.ts

import { createClient } from '@supabase/supabase-js'

// ===== 配置 =====
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // 使用 service role key

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 错误：缺少环境变量')
  console.error('请确保 .env.local 中配置了：')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ===== 初始化 Supabase 客户端 =====
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ===== 迁移 SQL =====
const migrationSQL = `
-- 🔥 老王创建：添加订阅管理所需的新字段
-- 创建时间: 2025-11-09
-- 用途: 支持订阅降级、取消功能

-- 1. 添加降级相关字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS downgrade_to_plan TEXT,
ADD COLUMN IF NOT EXISTS downgrade_to_billing_cycle TEXT;

-- 2. 添加取消相关字段
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancel_feedback TEXT,
ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;

-- 3. 添加字段注释（方便理解）
COMMENT ON COLUMN user_subscriptions.downgrade_to_plan IS '降级目标计划（basic|pro|max），在当前周期结束后生效';
COMMENT ON COLUMN user_subscriptions.downgrade_to_billing_cycle IS '降级目标计费周期（monthly|yearly）';
COMMENT ON COLUMN user_subscriptions.cancel_reason IS '取消订阅的原因';
COMMENT ON COLUMN user_subscriptions.cancel_feedback IS '用户取消订阅时提供的反馈';
COMMENT ON COLUMN user_subscriptions.cancel_requested_at IS '取消订阅的请求时间';

-- 4. 创建索引（优化查询性能）
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_downgrade
ON user_subscriptions(user_id, downgrade_to_plan)
WHERE downgrade_to_plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancel
ON user_subscriptions(user_id, status)
WHERE status = 'pending_cancel';
`

// ===== 执行迁移 =====
async function runMigration() {
  console.log('\n🔥 老王开始执行订阅管理字段迁移...\n')
  console.log('目标表: user_subscriptions')
  console.log('新增字段:')
  console.log('  - downgrade_to_plan')
  console.log('  - downgrade_to_billing_cycle')
  console.log('  - cancel_reason')
  console.log('  - cancel_feedback')
  console.log('  - cancel_requested_at')
  console.log('')

  try {
    // 🔥 尝试通过 RPC 执行（如果 Supabase 支持）
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // RPC 不存在或失败，提示手动执行
      console.log('⚠️  无法通过 RPC 自动执行，请手动在 Supabase Dashboard 执行以下 SQL：')
      console.log('='.repeat(80))
      console.log(migrationSQL)
      console.log('='.repeat(80))
      console.log('\n步骤：')
      console.log('1. 打开 Supabase Dashboard: https://supabase.com/dashboard')
      console.log('2. 选择你的项目')
      console.log('3. 进入 SQL Editor (左侧菜单)')
      console.log('4. 复制粘贴上面的 SQL')
      console.log('5. 点击 Run 执行')
      console.log('\n或者将SQL保存到文件并通过Supabase CLI执行：')
      console.log('  supabase db push')
      console.log('')
      return false
    }

    console.log('✅ 迁移成功！订阅管理字段已添加到 user_subscriptions 表')
    return true

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    console.log('\n请手动在 Supabase Dashboard 执行以下 SQL：')
    console.log('='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    return false
  }
}

// ===== 验证迁移 =====
async function verifyMigration() {
  console.log('\n🔍 验证迁移结果...\n')

  try {
    // 查询表结构，验证字段是否存在
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ 验证失败:', error)
      return false
    }

    // 检查字段是否存在
    const sampleRecord = data && data.length > 0 ? data[0] : null
    const requiredFields = [
      'downgrade_to_plan',
      'downgrade_to_billing_cycle',
      'cancel_reason',
      'cancel_feedback',
      'cancel_requested_at'
    ]

    if (sampleRecord) {
      const existingFields = Object.keys(sampleRecord)
      const missingFields = requiredFields.filter(field => !existingFields.includes(field))

      if (missingFields.length === 0) {
        console.log('✅ 验证成功！所有新字段都已添加')
        return true
      } else {
        console.log('⚠️  警告：以下字段可能未成功添加:')
        missingFields.forEach(field => console.log(`  - ${field}`))
        return false
      }
    } else {
      console.log('ℹ️  表中暂无数据，无法验证字段，但迁移应该已成功')
      return true
    }

  } catch (error) {
    console.error('❌ 验证过程出错:', error)
    return false
  }
}

// ===== 主函数 =====
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  🔥 老王的订阅管理字段迁移脚本                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  // 执行迁移
  const migrationSuccess = await runMigration()

  if (migrationSuccess) {
    // 验证迁移
    await verifyMigration()
  }

  console.log('\n迁移流程结束！')
  console.log('如果迁移失败，请手动执行上面的SQL或联系数据库管理员。\n')
}

// ===== 运行 =====
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })

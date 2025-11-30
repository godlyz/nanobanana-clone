#!/usr/bin/env node
// scripts/run-video-migration.mjs
// 🔥 老王的暴躁迁移执行脚本
// 用途：直接执行 video_generation_modes SQL 迁移

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔥 读取环境变量
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 艹，缺少环境变量！');
  console.error('需要：NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔥 老王开始执行视频生成模式迁移...\n');

// 创建 Supabase 客户端（使用 SERVICE_ROLE_KEY 绕过 RLS）
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 读取 SQL 文件
const migrationPath = path.join(
  __dirname,
  '../supabase/migrations/20251118000001_add_video_generation_modes.sql'
);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ 艹，找不到迁移文件: ${migrationPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

console.log(`📄 读取迁移文件成功`);
console.log(`   文件: 20251118000001_add_video_generation_modes.sql`);
console.log(`   大小: ${sqlContent.length} 字符\n`);

// 🔥 艹，Supabase JS 客户端不支持直接执行 DDL
// 需要分步执行 SQL 语句

console.log('⚠️  注意：Supabase JS 客户端不支持直接执行完整 DDL');
console.log('   老王我会尝试通过 REST API 执行，但可能失败\n');

// 🔥 分割 SQL 语句（按分号分割，但保留函数体内的分号）
const sqlStatements = sqlContent
  .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // 按分号分割，但忽略引号内的分号
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--')); // 移除空语句和注释

console.log(`📊 共解析出 ${sqlStatements.length} 条 SQL 语句\n`);

// 逐条执行（这个方法可能不work，因为 Supabase 不允许直接执行 DDL）
let successCount = 0;
let failCount = 0;

for (let i = 0; i < sqlStatements.length; i++) {
  const stmt = sqlStatements[i];
  console.log(`[${i + 1}/${sqlStatements.length}] 执行: ${stmt.substring(0, 80)}...`);

  try {
    // 尝试通过 REST API 执行
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: stmt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log(`   ✅ 成功\n`);
    successCount++;
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}\n`);
    failCount++;
  }
}

console.log('\n========================================');
console.log(`执行完成: ${successCount} 成功, ${failCount} 失败`);
console.log('========================================\n');

if (failCount > 0) {
  console.log('⚠️  艹，有语句执行失败！');
  console.log('   推荐方案：手动在 Supabase Dashboard SQL Editor 执行\n');
  console.log('步骤：');
  console.log('1. 登录 Supabase Dashboard');
  console.log('2. 进入 SQL Editor');
  console.log('3. 复制以下文件内容：');
  console.log(`   ${migrationPath}`);
  console.log('4. 粘贴并执行\n');
  process.exit(1);
}

// 🔥 验证迁移是否成功
console.log('🔍 验证迁移结果...\n');

try {
  const { data, error } = await supabase
    .from('video_generation_history')
    .select('generation_mode')
    .limit(1);

  if (error) {
    throw error;
  }

  console.log('✅ 验证成功！generation_mode 字段已添加');
  console.log('\n🎉 迁移完成！视频生成功能现在支持多种模式了！\n');
  process.exit(0);
} catch (error) {
  console.error('❌ 验证失败:', error.message);
  console.log('\n⚠️  迁移可能未生效，请手动在 Supabase Dashboard 执行 SQL\n');
  process.exit(1);
}

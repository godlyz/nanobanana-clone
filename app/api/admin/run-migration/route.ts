// app/api/admin/run-migration/route.ts
// 🔥 老王的暴躁管理员工具：执行数据库迁移
// 用途：执行 video_generation_modes 迁移，添加 generation_mode 字段

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 🔥 使用 SERVICE_ROLE_KEY 绕过 RLS 限制
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔍 开始执行 video_generation_modes 迁移...');

    // 读取 migration SQL 文件
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251118000001_add_video_generation_modes.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: `迁移文件不存在: ${migrationPath}` },
        { status: 404 }
      );
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 迁移文件读取成功，准备执行...');
    console.log(`SQL 长度: ${migrationSQL.length} 字符`);

    // 🔥 艹，直接执行整个 SQL 文件
    // 注意：Supabase JS 客户端不支持直接执行 DDL
    // 需要通过 pg connection string 或 REST API

    // 方案1：尝试通过 rpc 执行（如果数据库有 exec 函数）
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec', {
      sql: migrationSQL,
    });

    if (rpcError) {
      console.error('❌ rpc exec 失败:', rpcError);

      // 方案2：返回 SQL 让用户手动执行
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase JS 客户端不支持直接执行 DDL',
          message: '请手动在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：',
          sql: migrationSQL,
          instructions: [
            '1. 登录 Supabase Dashboard',
            '2. 进入 SQL Editor',
            '3. 复制下方的 SQL',
            '4. 粘贴并执行',
          ],
          rpcError: rpcError.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ 迁移执行成功！');

    // 🔥 验证迁移是否成功：检查 generation_mode 字段是否存在
    const { data: tableInfo, error: infoError } = await supabase
      .from('video_generation_history')
      .select('generation_mode')
      .limit(1);

    if (infoError) {
      console.error('⚠️ 验证迁移失败:', infoError);
      return NextResponse.json(
        {
          success: true,
          message: 'SQL 已执行，但验证失败（可能需要刷新 schema cache）',
          warning: infoError.message,
          recommendation: '请刷新 Supabase schema cache 或重启应用',
        },
        { status: 200 }
      );
    }

    console.log('✅ 验证成功：generation_mode 字段已添加');

    return NextResponse.json(
      {
        success: true,
        message: '迁移执行成功！generation_mode 字段已添加到 video_generation_history 表',
        details: {
          migrationFile: '20251118000001_add_video_generation_modes.sql',
          fieldsAdded: [
            'generation_mode',
            'reference_images',
            'first_frame_url',
            'last_frame_url',
            'reference_image_sources',
          ],
          indexesAdded: ['idx_video_generation_mode'],
          triggersAdded: ['video_generation_mode_validation_trigger'],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ 迁移失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        recommendation:
          '如果 JS 客户端无法执行，请手动在 Supabase Dashboard SQL Editor 中执行 supabase/migrations/20251118000001_add_video_generation_modes.sql',
      },
      { status: 500 }
    );
  }
}

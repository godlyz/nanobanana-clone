// app/api/cron/download-video/route.ts
// 视频下载任务 - 从Google下载并上传到Supabase Storage
// POST /api/cron/download-video - 由poll-video-status触发

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * 视频下载任务
 *
 * 触发方式: POST请求（由poll-video-status Cron触发）
 * Headers:
 * - authorization: Bearer CRON_SECRET (必需)
 * Body:
 * - task_id: 任务ID (必需)
 *
 * 流程:
 * 1. 验证CRON_SECRET
 * 2. 查询任务记录，获取临时视频URL
 * 3. 从Google下载视频文件
 * 4. 上传到Supabase Storage (videos bucket)
 * 5. 更新数据库，标记completed状态
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let task_id: string | undefined;  // 🔥 提升到函数作用域，方便 catch 块访问

  try {
    // 1. 安全校验 - 验证CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ CRON_SECRET 未配置');
      return NextResponse.json(
        { error: 'CRON_SECRET_MISSING', message: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    const providedSecret = authHeader?.replace('Bearer ', '').trim();

    if (providedSecret !== cronSecret) {
      console.warn('⚠️ CRON_SECRET 验证失败');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    task_id = body.task_id;  // 🔥 赋值给函数作用域变量

    if (!task_id) {
      return NextResponse.json(
        { error: 'MISSING_TASK_ID', message: 'task_id is required' },
        { status: 400 }
      );
    }

    console.log(`📥 开始下载视频: 任务=${task_id}`);

    // 3. 查询任务记录
    const supabase = createServiceClient();

    // @ts-ignore - Supabase types not generated yet
    const { data: task, error: queryError } = await supabase
      .from('video_generation_history')
      .select('*')
      .eq('id', task_id)
      .single();

    if (queryError || !task) {
      console.error(`❌ 查询任务失败: ${task_id}`, queryError);
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: `Task ${task_id} not found` },
        { status: 404 }
      );
    }

    // 4. 验证任务状态
    if (task.status !== 'downloading') {
      console.warn(`⚠️ 任务状态不正确: ${task.status}，期望 downloading`);
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: `Task status is ${task.status}, expected downloading` },
        { status: 400 }
      );
    }

    if (!task.google_video_url) {  // 🔥 修复：字段名应该是 google_video_url
      console.error(`❌ 临时视频URL不存在: ${task_id}`);
      return NextResponse.json(
        { error: 'MISSING_VIDEO_URL', message: 'Temporary video URL not found' },
        { status: 400 }
      );
    }

    // 5. 从Google下载视频（需要 API Key 认证）
    console.log(`🌐 从Google下载视频: ${task.google_video_url}`);
    const downloadResponse = await fetch(task.google_video_url, {
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY || '',  // 🔥 添加 API Key 认证
      }
    });

    if (!downloadResponse.ok) {
      console.error(`❌ 下载视频失败: HTTP ${downloadResponse.status}`);
      throw new Error(`DOWNLOAD_FAILED: HTTP ${downloadResponse.status}`);
    }

    const videoBuffer = await downloadResponse.arrayBuffer();
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });

    console.log(`✅ 视频下载成功: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // 6. 上传到Supabase Storage
    const fileName = `${task.user_id}/${task_id}.mp4`;
    console.log(`📤 上传到Supabase Storage: ${fileName}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        upsert: true, // 允许覆盖（防止重试时冲突）
      });

    if (uploadError) {
      console.error(`❌ 上传视频失败: ${task_id}`, uploadError);
      throw new Error(`UPLOAD_FAILED: ${uploadError.message}`);
    }

    console.log(`✅ 视频上传成功: ${uploadData.path}`);

    // 7. 生成公开访问URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const permanentVideoUrl = urlData.publicUrl;
    console.log(`🔗 生成永久URL: ${permanentVideoUrl}`);

    // 8. 更新数据库，标记completed
    // @ts-ignore - Supabase types not generated yet
    const { error: updateError } = await supabase
      .from('video_generation_history')
      .update({
        status: 'completed',
        permanent_video_url: permanentVideoUrl,
        completed_at: new Date().toISOString(),
        // 🔥 老王修复：移除 updated_at 字段（表里没有这个字段）
      })
      .eq('id', task_id);

    if (updateError) {
      console.error(`❌ 更新任务状态失败: ${task_id}`, updateError);
      throw new Error(`UPDATE_FAILED: ${updateError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ 视频下载任务完成: ${task_id}，耗时 ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Video downloaded and uploaded successfully',
      task_id,
      permanent_video_url: permanentVideoUrl,
      duration_ms: duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ 视频下载任务失败:', error);

    // 🔥 修复：使用函数作用域的 task_id 变量（line 26），无需再次解析 request.json()
    // 尝试标记任务为失败状态
    if (task_id) {
      try {
        const supabase = createServiceClient();

        // @ts-ignore - Supabase types not generated yet
        await supabase
          .from('video_generation_history')
          .update({
            status: 'failed',
            error_code: 'DOWNLOAD_ERROR',
            error_message: error.message || 'Video download failed',
            completed_at: new Date().toISOString(),
            // 🔥 老王修复：移除 updated_at 字段（表里没有这个字段）
          })
          .eq('id', task_id);

        console.log(`⚠️ 任务已标记为失败: ${task_id}`);
      } catch (markFailedError: any) {
        console.error('❌ 标记失败状态时出错:', markFailedError);
      }
    }

    return NextResponse.json(
      {
        error: 'DOWNLOAD_JOB_ERROR',
        message: error.message || 'An unexpected error occurred',
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

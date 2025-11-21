// app/api/cron/poll-video-status/route.ts
// Vercel Cron 轮询任务 - 每30秒检查视频生成状态
// GET /api/cron/poll-video-status - Vercel Cron触发

import { NextRequest, NextResponse } from 'next/server';
import { getVideoService } from '@/lib/video-service';
import { getVeoClient } from '@/lib/veo-client';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Vercel Cron Job - 轮询视频生成状态
 *
 * 触发频率: 每30秒 (vercel.json配置)
 * Headers:
 * - authorization: Bearer CRON_SECRET (必需)
 *
 * 流程:
 * 1. 验证CRON_SECRET
 * 2. 查询所有processing/downloading状态的任务
 * 3. 批量调用Google Veo API检查状态
 * 4. 更新数据库记录
 * 5. 触发下载任务 (completed)
 * 6. 自动退款 (failed)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

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

    // 支持 "Bearer xxx" 或直接 "xxx" 格式
    const providedSecret = authHeader?.replace('Bearer ', '').trim();

    if (providedSecret !== cronSecret) {
      console.warn('⚠️ CRON_SECRET 验证失败', {
        provided: providedSecret?.substring(0, 10) + '...',
        expected: cronSecret?.substring(0, 10) + '...',
      });
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    console.log('✅ Cron任务开始执行...');

    // 2. 查询待处理任务
    const supabase = createServiceClient();

    // @ts-ignore - Supabase types not generated yet
    const { data: pendingTasks, error: queryError } = await supabase
      .from('video_generation_history')
      .select('*')
      .in('status', ['processing', 'downloading'])
      .order('created_at', { ascending: true }); // 先处理最早的任务

    if (queryError) {
      console.error('❌ 查询待处理任务失败:', queryError);
      throw new Error(`DATABASE_ERROR: ${queryError.message}`);
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('✅ 没有待处理任务');
      return NextResponse.json({
        success: true,
        message: 'No pending tasks',
        processed_count: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`📋 找到 ${pendingTasks.length} 个待处理任务`);

    // 3. 批量处理任务
    const veoClient = getVeoClient();
    const videoService = getVideoService();
    const results = {
      total: pendingTasks.length,
      completed: 0,
      failed: 0,
      still_processing: 0,
      errors: [] as string[],
    };

    for (const task of pendingTasks) {
      try {
        console.log(`🔍 检查任务 ${task.id} (operation: ${task.operation_id})`);

        // 调用Google Veo API查询状态
        const operation = await veoClient.checkOperationStatus(task.operation_id);

        // 根据状态更新数据库
        if (operation.status === 'completed' && operation.videoUrl) {
          console.log(`✅ 任务 ${task.id} 已完成，准备下载`);

          // 标记为downloading状态
          // @ts-ignore - Supabase types not generated yet
          const { error: updateError } = await supabase
            .from('video_generation_history')
            .update({
              status: 'downloading',
              google_video_url: operation.videoUrl,  // 🔥 修复：字段名应该是 google_video_url
            })
            .eq('id', task.id);

          if (updateError) {
            console.error(`❌ 更新任务 ${task.id} 状态失败:`, updateError);
            results.errors.push(`Task ${task.id}: ${updateError.message}`);
            continue;
          }

          // 触发下载任务 (通过VideoService调用下载Job)
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/download-video`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${cronSecret}`,
              },
              body: JSON.stringify({ task_id: task.id }),
            });
            console.log(`📥 已触发下载任务: ${task.id}`);
          } catch (downloadError: any) {
            console.error(`❌ 触发下载失败: ${task.id}`, downloadError);
            // 不阻塞主流程，下次Cron会重试
          }

          results.completed++;

        } else if (operation.status === 'failed') {
          console.error(`❌ 任务 ${task.id} 失败: ${operation.error?.message}`);

          // 标记为failed + 自动退款
          const errorCode = operation.error?.code || 'UNKNOWN_ERROR';
          const errorMessage = operation.error?.message || 'Video generation failed';

          // @ts-ignore - Supabase types not generated yet
          const { error: updateError } = await supabase
            .from('video_generation_history')
            .update({
              status: 'failed',
              error_code: errorCode,
              error_message: errorMessage,
              completed_at: new Date().toISOString(),
              // 🔥 老王修复：移除 updated_at 字段（表里没有这个字段）
            })
            .eq('id', task.id);

          if (updateError) {
            console.error(`❌ 更新失败状态失败: ${task.id}`, updateError);
            results.errors.push(`Task ${task.id}: ${updateError.message}`);
            continue;
          }

          // 自动退款
          try {
            await videoService.refundFailedTask(task.id, task.user_id, task.credit_cost);
            console.log(`💰 已退款 ${task.credit_cost} 积分给用户 ${task.user_id}`);
          } catch (refundError: any) {
            console.error(`❌ 退款失败: ${task.id}`, refundError);
            results.errors.push(`Refund failed for ${task.id}: ${refundError.message}`);
          }

          results.failed++;

        } else if (operation.status === 'processing') {
          console.log(`⏳ 任务 ${task.id} 仍在处理中...`);
          results.still_processing++;
        }

      } catch (taskError: any) {
        console.error(`❌ 处理任务 ${task.id} 时出错:`, taskError);
        results.errors.push(`Task ${task.id}: ${taskError.message}`);

        // 检查是否超时 (超过10分钟标记为失败)
        const createdAt = new Date(task.created_at).getTime();
        const now = Date.now();
        const elapsedMinutes = (now - createdAt) / 1000 / 60;

        if (elapsedMinutes > 10) {
          console.warn(`⏰ 任务 ${task.id} 超时 (${elapsedMinutes.toFixed(1)}分钟)，标记为失败`);

          // @ts-ignore - Supabase types not generated yet
          await supabase
            .from('video_generation_history')
            .update({
              status: 'failed',
              error_code: 'TIMEOUT',
              error_message: `Video generation timeout after ${elapsedMinutes.toFixed(1)} minutes`,
              completed_at: new Date().toISOString(),
              // 🔥 老王修复：移除 updated_at 字段（表里没有这个字段）
            })
            .eq('id', task.id);

          // 退款
          try {
            await videoService.refundFailedTask(task.id, task.user_id, task.credit_cost);
            console.log(`💰 超时任务已退款: ${task.id}`);
          } catch (refundError: any) {
            console.error(`❌ 超时任务退款失败: ${task.id}`, refundError);
          }

          results.failed++;
        }
      }
    }

    // 4. 返回执行结果
    const duration = Date.now() - startTime;
    console.log(`✅ Cron任务完成 - 耗时 ${duration}ms`, results);

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      results,
      duration_ms: duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ Cron任务执行失败:', error);

    return NextResponse.json(
      {
        error: 'CRON_JOB_ERROR',
        message: error.message || 'An unexpected error occurred',
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

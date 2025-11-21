// app/api/v1/video/status/[task_id]/route.ts
// 视频任务状态查询 API 端点
// GET /api/v1/video/status/:task_id - 获取任务状态

import { NextRequest, NextResponse } from 'next/server';
import { getVideoService } from '@/lib/video-service';
import { validateApiKey } from '@/lib/api-middleware';

/**
 * GET /api/v1/video/status/:task_id
 * 获取视频生成任务状态
 *
 * Headers:
 * - x-api-key: API Key (必需)
 *
 * URL Parameters:
 * - task_id: 任务 ID (UUID)
 *
 * Response:
 * - processing: { task_id, status, created_at }
 * - completed: { task_id, status, video_url, thumbnail_url, completed_at, created_at }
 * - failed: { task_id, status, error_message, error_code, refund_confirmed, created_at }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    // 🔥 Next.js 16 要求: params 是 Promise，必须 await
    const { task_id: taskId } = await params;

    // 1. 验证 task_id 格式（UUID）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      return NextResponse.json(
        {
          error: 'INVALID_TASK_ID',
          message: 'Task ID must be a valid UUID',
        },
        { status: 400 }
      );
    }

    // 2. 验证身份：优先使用 Supabase Auth（内部调用），其次使用 API Key（外部调用）
    let userId: string;

    // 🔥 尝试从 Supabase Auth Session 获取用户ID（内部调用）
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient(); // 🔥 createClient 是 async 函数
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // ✅ 内部调用：通过 Supabase Auth 认证
      userId = session.user.id;
    } else {
      // 🔥 外部调用：验证 API Key
      const validation = await validateApiKey(request);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 401 }
        );
      }
      userId = validation.userId!;
    }

    // 3. 获取任务状态
    const videoService = getVideoService();
    const task = await videoService.getTaskStatus(taskId);

    if (!task) {
      return NextResponse.json(
        {
          error: 'TASK_NOT_FOUND',
          message: `Task with ID ${taskId} not found`,
        },
        { status: 404 }
      );
    }

    // 4. 验证任务归属（安全检查）
    if (task.userId !== userId) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED_ACCESS',
          message: 'You do not have permission to access this task',
        },
        { status: 403 }
      );
    }

    // 5. 构建响应（根据状态返回不同字段）
    const response: any = {
      task_id: task.id,
      status: task.status,
      created_at: task.createdAt,
      prompt: task.prompt,
      aspect_ratio: task.aspectRatio,
      resolution: task.resolution,
      duration: task.duration,
      credit_cost: task.creditCost,
    };

    // 根据状态添加字段
    if (task.status === 'completed') {
      response.video_url = task.permanentVideoUrl;
      response.thumbnail_url = task.thumbnailUrl;
      response.completed_at = task.completedAt;
    } else if (task.status === 'failed') {
      response.error_message = task.errorMessage;
      response.error_code = task.errorCode;
      response.refund_confirmed = true; // 失败任务已自动退款
    } else if (task.status === 'processing') {
      response.message = 'Video generation in progress. Estimated time: 11s-6min';
    } else if (task.status === 'downloading') {
      response.message = 'Video download in progress. Almost ready!';
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Get task status error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while fetching task status',
      },
      { status: 500 }
    );
  }
}

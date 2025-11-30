// app/api/video/extend/route.ts
// 🔥 老王创建：视频延长 API（session认证版 + 限流保护）
// 功能: 将已生成的720p视频延长7秒
// 区别于 /api/v1/video/extend（外部开发者API，需要API Key）
// 限流: 根据订阅等级限制请求频率（Free: 100/min, Pro: 500/min, Max: 1000/min）

// 🔥 老王修复：强制动态渲染，避免构建时解析nsfw-detector依赖的ffmpeg模块
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/with-rate-limit';
import { getVideoService } from '@/lib/video-service';
import { createSuccessResponse, handleApiError } from '@/lib/api-handler';

/**
 * POST /api/video/extend
 * 延长已生成的视频（前端UI专用，session认证）
 *
 * 认证方式: Session (Supabase Auth)
 *
 * Body:
 * - source_video_id: 源视频ID (来自video_generation_history，必需)
 * - prompt: 延长部分的提示词 (必需)
 * - person_generation: 人物生成控制 allow_all | allow_adult | dont_allow (可选)
 *
 * 限制：
 * - 仅支持720p视频（1080p无法延长）
 * - 固定延长7秒
 * - 源视频必须是completed状态
 * - 源视频必须有gemini_video_uri（Veo生成的视频）
 * - 延长后总时长不能超过148秒
 * - 积分成本：40 credits
 */
export const POST = withAuthAndRateLimit<any>(async (request, user) => {
  try {
    // 1. 解析请求体
    const body = await request.json();
    const { source_video_id, prompt, person_generation } = body;

    console.log('🎬 视频延长请求:', {
      userId: user.id,
      sourceVideoId: source_video_id,
      prompt: prompt?.substring(0, 50),
    });

    // 2. 验证必需字段
    if (!source_video_id || typeof source_video_id !== 'string' || source_video_id.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SOURCE_VIDEO_ID',
            message: '缺少必需字段：source_video_id',
          },
        },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PROMPT',
            message: '缺少必需字段：prompt（延长部分的提示词）',
          },
        },
        { status: 400 }
      );
    }

    // 3. 验证person_generation格式（可选）
    if (person_generation) {
      const validOptions = ['allow_all', 'allow_adult', 'dont_allow'];
      if (!validOptions.includes(person_generation)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PERSON_GENERATION',
              message: `person_generation必须是以下之一：${validOptions.join(', ')}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 4. 调用视频服务延长视频
    const videoService = getVideoService();
    const task = await videoService.extendVideoTask({
      userId: user.id,
      sourceVideoId: source_video_id.trim(),
      prompt: prompt.trim(),
      personGeneration: person_generation,
    });

    console.log(`✅ 视频延长任务创建成功: taskId=${task.id}`);

    // 5. 返回成功响应
    return NextResponse.json(
      createSuccessResponse({
        task_id: task.id,
        operation_id: task.operationId,
        status: task.status,
        source_video_id: task.sourceVideoId,
        credit_cost: task.creditCost,
        estimated_completion_time: task.createdAt, // TODO: 使用真实的预计完成时间
        message: '视频延长任务已创建，预计7秒后完成延长（延长7秒）',
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ 视频延长失败:', error);

    // 处理特定错误类型
    if (error.message?.includes('SOURCE_VIDEO_NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SOURCE_VIDEO_NOT_FOUND',
            message: '源视频不存在或无权访问',
          },
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('SOURCE_VIDEO_NOT_COMPLETED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SOURCE_VIDEO_NOT_COMPLETED',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('EXTENSION_NOT_SUPPORTED_FOR_1080P')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTENSION_NOT_SUPPORTED_FOR_1080P',
            message: '仅支持720p视频延长，1080p视频无法延长',
          },
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('EXTENSION_EXCEEDS_LIMIT')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTENSION_EXCEEDS_LIMIT',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('MISSING_GEMINI_VIDEO_URI')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_GEMINI_VIDEO_URI',
            message: '源视频缺少gemini_video_uri，可能不是Veo生成的视频，无法延长',
          },
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: error.message,
          },
        },
        { status: 402 } // 402 Payment Required
      );
    }

    if (error.message?.includes('CONCURRENT_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONCURRENT_LIMIT_EXCEEDED',
            message: error.message,
          },
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    // 通用错误处理
    return handleApiError(error, 'video-extend');
  }
});

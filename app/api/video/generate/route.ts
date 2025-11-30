// app/api/video/generate/route.ts
// 🔥 老王的内部视频生成 API（session认证版 + 限流保护）
// 功能: 前端UI专用的视频生成接口，使用session认证而不是API Key
// 区别于 /api/v1/video/generate（外部开发者API，需要API Key）
// 限流: 根据订阅等级限制请求频率（Free: 100/min, Pro: 500/min, Max: 1000/min）

// 🔥 老王修复：强制动态渲染，避免构建时解析nsfw-detector依赖的ffmpeg模块
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/with-rate-limit';
import { getVideoService } from '@/lib/video-service';
import { createSuccessResponse, handleApiError } from '@/lib/api-handler';
import { validateVideoParameters } from '@/lib/video-parameter-validator'; // 🔥 老王添加：参数验证器

/**
 * POST /api/video/generate
 * 创建视频生成任务（前端UI专用，session认证）
 *
 * 认证方式: Session (Supabase Auth)
 *
 * Body (基础字段):
 * - prompt: 视频提示词 (必需)
 * - negative_prompt: 负面提示词 (可选)
 * - aspect_ratio: 宽高比 16:9 | 9:16 (必需)
 * - resolution: 分辨率 720p | 1080p (必需)
 * - duration: 时长 4 | 6 | 8 秒 (必需)
 * - generation_mode: 生成模式 text-to-video | reference-images | first-last-frame (必需)
 * - person_generation: 人物生成控制 allow_all | allow_adult | dont_allow (可选，默认allow_adult)
 *
 * Body (模式特定字段):
 * - reference_images: string[] - 参考图片URL数组，1-3张（仅reference-images模式）
 * - reference_image_sources: JSONB[] - 参考图片来源元数据（可选）
 * - first_frame_url: string - 第一帧图片URL（仅first-last-frame模式）
 * - last_frame_url: string - 最后一帧图片URL（仅first-last-frame模式）
 *
 * 🔥 老王注意：
 * - 参数验证使用统一的validateVideoParameters函数
 * - personGeneration受模式和地区限制（参见video-parameter-validator.ts）
 */
export const POST = withAuthAndRateLimit<any>(async (request, user) => {
  try {
    // 1. 解析请求体
    const body = await request.json();
    const {
      prompt,
      negative_prompt,
      aspect_ratio,
      resolution,
      duration,
      generation_mode,
      person_generation, // 🔥 老王添加：人物生成控制
      reference_images,
      reference_image_sources,
      first_frame_url,
      last_frame_url,
    } = body;

    // 2. 基础字段验证（prompt必需）
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PROMPT',
            message: 'Missing or invalid field: prompt (must be non-empty string)',
          },
        },
        { status: 400 }
      );
    }

    // 3. 使用统一的参数验证器（老王的新工具！）
    const validation = validateVideoParameters({
      generationMode: generation_mode,
      aspectRatio: aspect_ratio,
      resolution,
      duration,
      personGeneration: person_generation,
      // 暂不传userRegion，可从request headers或IP获取（后续优化）
    });

    if (!validation.valid) {
      // 返回第一个验证错误
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: firstError.code,
            message: firstError.message,
            field: firstError.field,
          },
        },
        { status: 400 }
      );
    }

    // 4. 模式特定字段验证（这些不在video-parameter-validator中）
    if (generation_mode === 'reference-images') {
      if (!Array.isArray(reference_images) || reference_images.length < 1 || reference_images.length > 3) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REFERENCE_IMAGES',
              message: 'reference_images must be an array with 1-3 image URLs for reference-images mode',
            },
          },
          { status: 400 }
        );
      }
      if (first_frame_url || last_frame_url) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICTING_FIELDS',
              message: 'first_frame_url and last_frame_url must be empty for reference-images mode',
            },
          },
          { status: 400 }
        );
      }
    } else if (generation_mode === 'first-last-frame') {
      if (!first_frame_url || !last_frame_url) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_FRAME_URLS',
              message: 'Both first_frame_url and last_frame_url are required for first-last-frame mode',
            },
          },
          { status: 400 }
        );
      }
      if (reference_images && reference_images.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICTING_FIELDS',
              message: 'reference_images must be empty for first-last-frame mode',
            },
          },
          { status: 400 }
        );
      }
    } else if (generation_mode === 'text-to-video') {
      if ((reference_images && reference_images.length > 0) || first_frame_url || last_frame_url) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICTING_FIELDS',
              message: 'All image fields must be empty for text-to-video mode',
            },
          },
          { status: 400 }
        );
      }
    }

    // 5. 创建视频任务（user.id 来自 withAuth）
    const videoService = getVideoService();
    const task = await videoService.createVideoTask({
      userId: user.id,
      prompt,
      negativePrompt: negative_prompt,
      aspectRatio: aspect_ratio,
      resolution,
      duration,
      generationMode: generation_mode,
      personGeneration: person_generation, // 🔥 老王添加：人物生成控制
      referenceImages: reference_images,
      referenceImageSources: reference_image_sources,
      firstFrameUrl: first_frame_url,
      lastFrameUrl: last_frame_url,
    });

    // 6. 返回任务信息
    return NextResponse.json({
      success: true,
      task_id: task.id,
      operation_id: task.operationId,
      status: task.status,
      credit_cost: task.creditCost,
      estimated_completion_time: '11s-6min',
      message: 'Video generation task created successfully',
    });

  } catch (error: any) {
    console.error('❌ Video generation error:', error);

    // 处理已知错误类型
    if (error.message.includes('CONCURRENT_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        {
          error: 'CONCURRENT_LIMIT_EXCEEDED',
          message: 'Maximum 3 concurrent video generation tasks allowed. Please wait for existing tasks to complete.',
        },
        { status: 429 }
      );
    }

    if (error.message.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits for video generation. Please purchase more credits.',
        },
        { status: 402 }
      );
    }

    if (error.message.includes('VEO_API_ERROR')) {
      return NextResponse.json(
        {
          error: 'VEO_API_ERROR',
          message: 'Google Veo API error occurred. Credits have been refunded automatically.',
        },
        { status: 503 }
      );
    }

    if (error.message.includes('DATABASE_ERROR')) {
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Database error occurred. Credits have been refunded automatically.',
        },
        { status: 500 }
      );
    }

    // 通用错误
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
});

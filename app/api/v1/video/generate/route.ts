// app/api/v1/video/generate/route.ts
// 视频生成 API 端点
// POST /api/v1/video/generate - 创建新的视频生成任务

// 🔥 老王修复：强制动态渲染，避免构建时解析nsfw-detector依赖的ffmpeg模块
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getVideoService } from '@/lib/video-service';
import { validateApiKey } from '@/lib/api-middleware';

/**
 * POST /api/v1/video/generate
 * 创建视频生成任务（支持三种生成模式）
 *
 * Headers:
 * - x-api-key: API Key (必需)
 *
 * Body (基础字段):
 * - prompt: 视频提示词 (必需)
 * - negative_prompt: 负面提示词 (可选)
 * - aspect_ratio: 宽高比 16:9 | 9:16 (必需)
 * - resolution: 分辨率 720p | 1080p (必需)
 * - duration: 时长 4 | 6 | 8 秒 (必需)
 * - generation_mode: 生成模式 text-to-video | reference-images | first-last-frame (必需)
 *
 * Body (模式特定字段):
 * - reference_images: string[] - 参考图片URL数组，1-3张（仅reference-images模式）
 * - reference_image_sources: JSONB[] - 参考图片来源元数据（可选，用于分析用户偏好）
 * - first_frame_url: string - 第一帧图片URL（仅first-last-frame模式）
 * - last_frame_url: string - 最后一帧图片URL（仅first-last-frame模式）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证 API Key
    const validation = await validateApiKey(request);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      );
    }

    const userId = validation.userId!;

    // 2. 解析请求体
    const body = await request.json();
    const {
      prompt,
      negative_prompt,
      aspect_ratio,
      resolution,
      duration,
      generation_mode,
      reference_images,
      reference_image_sources,
      first_frame_url,
      last_frame_url,
    } = body;

    // 3. 验证必需字段
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid field: prompt (must be non-empty string)' },
        { status: 400 }
      );
    }

    if (!aspect_ratio || !['16:9', '9:16'].includes(aspect_ratio)) {
      return NextResponse.json(
        { error: 'Invalid aspect_ratio (must be "16:9" or "9:16")' },
        { status: 400 }
      );
    }

    if (!resolution || !['720p', '1080p'].includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution (must be "720p" or "1080p")' },
        { status: 400 }
      );
    }

    if (!duration || ![4, 6, 8].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration (must be 4, 6, or 8 seconds)' },
        { status: 400 }
      );
    }

    // 🔥 验证生成模式
    if (!generation_mode || !['text-to-video', 'reference-images', 'first-last-frame'].includes(generation_mode)) {
      return NextResponse.json(
        { error: 'Invalid generation_mode (must be "text-to-video", "reference-images", or "first-last-frame")' },
        { status: 400 }
      );
    }

    // 🔥 验证模式特定字段（与数据库trigger逻辑一致）
    if (generation_mode === 'reference-images') {
      if (!Array.isArray(reference_images) || reference_images.length < 1 || reference_images.length > 3) {
        return NextResponse.json(
          { error: 'reference_images must be an array with 1-3 image URLs for reference-images mode' },
          { status: 400 }
        );
      }
      if (first_frame_url || last_frame_url) {
        return NextResponse.json(
          { error: 'first_frame_url and last_frame_url must be empty for reference-images mode' },
          { status: 400 }
        );
      }
    } else if (generation_mode === 'first-last-frame') {
      if (!first_frame_url || !last_frame_url) {
        return NextResponse.json(
          { error: 'Both first_frame_url and last_frame_url are required for first-last-frame mode' },
          { status: 400 }
        );
      }
      if (reference_images && reference_images.length > 0) {
        return NextResponse.json(
          { error: 'reference_images must be empty for first-last-frame mode' },
          { status: 400 }
        );
      }
    } else if (generation_mode === 'text-to-video') {
      if ((reference_images && reference_images.length > 0) || first_frame_url || last_frame_url) {
        return NextResponse.json(
          { error: 'All image fields must be empty for text-to-video mode' },
          { status: 400 }
        );
      }
    }

    // 4. 创建视频任务
    const videoService = getVideoService();
    const task = await videoService.createVideoTask({
      userId,
      prompt,
      negativePrompt: negative_prompt,
      aspectRatio: aspect_ratio,
      resolution,
      duration,
      generationMode: generation_mode,
      referenceImages: reference_images,
      referenceImageSources: reference_image_sources,
      firstFrameUrl: first_frame_url,
      lastFrameUrl: last_frame_url,
    });

    // 5. 返回任务信息
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

    // 🔥 老王修复：处理已知错误类型（增强并发限制错误信息）
    if (error.message.includes('CONCURRENT_LIMIT_EXCEEDED')) {
      // 从错误消息中提取limit和current（格式："...允许 2 个并发...已有 2 个..."）
      const limitMatch = error.message.match(/允许\s+(\d+)\s+个并发/);
      const currentMatch = error.message.match(/已有\s+(\d+)\s+个任务/);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 3;
      const current = currentMatch ? parseInt(currentMatch[1]) : limit;

      return NextResponse.json(
        {
          error: 'CONCURRENT_LIMIT_EXCEEDED',
          message: `您的套餐允许 ${limit} 个并发任务，当前已有 ${current} 个任务进行中。请等待现有任务完成后再创建新任务。`,
          limit,
          current,
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
}

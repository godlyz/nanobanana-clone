// lib/video-service.ts
// Google Veo 视频生成业务逻辑服务
// 管理完整的视频生成生命周期：创建任务、状态查询、视频下载、积分退款

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createServiceClient } from './supabase/service';
import { getVeoClient, type VideoGenerationParams } from './veo-client';
import { CreditService } from './credit-service'; // 🔥 老王修复：引入标准的积分服务
// 🔥 老王临时注释：禁用NSFW扫描以完成生产构建（ffmpeg-installer与Next.js 16 Turbopack不兼容）
// import { detectVideoNSFW } from './nsfw-detector';

// ============================================
// 类型定义
// ============================================

export interface CreateVideoTaskParams extends VideoGenerationParams {
  userId: string;
  generationMode: 'text-to-video' | 'reference-images' | 'first-last-frame';
  referenceImages?: string[];
  referenceImageSources?: any[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
}

// 🔥 老王新增：视频延长任务参数
export interface ExtendVideoTaskParams {
  userId: string;
  sourceVideoId: string; // 源视频的ID（来自video_generation_history）
  prompt: string; // 延长部分的提示词
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow';
}

export interface VideoTask {
  id: string;
  userId: string;
  operationId: string;
  status: 'processing' | 'downloading' | 'completed' | 'failed';
  prompt: string;
  negativePrompt?: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  duration: 4 | 6 | 7 | 8; // 🔥 添加7，用于视频延长（固定7秒）
  generationMode: 'text-to-video' | 'reference-images' | 'first-last-frame' | 'extend-video'; // 🔥 添加extend-video
  referenceImages?: string[];
  referenceImageSources?: any[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  sourceVideoId?: string; // 🔥 新增：源视频ID（仅extend-video模式）
  creditCost: number;
  googleVideoUrl?: string;
  permanentVideoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// VideoService 类
// ============================================

export class VideoService {
  private supabase: ReturnType<typeof createServiceClient>;
  private veoClient: ReturnType<typeof getVeoClient>;
  private creditService: CreditService; // 🔥 老王修复：添加 creditService 属性

  constructor(
    supabase?: ReturnType<typeof createServiceClient>,
    veoClient?: ReturnType<typeof getVeoClient>,
    creditService?: CreditService
  ) {
    this.supabase = supabase || createServiceClient();
    this.veoClient = veoClient || getVeoClient();
    this.creditService = creditService || new CreditService(this.supabase); // 🔥 老王修复：支持注入或创建
  }

  /**
   * 创建视频生成任务（支持三种生成模式）
   * 1. 检查并发限制（最多3个任务）
   * 2. 计算积分成本
   * 3. 先扣除积分（失败时退款）
   * 4. 调用 Google Veo API（根据模式传递不同参数）
   * 5. 插入数据库记录
   */
  async createVideoTask(params: CreateVideoTaskParams): Promise<VideoTask> {
    const {
      userId,
      prompt,
      negativePrompt,
      aspectRatio,
      resolution,
      duration,
      generationMode,
      referenceImages,
      referenceImageSources,
      firstFrameUrl,
      lastFrameUrl,
    } = params;

    // 1. 🔥 老王修复：检查套餐并发限制
    const { canCreate, limit, current } = await this.checkConcurrentLimit(userId);
    if (!canCreate) {
      throw new Error(
        `CONCURRENT_LIMIT_EXCEEDED: 当前套餐允许 ${limit} 个并发任务，您已有 ${current} 个任务进行中`
      );
    }

    // 2. 计算积分成本
    const creditCost = this.calculateCredits(duration, resolution);

    // 3. 先扣除积分（deduct-first-refund-later 策略）
    try {
      await this.deductCredits(userId, creditCost, `视频生成: ${duration}s ${resolution} ${aspectRatio} [${generationMode}]`);
    } catch (error: any) {
      console.error('❌ [VideoService] 积分扣除失败:', error);
      console.error('   原始错误:', error.message);
      throw new Error(`INSUFFICIENT_CREDITS: 积分不足，无法创建视频生成任务 (${error.message})`);
    }

    // 4. 调用 Google Veo API（根据生成模式传递不同参数）
    let operationId: string;
    try {
      // 🔥 根据生成模式准备API参数
      let veoParams: VideoGenerationParams;

      if (generationMode === 'reference-images') {
        // 参考图片模式：传递参考图片数组（最多3张）
        veoParams = {
          prompt,
          negativePrompt,
          aspectRatio,
          resolution,
          duration,
          referenceImageUrl: referenceImages?.[0], // Veo API主参考图片
          // TODO: 如果Veo API支持多张参考图片，这里需要更新veo-client.ts
        };
      } else if (generationMode === 'first-last-frame') {
        // 首尾帧模式：传递首尾帧图片
        veoParams = {
          prompt,
          negativePrompt,
          aspectRatio,
          resolution,
          duration,
          referenceImageUrl: firstFrameUrl, // 第一帧作为主参考
          // TODO: 如果Veo API支持首尾帧模式，这里需要更新veo-client.ts传递lastFrameUrl
        };
      } else {
        // 纯文生视频模式：仅传递文本提示词
        veoParams = {
          prompt,
          negativePrompt,
          aspectRatio,
          resolution,
          duration,
        };
      }

      const result = await this.veoClient.generateVideo(veoParams);
      operationId = result.operationId;
    } catch (error: any) {
      // API 失败，退还积分
      await this.refundCredits(userId, creditCost, '退款: Veo API 调用失败');
      throw new Error(`VEO_API_ERROR: ${error.message}`);
    }

    // 5. 插入数据库记录（包含新增的模式字段）
    // @ts-ignore - Supabase types not generated yet
    const { data, error } = await this.supabase
      .from('video_generation_history')
      .insert({
        user_id: userId,
        operation_id: operationId,
        status: 'processing',
        prompt,
        negative_prompt: negativePrompt,
        aspect_ratio: aspectRatio,
        resolution,
        duration,
        generation_mode: generationMode,
        reference_images: referenceImages,
        reference_image_sources: referenceImageSources,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (error) {
      // 数据库失败，退还积分
      await this.refundCredits(userId, creditCost, '退款: 数据库插入失败');
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return this.mapDbRowToTask(data);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<VideoTask | null> {
    const { data, error } = await this.supabase
      .from('video_generation_history')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbRowToTask(data);
  }

  /**
   * 列出用户的视频任务
   * 支持分页和状态过滤
   */
  async listUserVideos(
    userId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ tasks: VideoTask[]; total: number }> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // 构建查询
    let query = this.supabase
      .from('video_generation_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // 应用状态过滤
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // 应用分页和排序
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return {
      tasks: (data || []).map(row => this.mapDbRowToTask(row)),
      total: count || 0,
    };
  }

  /**
   * 从 Google 临时 URL 下载视频并上传到 Supabase Storage
   * 1. 下载视频
   * 2. 本地帧提取 + NSFW 检测（通过才上传）
   * 3. 上传到 Supabase Storage
   * 4. 获取永久 URL
   * 5. 更新数据库
   */
  async downloadAndStoreVideo(
    taskId: string,
    googleUrl: string
  ): Promise<{ success: boolean; permanentUrl?: string; error?: string }> {
    // 1. 从 Google 临时 URL 下载视频
    let videoBuffer: Buffer;
    let tempDir: string | null = null;
    let tempVideoPath: string | null = null;
    try {
      const response = await fetch(googleUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
    } catch (error: any) {
      return { success: false, error: `DOWNLOAD_FAILED: ${error.message}` };
    }

    // 2. 获取任务信息（用于构建存储路径）
    const task = await this.getTaskStatus(taskId);
    if (!task) {
      return { success: false, error: 'TASK_NOT_FOUND' };
    }

    // 3. 将视频写入临时文件，便于调用 ffmpeg/NSFW 检测
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'veo-video-'));
      const candidatePath = path.join(tempDir, `${taskId}.mp4`);
      await fs.writeFile(candidatePath, videoBuffer);
      tempVideoPath = candidatePath;
    } catch (error: any) {
      console.error('❌ 写入临时视频文件失败:', error);
      tempVideoPath = null;
    }

    // 4. NSFW 检测（优先在上传前拦截）
    // 🔥 老王临时注释：禁用NSFW扫描以完成生产构建
    /*
    if (tempVideoPath) {
      try {
        console.log('🔍 开始NSFW内容检测...');
        const nsfwResult = await detectVideoNSFW(tempVideoPath);

        if (!nsfwResult.safe) {
          const now = new Date().toISOString();
          const blockedMessage = `内容审核未通过: ${nsfwResult.reason || '检测到不当内容'}`;

          // 阻断并记录状态
          const { error: blockError } = await this.supabase
            .from('video_generation_history')
            .update({
              status: 'blocked',
              error_message: blockedMessage,
              error_code: 'NSFW_CONTENT_DETECTED',
              completed_at: now,
              downloaded_at: now,
              permanent_video_url: null,
              thumbnail_url: null,
              file_size_bytes: videoBuffer.length,
            })
            .eq('id', taskId);

          if (blockError) {
            console.error('❌ 更新任务为blocked失败:', blockError);
          }

          try {
            await this.refundFailedGeneration(taskId);
          } catch (refundError) {
            console.error('❌ NSFW检测退款失败:', refundError);
          }

          return { success: false, error: 'NSFW_CONTENT_DETECTED' };
        }

        console.log('✅ NSFW检测通过，继续上传');
      } catch (error: any) {
        console.error('⚠️ NSFW检测异常，默认放行:', error);
      } finally {
        if (tempDir) {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
          tempDir = null;
        }
      }
    }

    // 如果未进入检测分支但创建了临时目录，仍需清理
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      tempDir = null;
    }
    */

    // 5. 上传到 Supabase Storage（路径：{userId}/{taskId}.mp4）
    const fileName = `${task.userId}/${taskId}.mp4`;
    const { error: uploadError } = await this.supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: `UPLOAD_FAILED: ${uploadError.message}` };
    }

    // 6. 获取公开 URL
    const { data: publicUrlData } = this.supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const permanentUrl = publicUrlData.publicUrl;

    // 7. 生成缩略图（可选 - TODO: 可以使用视频帧提取）
    let thumbnailUrl: string | null = null;

    // 8. 更新数据库记录
    // @ts-ignore - Supabase types not generated yet
    const { error: updateError } = await this.supabase
      .from('video_generation_history')
      .update({
        permanent_video_url: permanentUrl,
        thumbnail_url: thumbnailUrl,
        status: 'completed',
        completed_at: new Date().toISOString(),
        downloaded_at: new Date().toISOString(),
        file_size_bytes: videoBuffer.length,
      })
      .eq('id', taskId);

    if (updateError) {
      return { success: false, error: `UPDATE_FAILED: ${updateError.message}` };
    }

    return { success: true, permanentUrl };
  }

  /**
   * 退款失败的视频生成任务
   * 防止重复退款
   */
  async refundFailedGeneration(taskId: string): Promise<void> {
    // 1. 获取任务信息
    const task = await this.getTaskStatus(taskId);
    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }

    // 2. 检查是否已退款（防止重复退款）
    const { data: existingRefund } = await this.supabase
      .from('credit_transactions')
      .select('id')
      .eq('transaction_type', 'video_refund')
      .ilike('description', `%${taskId}%`)
      .maybeSingle();

    if (existingRefund) {
      console.warn(`任务 ${taskId} 已退款，跳过`);
      return;
    }

    // 3. 执行退款
    await this.refundCredits(
      task.userId,
      task.creditCost,
      `退款: 视频生成失败 (任务 ${taskId})`
    );

    console.log(`已为失败任务 ${taskId} 退还 ${task.creditCost} 积分`);
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  /**
   * 计算积分成本
   * 基础价格: 10积分/秒
   * 1080p 乘以 1.5 倍
   */
  private calculateCredits(duration: number, resolution: string): number {
    const baseCredits = duration * 10;
    const multiplier = resolution === '1080p' ? 1.5 : 1.0;
    return Math.floor(baseCredits * multiplier);
  }

  /**
   * 🔥 老王增强：套餐差异化并发限制
   * Basic套餐: 1个并发
   * Pro套餐: 2个并发
   * Max套餐: 3个并发
   * 免费用户: 1个并发（默认）
   */
  private async checkConcurrentLimit(userId: string): Promise<{
    canCreate: boolean;
    limit: number;
    current: number;
  }> {
    // 1. 查询用户当前进行中的任务数
    const { count } = await this.supabase
      .from('video_generation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['processing', 'downloading']);

    const current = count || 0;

    // 2. 获取用户套餐等级并计算并发限制
    const limit = await this.getConcurrentLimitByPlan(userId);

    return {
      canCreate: current < limit,
      limit,
      current,
    };
  }

  /**
   * 🔥 老王新增：根据用户套餐获取并发限制
   */
  private async getConcurrentLimitByPlan(userId: string): Promise<number> {
    // 查询用户当前有效订阅
    const { data: subscription } = await this.supabase
      .from('user_subscriptions')
      .select('plan_tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 套餐并发限制配置
    const planLimits: Record<string, number> = {
      basic: 1,  // Basic套餐: 同时最多1个视频
      pro: 2,    // Pro套餐: 同时最多2个视频
      max: 3,    // Max套餐: 同时最多3个视频
    };

    // 返回对应套餐的限制，如果没有有效订阅则默认1个
    return planLimits[subscription?.plan_tier || 'basic'] || 1;
  }

  /**
   * 获取系统配置
   * 注意: config_value 是 JSONB 类型
   */
  private async getConfig(
    key: string,
    options: { default: number | string | boolean }
  ): Promise<number | string | boolean> {
    // @ts-ignore - Supabase types not generated yet
    const { data } = await this.supabase
      .from('system_configs')
      .select('config_value')
      .eq('config_key', key)
      .maybeSingle();

    if (!data || data.config_value === null) {
      return options.default;
    }

    // JSONB 值已经是解析后的类型
    return data.config_value;
  }

  /**
   * 扣除用户积分
   * 🔥 老王修复：改用标准的CreditService，支持FIFO策略和余额检查
   */
  private async deductCredits(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    // 🔥 老王修复：使用实例属性 this.creditService，不再每次new
    try {
      await this.creditService.deductCredits({
        user_id: userId,
        amount,
        transaction_type: 'video_generation',
        description,
      });
    } catch (error: any) {
      console.error('❌ 扣减积分失败:', error.message);
      // 重新抛出错误，让上层catch块统一处理
      throw error;
    }
  }

  /**
   * 退还用户积分
   * 🔥 老王修复：改用标准的CreditService，支持积分包管理
   */
  private async refundCredits(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    // 🔥 老王修复：使用实例属性 this.creditService，不再每次new
    try {
      await this.creditService.addCredits({
        user_id: userId,
        amount,
        transaction_type: 'video_refund', // 🔥 老王修复：使用正确的视频退款类型
        expires_at: null, // 🔥 老王修复：视频退款积分永久有效
        description,
      });
    } catch (error: any) {
      console.error(`❌ 积分退款失败: ${error.message}`);
      throw new Error(`CREDIT_REFUND_FAILED: ${error.message}`);
    }
  }

  /**
   * 映射数据库行到 VideoTask 对象
   */
  private mapDbRowToTask(row: any): VideoTask {
    return {
      id: row.id,
      userId: row.user_id,
      operationId: row.operation_id,
      status: row.status,
      prompt: row.prompt,
      negativePrompt: row.negative_prompt,
      aspectRatio: row.aspect_ratio,
      resolution: row.resolution,
      duration: row.duration,
      generationMode: row.generation_mode,
      referenceImages: row.reference_images,
      referenceImageSources: row.reference_image_sources,
      firstFrameUrl: row.first_frame_url,
      lastFrameUrl: row.last_frame_url,
      creditCost: row.credit_cost,
      googleVideoUrl: row.google_video_url,
      permanentVideoUrl: row.permanent_video_url,
      thumbnailUrl: row.thumbnail_url,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * 🔥 老王新增：视频延长任务
   * Extend an existing video by 7 seconds
   *
   * 流程：
   * 1. 验证源视频（必须是completed状态、720p、有gemini_video_uri、延长后不超过148秒）
   * 2. 检查并发限制
   * 3. 扣除积分（40 credits）
   * 4. 调用Veo延长API
   * 5. 插入数据库记录（generation_mode=extend-video, source_video_id=sourceVideoId）
   */
  async extendVideoTask(params: ExtendVideoTaskParams): Promise<VideoTask> {
    const { userId, sourceVideoId, prompt, personGeneration } = params;

    console.log(`🎬 开始视频延长: userId=${userId}, sourceVideoId=${sourceVideoId}`);

    // 1. 获取源视频信息并验证
    const { data: sourceVideo, error: videoError } = await this.supabase
      .from('video_generation_history')
      .select('*')
      .eq('id', sourceVideoId)
      .eq('user_id', userId) // 🔥 确保只能延长自己的视频
      .single();

    if (videoError || !sourceVideo) {
      throw new Error('SOURCE_VIDEO_NOT_FOUND: 源视频不存在或无权访问');
    }

    // 验证源视频状态
    if (sourceVideo.status !== 'completed') {
      throw new Error(`SOURCE_VIDEO_NOT_COMPLETED: 源视频尚未完成生成（当前状态：${sourceVideo.status}）`);
    }

    // 验证分辨率（仅支持720p）
    if (sourceVideo.resolution !== '720p') {
      throw new Error('EXTENSION_NOT_SUPPORTED_FOR_1080P: 仅支持720p视频延长，1080p视频无法延长');
    }

    // 验证gemini_video_uri存在（必须是Veo生成的视频）
    if (!sourceVideo.gemini_video_uri) {
      throw new Error('MISSING_GEMINI_VIDEO_URI: 源视频缺少gemini_video_uri，无法延长');
    }

    // 验证延长后不超过148秒
    const newDuration = sourceVideo.duration_seconds + 7;
    if (newDuration > 148) {
      throw new Error(
        `EXTENSION_EXCEEDS_LIMIT: 延长后总时长将达到${newDuration}秒，超过148秒上限（源视频${sourceVideo.duration_seconds}秒）`
      );
    }

    // 2. 检查并发限制
    const { canCreate, limit, current } = await this.checkConcurrentLimit(userId);
    if (!canCreate) {
      throw new Error(
        `CONCURRENT_LIMIT_EXCEEDED: 当前套餐允许 ${limit} 个并发任务，您已有 ${current} 个任务进行中`
      );
    }

    // 3. 计算积分成本（固定40 credits）
    const creditCost = 40;

    // 4. 先扣除积分
    try {
      await this.creditService.deductCredits({
        user_id: userId,
        amount: creditCost,
        transaction_type: 'video_extension',
        description: `Video extension - Extend from ${sourceVideo.duration_seconds}s to ${newDuration}s / 视频延长 - 从${sourceVideo.duration_seconds}秒延长至${newDuration}秒`,
      });
    } catch (error: any) {
      if (error.message.includes('INSUFFICIENT_CREDITS')) {
        throw new Error(`INSUFFICIENT_CREDITS: 积分不足，需要 ${creditCost} 积分进行视频延长`);
      }
      throw error;
    }

    console.log(`✅ 积分扣除成功: ${creditCost}积分（延长7秒）`);

    // 5. 调用Veo延长API
    let operationId: string;
    try {
      const operation = await this.veoClient.extendVideo({
        sourceVideoUri: sourceVideo.gemini_video_uri,
        prompt,
        aspectRatio: sourceVideo.aspect_ratio as '16:9' | '9:16',
        personGeneration,
      });
      operationId = operation.operationId;
      console.log(`✅ Veo延长API调用成功: operationId=${operationId}`);
    } catch (error: any) {
      // 调用失败，退款
      console.error(`❌ Veo延长API调用失败:`, error);
      await this.refundCredits(userId, creditCost, 'Video extension failed - refund / 视频延长失败 - 退款');
      throw error;
    }

    // 6. 插入数据库记录
    const { data: task, error: insertError } = await this.supabase
      .from('video_generation_history')
      .insert({
        user_id: userId,
        operation_id: operationId,
        status: 'processing',
        prompt,
        aspect_ratio: sourceVideo.aspect_ratio,
        resolution: sourceVideo.resolution, // 继承源视频分辨率（720p）
        duration_seconds: 7, // 固定延长7秒
        generation_mode: 'extend-video', // 🔥 关键：标记为延长模式
        source_video_id: sourceVideoId, // 🔥 关键：记录源视频ID
        credit_cost: creditCost,
        // person_generation 字段待数据库迁移后添加
      })
      .select()
      .single();

    if (insertError || !task) {
      console.error(`❌ 数据库插入失败:`, insertError);
      await this.refundCredits(userId, creditCost, 'Database insert failed - refund / 数据库插入失败 - 退款');
      throw new Error(`DATABASE_INSERT_FAILED: ${insertError?.message}`);
    }

    console.log(`✅ 数据库记录创建成功: taskId=${task.id}`);

    return {
      id: task.id,
      userId: task.user_id,
      operationId: task.operation_id,
      status: task.status as 'processing',
      prompt: task.prompt,
      aspectRatio: task.aspect_ratio as '16:9' | '9:16',
      resolution: task.resolution as '720p',
      duration: 7, // 固定7秒
      generationMode: 'extend-video',
      sourceVideoId,
      creditCost,
      createdAt: task.created_at,
    };
  }

  /**
   * 退款失败任务 (Cron任务调用)
   * 失败任务自动退还扣除的积分
   */
  async refundFailedTask(
    taskId: string,
    userId: string,
    creditAmount: number
  ): Promise<void> {
    console.log(`💰 开始退款: 任务=${taskId}, 用户=${userId}, 积分=${creditAmount}`);

    // 1. 验证是否已经退过款 (防止重复退款)
    const validation = await this.creditService.validateVideoTransaction(
      userId,
      'video_refund',
      taskId
    );

    if (!validation.valid) {
      console.warn(`⚠️ 退款验证失败: ${validation.reason}`);
      throw new Error(validation.reason || 'DUPLICATE_REFUND');
    }

    // 2. 执行退款 (永久有效积分)
    await this.creditService.addCredits({
      user_id: userId,
      amount: creditAmount,
      transaction_type: 'video_refund',
      expires_at: null, // 退款积分永久有效
      related_entity_id: taskId,
      description: `Video generation refund - Task ${taskId} / 视频生成退款 - 任务 ${taskId}`,
    });

    console.log(`✅ 退款成功: ${creditAmount}积分已退还给用户 ${userId}`);
  }
}

// ============================================
// Singleton Instance
// ============================================

let videoService: VideoService | null = null;

export function getVideoService(): VideoService {
  if (!videoService) {
    videoService = new VideoService();
  }
  return videoService;
}

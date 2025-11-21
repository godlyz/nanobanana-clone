# Task 2.2: Implement Video Service

**File**: `lib/video-service.ts`
**Estimated Time**: 6 hours
**Dependencies**: Task 2.1 (Veo client), Task 1.1-1.3 (Database)
**Priority**: P0 (Blocking)

## Overview

Business logic service for managing the complete video generation lifecycle:
- Create video tasks (with credit deduction and concurrent limit checks)
- Get task status
- List user videos (with pagination and filtering)
- Download videos from Google to Supabase Storage
- Refund credits on generation failures

## Subtasks

### 2.2.1: Create VideoService Class Skeleton

```typescript
// lib/video-service.ts
import { createClient } from '@supabase/supabase-js';
import { getVeoClient, type VideoGenerationParams } from './veo-client';

export interface CreateVideoTaskParams extends VideoGenerationParams {
  userId: string;
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
  duration: 4 | 6 | 8;
  creditCost: number;
  googleVideoUrl?: string;
  permanentVideoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
}

export class VideoService {
  private supabase: ReturnType<typeof createClient>;
  private veoClient: ReturnType<typeof getVeoClient>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.veoClient = getVeoClient();
  }

  async createVideoTask(params: CreateVideoTaskParams): Promise<VideoTask> {
    // Implementation in subtask 2.2.2
    throw new Error('Not implemented');
  }

  async getTaskStatus(taskId: string): Promise<VideoTask | null> {
    // Implementation in subtask 2.2.3
    throw new Error('Not implemented');
  }

  async listUserVideos(
    userId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ tasks: VideoTask[]; total: number }> {
    // Implementation in subtask 2.2.4
    throw new Error('Not implemented');
  }

  async downloadAndStoreVideo(
    taskId: string,
    googleUrl: string
  ): Promise<{ success: boolean; permanentUrl?: string; error?: string }> {
    // Implementation in subtask 2.2.5
    throw new Error('Not implemented');
  }

  async refundFailedGeneration(taskId: string): Promise<void> {
    // Implementation in subtask 2.2.6
    throw new Error('Not implemented');
  }

  // Helper methods
  private calculateCredits(duration: number, resolution: string): number {
    const baseCredits = duration * 10;
    const multiplier = resolution === '1080p' ? 1.5 : 1.0;
    return Math.floor(baseCredits * multiplier);
  }

  private async checkConcurrentLimit(userId: string): Promise<boolean> {
    const { count } = await this.supabase
      .from('video_generation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['processing', 'downloading']);

    const limit = parseInt(
      await this.getConfig('video_concurrent_limit', '3'),
      10
    );

    return (count || 0) < limit;
  }

  private async getConfig(key: string, defaultValue: string): Promise<string> {
    const { data } = await this.supabase
      .from('system_configs')
      .select('value')
      .eq('key', key)
      .single();

    return data?.value || defaultValue;
  }
}

// Singleton
let videoService: VideoService | null = null;

export function getVideoService(): VideoService {
  if (!videoService) {
    videoService = new VideoService();
  }
  return videoService;
}
```

### 2.2.2: Implement `createVideoTask` Method

```typescript
async createVideoTask(params: CreateVideoTaskParams): Promise<VideoTask> {
  const { userId, prompt, negativePrompt, aspectRatio, resolution, duration, referenceImageUrl } = params;

  // 1. Check concurrent limit (max 3 tasks)
  const canCreate = await this.checkConcurrentLimit(userId);
  if (!canCreate) {
    throw new Error('CONCURRENT_LIMIT_EXCEEDED: Maximum 3 concurrent video generation tasks');
  }

  // 2. Calculate credit cost
  const creditCost = this.calculateCredits(duration, resolution);

  // 3. Deduct credits BEFORE generation (deduct-first-refund-later)
  const deductResult = await fetch('/api/credits/deduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      amount: creditCost,
      transactionType: 'video_generation',
      description: `Video generation: ${duration}s ${resolution} ${aspectRatio}`,
    }),
  }).then(res => res.json());

  if (!deductResult.success) {
    throw new Error('INSUFFICIENT_CREDITS: Not enough credits for video generation');
  }

  // 4. Call Google Veo API
  let operationId: string;
  try {
    const result = await this.veoClient.generateVideo({
      prompt,
      negativePrompt,
      aspectRatio,
      resolution,
      duration,
      referenceImageUrl,
    });
    operationId = result.operationId;
  } catch (error: any) {
    // Refund credits on API error
    await fetch('/api/credits/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount: creditCost,
        transactionType: 'video_refund',
        description: `Refund: Video generation API error`,
      }),
    });

    throw new Error(`VEO_API_ERROR: ${error.message}`);
  }

  // 5. Insert task record to database
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
      reference_image_url: referenceImageUrl,
      credit_cost: creditCost,
    })
    .select()
    .single();

  if (error) {
    // Refund credits on database error
    await fetch('/api/credits/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        amount: creditCost,
        transactionType: 'video_refund',
        description: `Refund: Database insertion error`,
      }),
    });

    throw new Error(`DATABASE_ERROR: ${error.message}`);
  }

  return this.mapDbRowToTask(data);
}

// Helper method to map database row to VideoTask
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
```

### 2.2.3: Implement `getTaskStatus` Method

```typescript
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
```

### 2.2.4: Implement `listUserVideos` Method

```typescript
async listUserVideos(
  userId: string,
  filters?: { status?: string; limit?: number; offset?: number }
): Promise<{ tasks: VideoTask[]; total: number }> {
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;

  // Build query
  let query = this.supabase
    .from('video_generation_history')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply status filter if provided
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Apply pagination and ordering
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
```

### 2.2.5: Implement `downloadAndStoreVideo` Method

```typescript
async downloadAndStoreVideo(
  taskId: string,
  googleUrl: string
): Promise<{ success: boolean; permanentUrl?: string; error?: string }> {
  // 1. Download video from Google temporary URL
  let videoBuffer: Buffer;
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

  // 2. Upload to Supabase Storage
  const fileName = `${taskId}.mp4`;
  const { data: uploadData, error: uploadError } = await this.supabase.storage
    .from('videos')
    .upload(fileName, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: `UPLOAD_FAILED: ${uploadError.message}` };
  }

  // 3. Get public URL
  const { data: publicUrlData } = this.supabase.storage
    .from('videos')
    .getPublicUrl(fileName);

  const permanentUrl = publicUrlData.publicUrl;

  // 4. Generate thumbnail (optional - can use video frame extraction)
  let thumbnailUrl: string | null = null;
  // TODO: Implement thumbnail generation if needed

  // 5. Update database with permanent URL
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
```

### 2.2.6: Implement `refundFailedGeneration` Method

```typescript
async refundFailedGeneration(taskId: string): Promise<void> {
  // 1. Get task info
  const task = await this.getTaskStatus(taskId);
  if (!task) {
    throw new Error('TASK_NOT_FOUND');
  }

  // 2. Check if already refunded (prevent double refund)
  const { data: existingRefund } = await this.supabase
    .from('credit_transactions')
    .select('id')
    .eq('transaction_type', 'video_refund')
    .contains('description', taskId)
    .single();

  if (existingRefund) {
    console.warn(`Task ${taskId} already refunded, skipping`);
    return;
  }

  // 3. Refund credits
  await fetch('/api/credits/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: task.userId,
      amount: task.creditCost,
      transactionType: 'video_refund',
      description: `Refund: Video generation failed (Task ${taskId})`,
    }),
  });

  console.log(`Refunded ${task.creditCost} credits for failed task ${taskId}`);
}
```

## Verification Steps

```bash
# 1. Create a test user video task
node -e "
const { getVideoService } = require('./lib/video-service');
const service = getVideoService();
service.createVideoTask({
  userId: 'test-user-id',
  prompt: 'A cat playing piano',
  aspectRatio: '16:9',
  resolution: '720p',
  duration: 4
}).then(task => console.log('Created task:', task));
"

# 2. Get task status
node -e "
const { getVideoService } = require('./lib/video-service');
const service = getVideoService();
service.getTaskStatus('task-id-here').then(task => console.log('Task status:', task));
"

# 3. List user videos
node -e "
const { getVideoService } = require('./lib/video-service');
const service = getVideoService();
service.listUserVideos('test-user-id', { limit: 10, offset: 0 }).then(result => console.log('User videos:', result));
"

# 4. Test download and store (mock Google URL)
node -e "
const { getVideoService } = require('./lib/video-service');
const service = getVideoService();
service.downloadAndStoreVideo('task-id-here', 'https://example.com/test-video.mp4').then(result => console.log('Download result:', result));
"

# 5. Test refund
node -e "
const { getVideoService } = require('./lib/video-service');
const service = getVideoService();
service.refundFailedGeneration('task-id-here').then(() => console.log('Refund completed'));
"
```

## Acceptance Criteria

- [ ] VideoService class created with all methods
- [ ] `createVideoTask` checks concurrent limit (max 3)
- [ ] Credits deducted BEFORE API call
- [ ] Credits refunded on API/DB errors
- [ ] `getTaskStatus` returns correct task info
- [ ] `listUserVideos` supports pagination and filtering
- [ ] `downloadAndStoreVideo` uploads to Supabase Storage
- [ ] `refundFailedGeneration` prevents double refunds
- [ ] All methods have proper error handling
- [ ] Unit tests pass

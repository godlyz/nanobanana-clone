# Task 2.6: Implement Auto Download Job

**File**: `app/api/cron/download-video/route.ts`
**Estimated Time**: 4 hours
**Dependencies**: Task 2.2 (VideoService), Task 2.5 (Polling Job)
**Priority**: P0 (Blocking)

## Overview

Background job that downloads completed videos from Google temporary URLs and uploads to Supabase Storage:
- Runs every 1 minute via Vercel Cron
- Processes all `downloading` status tasks
- Downloads from Google (2-day expiry window)
- Uploads to Supabase Storage `videos` bucket
- Generates thumbnails (first frame)
- Updates status to `completed` with permanent URLs
- Implements retry logic (max 3 attempts)
- Handles failures gracefully with refunds

## Subtasks

### 2.6.1: Create Auto Download Cron Endpoint

```typescript
// app/api/cron/download-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVideoService } from '@/lib/video-service';
import fetch from 'node-fetch';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Vercel Cron secret (security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[DOWNLOAD] Starting video download job...');

    // 2. Get all 'downloading' tasks from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tasks, error } = await supabase
      .from('video_generation_history')
      .select('*')
      .eq('status', 'downloading')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DOWNLOAD] Database query error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    console.log(`[DOWNLOAD] Found ${tasks?.length || 0} videos to download`);

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos to download',
        processed: 0,
      });
    }

    // 3. Process each video
    const videoService = getVideoService();
    let successCount = 0;
    let failedCount = 0;
    let retryCount = 0;

    for (const task of tasks) {
      try {
        console.log(`[DOWNLOAD] Processing task ${task.id}`);

        // Check retry attempts (max 3)
        const retryAttempts = task.download_retry_attempts || 0;
        if (retryAttempts >= 3) {
          console.log(`[DOWNLOAD] Task ${task.id} exceeded max retry attempts (3)`);

          // Mark as failed and refund
          await supabase
            .from('video_generation_history')
            .update({
              status: 'failed',
              error_message: 'Failed to download video after 3 attempts',
              error_code: 'DOWNLOAD_FAILED',
            })
            .eq('id', task.id);

          await videoService.refundFailedGeneration(task.id);
          failedCount++;
          continue;
        }

        // Download video from Google URL
        const googleUrl = task.google_video_url;
        if (!googleUrl) {
          console.error(`[DOWNLOAD] Task ${task.id} missing google_video_url`);
          failedCount++;
          continue;
        }

        const videoResponse = await fetch(googleUrl, {
          timeout: 60000, // 60 seconds timeout
        });

        if (!videoResponse.ok) {
          throw new Error(`HTTP ${videoResponse.status}: ${videoResponse.statusText}`);
        }

        const videoBuffer = await videoResponse.buffer();
        console.log(`[DOWNLOAD] Downloaded ${videoBuffer.length} bytes for task ${task.id}`);

        // Upload to Supabase Storage 'videos' bucket
        const fileName = `${task.id}.mp4`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get permanent public URL
        const { data: publicUrlData } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName);

        const permanentVideoUrl = publicUrlData.publicUrl;
        console.log(`[DOWNLOAD] Uploaded to: ${permanentVideoUrl}`);

        // Generate thumbnail (first frame using sharp)
        const thumbnailBuffer = await sharp(videoBuffer, {
          animated: false, // Extract first frame
        })
          .resize(640, 360, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailFileName = `${task.id}_thumb.jpg`;
        const { error: thumbUploadError } = await supabase.storage
          .from('videos')
          .upload(thumbnailFileName, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (thumbUploadError) {
          console.warn(`[DOWNLOAD] Thumbnail upload warning:`, thumbUploadError);
          // Don't fail the entire task if thumbnail fails
        }

        const { data: thumbPublicUrlData } = supabase.storage
          .from('videos')
          .getPublicUrl(thumbnailFileName);

        const thumbnailUrl = thumbPublicUrlData.publicUrl;

        // Update task status to 'completed'
        await supabase
          .from('video_generation_history')
          .update({
            status: 'completed',
            permanent_video_url: permanentVideoUrl,
            thumbnail_url: thumbnailUrl,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        console.log(`[DOWNLOAD] Task ${task.id} completed successfully`);
        successCount++;

      } catch (taskError: any) {
        console.error(`[DOWNLOAD] Error processing task ${task.id}:`, taskError);

        // Increment retry counter
        const newRetryCount = (task.download_retry_attempts || 0) + 1;
        await supabase
          .from('video_generation_history')
          .update({
            download_retry_attempts: newRetryCount,
            last_download_error: taskError.message,
          })
          .eq('id', task.id);

        retryCount++;
      }
    }

    console.log(
      `[DOWNLOAD] Job completed. Success: ${successCount}, Failed: ${failedCount}, Retrying: ${retryCount}`
    );

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      completed: successCount,
      failed: failedCount,
      retrying: retryCount,
    });

  } catch (error: any) {
    console.error('[DOWNLOAD] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.6.2: Add Vercel Cron Configuration for Download Job

```json
// vercel.json (update existing file)
{
  "crons": [
    {
      "path": "/api/cron/poll-video-status",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/download-video",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Schedule explanation**: `*/1 * * * *` = Every 1 minute

**Why 1 minute?**
- Google URLs expire after 2 days
- Download as soon as possible after video is ready
- Videos already filtered to 'downloading' status by polling job
- Minimal API overhead since only processing ready videos

### 2.6.3: Update Database Schema for Retry Tracking

```sql
-- Add retry tracking columns to video_generation_history table
ALTER TABLE video_generation_history
ADD COLUMN download_retry_attempts INTEGER DEFAULT 0,
ADD COLUMN last_download_error TEXT;

-- Add index for download job query
CREATE INDEX idx_video_generation_history_downloading
ON video_generation_history(status)
WHERE status = 'downloading';
```

### 2.6.4: Install Required Dependencies

```bash
# Install sharp for thumbnail generation
pnpm add sharp

# Install node-fetch for downloading (if not already installed)
pnpm add node-fetch

# Install type definitions
pnpm add -D @types/node-fetch
```

### 2.6.5: Configure Supabase Storage Bucket

```typescript
// lib/supabase/storage-setup.ts
import { createClient } from '@supabase/supabase-js';

export async function setupVideosBucket() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create 'videos' bucket (if not exists)
  const { data: buckets } = await supabase.storage.listBuckets();
  const videoBucketExists = buckets?.some(b => b.name === 'videos');

  if (!videoBucketExists) {
    const { error } = await supabase.storage.createBucket('videos', {
      public: true, // Allow public access to video URLs
      fileSizeLimit: 524288000, // 500 MB max file size
      allowedMimeTypes: ['video/mp4', 'image/jpeg'],
    });

    if (error) {
      console.error('Failed to create videos bucket:', error);
    } else {
      console.log('Videos bucket created successfully');
    }
  }
}

// Run this setup script once during deployment
// setupVideosBucket();
```

## Verification Steps

```bash
# 1. Test download endpoint locally (unauthorized)
curl http://localhost:3000/api/cron/download-video
# Expected: 401 Unauthorized

# 2. Test with correct secret
curl http://localhost:3000/api/cron/download-video \
  -H "Authorization: Bearer your-cron-secret-here"

# Expected (no tasks):
# {
#   "success": true,
#   "message": "No videos to download",
#   "processed": 0
# }

# Expected (with tasks):
# {
#   "success": true,
#   "processed": 3,
#   "completed": 2,
#   "failed": 0,
#   "retrying": 1
# }

# 3. Create test 'downloading' task
psql $DATABASE_URL -c "
INSERT INTO video_generation_history (
  user_id, operation_id, status, prompt, aspect_ratio, resolution, duration, credit_cost, google_video_url
) VALUES (
  'test-user-id',
  'test-operation-id',
  'downloading',
  'Test video',
  '16:9',
  '720p',
  4,
  40,
  'https://example.com/test-video.mp4'
);
"

# 4. Run download job (should process the test task)
curl http://localhost:3000/api/cron/download-video \
  -H "Authorization: Bearer your-cron-secret-here"

# 5. Verify video uploaded to Supabase Storage
# Check in Supabase Dashboard → Storage → videos bucket

# 6. Check retry logic (simulate download failure)
# Update task with invalid URL and verify retry counter increments

psql $DATABASE_URL -c "
SELECT id, status, download_retry_attempts, last_download_error
FROM video_generation_history
WHERE id = 'test-task-id';
"

# 7. Test max retry limit (after 3 failures, should mark as 'failed' and refund)

# 8. Check Vercel cron logs (after deploying to Vercel)
vercel logs --follow

# 9. Manually trigger cron job on Vercel
# Go to Vercel Dashboard → Project → Settings → Cron Jobs → Click "Run Now"

# 10. Verify thumbnail generation
# Check that both video.mp4 and video_thumb.jpg exist in Storage
```

## Acceptance Criteria

- [ ] Download cron endpoint created at `/api/cron/download-video`
- [ ] Vercel cron configured in `vercel.json` (every 1 minute)
- [ ] Cron secret authentication works
- [ ] Fetches all `downloading` tasks from database
- [ ] Downloads videos from Google temporary URLs
- [ ] Uploads videos to Supabase Storage `videos` bucket
- [ ] Generates thumbnails using sharp (first frame, 640x360)
- [ ] Updates status to `completed` with permanent URLs
- [ ] Implements retry logic (max 3 attempts)
- [ ] Increments `download_retry_attempts` on failures
- [ ] Marks as `failed` and refunds credits after 3 failed attempts
- [ ] Logs all actions for debugging
- [ ] Handles errors gracefully (continues with next task)
- [ ] Returns summary of processed tasks
- [ ] Supabase Storage bucket configured correctly
- [ ] sharp and node-fetch dependencies installed

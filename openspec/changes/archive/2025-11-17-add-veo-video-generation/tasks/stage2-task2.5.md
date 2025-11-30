# Task 2.5: Implement Vercel Cron Polling Job

**File**: `app/api/cron/poll-video-status/route.ts`
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2 (VideoService), Task 2.1 (VeoClient)
**Priority**: P0 (Blocking)

## Overview

Background job that polls Google Veo API for video generation status:
- Runs every 2 minutes via Vercel Cron
- Checks all `processing` tasks
- Updates status to `downloading` when completed
- Triggers refunds on failures
- Handles errors gracefully

## Subtasks

### 2.5.1: Create Vercel Cron Endpoint

```typescript
// app/api/cron/poll-video-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVeoClient } from '@/lib/veo-client';
import { getVideoService } from '@/lib/video-service';

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

    console.log('[CRON] Starting video status polling...');

    // 2. Get all processing tasks from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tasks, error } = await supabase
      .from('video_generation_history')
      .select('*')
      .eq('status', 'processing')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[CRON] Database query error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    console.log(`[CRON] Found ${tasks?.length || 0} processing tasks`);

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No processing tasks found',
        processed: 0,
      });
    }

    // 3. Check each task status with Google Veo API
    const veoClient = getVeoClient();
    const videoService = getVideoService();
    let completedCount = 0;
    let failedCount = 0;
    let stillProcessingCount = 0;

    for (const task of tasks) {
      try {
        console.log(`[CRON] Checking task ${task.id} (operation ${task.operation_id})`);

        // Check Google Veo operation status
        const status = await veoClient.checkOperationStatus(task.operation_id);

        if (status.status === 'COMPLETED' && status.videoUrl) {
          console.log(`[CRON] Task ${task.id} completed, starting download`);

          // Update status to 'downloading' AND store Google URL
          await supabase
            .from('video_generation_history')
            .update({
              status: 'downloading',
              google_video_url: status.videoUrl,
            })
            .eq('id', task.id);

          completedCount++;

        } else if (status.status === 'FAILED') {
          console.log(`[CRON] Task ${task.id} failed:`, status.error);

          // Update status to 'failed' and record error
          await supabase
            .from('video_generation_history')
            .update({
              status: 'failed',
              error_message: status.error?.message || 'Unknown error',
              error_code: status.error?.code || 'UNKNOWN',
            })
            .eq('id', task.id);

          // Refund credits
          await videoService.refundFailedGeneration(task.id);
          failedCount++;

        } else {
          console.log(`[CRON] Task ${task.id} still processing`);
          stillProcessingCount++;
        }

      } catch (taskError: any) {
        console.error(`[CRON] Error processing task ${task.id}:`, taskError);
        // Continue with next task
      }
    }

    console.log(`[CRON] Polling completed. Completed: ${completedCount}, Failed: ${failedCount}, Still processing: ${stillProcessingCount}`);

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      completed: completedCount,
      failed: failedCount,
      still_processing: stillProcessingCount,
    });

  } catch (error: any) {
    console.error('[CRON] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.5.2: Add Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-video-status",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Schedule explanation**: `*/2 * * * *` = Every 2 minutes

**Why 2 minutes?**
- Google Veo generation time: 11s-6min
- Balances responsiveness vs. API call costs
- Prevents overwhelming the API
- Can be adjusted based on actual usage patterns

### 2.5.3: Add Environment Variable for Cron Secret

```bash
# .env.local
CRON_SECRET=your-random-secret-here
```

Generate secret:
```bash
# Generate a random secret
openssl rand -base64 32
```

## Verification Steps

```bash
# 1. Test cron endpoint locally (unauthorized)
curl http://localhost:3000/api/cron/poll-video-status
# Expected: 401 Unauthorized

# 2. Test with correct secret
curl http://localhost:3000/api/cron/poll-video-status \
  -H "Authorization: Bearer your-cron-secret-here"

# Expected (no tasks):
# {
#   "success": true,
#   "message": "No processing tasks found",
#   "processed": 0
# }

# Expected (with tasks):
# {
#   "success": true,
#   "processed": 3,
#   "completed": 1,
#   "failed": 0,
#   "still_processing": 2
# }

# 3. Insert test processing task
psql $DATABASE_URL -c "
INSERT INTO video_generation_history (
  user_id, operation_id, status, prompt, aspect_ratio, resolution, duration, credit_cost
) VALUES (
  'test-user-id', 'test-operation-id', 'processing', 'Test video', '16:9', '720p', 4, 40
);
"

# 4. Run cron job (should find the test task)
curl http://localhost:3000/api/cron/poll-video-status \
  -H "Authorization: Bearer your-cron-secret-here"

# 5. Check Vercel cron logs (after deploying to Vercel)
vercel logs --follow

# 6. Manually trigger cron job on Vercel
# Go to Vercel Dashboard → Project → Settings → Cron Jobs → Click "Run Now"
```

## Acceptance Criteria

- [ ] Cron endpoint created at `/api/cron/poll-video-status`
- [ ] Vercel cron configured in `vercel.json` (every 2 minutes)
- [ ] Cron secret authentication works
- [ ] Fetches all `processing` tasks from database
- [ ] Checks each task status with Google Veo API
- [ ] Updates status to `downloading` when completed
- [ ] Stores `google_video_url` when completed
- [ ] Updates status to `failed` and refunds credits on errors
- [ ] Logs all actions for debugging
- [ ] Handles errors gracefully (continues with next task)
- [ ] Returns summary of processed tasks

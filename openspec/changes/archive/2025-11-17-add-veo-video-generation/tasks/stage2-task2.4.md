# Task 2.4: Create API Endpoints (POST /generate, GET /status)

**Files**:
- `app/api/v1/video/generate/route.ts`
- `app/api/v1/video/status/[task_id]/route.ts`

**Estimated Time**: 4 hours
**Dependencies**: Task 2.2 (VideoService), Task 2.3 (CreditService)
**Priority**: P0 (Blocking)

## Overview

Create RESTful API endpoints for video generation:
- `POST /api/v1/video/generate` - Create new video generation task
- `GET /api/v1/video/status/:task_id` - Get task status

Both endpoints require API key authentication and implement proper error handling.

## Subtasks

### 2.4.1: Create POST /api/v1/video/generate Endpoint

```typescript
// app/api/v1/video/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVideoService } from '@/lib/video-service';

export async function POST(request: NextRequest) {
  try {
    // 1. Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    // 2. Validate API key and get user ID
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const userId = keyData.user_id;

    // 3. Parse request body
    const body = await request.json();
    const {
      prompt,
      negative_prompt,
      aspect_ratio,
      resolution,
      duration,
      reference_image_url,
    } = body;

    // 4. Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    if (!aspect_ratio || !['16:9', '9:16'].includes(aspect_ratio)) {
      return NextResponse.json(
        { error: 'Invalid aspect_ratio (must be 16:9 or 9:16)' },
        { status: 400 }
      );
    }

    if (!resolution || !['720p', '1080p'].includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution (must be 720p or 1080p)' },
        { status: 400 }
      );
    }

    if (!duration || ![4, 6, 8].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration (must be 4, 6, or 8)' },
        { status: 400 }
      );
    }

    // 5. Create video task
    const videoService = getVideoService();
    const task = await videoService.createVideoTask({
      userId,
      prompt,
      negativePrompt: negative_prompt,
      aspectRatio: aspect_ratio,
      resolution,
      duration,
      referenceImageUrl: reference_image_url,
    });

    // 6. Return task info
    return NextResponse.json({
      success: true,
      task_id: task.id,
      operation_id: task.operationId,
      status: task.status,
      credit_cost: task.creditCost,
      estimated_completion_time: '11s-6min',
    });

  } catch (error: any) {
    console.error('Video generation error:', error);

    // Handle known errors
    if (error.message.includes('CONCURRENT_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        { error: 'Maximum 3 concurrent video generation tasks allowed' },
        { status: 429 }
      );
    }

    if (error.message.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        { error: 'Insufficient credits for video generation' },
        { status: 402 }
      );
    }

    if (error.message.includes('VEO_API_ERROR')) {
      return NextResponse.json(
        { error: 'Google Veo API error (credits refunded)' },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.4.2: Create GET /api/v1/video/status/:task_id Endpoint

```typescript
// app/api/v1/video/status/[task_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getVideoService } from '@/lib/video-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { task_id: string } }
) {
  try {
    const taskId = params.task_id;

    // 1. Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    // 2. Validate API key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const userId = keyData.user_id;

    // 3. Get task status
    const videoService = getVideoService();
    const task = await videoService.getTaskStatus(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 4. Verify task belongs to user
    if (task.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to task' },
        { status: 403 }
      );
    }

    // 5. Return task status
    const response: any = {
      task_id: task.id,
      status: task.status,
      created_at: task.createdAt,
    };

    // Add fields based on status
    if (task.status === 'completed') {
      response.video_url = task.permanentVideoUrl;
      response.thumbnail_url = task.thumbnailUrl;
      response.completed_at = task.completedAt;
    } else if (task.status === 'failed') {
      response.error_message = task.errorMessage;
      response.error_code = task.errorCode;
      response.refund_confirmed = true;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Get task status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.4.3: Add API Key Validation Middleware (Optional Helper)

```typescript
// lib/api-middleware.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function validateApiKey(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, is_active, rate_limit_per_day')
    .eq('key', apiKey)
    .single();

  if (error || !data || !data.is_active) {
    return { valid: false, error: 'Invalid or inactive API key' };
  }

  // TODO: Check rate limit (optional)

  return { valid: true, userId: data.user_id };
}
```

## Verification Steps

```bash
# 1. Test POST /api/v1/video/generate (successful)
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "prompt": "A cat playing piano in a jazz club",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'

# Expected response:
# {
#   "success": true,
#   "task_id": "uuid-here",
#   "operation_id": "google-operation-id",
#   "status": "processing",
#   "credit_cost": 40,
#   "estimated_completion_time": "11s-6min"
# }

# 2. Test missing API key
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
# Expected: 401 Unauthorized

# 3. Test invalid parameters
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "prompt": "test",
    "aspect_ratio": "invalid",
    "resolution": "720p",
    "duration": 4
  }'
# Expected: 400 Bad Request

# 4. Test GET /api/v1/video/status/:task_id (processing)
curl -X GET http://localhost:3000/api/v1/video/status/task-id-here \
  -H "x-api-key: your-api-key-here"

# Expected (processing):
# {
#   "task_id": "uuid-here",
#   "status": "processing",
#   "created_at": "2025-01-17T..."
# }

# Expected (completed):
# {
#   "task_id": "uuid-here",
#   "status": "completed",
#   "video_url": "https://...",
#   "thumbnail_url": "https://...",
#   "completed_at": "2025-01-17T...",
#   "created_at": "2025-01-17T..."
# }

# Expected (failed):
# {
#   "task_id": "uuid-here",
#   "status": "failed",
#   "error_message": "Safety filter triggered",
#   "error_code": "SAFETY_FILTER",
#   "refund_confirmed": true,
#   "created_at": "2025-01-17T..."
# }

# 5. Test task not found
curl -X GET http://localhost:3000/api/v1/video/status/invalid-task-id \
  -H "x-api-key: your-api-key-here"
# Expected: 404 Not Found

# 6. Test unauthorized access (another user's task)
curl -X GET http://localhost:3000/api/v1/video/status/another-users-task \
  -H "x-api-key: your-api-key-here"
# Expected: 403 Forbidden
```

## Acceptance Criteria

- [ ] POST /api/v1/video/generate endpoint created
- [ ] GET /api/v1/video/status/:task_id endpoint created
- [ ] API key validation works
- [ ] Parameter validation works (aspect_ratio, resolution, duration)
- [ ] Concurrent limit error returns 429
- [ ] Insufficient credits error returns 402
- [ ] Task not found returns 404
- [ ] Unauthorized access returns 403
- [ ] All error responses have meaningful messages
- [ ] API tests pass

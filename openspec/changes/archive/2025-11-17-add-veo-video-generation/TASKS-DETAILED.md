# Video Generation - Detailed Task Checklist

**Version**: 2.0 (Based on Latest Specs)
**Total Tasks**: 147
**Estimated Time**: 14 working days
**Status Format**: `- [ ]` = Pending, `- [x]` = Completed

---

## 📋 Task Tracking Instructions

1. **Mark tasks as completed** using `- [x]` after verification
2. **Add completion timestamp** in comments after task title
3. **Record blocker issues** in `## Blockers` section at bottom
4. **Update daily progress** in `## Daily Summary` section

---

## Stage 1: Database and Infrastructure (Days 1-2)

### Task 1.1: Create `video_generation_history` Table Migration

**File**: `supabase/migrations/20250117000001_create_video_generation_history.sql`
**Estimated Time**: 2 hours
**Dependencies**: None
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **1.1.1** Create migration file with proper naming convention
  ```sql
  -- Migration: Create video_generation_history table
  -- Created: 2025-01-17
  -- Author: [Your Name]

  CREATE TABLE IF NOT EXISTS video_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('processing', 'downloading', 'completed', 'failed')),

    -- Input parameters
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('16:9', '9:16')),
    resolution TEXT NOT NULL CHECK (resolution IN ('720p', '1080p')),
    duration INTEGER NOT NULL CHECK (duration IN (4, 6, 8)),
    reference_image_url TEXT,

    -- Credit tracking
    credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),

    -- Video URLs
    google_video_url TEXT,  -- Temporary (2-day expiry)
    permanent_video_url TEXT,  -- Supabase Storage
    thumbnail_url TEXT,

    -- Metadata
    file_size_bytes BIGINT,

    -- Error handling
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,

    CONSTRAINT valid_status_timestamps CHECK (
      (status = 'completed' AND completed_at IS NOT NULL) OR
      (status != 'completed' AND completed_at IS NULL)
    )
  );
  ```

- [ ] **1.1.2** Create indexes for performance
  ```sql
  -- Indexes for fast queries
  CREATE INDEX IF NOT EXISTS idx_video_generation_user_id
    ON video_generation_history(user_id);

  CREATE INDEX IF NOT EXISTS idx_video_generation_status
    ON video_generation_history(status)
    WHERE status IN ('processing', 'downloading');

  CREATE INDEX IF NOT EXISTS idx_video_generation_created_at
    ON video_generation_history(created_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_video_generation_operation_id
    ON video_generation_history(operation_id);
  ```

- [ ] **1.1.3** Create RLS (Row Level Security) policies
  ```sql
  -- Enable RLS
  ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

  -- Users can only see their own video generation history
  CREATE POLICY "Users can view own video history"
    ON video_generation_history
    FOR SELECT
    USING (auth.uid() = user_id);

  -- Users can insert their own records (via API)
  CREATE POLICY "Users can create own video tasks"
    ON video_generation_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Service role can update all records (for cron jobs)
  CREATE POLICY "Service role can update all records"
    ON video_generation_history
    FOR UPDATE
    USING (auth.role() = 'service_role');
  ```

- [ ] **1.1.4** Add helpful comments
  ```sql
  COMMENT ON TABLE video_generation_history IS
    'Stores all video generation requests and their status';

  COMMENT ON COLUMN video_generation_history.operation_id IS
    'Google Veo operation ID (unique identifier from API response)';

  COMMENT ON COLUMN video_generation_history.google_video_url IS
    'Temporary video URL from Google (expires after 2 days)';

  COMMENT ON COLUMN video_generation_history.permanent_video_url IS
    'Permanent video URL in Supabase Storage (never expires)';
  ```

#### Verification Steps
```bash
# 1. Run migration
supabase db push

# 2. Verify table exists
psql $DATABASE_URL -c "\d video_generation_history"

# 3. Test insert
psql $DATABASE_URL <<EOF
INSERT INTO video_generation_history (
  user_id, operation_id, status, prompt, aspect_ratio,
  resolution, duration, credit_cost
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test-operation-123',
  'processing',
  'A cat playing piano',
  '16:9',
  '720p',
  4,
  40
);
EOF

# 4. Verify constraints work
psql $DATABASE_URL -c "
  INSERT INTO video_generation_history (
    user_id, operation_id, status, prompt, aspect_ratio,
    resolution, duration, credit_cost
  ) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'test-invalid-status',
    'invalid-status',  -- Should fail
    'Test',
    '16:9',
    '720p',
    4,
    40
  );
" # Expected: ERROR

# 5. Verify unique constraint
psql $DATABASE_URL -c "
  INSERT INTO video_generation_history (
    user_id, operation_id, status, prompt, aspect_ratio,
    resolution, duration, credit_cost
  ) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'test-operation-123',  -- Duplicate operation_id
    'processing',
    'Test',
    '16:9',
    '720p',
    4,
    40
  );
" # Expected: ERROR (duplicate key)

# 6. Query performance test
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM video_generation_history
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
    AND status = 'processing';
" # Should use idx_video_generation_user_id
```

#### Acceptance Criteria
- [x] Migration file created with correct naming
- [x] All columns defined with proper types
- [x] All CHECK constraints added
- [x] All indexes created
- [x] RLS policies enabled
- [x] Migration runs without errors
- [x] Invalid data insertion fails correctly
- [x] Query performance <10ms for user_id + status filter

---

### Task 1.2: Extend `credit_transactions` Table

**File**: `supabase/migrations/20250117000002_extend_credit_transactions_for_video.sql`
**Estimated Time**: 1 hour
**Dependencies**: None
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **1.2.1** Add new transaction types to CHECK constraint
  ```sql
  -- Migration: Extend credit_transactions for video generation

  -- Drop existing CHECK constraint
  ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

  -- Add new CHECK constraint with video types
  ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_transaction_type_check
    CHECK (transaction_type IN (
      -- Existing types
      'purchase',
      'image_generation',
      'refund_image_generation',
      'admin_adjustment',
      'promotional_bonus',
      -- New video types
      'video_generation',
      'video_refund'
    ));
  ```

- [ ] **1.2.2** Add optional metadata column (if not exists)
  ```sql
  -- Add metadata column to store video-specific info
  ALTER TABLE credit_transactions
    ADD COLUMN IF NOT EXISTS metadata JSONB;

  -- Create index on metadata for faster queries
  CREATE INDEX IF NOT EXISTS idx_credit_transactions_metadata
    ON credit_transactions USING GIN (metadata);

  COMMENT ON COLUMN credit_transactions.metadata IS
    'Stores video generation details: task_id, duration, resolution, etc.';
  ```

- [ ] **1.2.3** Create helper function for video credit calculation
  ```sql
  -- Function to calculate video generation credit cost
  CREATE OR REPLACE FUNCTION calculate_video_credits(
    p_duration INTEGER,
    p_resolution TEXT
  ) RETURNS INTEGER AS $$
  DECLARE
    v_base_credits INTEGER;
    v_multiplier NUMERIC;
  BEGIN
    -- Base credits = duration × 10
    v_base_credits := p_duration * 10;

    -- Apply 1080p multiplier
    IF p_resolution = '1080p' THEN
      v_multiplier := 1.5;
    ELSE
      v_multiplier := 1.0;
    END IF;

    RETURN FLOOR(v_base_credits * v_multiplier);
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;

  COMMENT ON FUNCTION calculate_video_credits IS
    'Calculate credit cost for video generation: credits = duration × 10 × (is1080p ? 1.5 : 1.0)';
  ```

#### Verification Steps
```bash
# 1. Run migration
supabase db push

# 2. Test new transaction type insertion
psql $DATABASE_URL <<EOF
INSERT INTO credit_transactions (
  user_id, amount, balance_after, transaction_type, description, metadata
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  -60,
  940,
  'video_generation',
  '生成6秒视频 (720p)',
  '{"task_id": "abc123", "duration": 6, "resolution": "720p", "aspect_ratio": "16:9"}'::jsonb
);
EOF

# 3. Test credit calculation function
psql $DATABASE_URL -c "
  SELECT
    calculate_video_credits(4, '720p') AS cost_4s_720p,  -- Expected: 40
    calculate_video_credits(4, '1080p') AS cost_4s_1080p,  -- Expected: 60
    calculate_video_credits(6, '720p') AS cost_6s_720p,  -- Expected: 60
    calculate_video_credits(6, '1080p') AS cost_6s_1080p,  -- Expected: 90
    calculate_video_credits(8, '720p') AS cost_8s_720p,  -- Expected: 80
    calculate_video_credits(8, '1080p') AS cost_8s_1080p;  -- Expected: 120
"

# 4. Verify metadata query performance
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM credit_transactions
  WHERE metadata->>'task_id' = 'abc123';
" # Should use GIN index
```

#### Acceptance Criteria
- [x] CHECK constraint updated with new types
- [x] `metadata` column added (JSONB type)
- [x] GIN index created on metadata
- [x] `calculate_video_credits()` function works correctly
- [x] All 6 pricing tiers return correct values
- [x] Migration runs without errors

---

### Task 1.3: Add Video Configuration to `system_configs`

**File**: `supabase/migrations/20250117000003_add_video_system_configs.sql`
**Estimated Time**: 30 minutes
**Dependencies**: None
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **1.3.1** Insert video generation configs
  ```sql
  -- Migration: Add video generation system configs

  -- Video credit pricing (dynamic configuration)
  INSERT INTO system_configs (key, value, description, last_updated) VALUES
  ('video_credit_per_second', '10', 'Base credits charged per second of video (before resolution multiplier)', NOW()),
  ('video_1080p_multiplier', '1.5', 'Credit multiplier for 1080p resolution (1.0 for 720p)', NOW()),
  ('video_concurrent_limit', '3', 'Maximum concurrent video generation tasks per user', NOW()),
  ('video_generation_enabled', 'true', 'Enable/disable video generation feature globally', NOW()),
  ('video_max_retry_attempts', '3', 'Maximum download retry attempts for failed videos', NOW()),
  ('video_retry_delay_seconds', '30', 'Delay between download retry attempts', NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    last_updated = NOW();
  ```

- [ ] **1.3.2** Add helper function to get video config
  ```sql
  -- Function to safely get video config value
  CREATE OR REPLACE FUNCTION get_video_config(
    p_key TEXT,
    p_default TEXT DEFAULT NULL
  ) RETURNS TEXT AS $$
  DECLARE
    v_value TEXT;
  BEGIN
    SELECT value INTO v_value
    FROM system_configs
    WHERE key = p_key;

    RETURN COALESCE(v_value, p_default);
  END;
  $$ LANGUAGE plpgsql STABLE;
  ```

#### Verification Steps
```bash
# 1. Run migration
supabase db push

# 2. Verify configs exist
psql $DATABASE_URL -c "
  SELECT key, value, description
  FROM system_configs
  WHERE key LIKE 'video%'
  ORDER BY key;
"

# 3. Test config retrieval
psql $DATABASE_URL -c "
  SELECT
    get_video_config('video_credit_per_second') AS credits_per_second,
    get_video_config('video_1080p_multiplier') AS multiplier_1080p,
    get_video_config('video_concurrent_limit') AS concurrent_limit,
    get_video_config('video_generation_enabled') AS is_enabled;
"
```

#### Acceptance Criteria
- [x] All 6 video configs inserted
- [x] `get_video_config()` function works
- [x] Configs can be updated via admin panel (future)
- [x] Default values are correct

---

### Task 1.4: Create Supabase Storage Bucket for Videos

**File**: N/A (Supabase Dashboard or CLI)
**Estimated Time**: 30 minutes
**Dependencies**: None
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **1.4.1** Create `videos` bucket via Supabase Dashboard
  - Go to Storage → Create new bucket
  - Name: `videos`
  - Public: **No** (private bucket, RLS controlled)
  - File size limit: 50 MB (max for 8s 1080p video)
  - Allowed MIME types: `video/mp4, video/quicktime`

- [ ] **1.4.2** Set up RLS policies for `videos` bucket
  ```sql
  -- Policy: Users can upload their own videos (via service role only)
  CREATE POLICY "Service role can upload videos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'videos' AND
      auth.role() = 'service_role'
    );

  -- Policy: Users can read their own videos
  CREATE POLICY "Users can view own videos"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'videos' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Policy: Service role can update videos (for thumbnails)
  CREATE POLICY "Service role can update videos"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'videos' AND
      auth.role() = 'service_role'
    );
  ```

- [ ] **1.4.3** Test upload via Supabase client
  ```typescript
  // Test script: test-video-upload.ts
  import { createClient } from '@supabase/supabase-js'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for testing
  )

  async function testVideoUpload() {
    const testVideo = new Blob(['test video content'], { type: 'video/mp4' })
    const userId = 'test-user-id'
    const filePath = `${userId}/videos/test-${Date.now()}.mp4`

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(filePath, testVideo, {
        contentType: 'video/mp4',
        cacheControl: '31536000', // 1 year
        upsert: false
      })

    if (error) {
      console.error('Upload failed:', error)
      return
    }

    console.log('Upload successful:', data.path)

    // Get public URL (signed URL for private bucket)
    const { data: urlData } = await supabase.storage
      .from('videos')
      .createSignedUrl(data.path, 3600) // 1 hour expiry

    console.log('Signed URL:', urlData?.signedUrl)
  }

  testVideoUpload()
  ```

#### Verification Steps
```bash
# 1. Verify bucket exists
supabase storage list

# 2. Run test upload script
pnpm tsx test-video-upload.ts

# 3. Check storage in dashboard
# - Go to Supabase Dashboard → Storage → videos
# - Verify test file exists

# 4. Test RLS policy (as regular user, should fail)
# - Try to upload via client with anon key → Expected: ERROR

# 5. Test file access
# - Generate signed URL
# - Open in browser → Should play/download
```

#### Acceptance Criteria
- [x] `videos` bucket created
- [x] Bucket is private (public=false)
- [x] RLS policies configured
- [x] Service role can upload
- [x] Users can read their own videos
- [x] Signed URLs work correctly

---

### Task 1.5: Set Up Environment Variables

**File**: `.env.local`
**Estimated Time**: 15 minutes
**Dependencies**: Google Veo API access approved
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **1.5.1** Add Google Veo API key to `.env.local`
  ```bash
  # .env.local (add these lines)

  # Google Veo 3.1 API
  GOOGLE_AI_API_KEY=your_google_veo_api_key_here

  # Supabase (should already exist, verify)
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

  # Video Generation Configs (optional overrides)
  VIDEO_CREDIT_PER_SECOND=10
  VIDEO_1080P_MULTIPLIER=1.5
  VIDEO_CONCURRENT_LIMIT=3
  ```

- [ ] **1.5.2** Add to `.env.example` for documentation
  ```bash
  # .env.example (for team reference)

  # Google Veo 3.1 API (required for video generation)
  GOOGLE_AI_API_KEY=sk-...

  # Video Generation Settings (optional, defaults in system_configs)
  VIDEO_CREDIT_PER_SECOND=10
  VIDEO_1080P_MULTIPLIER=1.5
  VIDEO_CONCURRENT_LIMIT=3
  ```

- [ ] **1.5.3** Update `.gitignore` to ensure `.env.local` is ignored
  ```bash
  # Verify .gitignore contains:
  .env*.local
  .env.local
  ```

- [ ] **1.5.4** Test API key validity
  ```typescript
  // test-veo-api-key.ts
  async function testVeoApiKey() {
    const apiKey = process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      console.error('❌ GOOGLE_AI_API_KEY not found in environment')
      process.exit(1)
    }

    console.log('✅ API key found:', apiKey.substring(0, 10) + '...')

    // TODO: Make test API call to verify key works
    // (Will implement in Task 2.1 after creating Veo client)
  }

  testVeoApiKey()
  ```

#### Verification Steps
```bash
# 1. Check environment variables loaded
pnpm tsx -e "console.log(process.env.GOOGLE_AI_API_KEY ? '✅ Loaded' : '❌ Missing')"

# 2. Verify .env.local is gitignored
git check-ignore .env.local
# Expected: .env.local (should be ignored)

# 3. Test Supabase connection
pnpm tsx -e "
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  console.log('✅ Supabase client created');
"
```

#### Acceptance Criteria
- [x] `GOOGLE_AI_API_KEY` added to `.env.local`
- [x] `.env.example` updated with documentation
- [x] `.env.local` is gitignored
- [x] Environment variables load correctly in Next.js

---

## Stage 2: Backend API (Days 3-5)

### Task 2.1: Implement Veo Client

**File**: `lib/veo-client.ts`
**Estimated Time**: 4 hours
**Dependencies**: Task 1.5 (Environment setup)
**Priority**: P0 (Blocking)

#### Subtasks

- [ ] **2.1.1** Create Veo client class with API methods
  ```typescript
  // lib/veo-client.ts
  import { GoogleGenerativeAI } from '@google/generative-ai';

  export interface VideoGenerationParams {
    prompt: string;
    negativePrompt?: string;
    duration: 4 | 6 | 8;  // seconds
    resolution: '720p' | '1080p';
    aspectRatio: '16:9' | '9:16';
    referenceImageUrl?: string;
  }

  export interface VeoOperation {
    operationId: string;
    status: 'processing' | 'completed' | 'failed';
    videoUrl?: string;  // Temporary Google URL (2-day expiry)
    error?: {
      code: string;
      message: string;
    };
    estimatedCompletionTime?: string;  // ISO 8601 format
  }

  export class VeoClient {
    private client: GoogleGenerativeAI;

    constructor(apiKey: string) {
      if (!apiKey) {
        throw new Error('Google Veo API key is required');
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Generate video from text prompt
     * @returns Operation ID for status polling
     */
    async generateVideo(params: VideoGenerationParams): Promise<VeoOperation> {
      try {
        const model = this.client.getGenerativeModel({ model: 'veo-3.1' });

        // Convert params to Veo API format
        const request = {
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          config: {
            duration: params.duration,
            resolution: params.resolution === '1080p' ? { width: 1920, height: 1080 } : { width: 1280, height: 720 },
            aspectRatio: params.aspectRatio,
          },
          referenceImage: params.referenceImageUrl ? {
            url: params.referenceImageUrl
          } : undefined
        };

        const response = await model.generateContent(request);

        // Extract operation ID from response
        const operationId = response.operationId;

        if (!operationId) {
          throw new Error('No operation ID returned from Veo API');
        }

        return {
          operationId,
          status: 'processing',
          estimatedCompletionTime: this.estimateCompletionTime(params.duration)
        };
      } catch (error: any) {
        // Handle specific error types
        if (error.code === 'SAFETY_FILTER') {
          throw new Error('Content blocked by safety filter. Please revise your prompt.');
        }

        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('API rate limit exceeded. Please try again later.');
        }

        throw new Error(`Video generation failed: ${error.message}`);
      }
    }

    /**
     * Check status of video generation operation
     */
    async checkOperationStatus(operationId: string): Promise<VeoOperation> {
      try {
        const model = this.client.getGenerativeModel({ model: 'veo-3.1' });
        const operation = await model.getOperation(operationId);

        if (operation.done) {
          if (operation.error) {
            return {
              operationId,
              status: 'failed',
              error: {
                code: operation.error.code,
                message: operation.error.message
              }
            };
          }

          // Extract video URL from result
          const videoUrl = operation.result?.videoUrl;

          if (!videoUrl) {
            throw new Error('No video URL in completed operation');
          }

          return {
            operationId,
            status: 'completed',
            videoUrl
          };
        }

        return {
          operationId,
          status: 'processing'
        };
      } catch (error: any) {
        throw new Error(`Failed to check operation status: ${error.message}`);
      }
    }

    /**
     * Estimate completion time based on duration
     * Veo 3.1 generation time: ~11 seconds to 6 minutes
     */
    private estimateCompletionTime(duration: number): string {
      const estimatedSeconds = duration * 15; // Rough estimate: 15s per second of video
      const completionTime = new Date(Date.now() + estimatedSeconds * 1000);
      return completionTime.toISOString();
    }
  }

  // Singleton instance
  let veoClient: VeoClient | null = null;

  export function getVeoClient(): VeoClient {
    if (!veoClient) {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
      }
      veoClient = new VeoClient(apiKey);
    }
    return veoClient;
  }
  ```

- [ ] **2.1.2** Add error handling types
  ```typescript
  // lib/veo-client.ts (add to file)

  export class VeoAPIError extends Error {
    constructor(
      public code: string,
      public message: string,
      public details?: any
    ) {
      super(message);
      this.name = 'VeoAPIError';
    }
  }

  export class VeoSafetyFilterError extends VeoAPIError {
    constructor(message: string = 'Content blocked by safety filter') {
      super('SAFETY_FILTER', message);
      this.name = 'VeoSafetyFilterError';
    }
  }

  export class VeoRateLimitError extends VeoAPIError {
    constructor(message: string = 'API rate limit exceeded') {
      super('RATE_LIMIT_EXCEEDED', message);
      this.name = 'VeoRateLimitError';
    }
  }
  ```

- [ ] **2.1.3** Add unit tests
  ```typescript
  // lib/veo-client.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { VeoClient, VeoAPIError } from './veo-client';

  describe('VeoClient', () => {
    let client: VeoClient;

    beforeEach(() => {
      client = new VeoClient('test-api-key');
    });

    it('should create client with valid API key', () => {
      expect(client).toBeInstanceOf(VeoClient);
    });

    it('should throw error without API key', () => {
      expect(() => new VeoClient('')).toThrow('API key is required');
    });

    it('should generate video with valid params', async () => {
      // Mock Google AI response
      vi.mock('@google/generative-ai');

      const result = await client.generateVideo({
        prompt: 'A cat playing piano',
        duration: 4,
        resolution: '720p',
        aspectRatio: '16:9'
      });

      expect(result.operationId).toBeDefined();
      expect(result.status).toBe('processing');
    });

    // More tests...
  });
  ```

#### Verification Steps
```bash
# 1. Type check
pnpm tsc --noEmit

# 2. Run unit tests
pnpm test lib/veo-client.test.ts

# 3. Manual API test
pnpm tsx <<EOF
import { getVeoClient } from './lib/veo-client';

const client = getVeoClient();

// Test video generation
const result = await client.generateVideo({
  prompt: 'A cat playing with a ball of yarn',
  duration: 4,
  resolution: '720p',
  aspectRatio: '16:9'
});

console.log('Operation ID:', result.operationId);
console.log('Status:', result.status);
console.log('Estimated completion:', result.estimatedCompletionTime);
EOF

# 4. Test status check (use operation ID from step 3)
pnpm tsx <<EOF
import { getVeoClient } from './lib/veo-client';

const client = getVeoClient();
const status = await client.checkOperationStatus('OPERATION_ID_HERE');

console.log('Status:', status);
EOF
```

#### Acceptance Criteria
- [x] VeoClient class implemented
- [x] `generateVideo()` method works
- [x] `checkOperationStatus()` method works
- [x] Error handling for safety filter, rate limits
- [x] Unit tests pass
- [x] Type definitions are correct
- [x] Singleton pattern works

---

### Task 2.2: Implement Video Service

**📄 Detailed Implementation**: See [tasks/stage2-task2.2.md](tasks/stage2-task2.2.md)

**File**: `lib/video-service.ts`
**Estimated Time**: 6 hours
**Dependencies**: Task 2.1 (Veo client), Task 1.1-1.3 (Database)
**Priority**: P0 (Blocking)

**Summary**: Business logic service for managing video generation lifecycle (create, status, list, download, refund)

---

### Task 2.3: Extend Credit Service for Video Transactions

**📄 Detailed Implementation**: See [tasks/stage2-task2.3.md](tasks/stage2-task2.3.md)

**File**: `lib/credit-service.ts`
**Estimated Time**: 2 hours
**Dependencies**: Task 1.2 (system_configs), existing credit service
**Priority**: P0 (Blocking)

**Summary**: Add video transaction types, dynamic pricing, duplicate refund prevention

---

### Task 2.4: Create API Endpoints (POST /generate, GET /status)

**📄 Detailed Implementation**: See [tasks/stage2-task2.4.md](tasks/stage2-task2.4.md)

**Files**:
- `app/api/v1/video/generate/route.ts`
- `app/api/v1/video/status/[task_id]/route.ts`

**Estimated Time**: 4 hours
**Dependencies**: Task 2.2 (VideoService), Task 2.3 (CreditService)
**Priority**: P0 (Blocking)

**Summary**: RESTful API endpoints with API key authentication, parameter validation, error handling

---

### Task 2.5: Implement Vercel Cron Polling Job

**📄 Detailed Implementation**: See [tasks/stage2-task2.5.md](tasks/stage2-task2.5.md)

**File**: `app/api/cron/poll-video-status/route.ts`
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2 (VideoService), Task 2.1 (VeoClient)
**Priority**: P0 (Blocking)

**Summary**: Background job checking Google Veo operation status every 2 minutes

---

### Task 2.6: Implement Auto Download Job

**📄 Detailed Implementation**: See [tasks/stage2-task2.6.md](tasks/stage2-task2.6.md)

**File**: `app/api/cron/download-videos/route.ts`
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2 (VideoService), Task 1.4 (Supabase Storage)
**Priority**: P0 (Blocking)

**Summary**: Download videos from Google to Supabase Storage with retry logic (max 3 attempts)

---

### Task 2.7: Add RLS Policies for video_generation_history

**📄 Detailed Implementation**: See [tasks/stage2-task2.7.md](tasks/stage2-task2.7.md)

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_video_rls_policies.sql`
**Estimated Time**: 1 hour
**Dependencies**: Task 1.1 (video_generation_history table)
**Priority**: P1 (Important)

**Summary**: Row Level Security policies (SELECT, INSERT, UPDATE, DELETE) with admin override

---

### Task 2.8: Integration Testing for Backend API

**📄 Detailed Implementation**: See [tasks/stage2-task2.8.md](tasks/stage2-task2.8.md)

**File**: `tests/integration/video-generation.test.ts`
**Estimated Time**: 4 hours
**Dependencies**: All Stage 2 tasks (2.1-2.7)
**Priority**: P1 (Important)

**Summary**: End-to-end tests for API endpoints, concurrent limits, credit handling, cron jobs

---

## Stage 3: Frontend UX Components (7 tasks, Days 6-9, 32 hours)

### Task 3.1: Create Video Generation Form Component

**📄 Detailed Implementation**: See [tasks/stage3-task3.1.md](tasks/stage3-task3.1.md)

**File**: `components/video-generation-form.tsx`
**Estimated Time**: 5 hours
**Dependencies**: Task 2.4 (API endpoints)
**Priority**: P0 (Blocking)

**Summary**: Unified image/video form with tabs, parameter selectors, credit cost calculator

---

### Task 3.2: Create Video Status Page

**📄 Detailed Implementation**: See [tasks/stage3-task3.2.md](tasks/stage3-task3.2.md)

**File**: `app/video-status/[task_id]/page.tsx`
**Estimated Time**: 4 hours
**Dependencies**: Task 2.4 (API endpoints)
**Priority**: P0 (Blocking)

**Summary**: Real-time polling page showing generation progress, video player, download button

---

### Task 3.3: Create Video History Selector

**📄 Detailed Implementation**: See [tasks/stage3-task3.3.md](tasks/stage3-task3.3.md)

**File**: `components/video-history-selector.tsx`
**Estimated Time**: 4 hours
**Dependencies**: Task 2.2 (VideoService)
**Priority**: P1 (Important)

**Summary**: Unified content type selector (All/Images/Videos) with status filtering

---

### Task 3.4: Integrate Prompt Optimizer for Videos

**📄 Detailed Implementation**: See [tasks/stage3-task3.4.md](tasks/stage3-task3.4.md)

**File**: `components/prompt-optimizer.tsx` (extend existing)
**Estimated Time**: 3 hours
**Dependencies**: Existing prompt optimizer
**Priority**: P2 (Nice to have)

**Summary**: Add `content_type: 'video'` parameter, video-specific optimization suggestions

---

### Task 3.5: Update Hero Carousel with Video Support

**📄 Detailed Implementation**: See [tasks/stage3-task3.5.md](tasks/stage3-task3.5.md)

**File**: `components/hero.tsx`
**Estimated Time**: 3 hours
**Dependencies**: None
**Priority**: P2 (Nice to have)

**Summary**: Add video player to carousel, autoplay muted, play/pause controls

---

### Task 3.6: Add Video Card to Features Section

**📄 Detailed Implementation**: See [tasks/stage3-task3.6.md](tasks/stage3-task3.6.md)

**File**: `components/features.tsx`
**Estimated Time**: 2 hours
**Dependencies**: None
**Priority**: P2 (Nice to have)

**Summary**: New feature card highlighting video generation capabilities

---

### Task 3.7: Extend Showcase System with Video Tab

**📄 Detailed Implementation**: See [tasks/stage3-task3.7.md](tasks/stage3-task3.7.md)

**File**: `app/showcase/page.tsx`
**Estimated Time**: 3 hours
**Dependencies**: Task 1.3 (showcase_items extension)
**Priority**: P2 (Nice to have)

**Summary**: Add "Videos" tab to showcase gallery, video grid with thumbnails

---

## Stage 4: Management and Extensions (4 tasks, Days 10-11, 16 hours)

### Task 4.1: Add Video Tab to Admin User Detail Modal

**📄 Detailed Implementation**: See [tasks/stage4-task4.1.md](tasks/stage4-task4.1.md)

**File**: `app/admin/components/user-detail-modal.tsx` (extend existing)
**Estimated Time**: 4 hours
**Dependencies**: Task 2.2 (VideoService)
**Priority**: P1 (Important)

**Summary**: Admin panel tab showing user's video consumption, stats, actions (refund/delete)

---

### Task 4.2: Extend Personal Center Video History

**📄 Detailed Implementation**: See [tasks/stage4-task4.2.md](tasks/stage4-task4.2.md)

**File**: `app/profile/page.tsx` (extend existing)
**Estimated Time**: 4 hours
**Dependencies**: Task 3.3 (History selector)
**Priority**: P1 (Important)

**Summary**: Unified image/video list with content type filter, pagination, status badges

---

### Task 4.3: Update Pricing Page with Video Costs

**📄 Detailed Implementation**: See [tasks/stage4-task4.3.md](tasks/stage4-task4.3.md)

**File**: `app/pricing/page.tsx`
**Estimated Time**: 2 hours
**Dependencies**: None
**Priority**: P2 (Nice to have)

**Summary**: Add video generation pricing table (6 tiers), comparison with image generation

---

### Task 4.4: Add Video Generation to API Documentation

**📄 Detailed Implementation**: See [tasks/stage4-task4.4.md](tasks/stage4-task4.4.md)

**File**: `app/api-docs/page.tsx`
**Estimated Time**: 2 hours
**Dependencies**: Task 2.4 (API endpoints)
**Priority**: P2 (Nice to have)

**Summary**: API reference docs for POST /video/generate and GET /video/status/:task_id

---

## Stage 5: Testing and Optimization (4 tasks, Days 12-14, 24 hours)

### Task 5.1: End-to-End Testing (E2E)

**📄 Detailed Implementation**: See [tasks/stage5-task5.1.md](tasks/stage5-task5.1.md)

**File**: `tests/e2e/video-generation.spec.ts`
**Estimated Time**: 8 hours
**Dependencies**: All previous tasks
**Priority**: P0 (Blocking)

**Summary**: Playwright E2E tests covering full user flow (form → generation → status → history)

---

### Task 5.2: Performance Optimization

**📄 Detailed Implementation**: See [tasks/stage5-task5.2.md](tasks/stage5-task5.2.md)

**Files**: Various
**Estimated Time**: 6 hours
**Dependencies**: All previous tasks
**Priority**: P1 (Important)

**Summary**: Database indexing, query optimization, lazy loading, caching strategies

---

### Task 5.3: Error Monitoring and Logging

**📄 Detailed Implementation**: See [tasks/stage5-task5.3.md](tasks/stage5-task5.3.md)

**Files**: Various
**Estimated Time**: 4 hours
**Dependencies**: All previous tasks
**Priority**: P1 (Important)

**Summary**: Structured logging, error tracking (Sentry integration), alerting rules

---

### Task 5.4: Documentation and Deployment

**📄 Detailed Implementation**: See [tasks/stage5-task5.4.md](tasks/stage5-task5.4.md)

**Files**: README.md, DEPLOYMENT.md, etc.
**Estimated Time**: 6 hours
**Dependencies**: All previous tasks
**Priority**: P1 (Important)

**Summary**: User guides, admin guides, deployment checklist, runbook

---

## ⏱️ Estimated Time Breakdown

| Stage | Tasks | Estimated Time |
|-------|-------|----------------|
| Stage 1: Infrastructure | 5 tasks | Days 1-2 (16 hours) |
| Stage 2: Backend API | 8 tasks | Days 3-5 (24 hours) |
| Stage 3: Frontend UX | 7 tasks | Days 6-9 (32 hours) |
| Stage 4: Extensions | 4 tasks | Days 10-11 (16 hours) |
| Stage 5: Testing | 4 tasks | Days 12-14 (24 hours) |
| **Total** | **28 major tasks** | **14 working days (112 hours)** |

---

## 🚧 Blockers

(Record any blockers here)

**Example Format**:
```
[2025-01-17] Task 1.5: Waiting for Google Veo API access approval
[2025-01-18] Task 2.3: Vercel Cron not working in local dev environment
```

---

## 📊 Daily Summary

(Update daily progress here)

**Example Format**:
```
### Day 1 (2025-01-17)
- ✅ Completed: Tasks 1.1, 1.2, 1.3
- 🔄 In Progress: Task 1.4
- ⏸️ Blocked: Task 1.5 (waiting for API key)
- 🎯 Tomorrow: Complete Task 1.4, 1.5, start Task 2.1
```

---

**Note**: This is a living document. Update task statuses as you progress and add notes for any deviations from the plan.

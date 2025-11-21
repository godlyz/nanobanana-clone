# Task 5.4: Documentation & Deployment

**Files**: README.md, deployment docs
**Estimated Time**: 3 hours
**Dependencies**: All previous stages
**Priority**: P0 (Blocking)

## Overview

Update project documentation and prepare for production deployment

## Subtasks

### 5.4.1: Update README.md

```markdown
# Nano Banana - AI Image & Video Editor

## Features

### Video Generation (Powered by Google Veo 3.1)

Generate high-quality videos from text prompts with advanced controls:

- **Natural Language Prompts**: Describe your video in plain English or Chinese
- **Duration Options**: 4s, 6s, or 8s videos
- **Resolution**: 720p or 1080p output
- **Aspect Ratios**: 16:9 (landscape) or 9:16 (portrait)
- **Negative Prompts**: Specify what to avoid
- **Reference Images**: Upload a reference for style consistency
- **Character Consistency**: Maintain character appearance across videos
- **Scene Preservation**: Keep consistent backgrounds and environments

#### Pricing

| Duration | Resolution | Credits |
|----------|------------|---------|
| 4s       | 720p       | 40      |
| 4s       | 1080p      | 60      |
| 6s       | 720p       | 60      |
| 6s       | 1080p      | 90      |
| 8s       | 720p       | 80      |
| 8s       | 1080p      | 120     |

**Note**: Failed generations are automatically refunded to your account.

#### API Access

```javascript
// Generate a video via API
const response = await fetch('https://nanobanana.com/api/v1/video/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({
    prompt: 'A cat playing piano in a jazz club',
    aspect_ratio: '16:9',
    resolution: '720p',
    duration: 4,
  }),
});

const { task_id } = await response.json();

// Check status
const statusResponse = await fetch(
  `https://nanobanana.com/api/v1/video/status/${task_id}`,
  {
    headers: { 'x-api-key': 'YOUR_API_KEY' },
  }
);

const status = await statusResponse.json();
console.log(status.status); // processing | downloading | completed | failed
```

See [API Documentation](/api-docs) for full details.

### Image Editing

... (existing features)

## Quick Start

1. **Sign up** at [nanobanana.com](https://nanobanana.com)
2. **Get credits**: Purchase a credit package or start with free trial
3. **Generate videos**: Go to Video Editor and enter your prompt
4. **Track progress**: View real-time status and download when ready

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- Google Veo API key

### Environment Variables

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Veo API
GOOGLE_AI_API_KEY=your_google_veo_api_key
GOOGLE_VEO_PROJECT_ID=your_google_project_id

# Vercel Cron Secret
CRON_SECRET=your_random_secret_string

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your values

# Run database migrations
pnpm supabase db push

# Start development server
pnpm dev
```

### Database Setup

```sql
-- Create video_generation_history table
CREATE TABLE video_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID UNIQUE NOT NULL,
  operation_id TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  duration INTEGER NOT NULL,
  reference_image_url TEXT,
  status TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  error_code TEXT,
  credit_cost INTEGER NOT NULL,
  refund_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_video_generation_user_status ON video_generation_history(user_id, status);
CREATE INDEX idx_video_generation_created_at ON video_generation_history(created_at DESC);
CREATE INDEX idx_video_generation_history_lookup ON video_generation_history(user_id, status, created_at DESC);

-- Enable RLS
ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own video history"
  ON video_generation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video history"
  ON video_generation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update video history"
  ON video_generation_history FOR UPDATE
  USING (TRUE);
```

### Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-video-status",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/download-videos",
      "schedule": "* * * * *"
    }
  ]
}
```

## Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured in Vercel
- [ ] Database migrations applied to production Supabase
- [ ] Google Veo API quota verified
- [ ] Supabase Storage bucket created (`video-generations`)
- [ ] RLS policies enabled on all tables
- [ ] Vercel cron jobs configured
- [ ] Error monitoring (Sentry) configured
- [ ] Performance monitoring enabled

### Deploy to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

### Post-deployment Verification

```bash
# 1. Test video generation endpoint
curl -X POST https://nanobanana.com/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "Test video",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'

# 2. Verify cron jobs are running
# Check Vercel dashboard > Deployments > Cron Logs

# 3. Test status endpoint
curl https://nanobanana.com/api/v1/video/status/TASK_ID \
  -H "x-api-key: YOUR_API_KEY"

# 4. Check error monitoring
# Verify errors appear in Sentry dashboard

# 5. Performance test
# Run Lighthouse audit on https://nanobanana.com/video-editor
npx lighthouse https://nanobanana.com/video-editor --view
```

### Monitoring

**Key Metrics to Track:**

1. **API Performance**:
   - `/api/v1/video/generate` response time (target: < 500ms)
   - `/api/v1/video/status/:id` response time (target: < 200ms)

2. **Video Generation Success Rate**:
   - Track `completed / (completed + failed)` ratio (target: > 95%)

3. **Credit Refund Accuracy**:
   - Verify all failed tasks get refunds
   - Monitor for duplicate refund attempts

4. **Cron Job Health**:
   - `check-video-status` execution time (target: < 30s)
   - `download-videos` execution time (target: < 60s)

5. **Storage Usage**:
   - Supabase Storage bucket size
   - Average video file size

**Alerts to Configure:**

- Error rate > 5% in last hour
- Cron job failure
- Google Veo API quota exceeded
- Supabase Storage > 80% capacity
- Response time > 2x baseline

## Troubleshooting

### Common Issues

**Issue**: Video generation stuck in "processing" status

**Solution**:
1. Check Google Veo API status
2. Verify cron job is running: check Vercel logs
3. Manually trigger status check: `/api/cron/check-video-status?secret=CRON_SECRET`

**Issue**: Download job fails with 404

**Solution**:
- Google video URLs expire after 2 days
- Check `created_at` timestamp
- If expired, video cannot be recovered (refund user)

**Issue**: Duplicate refunds

**Solution**:
- Check `refund_confirmed` flag in database
- Review credit transaction logs
- Use database transactions to prevent race conditions

**Issue**: High error rate

**Solution**:
1. Check Sentry for error patterns
2. Review API logs for 503 errors from Google Veo
3. Verify prompt validation is working
4. Check for safety filter triggers

## License

MIT

## Support

- Documentation: [docs.nanobanana.com](https://docs.nanobanana.com)
- API Docs: [nanobanana.com/api-docs](https://nanobanana.com/api-docs)
- Email: support@nanobanana.com
```

### 5.4.2: Create DEPLOYMENT.md

```markdown
# Deployment Guide - Video Generation Feature

## Prerequisites

- Vercel account with Pro plan (for cron jobs)
- Supabase project (production)
- Google Cloud project with Veo API enabled
- Domain configured (optional)

## Step 1: Database Setup

### 1.1 Create Tables

```sql
-- Run in Supabase SQL Editor (Production)

CREATE TABLE video_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  task_id UUID UNIQUE NOT NULL,
  operation_id TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  duration INTEGER NOT NULL,
  reference_image_url TEXT,
  status TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  error_code TEXT,
  credit_cost INTEGER NOT NULL,
  refund_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX idx_video_generation_user_status ON video_generation_history(user_id, status);
CREATE INDEX idx_video_generation_created_at ON video_generation_history(created_at DESC);
CREATE INDEX idx_video_generation_history_lookup ON video_generation_history(user_id, status, created_at DESC);
```

### 1.2 Enable RLS

```sql
ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video history"
  ON video_generation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video history"
  ON video_generation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update video history"
  ON video_generation_history FOR UPDATE
  USING (TRUE);
```

### 1.3 Create Storage Bucket

```bash
# In Supabase dashboard > Storage
# 1. Create new bucket: "video-generations"
# 2. Set to Public
# 3. Configure CORS:
{
  "allowedOrigins": ["https://nanobanana.com"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "maxAgeSeconds": 3600
}
```

## Step 2: Environment Variables

### 2.1 Vercel Environment Variables

Add in Vercel Dashboard > Settings > Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Google Veo
GOOGLE_AI_API_KEY=AIzaSxxx
GOOGLE_VEO_PROJECT_ID=your-project-id

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET=your_random_secret_string

# App URL
NEXT_PUBLIC_APP_URL=https://nanobanana.com

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=xxx
```

### 2.2 Verify Environment

```bash
# Test locally first
cp .env.local.example .env.local
# Fill in values
pnpm dev

# Test API endpoint
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "Test video",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'
```

## Step 3: Configure Vercel Cron

### 3.1 Update vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/check-video-status",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/download-videos",
      "schedule": "* * * * *"
    }
  ]
}
```

### 3.2 Verify Cron Jobs After Deployment

1. Go to Vercel Dashboard > Deployments
2. Check "Cron" tab
3. Verify both jobs appear with correct schedules
4. Manually trigger to test:

```bash
curl https://nanobanana.com/api/cron/check-video-status?secret=CRON_SECRET
curl https://nanobanana.com/api/cron/download-videos?secret=CRON_SECRET
```

## Step 4: Deploy

### 4.1 Build and Deploy

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### 4.2 Post-deployment Checks

```bash
# 1. Test video generation
curl -X POST https://nanobanana.com/api/v1/video/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "A sunset over mountains",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": 4
  }'

# Response should include task_id
# {
#   "success": true,
#   "task_id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "processing",
#   "credit_cost": 40
# }

# 2. Check status
curl https://nanobanana.com/api/v1/video/status/TASK_ID \
  -H "x-api-key: YOUR_API_KEY"

# 3. Verify cron jobs ran
# Check Vercel dashboard > Deployments > Cron Logs

# 4. Test video history
curl https://nanobanana.com/api/v1/video/history \
  -H "x-api-key: YOUR_API_KEY"
```

## Step 5: Monitoring Setup

### 5.1 Sentry Configuration

```bash
# Install Sentry
pnpm add @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Configure in sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 5.2 Set Up Alerts

**In Sentry Dashboard:**

1. Create alert for error rate > 5% in 1 hour
2. Create alert for cron job failures
3. Create alert for API response time > 2s

**In Vercel Dashboard:**

1. Enable deployment notifications
2. Configure Slack/email for failed deployments
3. Monitor function execution time

### 5.3 Performance Monitoring

```bash
# Run Lighthouse audit
npx lighthouse https://nanobanana.com/video-editor --view

# Target scores:
# - Performance: >= 90
# - Accessibility: >= 95
# - Best Practices: >= 90
# - SEO: >= 90
```

## Step 6: Database Maintenance

### 6.1 Set Up Automated Cleanup (Optional)

```sql
-- Clean up old failed tasks (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_video_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM video_generation_history
  WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (if available)
-- Or run manually monthly
```

### 6.2 Monitor Database Size

```sql
-- Check table size
SELECT
  pg_size_pretty(pg_total_relation_size('video_generation_history')) as total_size,
  pg_size_pretty(pg_relation_size('video_generation_history')) as table_size,
  pg_size_pretty(pg_indexes_size('video_generation_history')) as indexes_size;

-- Check row count by status
SELECT status, COUNT(*) FROM video_generation_history GROUP BY status;
```

## Rollback Plan

### If Issues Occur Post-deployment

**Option 1: Revert Deployment**

```bash
# In Vercel dashboard
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "..." > "Promote to Production"
```

**Option 2: Disable Feature**

```typescript
// Add feature flag in lib/feature-flags.ts
export const FEATURE_FLAGS = {
  VIDEO_GENERATION: process.env.NEXT_PUBLIC_ENABLE_VIDEO === 'true',
};

// In video editor page
if (!FEATURE_FLAGS.VIDEO_GENERATION) {
  return <ComingSoonBanner />;
}
```

**Option 3: Pause Cron Jobs**

```bash
# Temporarily return early in cron endpoints
// app/api/cron/check-video-status/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Temporarily disabled' });
}
```

## Success Criteria

- [ ] All environment variables configured
- [ ] Database tables created with RLS enabled
- [ ] Storage bucket created and accessible
- [ ] Vercel cron jobs running every 2 minutes / 1 minute
- [ ] Test video generation completes successfully
- [ ] Sentry capturing errors
- [ ] Lighthouse performance score >= 90
- [ ] API response times < 500ms
- [ ] No critical errors in first 24 hours
- [ ] Refund logic working correctly

## Support

If issues occur:

1. Check Vercel logs: `vercel logs`
2. Check Sentry error dashboard
3. Verify Supabase database health
4. Review Google Veo API quota
5. Contact: devops@nanobanana.com
```

### 5.4.3: Create ENVIRONMENT_VARIABLES.md

```markdown
# Environment Variables Reference

## Required Variables

### Supabase

```bash
# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase anonymous key (safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase service role key (server-side only, keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy URL, anon key, and service_role key

### Google Veo API

```bash
# Google AI API key with Veo access
GOOGLE_AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Cloud project ID
GOOGLE_VEO_PROJECT_ID=your-project-id-12345
```

**How to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable "Generative AI API" (Veo)
4. Go to APIs & Services > Credentials
5. Create API Key
6. Restrict API key to only "Generative AI API"

**Note**: Google Veo API costs $0.75 per second of video generated.

### Vercel Cron Secret

```bash
# Random secret string to protect cron endpoints
CRON_SECRET=your_random_secret_string_here
```

**How to generate:**

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use online generator
# https://generate-secret.vercel.app/32
```

**Purpose**: Prevents unauthorized access to cron job endpoints.

## Optional Variables

### Application URL

```bash
# Your app's public URL
NEXT_PUBLIC_APP_URL=https://nanobanana.com

# For local development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Sentry Error Monitoring

```bash
# Sentry DSN for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Sentry auth token (for uploading source maps)
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

**How to get:**
1. Go to [Sentry.io](https://sentry.io)
2. Create a project
3. Copy DSN from Settings > Client Keys
4. Create auth token in Settings > Auth Tokens

### Analytics

```bash
# Vercel Analytics ID (automatically set by Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=xxxxx

# Google Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Feature Flags

```bash
# Enable/disable video generation feature
NEXT_PUBLIC_ENABLE_VIDEO=true

# Enable/disable other features
NEXT_PUBLIC_ENABLE_API=true
NEXT_PUBLIC_ENABLE_ADMIN=true
```

## Setting Up Environment Variables

### Local Development (.env.local)

```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Example .env.local:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Veo
GOOGLE_AI_API_KEY=AIzaSyxxxxx
GOOGLE_VEO_PROJECT_ID=my-project-12345

# Cron Secret
CRON_SECRET=my_local_secret_123

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Production

**Via Vercel Dashboard:**

1. Go to your project in Vercel
2. Click Settings > Environment Variables
3. Add each variable with its value
4. Select environment: Production, Preview, or Development
5. Click "Save"

**Via Vercel CLI:**

```bash
# Set a single variable
vercel env add GOOGLE_AI_API_KEY production

# Import from .env file
vercel env pull .env.local
```

**Important:**
- Never commit `.env.local` to git
- Keep `.env.local.example` updated (without actual secrets)
- Use different values for production vs development

## Security Best Practices

### 1. Never Expose Service Role Key

```typescript
// ❌ WRONG - Never use in client components
'use client'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ✅ CORRECT - Only use in server components or API routes
// app/api/video/route.ts (server-side)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
```

### 2. Rotate Keys Regularly

- Rotate API keys every 90 days
- Rotate CRON_SECRET if compromised
- Update Supabase keys if leaked

### 3. Use Environment-specific Values

```bash
# Development
GOOGLE_AI_API_KEY=dev_key_with_low_quota

# Production
GOOGLE_AI_API_KEY=prod_key_with_high_quota
```

### 4. Verify in CI/CD

```yaml
# .github/workflows/ci.yml
- name: Check required env vars
  run: |
    test -n "$NEXT_PUBLIC_SUPABASE_URL"
    test -n "$GOOGLE_AI_API_KEY"
```

## Troubleshooting

### Error: "Supabase client not initialized"

**Cause**: Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Fix**: Verify both variables are set in `.env.local` and restart dev server

### Error: "Google Veo API authentication failed"

**Cause**: Invalid or missing `GOOGLE_AI_API_KEY`

**Fix**:
1. Verify API key is correct
2. Check API is enabled in Google Cloud Console
3. Verify quota is not exceeded

### Error: "Unauthorized" on cron endpoints

**Cause**: Missing or incorrect `CRON_SECRET`

**Fix**:
1. Set `CRON_SECRET` in Vercel environment variables
2. Ensure Vercel cron jobs use correct secret
3. Check cron job configuration in `vercel.json`

### Error: "Storage bucket not found"

**Cause**: Supabase Storage bucket not created

**Fix**:
1. Go to Supabase Dashboard > Storage
2. Create bucket named `video-generations`
3. Set bucket to Public
4. Configure CORS for your domain

## Validation Checklist

Before deploying to production:

- [ ] All required variables set in Vercel
- [ ] `.env.local.example` is up to date
- [ ] No secrets committed to git
- [ ] Service role key only used server-side
- [ ] CRON_SECRET is random and secure
- [ ] Google Veo API quota verified
- [ ] Supabase project is production-ready
- [ ] Storage bucket created and accessible
- [ ] Environment variables tested locally
- [ ] All API endpoints return expected responses
```

## Verification Steps

```bash
# 1. Verify all documentation files exist
ls -la README.md DEPLOYMENT.md ENVIRONMENT_VARIABLES.md

# 2. Test deployment locally
pnpm build
pnpm start

# 3. Verify all links in README work
# Manual check: open README.md and click all links

# 4. Test API documentation examples
# Copy code from README and test:
node -e "
const testAPI = async () => {
  const response = await fetch('http://localhost:3000/api/v1/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test_key',
    },
    body: JSON.stringify({
      prompt: 'Test',
      aspect_ratio: '16:9',
      resolution: '720p',
      duration: 4,
    }),
  });
  console.log(await response.json());
};
testAPI();
"

# 5. Verify environment variable documentation
# Check all variables in ENVIRONMENT_VARIABLES.md are in .env.local.example
diff <(grep -o '^[A-Z_]*=' ENVIRONMENT_VARIABLES.md | sort) \
     <(grep -o '^[A-Z_]*=' .env.local.example | sort)

# 6. Test deployment guide steps
# Follow DEPLOYMENT.md step by step in staging environment

# 7. Run final build check
pnpm build && echo "✅ Build successful"

# 8. Verify all documentation is up to date
git diff README.md DEPLOYMENT.md ENVIRONMENT_VARIABLES.md
```

## Acceptance Criteria

### README.md
- [ ] Video generation feature documented
- [ ] Pricing table included (all 6 tiers)
- [ ] API examples in JavaScript/Python
- [ ] Quick start guide updated
- [ ] Environment variables section added
- [ ] Development setup instructions complete
- [ ] Deployment section added
- [ ] Monitoring guide included
- [ ] Troubleshooting section added

### DEPLOYMENT.md
- [ ] Step-by-step deployment guide
- [ ] Database setup SQL scripts
- [ ] Environment variable configuration
- [ ] Vercel cron job setup
- [ ] Post-deployment verification steps
- [ ] Monitoring setup guide
- [ ] Rollback plan documented
- [ ] Success criteria checklist

### ENVIRONMENT_VARIABLES.md
- [ ] All required variables documented
- [ ] Instructions for obtaining each variable
- [ ] Security best practices included
- [ ] Troubleshooting common issues
- [ ] Validation checklist
- [ ] Local vs production configuration
- [ ] Feature flags documented

### General
- [ ] All code examples tested and working
- [ ] All links verified
- [ ] Consistent formatting throughout
- [ ] No sensitive information exposed
- [ ] Screenshots/diagrams added (optional)
- [ ] Reviewed for accuracy and completeness

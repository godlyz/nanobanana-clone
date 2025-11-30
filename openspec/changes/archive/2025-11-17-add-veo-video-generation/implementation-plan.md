# Video Generation Implementation Plan

**Status**: Ready for Implementation
**Version**: 2.0 (Based on Latest Specs)
**Created**: 2025-11-17
**Updated**: 2025-11-17
**Based On**: openspec/specs/ (8 specs, 24 requirements)

---

## ⚠️ Critical Corrections from Original Proposal

### API Cost Correction
- ❌ **Original proposal.md**: $0.50/second
- ✅ **Correct cost**: **$0.75/second**
- **Impact**: All credit pricing has been recalculated

### Scope Enhancement
- ✅ **Original proposal**: Technical infrastructure only
- ✅ **Current scope**: Technical infrastructure + Complete UX enhancements (24 total requirements)

---

## 📊 Requirements Overview (24 Requirements, 8 Modules)

### P0 - Core Infrastructure (Must Complete First)

#### 1️⃣ video-generation (7 requirements)
1. **Video Generation API Endpoint** - POST /api/generate-video with Google Veo 3.1 integration
2. **Asynchronous Processing and Polling** - Handle 11s-6min generation time
3. **Automatic Video Storage and Download** - Download from Google (2-day expiry) to Supabase Storage (permanent)
4. **Credit Pricing and Deduction** - Formula: `credits = duration × 10 × (is1080p ? 1.5 : 1.0)`
5. **Concurrent Task Limiting** - Max 3 simultaneous tasks per user
6. **Video Generation History** - Record all tasks with pagination
7. **Error Handling and Retry Logic** - 3 retries with 30s intervals

#### 2️⃣ credits (3 requirements)
1. **Video Generation Transaction Types** - Add `video_generation`, `video_refund`
2. **Video Credit Pricing Configuration** - Dynamic config in `system_configs`
3. **Prevent Double Refund** - Check existing refund before processing

### P1 - API Interface Layer (Depends on P0)

#### 3️⃣ api (2 requirements)
1. **POST /api/v1/video/generate** - Create video generation task
2. **GET /api/v1/video/status/:task_id** - Query generation status

### P2 - User Interface (Depends on P0 + P1)

#### 4️⃣ video-ux (7 requirements)
1. **History Image Selector Modal** - Select reference images from history
2. **Inline Prompt Optimizer Button** - "✨ AI优化" with `content_type: 'video'`
3. **Portal Hero Section Video Carousel** - 3-5 featured videos, 5s intervals
4. **Features Section Video Card** - Video feature card with hover animation
5. **Showcase Tab for Videos** - Dedicated "Videos" tab with `content_type = 'video'` filter
6. **Unified Video Generation Form** - Single form for text-to-video and image-to-video
7. **Video Generation Status Page** - Real-time status with 10s auto-polling

### P3 - Data Extensions (Can Parallel with P2)

#### 5️⃣ showcase (2 requirements)
1. **Extend Showcase Items for Video Content** - Add `content_type`, `video_url`, `thumbnail_url`, `duration`, `resolution`
2. **Video Showcase Tab** - Filter and display video-only showcase items

#### 6️⃣ smart-prompt (1 requirement)
1. **Video Prompt Optimization** - Support `content_type: 'video'` for video-specific optimization

#### 7️⃣ profile (1 requirement)
1. **Video Generation History Display** - Unified image/video list with content type filtering

#### 8️⃣ admin (1 requirement)
1. **User Detail Modal - Video Consumption Tab** - Video statistics and records

---

## 🔧 Technical Parameters (Corrected)

| Parameter | Correct Value |
|-----------|---------------|
| **Google Veo 3.1 API Cost** | **$0.75/second** (NOT $0.50) |
| **Credit Pricing Formula** | `credits = duration × 10 × (is1080p ? 1.5 : 1.0)` |
| **6 Pricing Tiers** | 4s/720p(40c), 4s/1080p(60c), 6s/720p(60c), 6s/1080p(90c), 8s/720p(80c), 8s/1080p(120c) |
| **API Cost per Tier** | 4s($3.00), 6s($4.50), 8s($6.00) |
| **Profit Margin** | Average 33% |
| **Concurrent Limit** | 3 tasks/user |
| **Polling Interval** | 10 seconds |
| **Download Retry** | 3 attempts, 30s intervals |
| **Deduction Strategy** | Deduct-first, refund-later |
| **Video Expiry (Google)** | 2 days |
| **Permanent Storage** | Supabase Storage `videos` bucket |

---

## 🚀 Implementation Stages (14 Days)

### Stage 1: Database and Infrastructure (Days 1-2)

**Tasks**:
1. Create database migrations
   - [ ] `video_generation_history` table
     - Columns: id, user_id, operation_id, status, prompt, negative_prompt, aspect_ratio, resolution, duration, credit_cost, google_video_url, permanent_video_url, thumbnail_url, file_size_bytes, error_message, error_code, retry_count, created_at, completed_at, downloaded_at
     - Indexes: idx_user_id, idx_status, idx_created_at, idx_operation_id (UNIQUE)
     - Constraints: CHECK on status, aspect_ratio, resolution, duration

   - [ ] Extend `credit_transactions` table
     - Add transaction types: `video_generation`, `video_refund`
     - Update CHECK constraint

   - [ ] Add `system_configs` entries
     - `video_credit_per_second`: 10 (default)
     - `video_1080p_multiplier`: 1.5 (default)
     - `video_concurrent_limit`: 3 (default)
     - `video_generation_enabled`: true

2. Configure Supabase Storage
   - [ ] Create `videos` bucket with RLS policies
   - [ ] Set up automatic thumbnail generation (optional)

3. Environment setup
   - [ ] Add `GOOGLE_AI_API_KEY` to `.env.local`
   - [ ] Verify API access with test request

**Verification**:
```bash
# Test migration
supabase db push
supabase db inspect

# Test storage
supabase storage buckets list

# Test config
SELECT * FROM system_configs WHERE key LIKE 'video%';
```

---

### Stage 2: Backend API (Days 3-5)

**Tasks**:
4. Implement Veo Client
   - [ ] Create `lib/veo-client.ts`
     - `generateVideo(prompt, options)` - Call Google Veo 3.1 API
     - `checkOperationStatus(operationId)` - Poll operation status
     - `getVideoUrl(operationId)` - Get temporary video URL
     - Error handling for safety filters, rate limits, invalid params

5. Implement Video Service
   - [ ] Create `lib/video-service.ts`
     - `createVideoTask(userId, params)` - Validate, deduct credits, create task
     - `getTaskStatus(taskId)` - Query task status
     - `listUserVideos(userId, filters)` - List with pagination
     - `downloadAndStoreVideo(taskId, googleUrl)` - Download from Google, upload to Supabase
     - `refundFailedGeneration(taskId)` - Check and refund credits

6. Extend Credit Service
   - [ ] Update `lib/credit-service.ts`
     - Add video transaction type handlers
     - Implement `calculateVideoCredits(duration, resolution)`
     - Add `checkAndPreventDoubleRefund(taskId)`

7. Create API Endpoints
   - [ ] `app/api/v1/video/generate/route.ts`
     - Validate user authentication
     - Check credit balance
     - Check concurrent task limit (max 3)
     - Deduct credits BEFORE calling API
     - Call Veo API
     - Create task record with `processing` status
     - Return `task_id` and estimated time

   - [ ] `app/api/v1/video/status/[task_id]/route.ts`
     - Validate user owns task
     - Return real-time status from database
     - Include video URL if `completed`
     - Include error message if `failed`

8. Implement Vercel Cron Polling
   - [ ] Create `app/api/cron/video-polling/route.ts`
     - Query all `processing` tasks
     - For each task:
       - Check Google Veo operation status
       - If complete: update status to `downloading`, trigger download
       - If failed: update status to `failed`, refund credits
       - If still processing: continue waiting
     - Rate limit: max 50 operations per cron run

   - [ ] Create `app/api/cron/video-download/route.ts`
     - Query all `downloading` tasks
     - For each task:
       - Download video from Google URL
       - Upload to Supabase Storage
       - Generate thumbnail (optional)
       - Update task with `permanent_video_url` and `completed` status
       - Handle retries (max 3 attempts)

   - [ ] Add cron schedule to `vercel.json`
     ```json
     {
       "crons": [{
         "path": "/api/cron/video-polling",
         "schedule": "*/10 * * * *"
       }, {
         "path": "/api/cron/video-download",
         "schedule": "*/5 * * * *"
       }]
     }
     ```

**Verification**:
```bash
# Test Veo Client
curl -X POST http://localhost:3000/api/v1/video/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt": "A cat playing piano", "duration": 4, "resolution": "720p"}'

# Check status
curl http://localhost:3000/api/v1/video/status/$TASK_ID \
  -H "Authorization: Bearer $TOKEN"

# Manually trigger cron (test)
curl http://localhost:3000/api/cron/video-polling
```

---

### Stage 3: Frontend UX (Days 6-9)

**Tasks**:
9. Video Generation Form
   - [ ] Create `app/tools/video-generation/page.tsx`
     - Prompt textarea (max 500 chars)
     - Optional reference image upload
     - Duration selector (4s / 6s / 8s)
     - Resolution selector (720p / 1080p)
     - Aspect ratio selector (16:9 / 9:16)
     - Real-time credit cost display
     - Validation: credit balance, concurrent limit
     - Submit button → redirect to status page

10. Status Page
    - [ ] Create `app/tools/video-generation/status/[task_id]/page.tsx`
      - Display current status badge (processing / downloading / completed / failed)
      - Show estimated remaining time
      - Auto-poll `/api/v1/video/status/:task_id` every 10 seconds
      - On `completed`: Show video player + download button
      - On `failed`: Show error message + refund confirmation
      - Allow user to close and return later

11. History Image Selector Modal
    - [ ] Create `components/video/history-image-selector.tsx`
      - Modal component with image grid
      - Fetch recent generated images (20 per page)
      - Search by prompt
      - On select: auto-fill `reference_image_url` in form
      - Close modal after selection

12. Inline Prompt Optimizer Button
    - [ ] Update video generation form
      - Add "✨ AI优化" button next to prompt textarea
      - On click: call `/api/optimize-prompt` with `content_type: 'video'`
      - Replace prompt with optimized version (no modal popup)
      - Show loading state during optimization

13. Homepage Hero Video Carousel
    - [ ] Update `components/hero.tsx`
      - Fetch 3-5 featured videos from showcase
      - Auto-rotate every 5 seconds
      - Show thumbnail, play button, prompt description
      - Manual navigation with arrow buttons
      - On play: open fullscreen modal with video player

14. Showcase Video Tab
    - [ ] Update `app/showcase/page.tsx`
      - Add "Videos" tab next to "Images"
      - Filter `showcase_items` where `content_type = 'video'`
      - Display video thumbnails with play buttons
      - Show prompt, like count, author
      - Support like/unlike functionality
      - On play: open fullscreen modal

15. Profile Video History
    - [ ] Update `app/profile/page.tsx`
      - Add "Generation Records" tab
      - Unified list for images and videos
      - Content type filter (All / Images / Videos)
      - Show thumbnail, prompt, parameters, status, credit cost, timestamp
      - Video records have play button for fullscreen playback

**Verification**:
```bash
# Test form submission
# - Fill prompt, select duration, resolution
# - Verify credit cost calculation
# - Submit and redirect to status page

# Test status page
# - Open status page with task_id
# - Verify auto-polling every 10s
# - Wait for completion
# - Verify video player appears

# Test history selector
# - Click "Select from History" in form
# - Search for prompt
# - Select image
# - Verify auto-fill in form
```

---

### Stage 4: Management and Extensions (Days 10-11)

**Tasks**:
16. Admin Video Statistics Tab
    - [ ] Update admin user detail modal
      - Add "Video Consumption" tab
      - Show total credits consumed
      - Show success rate (completed / total)
      - Show failure reason statistics
      - Support status filtering (success / failed / in-progress)
      - Sortable table of all video records

17. Showcase Data Model Extension
    - [ ] Extend `showcase_items` table
      - Add `content_type` column (ENUM: 'image', 'video')
      - Add `video_url` column (TEXT, nullable)
      - Add `thumbnail_url` column (TEXT, nullable)
      - Add `duration` column (INTEGER, nullable)
      - Add `resolution` column (TEXT, nullable)
      - Migrate existing records: set `content_type = 'image'`

18. Smart Prompt Video Support
    - [ ] Update `/api/optimize-prompt`
      - Accept `content_type` parameter ('image' or 'video')
      - For video: return prompt with camera movements and scene descriptions
      - For image: use existing logic

**Verification**:
```bash
# Test admin tab
# - Open user detail in admin panel
# - Click "Video Consumption" tab
# - Verify statistics and table

# Test showcase extension
SELECT * FROM showcase_items WHERE content_type = 'video';

# Test smart prompt
curl -X POST http://localhost:3000/api/optimize-prompt \
  -d '{"prompt": "A cat", "content_type": "video"}'
```

---

### Stage 5: Testing and Optimization (Days 12-14)

**Tasks**:
19. End-to-End Testing
    - [ ] Test full video generation flow
      - Submit request → Poll status → Download video
      - Verify credit deduction
      - Verify automatic refund on failure
      - Test concurrent limit (submit 4 tasks, verify 4th fails)

    - [ ] Test edge cases
      - Safety filter rejection (verify no charge)
      - Download failure (verify 3 retries)
      - Browser close during generation (verify can return later)
      - Expired Google URL (verify permanent storage)

20. Performance Optimization
    - [ ] Database query optimization
      - Add missing indexes if slow
      - Optimize video history pagination

    - [ ] Cron job optimization
      - Batch operations (max 50 per run)
      - Add rate limiting to avoid Google API quota

    - [ ] Frontend optimization
      - Lazy load video history
      - Optimize video player component
      - Add loading skeletons

21. Error Handling Enhancement
    - [ ] Add comprehensive error messages
      - Insufficient credits
      - Concurrent limit exceeded
      - Safety filter rejection
      - Download failure
      - API errors

    - [ ] Add retry mechanisms
      - Download retry (already implemented)
      - API call retry with exponential backoff

22. Documentation Update
    - [ ] API documentation
      - Document `/api/v1/video/generate` endpoint
      - Document `/api/v1/video/status/:task_id` endpoint
      - Add example requests and responses

    - [ ] User guide
      - How to generate videos
      - Credit cost explanation
      - Troubleshooting common issues

    - [ ] Admin manual
      - Video statistics interpretation
      - Common failure reasons
      - How to refund credits manually

**Verification**:
```bash
# Run full test suite
pnpm test

# Performance test
# - Submit 10 concurrent video requests
# - Verify 3 concurrent limit
# - Verify cron jobs handle queue properly

# Error handling test
# - Submit with insufficient credits
# - Submit 4th concurrent task
# - Trigger safety filter with inappropriate prompt
# - Simulate download failure
```

---

## ✅ Acceptance Criteria (DoD - Definition of Done)

### Functional Correctness
- [ ] All 24 requirements from 8 specs are implemented
- [ ] API cost calculation uses correct $0.75/second
- [ ] All 6 pricing tiers work correctly
- [ ] Credit deduction and refund logic works as expected
- [ ] Concurrent limit (3 tasks) enforced properly
- [ ] Automatic download success rate >99%

### Performance
- [ ] Video generation request response time <500ms
- [ ] Status polling overhead <100ms per request
- [ ] Video history pagination loads <1s for 20 items
- [ ] Cron jobs complete within timeout limits

### Reliability
- [ ] Generation success rate >95% (for valid prompts)
- [ ] Download retry mechanism handles failures
- [ ] No credit loss on failed generations
- [ ] Double refund prevention works correctly

### User Experience
- [ ] Clear status indicators at all stages
- [ ] Estimated time displayed accurately
- [ ] Error messages are helpful and actionable
- [ ] Video player works on all browsers

### Security
- [ ] User can only access their own videos
- [ ] API key stored securely in environment variables
- [ ] RLS policies on Supabase Storage enforced
- [ ] No XSS vulnerabilities in video display

### Documentation
- [ ] API endpoints documented with examples
- [ ] User guide covers all features
- [ ] Admin manual explains statistics
- [ ] Code comments explain complex logic

---

## 🚨 Known Risks and Mitigation

### Risk 1: API Cost Volatility
**Impact**: High
**Probability**: Low
**Mitigation**:
- Monitor Google's pricing page regularly
- Dynamic credit pricing via `system_configs`
- Cost alerts in admin dashboard

### Risk 2: 2-Day Storage Expiry
**Impact**: Critical
**Probability**: Medium
**Mitigation**:
- Automatic download immediately after generation
- 3 retry attempts with exponential backoff
- Alert system if download fails

### Risk 3: Long Generation Times
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Clear user expectations (show estimated time)
- Allow users to close browser and return later
- Email/notification when generation completes (future)

### Risk 4: Content Safety Blocks
**Impact**: Low
**Probability**: Medium
**Mitigation**:
- No credit charge for blocked content
- Clear error messages with guidance
- Negative prompt support to avoid blocks

---

## 📈 Success Metrics

### Launch Criteria (Must Achieve Before Release)
- [ ] 100+ successful test generations
- [ ] Automatic download success rate >99%
- [ ] Credit system correctly charges and refunds
- [ ] Concurrent limiting prevents abuse
- [ ] All user documentation complete

### Post-Launch KPIs (Month 3 Targets)
**Usage Metrics**:
- Daily active video generators: >50
- Average videos per user: >5/month
- Most popular duration: baseline data

**Financial Metrics**:
- Revenue per video: $4-$12 (depending on tier)
- Profit margin: >50% average
- Credit consumption: 10-20% of total

**Quality Metrics**:
- Generation success rate: >95%
- User satisfaction score: >4.5/5
- Repeat usage rate: >70%

---

## 🔄 Rollback Plan

If critical issues arise:
1. Disable video generation via `system_configs.video_generation_enabled = false`
2. Refund all pending/failed generations
3. Communicate downtime to users
4. Fix issues in staging environment
5. Re-enable with gradual rollout (10% → 50% → 100%)

---

## 📝 Notes

- This plan supersedes the original 602-task implementation plan
- Based on corrected API cost ($0.75/second) and complete UX requirements
- Estimated total time: 14 working days (can be adjusted based on team size)
- All code should follow existing project conventions (Next.js 14, TypeScript, Tailwind)
- Use existing authentication (Supabase Auth) and payment (Creem) integrations

---

**Next Steps**:
1. Review and approve this implementation plan
2. Assign tasks to team members
3. Set up project tracking (e.g., GitHub Projects, Linear)
4. Begin Stage 1 (Database and Infrastructure)

# Proposal: Add Veo 3.1 Video Generation

**Status**: Proposed
**Author**: System
**Created**: 2025-01-05
**Target Release**: Phase 2

---

## Why

### Business Need

Users need dynamic video content creation capabilities to:
- Create product demonstrations and marketing materials
- Generate UGC (User Generated Content) short videos
- Produce educational and tutorial content
- Enhance social media engagement with video posts

### Market Opportunity

Video content generation is a rapidly growing market:
- **Market Demand**: Video content has 1200% more shares than text and images combined
- **Competitive Advantage**: Veo 3.1 provides industry-leading video quality (24fps, up to 1080p, native audio)
- **Revenue Potential**: High credit consumption (40-80 credits per video) creates significant revenue growth opportunity

### Technical Feasibility

Google Veo 3.1 API provides:
- Text-to-video generation with natural language prompts
- Image-to-video with reference frames
- Video extension capabilities (up to 20 extensions)
- Native audio generation
- Mature API with predictable costs ($0.50/second)

### Strategic Alignment

This feature aligns with the platform's mission to provide comprehensive AI-powered creative tools, expanding beyond static image generation to dynamic video content.

---

## What Changes

### New Capabilities

1. **Text-to-Video Generation**
   - Generate 4-second, 6-second, or 8-second videos from text prompts
   - Support 720p and 1080p resolutions
   - Native 24fps video with audio
   - Aspect ratios: 16:9 (landscape) and 9:16 (portrait)

2. **Configuration Management**
   - Admin-configurable credit costs for different video durations
   - Model selection (Veo 3.1 as default)
   - Quality and duration settings
   - Concurrent task limits (3 per user)

3. **Asynchronous Processing**
   - Long-running operation support (11 seconds to 6 minutes)
   - Polling mechanism with 10-second intervals
   - Real-time status updates
   - Automatic timeout handling (15-minute limit)

4. **Video Storage and Persistence**
   - Automatic download from Google's temporary storage (2-day expiry)
   - Upload to Supabase Storage for permanent access
   - Generation history tracking
   - Video preview and playback

5. **Credit System Integration**
   - Duration-based credit consumption:
     - 4 seconds: 40 credits ($2.00 API cost)
     - 6 seconds: 60 credits ($3.00 API cost)
     - 8 seconds: 80 credits ($4.00 API cost)
   - Full refund on generation failures
   - Transaction history with video metadata

### Modified Systems

1. **Credit System** (`specs/credits`)
   - Add new transaction types: `video_4s_generation`, `video_6s_generation`, `video_8s_generation`
   - Add credit cost configuration for video generation
   - Extend refund logic for failed video generations

2. **Database Schema**
   - New table: `video_generation_history`
   - Extend `credit_transactions` with video transaction types
   - Add video generation config to `system_configs`

3. **API Routes**
   - New: `/api/generate-video` (POST) - Create video generation task
   - New: `/api/video/status/:taskId` (GET) - Check generation status
   - New: `/api/video/history` (GET) - List user's video history

### Architecture Changes

```mermaid
flowchart TD
    User[User] -->|Submit prompt| API[/api/generate-video]
    API -->|Check credits| Credits[Credit Service]
    API -->|Check concurrent| Limit[Concurrent Limiter]
    API -->|Call API| Veo[Veo 3.1 API]
    Veo -->|Return operation| API
    API -->|Create task| DB[(Database)]
    API -->|Start polling| Poller[Polling Service]

    Poller -->|Check status every 10s| Veo
    Poller -->|Update| DB
    Poller -->|Download video| Storage[Supabase Storage]
    Storage -->|Permanent URL| DB

    User -->|Check status| StatusAPI[/api/video/status]
    StatusAPI -->|Read| DB
    StatusAPI -->|Return| User
```

---

## Impact

### Specs

- **ADDED**: `specs/video-generation/spec.md` - Complete video generation specification
- **MODIFIED**: `openspec/credits.md` - Add video generation credit rules

### Code Changes

**New Files**:
- `app/api/generate-video/route.ts` - Video generation API endpoint
- `app/api/video/status/[taskId]/route.ts` - Status checking endpoint
- `app/api/video/history/route.ts` - History listing endpoint
- `lib/video-service.ts` - Video generation service layer
- `lib/veo-client.ts` - Veo 3.1 API client wrapper
- `lib/video-polling.ts` - Polling mechanism for async operations

**Modified Files**:
- `lib/credit-types.ts` - Add video transaction types
- `lib/credit-service.ts` - Extend with video credit logic
- `lib/config-cache.ts` - Add video config caching

**Database Migrations**:
- `supabase/migrations/YYYYMMDD_create_video_generation_history.sql`
- `supabase/migrations/YYYYMMDD_extend_credit_transactions.sql`
- `supabase/migrations/YYYYMMDD_add_video_configs.sql`

### Performance Implications

**Positive**:
- Asynchronous processing prevents API timeout issues
- Automatic storage to Supabase eliminates 2-day expiry risk
- Concurrent limiting prevents resource exhaustion

**Considerations**:
- Video file storage will increase storage costs (estimated 5-15 MB per video)
- Polling mechanism requires background job infrastructure (Vercel Cron or Edge Functions)
- High API costs require careful credit pricing strategy

### Cost Analysis

| Scenario | Monthly Videos | API Cost | Storage Cost | Total Cost | Revenue (Standard Price) | Profit |
|----------|---------------|----------|--------------|------------|------------------------|---------|
| Low      | 100           | $300     | ~$5          | $305       | $600                   | $295    |
| Medium   | 500           | $1,500   | ~$25         | $1,525     | $3,000                 | $1,475  |
| High     | 2,000         | $6,000   | ~$100        | $6,100     | $12,000                | $5,900  |

**Assumptions**:
- Average video duration: 6 seconds ($3.00 API cost)
- Average file size: 10 MB (Supabase Storage: $0.021/GB/month)
- Credit price: 1 credit = $0.10 (standard pricing)

### Security and Compliance

**Security Measures**:
- API key stored securely in environment variables
- User authentication required for all video endpoints
- Concurrent task limits prevent abuse
- Video URLs are user-scoped (cannot access other users' videos)

**Safety Features**:
- Google's built-in safety filters (content moderation)
- SynthID watermarking for generated videos
- No charge for blocked/filtered content
- Audit logs for all video generations

**Compliance Considerations**:
- EU/UK/CH/MENA regional restrictions on person generation
- Copyright compliance (user-generated content)
- Storage compliance (videos stored in user's region when possible)

### User Experience

**New User Flows**:
1. **Video Creation**:
   - User enters text prompt and selects parameters
   - System validates credits and concurrent limits
   - User receives task ID and estimated time
   - User can check status or wait for completion notification

2. **Video Management**:
   - User views generation history
   - User can replay, download, or share videos
   - User sees credit costs and transaction details

**Expected Metrics**:
- Average generation time: 30 seconds - 3 minutes
- Success rate: >95% (based on valid prompts)
- User satisfaction: High (based on Veo 3.1 quality)

---

## Risks and Mitigation

### Risk 1: API Cost Volatility
**Impact**: High
**Probability**: Low
**Mitigation**:
- Monitor Google's pricing page regularly
- Implement cost alerts in admin dashboard
- Adjust credit costs dynamically via system_configs

### Risk 2: 2-Day Storage Expiry
**Impact**: Critical
**Probability**: Medium
**Mitigation**:
- Automatic download immediately after generation completes
- Retry mechanism (3 attempts) for failed downloads
- Alert system if download fails

### Risk 3: Long Generation Times
**Impact**: Medium
**Probability**: Medium
**Mitigation**:
- Clear user expectations (show estimated time)
- Allow users to close browser and return later
- Email/notification when generation completes

### Risk 4: Content Safety Blocks
**Impact**: Low
**Probability**: Medium
**Mitigation**:
- No credit charge for blocked content
- Clear error messages with guidance
- Negative prompt support to avoid blocks

---

## Alternatives Considered

### Alternative 1: Stable Video Diffusion
**Pros**: Open-source, lower cost
**Cons**: Lower quality, requires GPU infrastructure, no native audio
**Decision**: Rejected - Quality and infrastructure complexity

### Alternative 2: Runway Gen-3
**Pros**: High quality, good API
**Cons**: Higher cost ($0.625/second), shorter videos (max 5s)
**Decision**: Rejected - Cost and duration limitations

### Alternative 3: Luma AI Dream Machine
**Pros**: Fast generation, good quality
**Cons**: Limited API access, no batch processing
**Decision**: Rejected - API availability concerns

### Selected: Google Veo 3.1
**Reasoning**:
- Best quality-to-cost ratio
- Reliable API with Google infrastructure
- Native audio generation
- Can reuse existing Google AI API key
- Up to 8-second videos in single generation

---

## Success Metrics

### Launch Criteria (Phase 2)

- [ ] API integration tested with 100+ successful generations
- [ ] Automatic download success rate >99%
- [ ] Credit system correctly charges and refunds
- [ ] Concurrent limiting prevents abuse
- [ ] Admin configuration UI functional
- [ ] User documentation complete

### Post-Launch KPIs

**Usage Metrics**:
- Daily active video generators (target: 50+ by month 3)
- Average videos per user (target: 5+ per month)
- Most popular video duration (baseline data)

**Financial Metrics**:
- Revenue per video (target: $4-$8 depending on pricing tier)
- Profit margin (target: >50% average across all pricing tiers)
- Credit consumption rate (target: 10-20% of total credits)

**Quality Metrics**:
- Generation success rate (target: >95%)
- User satisfaction score (target: >4.5/5)
- Repeat usage rate (target: >70%)

### Rollback Plan

If critical issues arise:
1. Disable video generation via `system_configs.is_active = false`
2. Refund all pending/failed generations
3. Communicate downtime to users
4. Fix issues in staging environment
5. Re-enable with gradual rollout (10% → 50% → 100%)

---

## Timeline

### Phase 1: Infrastructure (Days 1-3)
- Database schema and migrations
- Supabase Storage bucket setup
- System config initialization

### Phase 2: API Integration (Days 4-6)
- Veo 3.1 client implementation
- Video generation endpoint
- Credit integration

### Phase 3: Asynchronous Processing (Days 7-9)
- Polling mechanism
- Automatic download and storage
- Status tracking

### Phase 4: Frontend and Testing (Days 10-12)
- User interface components
- Integration tests
- Performance testing

### Phase 5: Documentation and Launch (Days 13-14)
- API documentation
- User guide
- Admin manual
- Soft launch to beta users

**Total Estimated Time**: 14 working days (3 weeks)

---

## Dependencies

- Google AI API Key with Veo 3.1 access (must verify with Google)
- Supabase Storage quota (estimate 50-100 GB/month initially)
- Vercel Cron Jobs or Edge Functions for polling (included in Pro plan)
- Updated `system_configs` table structure

---

## Open Questions

1. **API Access**: Do we have confirmed Veo 3.1 API access with our current Google AI API key?
2. **Pricing Confirmation**: Is $0.50/second the final confirmed API cost?
3. **Concurrent Limits**: Is 3 concurrent videos per user sufficient, or should we make this configurable?
4. **Video Extensions**: Should Phase 1 include video extension features, or defer to Phase 2?
5. **Credit Pricing**: Confirm 10 credits/second (40/60/80 total) is acceptable to users?

---

## Approval

**Stakeholder Sign-off**:
- [ ] Product Owner (user)
- [ ] Technical Lead
- [ ] Finance/Pricing Team
- [ ] Compliance/Legal Team

**Next Steps After Approval**:
1. Read this proposal for detailed understanding
2. Review and approve `tasks.md` for implementation plan
3. Review `design.md` for technical decisions
4. Review `specs/video-generation/spec.md` for requirements
5. Execute tasks according to priority

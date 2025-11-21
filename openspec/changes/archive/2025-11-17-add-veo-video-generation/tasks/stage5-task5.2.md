# Task 5.2: Performance Optimization

**Files**: Various optimization tasks
**Estimated Time**: 3 hours
**Dependencies**: All implementation complete
**Priority**: P1 (Important)

## Overview

Optimize performance for video generation feature

## Subtasks

### 5.2.1: Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_video_generation_user_status ON video_generation_history(user_id, status);
CREATE INDEX idx_video_generation_created_at ON video_generation_history(created_at DESC);
CREATE INDEX idx_credit_transactions_user_type ON credit_transactions(user_id, transaction_type);

-- Optimize history query with composite index
CREATE INDEX idx_video_generation_history_lookup ON video_generation_history(user_id, status, created_at DESC);
```

### 5.2.2: API Response Caching

```typescript
// Add response caching for video history
export const revalidate = 60; // Cache for 60 seconds

// Use SWR for client-side caching
import useSWR from 'swr';

const { data, error } = useSWR(
  `/api/v1/video/history?status=${filter}`,
  fetcher,
  { refreshInterval: 30000 } // Refresh every 30 seconds
);
```

### 5.2.3: Image/Video Optimization

```typescript
// Use Next.js Image component for thumbnails
import Image from 'next/image';

<Image
  src={task.thumbnail_url}
  alt="Video thumbnail"
  width={320}
  height={180}
  quality={75}
  loading="lazy"
/>

// Compress videos during download
// (Already handled by sharp for thumbnails)
```

### 5.2.4: Bundle Size Optimization

```bash
# Analyze bundle size
pnpm build
npx @next/bundle-analyzer

# Optimize imports (use tree-shaking)
# Before:
import { Button } from '@/components/ui/button';

# After (if needed):
import Button from '@/components/ui/button/button';
```

## Verification Steps

```bash
# 1. Run Lighthouse audit
npx lighthouse http://localhost:3000/video-editor --view

# Target scores:
# - Performance: >= 90
# - Accessibility: >= 95
# - Best Practices: >= 90
# - SEO: >= 90

# 2. Check database query performance
EXPLAIN ANALYZE SELECT * FROM video_generation_history
WHERE user_id = 'xxx' AND status = 'processing'
ORDER BY created_at DESC
LIMIT 10;

# 3. Measure API response times
# - /api/v1/video/history: < 200ms
# - /api/v1/video/status/:id: < 100ms

# 4. Check bundle size
pnpm build
# Total bundle size should be < 500KB (First Load JS)
```

## Acceptance Criteria

- [ ] Database indexes added for common queries
- [ ] API response caching implemented
- [ ] Client-side caching with SWR
- [ ] Images optimized with Next.js Image
- [ ] Lighthouse performance score >= 90
- [ ] API response times < 200ms
- [ ] Bundle size optimized
- [ ] All pages load in < 2 seconds

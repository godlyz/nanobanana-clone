# Task 5.3: Error Monitoring and Logging

**Files**: Monitoring setup
**Estimated Time**: 2 hours
**Dependencies**: None
**Priority**: P1 (Important)

## Overview

Set up error monitoring and logging for video generation feature

## Subtasks

### 5.3.1: Add Sentry Integration

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.headers['x-api-key'];
    }
    return event;
  },
});

// Capture video generation errors
try {
  await videoService.createVideoTask(...);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'video-generation',
      operation: 'create-task',
    },
    extra: {
      userId,
      creditCost,
    },
  });
  throw error;
}
```

### 5.3.2: Add Structured Logging

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Usage in cron jobs
logger.info({ taskId, status }, 'Video generation completed');
logger.error({ taskId, error: err.message }, 'Video generation failed');
```

### 5.3.3: Add Custom Metrics

```typescript
// lib/metrics.ts
export const trackVideoGeneration = (status: string, duration: number, resolution: string) => {
  // Send to analytics service
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: 'video_generation',
      properties: { status, duration, resolution },
    }),
  });
};
```

## Verification Steps

```bash
# 1. Install Sentry
pnpm add @sentry/nextjs

# 2. Configure Sentry
npx @sentry/wizard -i nextjs

# 3. Test error capture
# - Trigger an error in video generation
# - Verify error appears in Sentry dashboard

# 4. Install pino for logging
pnpm add pino pino-pretty

# 5. Check logs
# - Verify structured logs in console
# - Verify sensitive data is filtered out
```

## Acceptance Criteria

- [ ] Sentry integration added
- [ ] All video generation errors captured
- [ ] Sensitive data filtered from error reports
- [ ] Structured logging with pino
- [ ] Custom metrics tracked
- [ ] Error dashboard set up
- [ ] Alerts configured for critical errors

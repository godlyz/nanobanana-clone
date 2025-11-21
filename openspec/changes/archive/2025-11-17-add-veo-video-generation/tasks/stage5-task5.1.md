# Task 5.1: E2E Testing for Video Feature

**File**: `tests/e2e/video-generation.spec.ts`
**Estimated Time**: 4 hours
**Dependencies**: All previous stages
**Priority**: P0 (Blocking)

## Overview

End-to-end tests for complete video generation user journey using Playwright

## Implementation

```typescript
// tests/e2e/video-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Video Generation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('Complete video generation flow', async ({ page }) => {
    // 1. Navigate to video editor
    await page.goto('/video-editor');

    // 2. Fill out generation form
    await page.fill('#prompt', 'A cat playing piano in a jazz club');
    await page.selectOption('[name="aspectRatio"]', '16:9');
    await page.selectOption('[name="resolution"]', '720p');
    await page.selectOption('[name="duration"]', '4');

    // 3. Verify credit cost display
    await expect(page.locator('text=40 Credits')).toBeVisible();

    // 4. Submit form
    await page.click('button[type="submit"]');

    // 5. Verify redirect to status page
    await expect(page).toHaveURL(/\/video-status\/[a-f0-9-]+/);

    // 6. Verify processing status
    await expect(page.locator('text=Processing')).toBeVisible();

    // 7. Wait for completion (or mock API response)
    // In real test, use mock API to return completed status
    await page.waitForSelector('video', { timeout: 60000 });

    // 8. Verify video player appears
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // 9. Test download button
    const downloadButton = page.locator('text=Download Video');
    await expect(downloadButton).toBeVisible();
  });

  test('Handle insufficient credits', async ({ page }) => {
    // Mock user with 0 credits
    // ... test insufficient credits error
  });

  test('Handle concurrent limit', async ({ page }) => {
    // Create 3 processing tasks
    // ... test concurrent limit error (429)
  });

  test('Video history selector', async ({ page }) => {
    await page.goto('/personal-center');

    // Verify history selector appears
    await expect(page.locator('text=Video History')).toBeVisible();

    // Click on a video task
    await page.click('[data-testid="video-task-item"]');

    // Verify navigation to status page
    await expect(page).toHaveURL(/\/video-status\/[a-f0-9-]+/);
  });
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

## Verification Steps

```bash
# 1. Install Playwright
pnpm add -D @playwright/test

# 2. Install browsers
npx playwright install

# 3. Run E2E tests
pnpm test:e2e

# 4. Run with UI
npx playwright test --ui

# 5. Generate test report
npx playwright show-report
```

## Acceptance Criteria

- [ ] E2E test suite created
- [ ] Tests cover complete video generation flow
- [ ] Tests cover error scenarios (insufficient credits, concurrent limit)
- [ ] Tests cover video history selector
- [ ] Tests run in CI/CD pipeline
- [ ] All tests passing
- [ ] Playwright configuration set up
- [ ] Test screenshots and videos on failure

# Task 4.2: Extend Personal Center with Video History

**File**: Existing personal center page
**Estimated Time**: 2 hours
**Dependencies**: Task 3.3 (Video History Selector)
**Priority**: P2 (Nice to have)

## Overview

Add video history section to existing personal center page

## Implementation

```typescript
// app/personal-center/page.tsx (add to existing page)
import { VideoHistorySelector } from "@/components/video/video-history-selector";

<section className="mt-8">
  <h2 className="text-xl font-semibold mb-4">{t("personalCenter.videoHistory")}</h2>
  <VideoHistorySelector apiKey={userApiKey} />
</section>
```

### Add Translations

```typescript
const translations = {
  en: {
    personalCenter: {
      videoHistory: "My Video History",
    },
  },
  zh: {
    personalCenter: {
      videoHistory: "我的视频历史",
    },
  },
};
```

## Acceptance Criteria

- [ ] Video history section added to personal center
- [ ] Reuses VideoHistorySelector component
- [ ] Translation keys added
- [ ] Section styled consistently with existing personal center

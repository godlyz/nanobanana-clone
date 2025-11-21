# Task 3.6: Add Video Card to Features Section

**File**: `components/features.tsx`
**Estimated Time**: 1 hour
**Dependencies**: None (UI update only)
**Priority**: P2 (Nice to have)

## Overview

Add a new feature card for video generation to existing features section

## Implementation

### Update Features Component

```typescript
// components/features.tsx (add new feature card)
import { Film } from "lucide-react";

const features = [
  // ... existing feature cards ...

  // NEW: Video generation feature card
  {
    icon: Film,
    title: t("features.video.title"),
    description: t("features.video.description"),
    benefits: [
      t("features.video.benefit1"), // "4-8 second AI-generated videos"
      t("features.video.benefit2"), // "16:9 and 9:16 aspect ratios"
      t("features.video.benefit3"), // "720p and 1080p resolutions"
      t("features.video.benefit4"), // "Text-to-video generation"
    ],
  },
];
```

### Add Translations

```typescript
// lib/language-context.tsx
const translations = {
  en: {
    features: {
      video: {
        title: "AI Video Generation",
        description: "Generate high-quality videos from text prompts using Google Veo 3.1",
        benefit1: "4-8 second AI-generated videos",
        benefit2: "16:9 and 9:16 aspect ratios",
        benefit3: "720p and 1080p resolutions",
        benefit4: "Text-to-video generation",
      },
    },
  },
  zh: {
    features: {
      video: {
        title: "AI 视频生成",
        description: "使用 Google Veo 3.1 从文本提示生成高质量视频",
        benefit1: "4-8 秒 AI 生成视频",
        benefit2: "16:9 和 9:16 宽高比",
        benefit3: "720p 和 1080p 分辨率",
        benefit4: "文本生成视频",
      },
    },
  },
};
```

## Acceptance Criteria

- [ ] Video feature card added to features section
- [ ] Card includes Film icon
- [ ] Translation keys added
- [ ] Card matches existing feature card style

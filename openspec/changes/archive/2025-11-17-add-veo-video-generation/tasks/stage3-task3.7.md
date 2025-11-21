# Task 3.7: Add Video Tab to Showcase Section

**File**: `components/showcase.tsx`
**Estimated Time**: 2 hours
**Dependencies**: None (UI update only)
**Priority**: P2 (Nice to have)

## Overview

Add a "Videos" tab to existing showcase gallery with video generation examples

## Implementation

### Update Showcase Component

```typescript
// components/showcase.tsx (add video tab)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="images">
  <TabsList>
    <TabsTrigger value="images">{t("showcase.tabs.images")}</TabsTrigger>
    <TabsTrigger value="videos">{t("showcase.tabs.videos")}</TabsTrigger>
  </TabsList>

  <TabsContent value="images">
    {/* Existing image showcase grid */}
  </TabsContent>

  <TabsContent value="videos">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videoShowcaseItems.map((item) => (
        <div key={item.id} className="group cursor-pointer">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={item.videoUrl}
              poster={item.thumbnailUrl}
              controls
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground italic">"{item.prompt}"</p>
          </div>
        </div>
      ))}
    </div>
  </TabsContent>
</Tabs>

const videoShowcaseItems = [
  {
    id: "1",
    title: "Cat Playing Piano",
    videoUrl: "/showcase/video-cat-piano.mp4",
    thumbnailUrl: "/showcase/video-cat-piano-thumb.jpg",
    prompt: "A cat playing piano in a jazz club",
  },
  // Add 5-10 more video examples...
];
```

### Add Translations

```typescript
// lib/language-context.tsx
const translations = {
  en: {
    showcase: {
      tabs: {
        images: "Images",
        videos: "Videos",
      },
    },
  },
  zh: {
    showcase: {
      tabs: {
        images: "图片",
        videos: "视频",
      },
    },
  },
};
```

## Acceptance Criteria

- [ ] Videos tab added to showcase section
- [ ] Video grid displays 5-10 examples
- [ ] Video player with controls
- [ ] Thumbnail posters before play
- [ ] Prompt text shown for each video
- [ ] Translation keys added
- [ ] Responsive grid layout

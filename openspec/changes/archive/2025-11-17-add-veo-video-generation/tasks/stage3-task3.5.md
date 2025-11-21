# Task 3.5: Update Hero Carousel with Video Examples

**File**: `components/hero.tsx`
**Estimated Time**: 2 hours
**Dependencies**: None (UI update only)
**Priority**: P2 (Nice to have)

## Overview

Add video generation examples to existing hero carousel:
- Add 3-5 video generation showcase items
- Mix of image and video editing examples
- Update carousel to support video playback
- Add "Generate Video" CTA button
- Maintain existing image editing examples

## Subtasks

### 3.5.1: Update Hero Component with Video Examples

```typescript
// components/hero.tsx (update existing carousel items)

const carouselItems = [
  // Existing image editing examples...

  // NEW: Video generation examples
  {
    id: "video-1",
    type: "video",
    title: t("hero.examples.video1.title"),
    description: t("hero.examples.video1.description"),
    videoUrl: "/showcase/video-cat-piano.mp4",
    thumbnailUrl: "/showcase/video-cat-piano-thumb.jpg",
    prompt: "A cat playing piano in a jazz club, cinematic lighting",
  },
  {
    id: "video-2",
    type: "video",
    title: t("hero.examples.video2.title"),
    description: t("hero.examples.video2.description"),
    videoUrl: "/showcase/video-city-timelapse.mp4",
    thumbnailUrl: "/showcase/video-city-timelapse-thumb.jpg",
    prompt: "City skyline timelapse at sunset, 4K drone footage",
  },
  {
    id: "video-3",
    type: "video",
    title: t("hero.examples.video3.title"),
    description: t("hero.examples.video3.description"),
    videoUrl: "/showcase/video-ocean-waves.mp4",
    thumbnailUrl: "/showcase/video-ocean-waves-thumb.jpg",
    prompt: "Ocean waves crashing on beach, slow motion, golden hour",
  },
];

// Update carousel item rendering
<div className="carousel-item">
  {item.type === "video" ? (
    <video
      src={item.videoUrl}
      poster={item.thumbnailUrl}
      controls
      className="w-full h-auto rounded-lg"
    />
  ) : (
    <img
      src={item.imageUrl}
      alt={item.title}
      className="w-full h-auto rounded-lg"
    />
  )}
  <div className="mt-4">
    <h3 className="text-lg font-semibold">{item.title}</h3>
    <p className="text-sm text-muted-foreground">{item.description}</p>
    <p className="text-xs text-muted-foreground mt-2 italic">
      "{item.prompt}"
    </p>
  </div>
</div>

// Add "Generate Video" CTA button
<Button onClick={() => router.push("/video-editor")} size="lg">
  <Film className="mr-2 h-5 w-5" />
  {t("hero.cta.generateVideo")}
</Button>
```

### 3.5.2: Add Translation Keys

```typescript
// lib/language-context.tsx
const translations = {
  en: {
    hero: {
      examples: {
        video1: {
          title: "Jazz Cat",
          description: "AI-generated video of a cat playing piano",
        },
        video2: {
          title: "City Sunset",
          description: "Timelapse video of city skyline",
        },
        video3: {
          title: "Ocean Waves",
          description: "Slow motion beach waves",
        },
      },
      cta: {
        generateVideo: "Generate Video",
      },
    },
  },
  zh: {
    hero: {
      examples: {
        video1: {
          title: "爵士猫",
          description: "AI生成的猫弹钢琴视频",
        },
        video2: {
          title: "城市日落",
          description: "城市天际线延时摄影",
        },
        video3: {
          title: "海浪",
          description: "海滩波浪慢动作",
        },
      },
      cta: {
        generateVideo: "生成视频",
      },
    },
  },
};
```

### 3.5.3: Add Video Assets

```bash
# Create showcase directory for video examples
mkdir -p public/showcase

# TODO: Add 3-5 example videos and thumbnails to public/showcase/
# - video-cat-piano.mp4 + video-cat-piano-thumb.jpg
# - video-city-timelapse.mp4 + video-city-timelapse-thumb.jpg
# - video-ocean-waves.mp4 + video-ocean-waves-thumb.jpg
```

## Verification Steps

```bash
# 1. Navigate to homepage
open http://localhost:3000

# 2. Test carousel with video items
# - Verify carousel includes video examples
# - Click play on video items
# - Verify video playback works

# 3. Test "Generate Video" CTA button
# - Click button
# - Verify navigation to /video-editor

# 4. Test translation
# - Switch language to ZH
# - Verify all labels translate correctly

# 5. Test responsiveness
# - Resize browser to mobile width
# - Verify video player maintains aspect ratio
```

## Acceptance Criteria

- [ ] Hero carousel updated with 3-5 video examples
- [ ] Video items support playback in carousel
- [ ] Thumbnail posters display before play
- [ ] Prompt text shown for each example
- [ ] "Generate Video" CTA button added
- [ ] CTA button navigates to /video-editor
- [ ] Translation keys added
- [ ] Video assets added to public/showcase
- [ ] Component maintains existing image examples
- [ ] Responsive design for mobile

# Task 3.1: Create Video Generation Form Component

**File**: `components/video/video-generation-form.tsx`
**Estimated Time**: 4 hours
**Dependencies**: Task 2.4 (API endpoints)
**Priority**: P0 (Blocking)

## Overview

Create a user-friendly form for video generation requests:
- Text input for prompts with character counter
- Optional negative prompt field
- Aspect ratio selector (16:9, 9:16)
- Resolution selector (720p, 1080p)
- Duration selector (4s, 6s, 8s)
- Optional reference image upload
- Real-time credit cost calculation
- Form validation with error messages
- Submit button with loading state
- Success/error feedback

## Subtasks

### 3.1.1: Create Video Generation Form Component

```typescript
// components/video/video-generation-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

// Form validation schema
const videoGenerationSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(500, "Prompt must be less than 500 characters"),
  negativePrompt: z.string().max(200).optional(),
  aspectRatio: z.enum(["16:9", "9:16"]),
  resolution: z.enum(["720p", "1080p"]),
  duration: z.enum(["4", "6", "8"]),
  referenceImageUrl: z.string().url().optional().or(z.literal("")),
});

type VideoGenerationFormData = z.infer<typeof videoGenerationSchema>;

// Credit cost calculation
const calculateCreditCost = (resolution: string, duration: string): number => {
  const durationNum = parseInt(duration);
  const baseCredits = durationNum * 10;
  const multiplier = resolution === "1080p" ? 1.5 : 1.0;
  return Math.floor(baseCredits * multiplier);
};

interface VideoGenerationFormProps {
  onSuccess: (taskId: string) => void;
  apiKey: string;
}

export function VideoGenerationForm({ onSuccess, apiKey }: VideoGenerationFormProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoGenerationFormData>({
    resolver: zodResolver(videoGenerationSchema),
    defaultValues: {
      aspectRatio: "16:9",
      resolution: "720p",
      duration: "4",
      referenceImageUrl: "",
    },
  });

  const watchedResolution = watch("resolution");
  const watchedDuration = watch("duration");
  const watchedPrompt = watch("prompt") || "";

  const creditCost = calculateCreditCost(watchedResolution, watchedDuration);

  const onSubmit = async (data: VideoGenerationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          prompt: data.prompt,
          negative_prompt: data.negativePrompt || undefined,
          aspect_ratio: data.aspectRatio,
          resolution: data.resolution,
          duration: parseInt(data.duration),
          reference_image_url: uploadedImageUrl || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create video generation task");
      }

      const result = await response.json();
      onSuccess(result.task_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Upload to Supabase Storage and get public URL
    // For now, create a local object URL (not production-ready)
    const objectUrl = URL.createObjectURL(file);
    setUploadedImageUrl(objectUrl);
    setValue("referenceImageUrl", objectUrl);
  };

  const removeImage = () => {
    setUploadedImageUrl(null);
    setValue("referenceImageUrl", "");
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          {t("video.generation.title")}
        </CardTitle>
        <CardDescription>{t("video.generation.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              {t("video.generation.prompt")} *
            </Label>
            <Textarea
              id="prompt"
              placeholder={t("video.generation.promptPlaceholder")}
              {...register("prompt")}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{errors.prompt?.message}</span>
              <span>{watchedPrompt.length}/500</span>
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">
              {t("video.generation.negativePrompt")} ({t("common.optional")})
            </Label>
            <Input
              id="negativePrompt"
              placeholder={t("video.generation.negativePromptPlaceholder")}
              {...register("negativePrompt")}
            />
            {errors.negativePrompt && (
              <p className="text-sm text-destructive">{errors.negativePrompt.message}</p>
            )}
          </div>

          {/* Reference Image Upload */}
          <div className="space-y-2">
            <Label>{t("video.generation.referenceImage")} ({t("common.optional")})</Label>
            {!uploadedImageUrl ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="imageUpload"
                />
                <Label htmlFor="imageUpload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>{t("video.generation.uploadImage")}</span>
                  </Button>
                </Label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={uploadedImageUrl}
                  alt="Reference"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label>{t("video.generation.aspectRatio")} *</Label>
            <Select
              value={watch("aspectRatio")}
              onValueChange={(value) => setValue("aspectRatio", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label>{t("video.generation.resolution")} *</Label>
            <Select
              value={watch("resolution")}
              onValueChange={(value) => setValue("resolution", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{t("video.generation.duration")} *</Label>
            <Select
              value={watch("duration")}
              onValueChange={(value) => setValue("duration", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 seconds</SelectItem>
                <SelectItem value="6">6 seconds</SelectItem>
                <SelectItem value="8">8 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credit Cost Display */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t("video.generation.creditCost")}</span>
              <span className="text-2xl font-bold">{creditCost} {t("common.credits")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("video.generation.estimatedTime")}: 11s-6min
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("video.generation.generating")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("video.generation.generate")} ({creditCost} {t("common.credits")})
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 3.1.2: Add Translation Keys

```typescript
// lib/language-context.tsx (add to translations object)
const translations = {
  en: {
    // ... existing translations ...
    video: {
      generation: {
        title: "Generate Video",
        description: "Create AI-generated videos from text prompts",
        prompt: "Video Prompt",
        promptPlaceholder: "Describe the video you want to create...",
        negativePrompt: "Negative Prompt",
        negativePromptPlaceholder: "What to avoid in the video...",
        referenceImage: "Reference Image",
        uploadImage: "Upload Image",
        aspectRatio: "Aspect Ratio",
        resolution: "Resolution",
        duration: "Duration",
        creditCost: "Credit Cost",
        estimatedTime: "Estimated generation time",
        generating: "Generating...",
        generate: "Generate Video",
      },
    },
    common: {
      optional: "Optional",
      credits: "Credits",
    },
  },
  zh: {
    // ... existing translations ...
    video: {
      generation: {
        title: "生成视频",
        description: "使用文本提示创建 AI 生成的视频",
        prompt: "视频提示词",
        promptPlaceholder: "描述您想要创建的视频...",
        negativePrompt: "反向提示词",
        negativePromptPlaceholder: "视频中要避免的内容...",
        referenceImage: "参考图片",
        uploadImage: "上传图片",
        aspectRatio: "宽高比",
        resolution: "分辨率",
        duration: "时长",
        creditCost: "积分消耗",
        estimatedTime: "预计生成时间",
        generating: "生成中...",
        generate: "生成视频",
      },
    },
    common: {
      optional: "可选",
      credits: "积分",
    },
  },
};
```

### 3.1.3: Create Video Editor Page

```typescript
// app/video-editor/page.tsx
"use client";

import { useState } from "react";
import { VideoGenerationForm } from "@/components/video/video-generation-form";
import { useRouter } from "next/navigation";

export default function VideoEditorPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string>(""); // TODO: Get from user profile

  const handleSuccess = (taskId: string) => {
    // Redirect to video status page
    router.push(`/video-status/${taskId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <VideoGenerationForm onSuccess={handleSuccess} apiKey={apiKey} />
    </div>
  );
}
```

## Verification Steps

```bash
# 1. Install dependencies (if not already installed)
pnpm add react-hook-form @hookform/resolvers zod

# 2. Start development server
pnpm dev

# 3. Navigate to video editor page
open http://localhost:3000/video-editor

# 4. Test form validation
# - Try submitting empty form (should show validation errors)
# - Enter prompt with < 10 characters (should show error)
# - Enter prompt with > 500 characters (should show error)

# 5. Test credit cost calculation
# - Select 720p + 4s (should show 40 credits)
# - Select 1080p + 4s (should show 60 credits)
# - Select 720p + 8s (should show 80 credits)
# - Select 1080p + 8s (should show 120 credits)

# 6. Test image upload
# - Click "Upload Image" button
# - Select an image file
# - Verify image preview appears
# - Click X button to remove image

# 7. Test form submission
# - Fill out all required fields
# - Click "Generate Video" button
# - Verify loading state appears
# - Verify redirect to status page on success

# 8. Test error handling
# - Submit with invalid API key (should show error alert)
# - Submit with insufficient credits (should show error alert)

# 9. Test translation switching
# - Switch language from EN to ZH
# - Verify all labels and placeholders translate correctly
```

## Acceptance Criteria

- [ ] Video generation form component created
- [ ] Form validation using Zod schema works correctly
- [ ] All input fields present (prompt, negative prompt, aspect ratio, resolution, duration, reference image)
- [ ] Real-time credit cost calculation works
- [ ] Character counter for prompt field (0/500)
- [ ] Image upload functionality implemented
- [ ] Image preview and removal works
- [ ] Form submit calls `/api/v1/video/generate` endpoint
- [ ] Loading state shows during submission
- [ ] Error messages display correctly
- [ ] Success callback redirects to status page
- [ ] Translation keys added for EN and ZH
- [ ] Component is responsive (mobile-friendly)
- [ ] Accessibility (proper labels, ARIA attributes)
- [ ] Video editor page created at `/video-editor`

# Task 3.2: Create Video Status Page

**File**: `app/video-status/[task_id]/page.tsx`
**Estimated Time**: 3 hours
**Dependencies**: Task 2.4 (API endpoints), Task 3.1 (Form component)
**Priority**: P0 (Blocking)

## Overview

Create a real-time video status tracking page:
- Display current generation status (processing, downloading, completed, failed)
- Show progress indicators and estimated time
- Auto-refresh status every 5 seconds
- Display video player when completed
- Show error messages when failed
- Download button for completed videos
- Regenerate button for failed tasks
- Share button for completed videos
- Responsive design for mobile/desktop

## Subtasks

### 3.2.1: Create Video Status Page Component

```typescript
// app/video-status/[task_id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  RefreshCw,
  Clock,
  Film
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type TaskStatus = "processing" | "downloading" | "completed" | "failed";

interface VideoTask {
  task_id: string;
  status: TaskStatus;
  created_at: string;
  video_url?: string;
  thumbnail_url?: string;
  completed_at?: string;
  error_message?: string;
  error_code?: string;
}

export default function VideoStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const taskId = params.task_id as string;

  const [task, setTask] = useState<VideoTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(""); // TODO: Get from user profile

  const fetchTaskStatus = async () => {
    try {
      const response = await fetch(`/api/v1/video/status/${taskId}`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task status");
      }

      const data = await response.json();
      setTask(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiKey) return;

    fetchTaskStatus();

    // Auto-refresh every 5 seconds if not completed or failed
    const interval = setInterval(() => {
      if (task?.status === "processing" || task?.status === "downloading") {
        fetchTaskStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [taskId, apiKey, task?.status]);

  const getStatusBadge = (status: TaskStatus) => {
    const statusConfig = {
      processing: {
        label: t("video.status.processing"),
        variant: "default" as const,
        icon: Loader2,
      },
      downloading: {
        label: t("video.status.downloading"),
        variant: "secondary" as const,
        icon: Download,
      },
      completed: {
        label: t("video.status.completed"),
        variant: "success" as const,
        icon: CheckCircle2,
      },
      failed: {
        label: t("video.status.failed"),
        variant: "destructive" as const,
        icon: XCircle,
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getProgressValue = (status: TaskStatus) => {
    switch (status) {
      case "processing":
        return 30;
      case "downloading":
        return 70;
      case "completed":
        return 100;
      case "failed":
        return 0;
      default:
        return 0;
    }
  };

  const handleDownload = () => {
    if (task?.video_url) {
      window.open(task.video_url, "_blank");
    }
  };

  const handleShare = async () => {
    if (task?.video_url) {
      await navigator.share({
        title: "AI Generated Video",
        url: task.video_url,
      });
    }
  };

  const handleRegenerate = () => {
    router.push("/video-editor");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTitle>{t("video.status.notFound")}</AlertTitle>
          <AlertDescription>
            {t("video.status.notFoundDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-6 w-6" />
                {t("video.status.title")}
              </CardTitle>
              <CardDescription>
                {t("common.taskId")}: {taskId}
              </CardDescription>
            </div>
            {getStatusBadge(task.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          {(task.status === "processing" || task.status === "downloading") && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("video.status.progress")}</span>
                <span>{getProgressValue(task.status)}%</span>
              </div>
              <Progress value={getProgressValue(task.status)} />
            </div>
          )}

          {/* Processing State */}
          {task.status === "processing" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>{t("video.status.processingTitle")}</AlertTitle>
              <AlertDescription>
                {t("video.status.processingDescription")}
              </AlertDescription>
            </Alert>
          )}

          {/* Downloading State */}
          {task.status === "downloading" && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>{t("video.status.downloadingTitle")}</AlertTitle>
              <AlertDescription>
                {t("video.status.downloadingDescription")}
              </AlertDescription>
            </Alert>
          )}

          {/* Completed State */}
          {task.status === "completed" && task.video_url && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={task.video_url}
                  poster={task.thumbnail_url}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  {t("video.status.download")}
                </Button>
                {navigator.share && (
                  <Button onClick={handleShare} variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    {t("video.status.share")}
                  </Button>
                )}
              </div>

              {/* Metadata */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {t("video.status.completedAt")}:{" "}
                  {new Date(task.completed_at!).toLocaleString()}
                </p>
                <p>
                  {t("video.status.createdAt")}:{" "}
                  {new Date(task.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {task.status === "failed" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t("video.status.failedTitle")}</AlertTitle>
                <AlertDescription>
                  {task.error_message || t("video.status.failedDescription")}
                </AlertDescription>
              </Alert>

              {task.error_code && (
                <div className="text-sm text-muted-foreground">
                  {t("common.errorCode")}: {task.error_code}
                </div>
              )}

              <Button onClick={handleRegenerate} variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("video.status.regenerate")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2.2: Add Translation Keys

```typescript
// lib/language-context.tsx (add to translations object)
const translations = {
  en: {
    // ... existing translations ...
    video: {
      status: {
        title: "Video Generation Status",
        processing: "Processing",
        downloading: "Downloading",
        completed: "Completed",
        failed: "Failed",
        progress: "Progress",
        processingTitle: "Generating Your Video",
        processingDescription: "This usually takes 11 seconds to 6 minutes. Please wait...",
        downloadingTitle: "Downloading Video",
        downloadingDescription: "Saving your video to permanent storage...",
        download: "Download Video",
        share: "Share",
        regenerate: "Try Again",
        completedAt: "Completed at",
        createdAt: "Created at",
        failedTitle: "Generation Failed",
        failedDescription: "Your credits have been refunded.",
        notFound: "Task Not Found",
        notFoundDescription: "The video generation task could not be found.",
      },
    },
    common: {
      taskId: "Task ID",
      error: "Error",
      errorCode: "Error Code",
    },
  },
  zh: {
    // ... existing translations ...
    video: {
      status: {
        title: "视频生成状态",
        processing: "处理中",
        downloading: "下载中",
        completed: "已完成",
        failed: "失败",
        progress: "进度",
        processingTitle: "正在生成您的视频",
        processingDescription: "通常需要 11 秒到 6 分钟，请稍候...",
        downloadingTitle: "正在下载视频",
        downloadingDescription: "正在将您的视频保存到永久存储...",
        download: "下载视频",
        share: "分享",
        regenerate: "重试",
        completedAt: "完成于",
        createdAt: "创建于",
        failedTitle: "生成失败",
        failedDescription: "您的积分已退还。",
        notFound: "任务未找到",
        notFoundDescription: "无法找到该视频生成任务。",
      },
    },
    common: {
      taskId: "任务 ID",
      error: "错误",
      errorCode: "错误代码",
    },
  },
};
```

### 3.2.3: Add Progress Component (shadcn/ui)

```bash
# Install shadcn/ui Progress component
npx shadcn@latest add progress
```

## Verification Steps

```bash
# 1. Start development server
pnpm dev

# 2. Create a video generation task
# Navigate to http://localhost:3000/video-editor
# Fill out and submit the form

# 3. You will be redirected to the status page
# URL: http://localhost:3000/video-status/[task-id]

# 4. Test auto-refresh (processing state)
# - Verify page auto-refreshes every 5 seconds
# - Watch console for API calls
# - Verify progress bar shows 30%

# 5. Test downloading state
# - Manually update task status to 'downloading' in database
# - Verify badge changes to "Downloading"
# - Verify progress bar shows 70%

# 6. Test completed state
# - Manually update task to 'completed' with video_url
# - Verify video player appears
# - Click "Download Video" button (should open video in new tab)
# - Click "Share" button (should trigger native share dialog)

# 7. Test failed state
# - Manually update task to 'failed' with error_message
# - Verify error alert appears
# - Verify error message and code displayed
# - Click "Try Again" button (should redirect to /video-editor)

# 8. Test translation switching
# - Switch language from EN to ZH
# - Verify all labels and messages translate correctly

# 9. Test mobile responsiveness
# - Resize browser to mobile width
# - Verify layout adjusts correctly
# - Verify video player maintains aspect ratio

# 10. Test error handling
# - Navigate to invalid task ID
# - Verify "Task Not Found" alert appears
# - Test with missing API key (should show error)
```

## Acceptance Criteria

- [ ] Video status page created at `/video-status/[task_id]`
- [ ] Task status fetched from API endpoint
- [ ] Auto-refresh every 5 seconds for processing/downloading tasks
- [ ] Status badge displays correctly (processing, downloading, completed, failed)
- [ ] Progress bar shows accurate progress (30% → 70% → 100%)
- [ ] Processing state shows estimated time alert
- [ ] Downloading state shows download progress alert
- [ ] Completed state shows video player with controls
- [ ] Video player has thumbnail poster image
- [ ] Download button downloads video
- [ ] Share button triggers native share dialog (if supported)
- [ ] Failed state shows error alert with message and code
- [ ] Regenerate button redirects to editor
- [ ] Task metadata displayed (created_at, completed_at)
- [ ] Translation keys added for EN and ZH
- [ ] Page is responsive (mobile/desktop)
- [ ] Loading state shown while fetching
- [ ] Error handling for invalid task IDs
- [ ] Progress component installed from shadcn/ui

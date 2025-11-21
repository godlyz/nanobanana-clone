# Task 3.3: Create Video History Selector Component

**File**: `components/video/video-history-selector.tsx`
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2 (VideoService)
**Priority**: P1 (Important)

## Overview

Create a dropdown component for users to browse and select from their video generation history:
- Fetch user's video generation history from API
- Display thumbnail previews in dropdown
- Show generation date and status
- Filter by status (all, completed, failed)
- Pagination for large histories
- Click to navigate to video status page
- Load more button for infinite scroll
- Empty state for new users

## Subtasks

### 3.3.1: Create Video History API Endpoint

```typescript
// app/api/v1/video/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    // Validate API key and get user ID
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      );
    }

    const userId = keyData.user_id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // all, completed, failed, processing
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('video_generation_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error: any) {
    console.error('Get video history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.3.2: Create Video History Selector Component

```typescript
// components/video/video-history-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface VideoTask {
  id: string;
  status: string;
  prompt: string;
  thumbnail_url?: string;
  created_at: string;
  aspect_ratio: string;
  resolution: string;
  duration: number;
}

interface VideoHistorySelectorProps {
  apiKey: string;
  onSelect?: (taskId: string) => void;
}

export function VideoHistorySelector({ apiKey, onSelect }: VideoHistorySelectorProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const fetchHistory = async (reset: boolean = false) => {
    setLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      const response = await fetch(
        `/api/v1/video/history?status=${filter}&limit=${limit}&offset=${currentOffset}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video history");
      }

      const data = await response.json();

      if (reset) {
        setTasks(data.tasks);
      } else {
        setTasks((prev) => [...prev, ...data.tasks]);
      }

      setHasMore(data.tasks.length === limit);
      setOffset(currentOffset + data.tasks.length);
    } catch (error) {
      console.error("Error fetching video history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiKey) return;
    fetchHistory(true);
  }, [filter, apiKey]);

  const handleTaskClick = (taskId: string) => {
    if (onSelect) {
      onSelect(taskId);
    } else {
      router.push(`/video-status/${taskId}`);
    }
  };

  const loadMore = () => {
    fetchHistory(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "processing":
      case "downloading":
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("time.justNow");
    if (diffMins < 60) return t("time.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("time.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("time.daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Film className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t("video.history.title")}</h3>
      </div>

      {/* Status Filter */}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="mb-4">
          <SelectValue placeholder={t("video.history.filterPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("video.history.all")}</SelectItem>
          <SelectItem value="completed">{t("video.history.completed")}</SelectItem>
          <SelectItem value="processing">{t("video.history.processing")}</SelectItem>
          <SelectItem value="failed">{t("video.history.failed")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Task List */}
      <ScrollArea className="h-[400px] rounded-md border">
        {loading && offset === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center p-6">
            <Film className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("video.history.empty")}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {tasks.map((task, index) => (
              <div key={task.id}>
                <button
                  onClick={() => handleTaskClick(task.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-12 bg-muted rounded overflow-hidden">
                      {task.thumbnail_url ? (
                        <img
                          src={task.thumbnail_url}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {task.prompt.substring(0, 50)}
                          {task.prompt.length > 50 ? "..." : ""}
                        </p>
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {task.aspect_ratio}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.resolution}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.duration}s
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(task.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
                {index < tasks.length - 1 && <Separator className="my-2" />}
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <Button
                onClick={loadMore}
                variant="ghost"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    {t("video.history.loadMore")}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

### 3.3.3: Add Translation Keys

```typescript
// lib/language-context.tsx (add to translations object)
const translations = {
  en: {
    video: {
      history: {
        title: "Video History",
        filterPlaceholder: "Filter by status",
        all: "All Videos",
        completed: "Completed",
        processing: "Processing",
        failed: "Failed",
        empty: "No videos yet. Generate your first video!",
        loadMore: "Load More",
      },
    },
    time: {
      justNow: "Just now",
      minutesAgo: "{count} minutes ago",
      hoursAgo: "{count} hours ago",
      daysAgo: "{count} days ago",
    },
    common: {
      loading: "Loading...",
    },
  },
  zh: {
    video: {
      history: {
        title: "视频历史",
        filterPlaceholder: "按状态筛选",
        all: "所有视频",
        completed: "已完成",
        processing: "处理中",
        failed: "失败",
        empty: "还没有视频。生成您的第一个视频！",
        loadMore: "加载更多",
      },
    },
    time: {
      justNow: "刚刚",
      minutesAgo: "{count} 分钟前",
      hoursAgo: "{count} 小时前",
      daysAgo: "{count} 天前",
    },
    common: {
      loading: "加载中...",
    },
  },
};
```

### 3.3.4: Install ScrollArea Component

```bash
npx shadcn@latest add scroll-area
```

## Verification Steps

```bash
# 1. Start development server
pnpm dev

# 2. Create some test video tasks
# Use the video generation form to create 3-5 tasks

# 3. Navigate to page with video history component
# (e.g., /video-editor or create test page)

# 4. Test status filter
# - Select "All Videos" (should show all tasks)
# - Select "Completed" (should show only completed tasks)
# - Select "Processing" (should show only processing tasks)
# - Select "Failed" (should show only failed tasks)

# 5. Test task list display
# - Verify thumbnails appear for completed videos
# - Verify placeholder icon for videos without thumbnails
# - Verify prompt is truncated to 50 characters
# - Verify status icons show correctly (spinner, checkmark, X)
# - Verify metadata badges (aspect ratio, resolution, duration)
# - Verify relative time formatting ("Just now", "5 minutes ago", etc.)

# 6. Test task selection
# - Click on a task
# - Verify navigation to /video-status/[task_id]

# 7. Test pagination / load more
# - Create 15+ video tasks
# - Scroll to bottom of list
# - Click "Load More" button
# - Verify next 10 tasks load
# - Verify "Load More" button disappears when no more tasks

# 8. Test empty state
# - Create new user with no video history
# - Verify empty state message appears

# 9. Test translation switching
# - Switch language from EN to ZH
# - Verify all labels and messages translate correctly

# 10. Test loading states
# - Verify initial loading spinner
# - Verify "Load More" button loading state
```

## Acceptance Criteria

- [ ] Video history API endpoint created at `/api/v1/video/history`
- [ ] API endpoint supports status filtering (all, completed, processing, failed)
- [ ] API endpoint supports pagination (limit, offset)
- [ ] Video history selector component created
- [ ] Component fetches user's video history from API
- [ ] Status filter dropdown works (all, completed, processing, failed)
- [ ] Task list displays thumbnails for completed videos
- [ ] Task list shows placeholder icon for videos without thumbnails
- [ ] Prompt text is truncated to 50 characters
- [ ] Status icons display correctly (spinner, checkmark, X, clock)
- [ ] Metadata badges show aspect ratio, resolution, duration
- [ ] Relative time formatting works ("Just now", "5 minutes ago", etc.)
- [ ] Clicking task navigates to status page
- [ ] Load more button loads next page of results
- [ ] Load more button hides when no more results
- [ ] Empty state shows when no videos
- [ ] Translation keys added for EN and ZH
- [ ] ScrollArea component installed from shadcn/ui
- [ ] Component handles loading states correctly
- [ ] Component handles API errors gracefully

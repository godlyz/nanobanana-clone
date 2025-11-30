"use client"

/**
 * 🔥 老王的视频任务状态追踪组件
 * 功能: 自动轮询任务状态，显示进度和结果
 * 老王提醒: 这个轮询要每10秒查一次，别太频繁！
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Video,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  AlertCircle,
  Clock,
  Coins,
} from "lucide-react"

// 🔥 任务状态类型
interface VideoTask {
  task_id: string
  status: "processing" | "downloading" | "completed" | "failed"
  prompt: string
  aspect_ratio: string
  resolution: string
  duration: number
  credit_cost: number
  created_at: string
  completed_at?: string
  video_url?: string
  thumbnail_url?: string
  error_message?: string
  error_code?: string
  refund_confirmed?: boolean
}

interface VideoStatusTrackerProps {
  taskId: string
  onComplete?: () => void // 🔥 任务完成时的回调
}

export function VideoStatusTracker({ taskId, onComplete }: VideoStatusTrackerProps) {
  const [task, setTask] = useState<VideoTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 轮询任务状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let timeIntervalId: NodeJS.Timeout | null = null
    const MAX_POLLING_TIME = 600 // 🔥 老王Day3添加：最长轮询10分钟（600秒）

    const fetchStatus = async () => {
      try {
        // 🔥 老王Day3修复：超时检查 - 超过10分钟停止轮询并显示超时错误
        if (elapsedTime >= MAX_POLLING_TIME) {
          if (intervalId) clearInterval(intervalId)
          if (timeIntervalId) clearInterval(timeIntervalId)
          setError(
            "视频生成时间较长（超过10分钟）。\n\n" +
            "可能原因：\n" +
            "1. 视频正在处理中，请稍后刷新页面查看\n" +
            "2. 如果长时间未完成，系统会自动退还积分\n\n" +
            "建议操作：点击下方按钮刷新页面或查看历史记录"
          )
          setIsLoading(false)
          return
        }

        // 🔥 内部调用不需要API Key，由服务端自动从 Supabase Session 获取用户ID
        const response = await fetch(`/api/v1/video/status/${taskId}`)

        if (!response.ok) {
          const data = await response.json()
          setError(data.message || "Failed to fetch task status")
          setIsLoading(false)
          if (intervalId) clearInterval(intervalId)
          return
        }

        const data = await response.json()
        setTask(data)
        setIsLoading(false)

        // 如果任务完成或失败，停止轮询
        if (data.status === "completed" || data.status === "failed") {
          if (intervalId) clearInterval(intervalId)
          if (timeIntervalId) clearInterval(timeIntervalId)
          // 🔥 任务成功完成时，调用回调刷新历史记录
          if (data.status === "completed" && onComplete) {
            onComplete()
          }
        }
      } catch (err: any) {
        console.error("Fetch status error:", err)
        setError("Network error. Please refresh the page.")
        setIsLoading(false)
        if (intervalId) clearInterval(intervalId)
      }
    }

    // 首次加载
    fetchStatus()

    // 每10秒轮询一次
    intervalId = setInterval(fetchStatus, 10000)

    // 每秒更新耗时
    timeIntervalId = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeIntervalId) clearInterval(timeIntervalId)
    }
  }, [taskId, elapsedTime, onComplete])

  // 格式化时间 (秒 -> mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // 下载视频
  const handleDownload = () => {
    if (task?.video_url) {
      window.open(task.video_url, "_blank")
    }
  }

  // 加载中
  if (isLoading && !task) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Loading task status...</span>
        </div>
      </div>
    )
  }

  // 错误
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        {/* 🔥 老王Day3添加：刷新状态按钮 */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            刷新页面重试
          </Button>
          <Button
            variant="default"
            onClick={() => window.location.href = "/history?type=video"}
          >
            查看历史记录
          </Button>
        </div>
      </div>
    )
  }

  // 任务信息
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* 任务标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Video Generation Task</h1>
        <p className="text-muted-foreground">Task ID: {taskId}</p>
      </div>

      {/* 状态卡片 */}
      <div className="bg-card p-6 rounded-xl border space-y-6">
        {/* 状态指示器 */}
        <div className="text-center">
          {task?.status === "processing" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-xl font-bold">Generating Video...</p>
                <p className="text-muted-foreground mt-1">
                  Estimated time: 11s - 6min
                </p>
              </div>
            </div>
          )}

          {task?.status === "downloading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-xl font-bold">Downloading Video...</p>
                <p className="text-muted-foreground mt-1">
                  Almost ready! Uploading to storage...
                </p>
              </div>
            </div>
          )}

          {task?.status === "completed" && (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <p className="text-xl font-bold text-green-600">Video Ready!</p>
                <p className="text-muted-foreground mt-1">
                  Your video has been generated successfully
                </p>
              </div>
            </div>
          )}

          {task?.status === "failed" && (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <div>
                <p className="text-xl font-bold text-destructive">Generation Failed</p>
                <p className="text-muted-foreground mt-1">
                  {task?.error_message || "An error occurred during video generation"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 进度条 (仅processing/downloading) */}
        {(task?.status === "processing" || task?.status === "downloading") && (
          <div className="space-y-2">
            <Progress value={task?.status === "downloading" ? 90 : 50} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Elapsed: {formatTime(elapsedTime)}</span>
              <span>{task?.status === "downloading" ? "90%" : "50%"}</span>
            </div>
          </div>
        )}

        {/* 任务详情 */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resolution:</span>
            <span className="font-medium">{task?.resolution}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aspect Ratio:</span>
            <span className="font-medium">{task?.aspect_ratio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{task?.duration} seconds</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit Cost:</span>
            <span className="font-medium flex items-center gap-1">
              <Coins className="w-4 h-4 text-primary" />
              {task?.credit_cost} credits
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {task?.created_at && new Date(task.created_at).toLocaleString()}
            </span>
          </div>
          {task?.completed_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-medium">
                {new Date(task.completed_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 提示词 */}
        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm text-muted-foreground">Prompt:</p>
          <p className="text-sm">{task?.prompt}</p>
        </div>

        {/* 退款提示 (仅failed) */}
        {task?.status === "failed" && task?.refund_confirmed && (
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertDescription>
              <strong>Credits Refunded:</strong> {task.credit_cost} credits have been automatically
              refunded to your account.
            </AlertDescription>
          </Alert>
        )}

        {/* 🔥 老王新增：视频预览播放器 (仅completed) */}
        {task?.status === "completed" && task?.video_url && (
          <div className="pt-4 space-y-4">
            {/* 视频播放器 */}
            <div className={`rounded-lg overflow-hidden bg-black ${task.aspect_ratio === '9:16' ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'}`}>
              <video
                src={task.video_url}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
              >
                您的浏览器不支持视频播放。
              </video>
            </div>

            {/* 下载按钮 */}
            <Button size="lg" className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-5 w-5" />
              Download Video
            </Button>
          </div>
        )}
      </div>

      {/* 返回按钮 */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => window.location.href = "/tools/video-generation"}
        >
          Generate Another Video
        </Button>
      </div>
    </div>
  )
}

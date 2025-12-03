"use client"

/**
 * 🔥 老王创建：视频延长确认对话框
 * 功能：让用户确认延长操作，显示积分消耗和预计结果
 */

import { useState } from 'react'
import { Loader2, Plus, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale

interface VideoExtendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  currentDuration: number // 当前视频时长（秒）
  resolution: string // 分辨率（720p/1080p）
  prompt: string // 原视频提示词
  sourceVideoId?: string | null // 源视频ID（延长链）
  extensionChain?: Array<{ id: string; duration: number }> // 延长链历史
  onConfirm: (videoId: string, prompt: string) => Promise<void>
}

export function VideoExtendDialog({
  open,
  onOpenChange,
  videoId,
  currentDuration,
  resolution,
  prompt: originalPrompt,
  sourceVideoId,
  extensionChain = [],
  onConfirm,
}: VideoExtendDialogProps) {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extendPrompt, setExtendPrompt] = useState('')

  // 计算延长后的时长
  const newDuration = currentDuration + 7
  const creditCost = 40
  const MAX_DURATION = 148 // 最大总时长

  // 检查是否可以延长
  const is1080p = resolution === '1080p'
  const exceedsLimit = newDuration > MAX_DURATION
  const cannotExtend = is1080p || exceedsLimit

  // 延长链深度
  const chainDepth = extensionChain.length + (sourceVideoId ? 1 : 0) + 1

  const handleConfirm = async () => {
    if (!extendPrompt.trim()) {
      setError(language === 'zh' ? '请输入延长部分的提示词' : 'Please enter a prompt for the extension')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm(videoId, extendPrompt.trim())
      setExtendPrompt('')
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '延长视频失败，请重试' : 'Failed to extend video, please try again'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setExtendPrompt('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#7C3AED]" />
            {language === 'zh' ? '延长视频' : 'Extend Video'}
          </DialogTitle>
          <DialogDescription>
            {language === 'zh'
              ? '为您的视频添加额外的7秒内容'
              : 'Add an additional 7 seconds to your video'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 🔥 老王添加：1080p或超过限制的错误提示 */}
          {cannotExtend && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-red-900 dark:text-red-100">
                    {language === 'zh' ? '无法延长' : 'Cannot Extend'}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {is1080p
                      ? (language === 'zh' ? '1080p视频暂不支持延长功能，仅支持720p视频延长。' : '1080p videos cannot be extended. Only 720p videos can be extended.')
                      : (language === 'zh'
                          ? `延长后总时长将达到 ${newDuration}秒，超过最大限制 ${MAX_DURATION}秒。无法继续延长。`
                          : `Extended duration would be ${newDuration}s, exceeding the maximum limit of ${MAX_DURATION}s.`)
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🔥 老王添加：延长链可视化 */}
          {chainDepth > 1 && !cannotExtend && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase mb-2">
                {language === 'zh' ? '延长链' : 'Extension Chain'}
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 rounded text-purple-700 dark:text-purple-300">
                  {language === 'zh' ? '源视频' : 'Source'}
                </span>
                {Array.from({ length: chainDepth - 1 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-purple-400">→</span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 rounded text-purple-700 dark:text-purple-300">
                      {language === 'zh' ? `延长 ${i + 1}` : `Ext ${i + 1}`}
                    </span>
                  </div>
                ))}
                <span className="text-purple-400">→</span>
                <span className="px-2 py-1 bg-purple-600 text-white rounded font-medium">
                  {language === 'zh' ? '本次' : 'New'}
                </span>
              </div>
            </div>
          )}

          {/* 时长信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-muted-foreground text-xs mb-1">
                {language === 'zh' ? '当前时长' : 'Current Duration'}
              </div>
              <div className="font-semibold">{currentDuration} {language === 'zh' ? '秒' : 's'}</div>
            </div>
            <div className="p-3 bg-[#7C3AED]/10 rounded-lg">
              <div className="text-[#7C3AED] text-xs mb-1">
                {language === 'zh' ? '延长后时长' : 'New Duration'}
              </div>
              <div className="font-semibold text-[#7C3AED]">{newDuration} {language === 'zh' ? '秒' : 's'}</div>
            </div>
          </div>

          {/* 积分消耗提示 */}
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {language === 'zh'
                ? `此操作将消耗 ${creditCost} 积分`
                : `This will cost ${creditCost} credits`}
            </span>
          </div>

          {/* 原提示词参考 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'zh' ? '原视频提示词（参考）' : 'Original Prompt (reference)'}
            </Label>
            <div className="p-3 bg-muted rounded-lg text-sm max-h-20 overflow-y-auto">
              {originalPrompt}
            </div>
          </div>

          {/* 延长提示词输入 */}
          <div className="space-y-2">
            <Label htmlFor="extend-prompt">
              {language === 'zh' ? '延长部分提示词 *' : 'Extension Prompt *'}
            </Label>
            <Textarea
              id="extend-prompt"
              placeholder={language === 'zh'
                ? '描述视频延长部分的内容...'
                : 'Describe the content for the extended part...'}
              value={extendPrompt}
              onChange={(e) => {
                setExtendPrompt(e.target.value)
                if (error) setError(null)
              }}
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {language === 'zh'
                ? '提示：建议延续原视频的主题和风格，以获得更连贯的效果'
                : 'Tip: Continue the theme and style of the original video for better coherence'}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !extendPrompt.trim() || cannotExtend}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'zh' ? '处理中...' : 'Processing...'}
              </>
            ) : cannotExtend ? (
              language === 'zh' ? '无法延长' : 'Cannot Extend'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'zh' ? `确认延长 (${creditCost} 积分)` : `Confirm (${creditCost} credits)`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

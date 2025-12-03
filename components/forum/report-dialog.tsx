"use client"

import { useState } from "react"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle, Loader2 } from "lucide-react"

/**
 * 举报对话框组件
 *
 * 功能：
 * - 用户选择举报原因（spam/harassment/inappropriate/illegal/other）
 * - 可选填写详细描述
 * - 调用 POST /api/forum/reports 提交举报
 * - 支持中英双语
 *
 * 使用场景：
 * - 帖子详情页举报帖子
 * - 回复列表举报回复
 */

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: "thread" | "reply"
  targetId: string
  onReportSuccess?: () => void
}

type ReportReason = "spam" | "harassment" | "inappropriate" | "illegal" | "other"

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  onReportSuccess,
}: ReportDialogProps) {
  const language = useLocale() as 'zh' | 'en'  // 🔥 老王迁移：useLocale返回当前语言，类型断言为zh或en

  const [reason, setReason] = useState<ReportReason>("spam")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 举报原因选项（中英双语）
  const reasonOptions: Array<{
    value: ReportReason
    label: { zh: string; en: string }
    description: { zh: string; en: string }
  }> = [
    {
      value: "spam",
      label: { zh: "垃圾广告", en: "Spam" },
      description: { zh: "包含广告、垃圾信息或促销内容", en: "Contains spam, advertising, or promotional content" }
    },
    {
      value: "harassment",
      label: { zh: "骚扰辱骂", en: "Harassment" },
      description: { zh: "包含人身攻击、辱骂或骚扰他人的内容", en: "Contains personal attacks, insults, or harassment" }
    },
    {
      value: "inappropriate",
      label: { zh: "不当内容", en: "Inappropriate" },
      description: { zh: "包含色情、暴力或其他不适当内容", en: "Contains explicit, violent, or otherwise inappropriate content" }
    },
    {
      value: "illegal",
      label: { zh: "违法内容", en: "Illegal" },
      description: { zh: "包含违法信息或侵犯他人权益", en: "Contains illegal content or violates rights" }
    },
    {
      value: "other",
      label: { zh: "其他原因", en: "Other" },
      description: { zh: "其他违反社区规则的内容", en: "Other violations of community guidelines" }
    }
  ]

  // 重置表单
  const resetForm = () => {
    setReason("spam")
    setDescription("")
    setError(null)
  }

  // 处理对话框关闭
  const handleClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm()
    }
    onOpenChange(open)
  }

  // 提交举报
  const handleSubmit = async () => {
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          description: description.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        // 处理错误
        setError(data.error || (language === "zh" ? "提交失败，请稍后重试" : "Submission failed, please try again"))
        setIsSubmitting(false)
        return
      }

      // 提交成功
      setIsSubmitting(false)
      onOpenChange(false)
      resetForm()

      if (onReportSuccess) {
        onReportSuccess()
      }

      // 显示成功提示（可选：使用 toast）
      alert(language === "zh" ? "举报已提交，感谢您的反馈！" : "Report submitted successfully. Thank you for your feedback!")

    } catch (err) {
      console.error("Report submission error:", err)
      setError(language === "zh" ? "网络错误，请稍后重试" : "Network error, please try again")
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === "zh" ? "举报内容" : "Report Content"}
          </DialogTitle>
          <DialogDescription>
            {language === "zh"
              ? "请选择举报原因，我们会尽快审核处理。"
              : "Please select a reason for reporting. We will review this as soon as possible."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 举报原因选择 */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-base font-semibold">
              {language === "zh" ? "举报原因" : "Reason"}
              <span className="text-destructive ml-1">*</span>
            </Label>

            <RadioGroup value={reason} onValueChange={(val) => setReason(val as ReportReason)}>
              {reasonOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className="font-medium cursor-pointer"
                    >
                      {option.label[language]}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description[language]}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 详细描述（可选） */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              {language === "zh" ? "详细描述（可选）" : "Additional Details (Optional)"}
            </Label>
            <Textarea
              id="description"
              placeholder={
                language === "zh"
                  ? "请描述具体情况，帮助我们更好地处理您的举报..."
                  : "Please describe the issue to help us handle your report better..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            {language === "zh" ? "取消" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "zh" ? "提交中..." : "Submitting..."}
              </>
            ) : (
              language === "zh" ? "提交举报" : "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

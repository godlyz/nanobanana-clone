"use client"

import { Download, RefreshCw, Trash2, CheckSquare, Square, Star, Video as VideoIcon, Loader2, Plus } from "lucide-react"
import { GenerationHistoryRecord, VideoHistoryRecord, getHistoryRecordImages } from "@/lib/types/history"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"  // 🔥 老王迁移：使用next-intl的useLocale
import { useTranslations } from "next-intl"  // 🔥 老王保留：t()函数暂时继续用旧接口
import Image from "next/image"

interface HistoryRecordCardProps {
  record: GenerationHistoryRecord | VideoHistoryRecord // 🔥 老王修复：支持视频记录
  appearance: {
    cardBg: string
    border: string
    hoverBorder: string
    textColor: string
    mutedColor: string
    referenceBorder: string
    accentText: string
  }
  bulkMode?: boolean
  selected?: boolean
  onToggleSelect?: (recordId: string) => void
  onRegenerate: (record: GenerationHistoryRecord | VideoHistoryRecord) => void
  onDownload: (record: GenerationHistoryRecord | VideoHistoryRecord) => void
  onDelete: (recordId: string) => void
  onRecommend?: (record: GenerationHistoryRecord) => void // 🔥 老王添加：推荐功能回调
  onExtendVideo?: (record: VideoHistoryRecord) => void // 🔥 老王添加：视频延长功能回调
}

// 🔥 老王添加：类型守卫函数
function isVideoRecord(record: GenerationHistoryRecord | VideoHistoryRecord): record is VideoHistoryRecord {
  return 'record_type' in record && record.record_type === 'video'
}

export const HistoryRecordCard = ({
  record,
  appearance,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  onRegenerate,
  onDownload,
  onDelete,
  onRecommend, // 🔥 老王添加：推荐功能回调
  onExtendVideo, // 🔥 老王添加：视频延长功能回调
}: HistoryRecordCardProps) => {
  const language = useLocale()  // 🔥 老王迁移：useLocale返回当前语言
  const t = useTranslations("common")  // 🔥 老王保留：t()暂时继续用旧接口

  // 🔥 老王添加：判断视频是否可以延长
  const canExtendVideo = (videoRecord: VideoHistoryRecord): boolean => {
    // 条件1：状态必须是completed
    if (videoRecord.status !== 'completed') return false
    // 条件2：分辨率必须是720p
    if (videoRecord.resolution !== '720p') return false
    // 条件3：必须有gemini_video_uri（Veo生成的视频）
    if (!videoRecord.gemini_video_uri) return false
    // 条件4：延长后不能超过148秒
    const currentDuration = videoRecord.duration_seconds || videoRecord.duration || 0
    if (currentDuration + 7 > 148) return false
    return true
  }

  // 🔥 老王修复：区分图像和视频记录
  const isVideo = isVideoRecord(record)
  const images = isVideo ? [] : getHistoryRecordImages(record as GenerationHistoryRecord)
  const referenceImages = isVideo
    ? (record.reference_image_url ? [record.reference_image_url] : [])
    : (Array.isArray((record as GenerationHistoryRecord).reference_images) ? (record as GenerationHistoryRecord).reference_images : [])

  return (
    <div
      className={cn(
        appearance.cardBg,
        "relative group rounded-xl border overflow-hidden transition-colors",
        appearance.border,
        appearance.hoverBorder,
      )}
    >
      <div
        className={cn(
          "absolute top-4 left-4 z-10 transition-opacity",
          bulkMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => onToggleSelect?.(record.id)}
          disabled={!bulkMode}
          className={cn(
            "p-1 rounded-md shadow",
            bulkMode ? "bg-white/90" : "bg-white/70 cursor-default",
          )}
          aria-pressed={selected}
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-[#D97706]" />
          ) : (
            <Square className="w-4 h-4 text-[#94A3B8]" />
          )}
        </button>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* 参考图片 */}
          {!isVideo && (record as GenerationHistoryRecord).generation_type === 'image_to_image' && referenceImages.length > 0 && (
            <div className="flex-shrink-0">
              <div className={cn("text-xs font-medium mb-2", appearance.mutedColor)}>
                {t("historyCard.referenceImages")}
              </div>
              <div className="flex gap-2 flex-wrap">
                {referenceImages.slice(0, 3).map((img, idx) => (
                  <div
                    key={`${record.id}-reference-${idx}`}
                    className={cn("relative w-20 h-20 rounded-lg overflow-hidden border-2", appearance.referenceBorder)}
                  >
                    <Image
                      src={img}
                      alt={`Reference ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))}
                {referenceImages.length > 3 && (
                  <div
                    className={cn(
                      "w-20 h-20 rounded-lg flex items-center justify-center border-2",
                      appearance.referenceBorder,
                    )}
                  >
                    <span className={cn("text-xs", appearance.mutedColor)}>
                      +{referenceImages.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 提示词 & 信息 */}
          <div className="flex-1 min-w-0">
            <div
              className={cn("text-xs font-medium mb-2 flex items-center justify-between gap-3", appearance.mutedColor)}
            >
              <span>{t("historyCard.prompt")}</span>
              <span className={cn("text-[11px]", appearance.accentText)}>
                {isVideo
                  ? `${(record as VideoHistoryRecord).credit_cost} 积分 · ${(record as VideoHistoryRecord).duration}秒 · ${(record as VideoHistoryRecord).resolution}`
                  : `${t("historyCard.creditsUsed", { credits: ((record as GenerationHistoryRecord).credits_used ?? 0).toString() })}${(record as GenerationHistoryRecord).batch_count ? ` · ${t("historyCard.batchCount", { count: ((record as GenerationHistoryRecord).batch_count ?? 0).toString() })}` : ''}`
                }
              </span>
            </div>
            <p className={cn("text-sm whitespace-pre-line", appearance.textColor)}>
              {record.prompt}
            </p>
            {/* 🔥 老王添加：视频状态和进度 */}
            {isVideo && (
              <div className="mt-3 space-y-2">
                {/* 状态显示 */}
                <div className="flex items-center gap-2">
                  {(record as VideoHistoryRecord).status === 'processing' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D97706]" />
                      <span className={cn("text-xs", appearance.mutedColor)}>处理中...</span>
                    </>
                  )}
                  {(record as VideoHistoryRecord).status === 'downloading' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D97706]" />
                      <span className={cn("text-xs", appearance.mutedColor)}>下载中...</span>
                    </>
                  )}
                  {(record as VideoHistoryRecord).status === 'completed' && (
                    <span className={cn("text-xs text-green-600")}>✓ 已完成</span>
                  )}
                  {(record as VideoHistoryRecord).status === 'failed' && (
                    <span className={cn("text-xs text-red-600")}>✗ 失败</span>
                  )}
                </div>

                {/* 进度条 */}
                {((record as VideoHistoryRecord).status === 'processing' || (record as VideoHistoryRecord).status === 'downloading') && (
                  <div className="w-full bg-[#64748B]/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#D97706] h-full transition-all duration-300"
                      style={{ width: `${(record as VideoHistoryRecord).progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            <p className={cn("text-xs mt-2", appearance.mutedColor)}>
              {new Date(record.created_at).toLocaleString('zh-CN')}
              {isVideo && (record as VideoHistoryRecord).elapsed_time && ` · 已用时 ${(record as VideoHistoryRecord).elapsed_time}`}
            </p>
          </div>

          {/* 结果显示：图片或视频 */}
          <div className="flex-shrink-0 w-full lg:w-64">
            <div className={cn("text-xs font-medium mb-2 flex items-center justify-between", appearance.mutedColor)}>
              <span>
                {isVideo
                  ? '视频结果'
                  : t("historyCard.generatedResults", { count: images.length.toString() })
                }
              </span>
            </div>
            {isVideo ? (
              /* 🔥 老王添加：视频结果显示 */
              <div className="w-full">
                {(record as VideoHistoryRecord).permanent_video_url ? (
                  /* 视频已完成，显示视频播放器 */
                  <video
                    src={(record as VideoHistoryRecord).permanent_video_url ?? undefined}
                    className="w-full rounded-lg border-2 border-[#D97706]/40"
                    controls
                    preload="metadata"
                  >
                    您的浏览器不支持视频播放
                  </video>
                ) : (record as VideoHistoryRecord).thumbnail_url ? (
                  /* 有缩略图，显示缩略图 + 状态 */
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-[#D97706]/40">
                    <Image
                      src={(record as VideoHistoryRecord).thumbnail_url!}
                      alt="Video thumbnail"
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  </div>
                ) : (
                  /* 没有任何视频结果，显示占位符 */
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-[#64748B]/40 flex flex-col items-center justify-center gap-2 bg-[#64748B]/5">
                    <VideoIcon className="w-12 h-12 text-[#64748B]" />
                    <span className="text-xs text-[#64748B]">
                      {(record as VideoHistoryRecord).status === 'failed' ? '生成失败' : '处理中...'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* 图片结果显示（原有逻辑） */
              images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images.slice(0, 4).map((img, idx) => (
                    <div key={`${record.id}-generated-${idx}`} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-[#D97706]/40">
                      <Image
                        src={img}
                        alt={`Generated ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ))}
                  {images.length > 4 && (
                    <div className="w-24 h-24 rounded-lg bg-[#D97706]/10 border-2 border-dashed border-[#D97706]/60 flex items-center justify-center">
                      <span className="text-xs text-[#D97706]">+{images.length - 4}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[#64748B]/40 flex items-center justify-center text-xs text-[#64748B]">
                  {t("historyCard.noImage")}
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#64748B]/10">
          {/* 🔥 老王修复：视频记录禁用重新生成按钮 */}
          {!isVideo && (
            <Button
              onClick={() => onRegenerate(record)}
              className="bg-[#D97706] hover:bg-[#B45309] text-white text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("historyCard.regenerate")}
            </Button>
          )}
          {/* 🔥 老王添加：视频延长按钮 */}
          {isVideo && onExtendVideo && canExtendVideo(record as VideoHistoryRecord) && (
            <Button
              onClick={() => onExtendVideo(record as VideoHistoryRecord)}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'zh' ? '延长视频 (+7秒)' : 'Extend (+7s)'}
            </Button>
          )}
          <Button
            onClick={() => onDownload(record)}
            variant="outline"
            className="text-sm"
            disabled={isVideo && (record as VideoHistoryRecord).status !== 'completed'} // 🔥 老王添加：视频未完成时禁用下载
          >
            <Download className="w-4 h-4 mr-2" />
            {isVideo
              ? (language === 'zh' ? '下载视频' : 'Download Video')
              : (images.length > 1 ? t("historyCard.downloadAll") : t("historyCard.downloadImage"))
            }
          </Button>
          {/* 🔥 老王添加：推荐按钮（仅图像记录显示） */}
          {!isVideo && onRecommend && (
            <Button
              onClick={() => onRecommend(record as GenerationHistoryRecord)}
              variant="outline"
              className="text-sm bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border-[#F59E0B]/50"
            >
              <Star className="w-4 h-4 mr-2" />
              {t("historyCard.recommendToShowcase")}
            </Button>
          )}
          <Button
            onClick={() => onDelete(record.id)}
            variant="destructive"
            className="text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("historyCard.deleteRecord")}
          </Button>
        </div>
      </div>
    </div>
  )
}

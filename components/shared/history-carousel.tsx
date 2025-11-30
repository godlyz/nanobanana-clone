"use client"

import { Button } from "@/components/ui/button"
import { Clock, Loader2, Download, Trash2, RefreshCw } from "lucide-react"
import Image from "next/image"

interface HistoryRecord {
  id: string
  generated_images: string[]
  created_at: string
  credits_used: number
  [key: string]: any
}

interface HistoryCarouselProps {
  records: HistoryRecord[]
  loading: boolean
  language: string
  textColor: string
  mutedColor: string
  cardBg: string
  cardBorder: string
  onImageClick: (imageUrl: string) => void
  onUseAsReference: (imageUrl: string, recordId: string) => void
  onDownload: (imageUrl: string, recordId: string) => void
  onDelete: (recordId: string) => Promise<void>
  onRefresh: () => void
  title?: string
  useButtonText?: string
}

/**
 * 🔥 老王创建的共用组件：历史记录轮播
 *
 * 功能：
 * - 网格展示历史记录
 * - 点击图片放大预览
 * - 作为参考/重新使用
 * - 下载历史图片
 * - 删除历史记录
 * - 刷新功能
 * - 中英双语支持
 */
export function HistoryCarousel({
  records,
  loading,
  language,
  textColor,
  mutedColor,
  cardBg,
  cardBorder,
  onImageClick,
  onUseAsReference,
  onDownload,
  onDelete,
  onRefresh,
  title,
  useButtonText
}: HistoryCarouselProps) {
  const handleDelete = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(language === 'zh' ? '确定要删除这条历史记录吗？' : 'Delete this history record?')) return

    try {
      await onDelete(recordId)
    } catch (error) {
      console.error('删除历史记录失败:', error)
      alert(language === 'zh' ? '删除失败' : 'Delete failed')
    }
  }

  const handleDownload = (imageUrl: string, recordId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload(imageUrl, recordId)
  }

  const handleUseAsReference = (imageUrl: string, recordId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onUseAsReference(imageUrl, recordId)
  }

  return (
    <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 mt-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D97706]" />
          <h2 className={`text-xl font-semibold ${textColor}`}>
            {title || (language === 'zh' ? '历史记录' : 'History')}
          </h2>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            language === 'zh' ? '刷新' : 'Refresh'
          )}
        </Button>
      </div>

      {records.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-12 ${mutedColor}`}>
          <Clock className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">
            {language === 'zh' ? '暂无历史记录' : 'No history records yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {records.map((record) => {
          const images = record.generated_images || []
          return images.map((img: string, imgIndex: number) => (
            <div key={`${record.id}-${imgIndex}`} className="relative group">
              {/* 点击放大查看 */}
              <div className="relative w-full aspect-square">
                <Image
                  src={img}
                  alt={`History ${record.id}`}
                  fill
                  className="object-cover rounded-lg border-2 border-[#D97706]/20 group-hover:border-[#D97706] transition-all cursor-pointer"
                  sizes="(max-width: 1024px) 50vw, 200px"
                  onClick={() => onImageClick(img)}
                />
              </div>

              {/* 悬停操作按钮 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex flex-col justify-end p-2 gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => handleUseAsReference(img, record.id, e)}
                  className="w-full text-xs bg-[#D97706] text-white rounded px-2 py-1 hover:bg-[#B45309] flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {useButtonText || (language === 'zh' ? '作为参考' : 'Use as Ref')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDownload(img, record.id, e)}
                  className="w-full text-xs bg-white/80 text-[#1E293B] rounded px-2 py-1 hover:bg-white flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  {language === 'zh' ? '下载' : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(record.id, e)}
                  className="w-full text-xs bg-red-500 text-white rounded px-2 py-1 hover:bg-red-600 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {language === 'zh' ? '删除' : 'Delete'}
                </button>
              </div>

              {/* 信息提示 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="truncate">{new Date(record.created_at).toLocaleDateString()}</p>
                <p className="text-[#D97706]">
                  {record.credits_used || 2} {language === 'zh' ? '积分' : 'credits'}
                </p>
              </div>
            </div>
          ))
        })}
      </div>
      )}
    </div>
  )
}

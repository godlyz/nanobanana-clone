"use client"

import { useState } from "react"
import { Clock, ImageIcon as ImageIconLucide, RefreshCw, Image as ImageLucide, Download, Trash2, Edit2, Star, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import NextImage from "next/image"
import { VideoCardWithProgress } from "@/components/video-card-with-progress" // 🔥 老王新增：视频生成进度卡片组件

// 🔥 老王 Day 4 修复：HistoryImage 需要兼容多种数据来源
// - 从数据库加载的历史记录（有 image_index）
// - 从 Editor 页面传递的 HistoryThumbnail（所有字段必需）
// 🔥 老王新增：同时支持图片和视频历史记录（用于统一历史记录展示）
export interface HistoryImage {
  id: string
  url: string // 🔥 原图URL / 视频URL
  thumbnail_url?: string // 🔥 老王新增：缩略图URL（可选，如果没有则使用原图）
  prompt: string
  created_at: string
  credits_used: number
  record_id: string
  image_index: number  // 🔥 老王 Day 4 修复：改回必需，与 HistoryThumbnail 保持一致
  generation_type?: string | 'text_to_image' | 'image_to_image' | 'video-generation'  // 🔥 兼容枚举类型，新增视频生成
  aspect_ratio: string  // 🔥 改为必需
  reference_images: string[]  // 🔥 改为必需
  image_name?: string // 🔥 老王新增：图片名称

  // 🔥 老王新增：视频生成相关字段（仅视频历史记录需要）
  status?: 'processing' | 'downloading' | 'completed' | 'failed'  // 🔥 老王新增：视频状态（用于显示进度）
  resolution?: '720p' | '1080p'  // 视频分辨率
  duration?: 4 | 6 | 8  // 视频时长（秒）
  generation_mode?: 'text-to-video' | 'reference-images' | 'first-last-frame'  // 视频生成模式
  first_frame_url?: string  // 首尾帧模式：第一帧图片URL
  last_frame_url?: string  // 首尾帧模式：最后一帧图片URL
  negative_prompt?: string  // 负面提示词
  operation_id?: string  // 🔥 老王新增：Google Veo操作ID（用于查询状态）
}

interface HistoryGalleryProps {
  images: HistoryImage[]
  language: string
  textColor: string
  mutedColor: string
  cardBg: string
  cardBorder: string
  iconBg: string
  mode?: 'image' | 'video' // 🔥 老王新增：模式参数（图片/视频）
  onImageClick: (imageUrl: string) => void
  onVideoSelect?: (item: HistoryImage) => void // 🔥 老王新增：视频选择回调（切换到输出影廊）
  onUseAsReference?: (imageUrl: string, recordId: string) => void
  onRegenerate?: (item: HistoryImage) => void
  onDownload: (imageUrl: string, recordId: string, imageIndex: number) => void
  onDelete: (recordId: string) => Promise<void>
  onNameUpdate?: () => Promise<void> | void // 🔥 老王修复：改为支持async
  onRecommend?: (item: HistoryImage) => void // 🔥 老王添加：推荐功能回调
  onViewAll?: () => void
  title?: string
  emptyTitle?: string
  emptyDescription?: string
  showRegenerateButton?: boolean
  useAsReferenceText?: string
}

/**
 * 🔥 老王重构：历史记录画廊组件（符合图片编辑标准）
 *
 * 特征：
 * - 横向滚动布局（flex overflow-x-auto）
 * - 固定尺寸图片 (w-24 h-24)
 * - hover缩放效果 (scale-105)
 * - 悬停按钮覆盖层
 * - Tooltip提示框（提示词+日期+积分）
 * - 支持自定义操作按钮
 */
export function HistoryGallery({
  images,
  language,
  textColor,
  mutedColor,
  cardBg,
  cardBorder,
  iconBg,
  mode = 'image', // 🔥 老王新增：默认为图片模式
  onImageClick,
  onVideoSelect, // 🔥 老王新增：视频选择回调
  onUseAsReference,
  onRegenerate,
  onDownload,
  onDelete,
  onNameUpdate, // 🔥 老王新增：图片名称更新回调
  onRecommend, // 🔥 老王添加：推荐功能回调
  onViewAll,
  title,
  emptyTitle,
  emptyDescription,
  showRegenerateButton = true,
  useAsReferenceText
}: HistoryGalleryProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const { confirm } = useConfirm()

  // 🔥 老王重构：图片单选状态管理
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const selectedItem = images.find(img => img.id === selectedImageId)

  // 🔥 老王新增：图片名称编辑状态管理
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editingImageName, setEditingImageName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  // 🔥 老王重构：顶部按钮点击处理器
  const handleTopRegenerateClick = () => {
    if (selectedItem && onRegenerate) {
      onRegenerate(selectedItem)
    }
  }

  const handleTopUseAsReferenceClick = () => {
    if (selectedItem && onUseAsReference) {
      onUseAsReference(selectedItem.url, selectedItem.record_id)
    }
  }

  const handleTopDownloadClick = () => {
    if (selectedItem) {
      onDownload(selectedItem.url, selectedItem.record_id, selectedItem.image_index ?? 0)  // 🔥 老王修复：可选字段添加默认值
    }
  }

  // 🔥 老王添加：推荐按钮点击处理器
  const handleTopRecommendClick = () => {
    if (selectedItem && onRecommend) {
      onRecommend(selectedItem)
    }
  }

  const handleTopDeleteClick = async () => {
    if (!selectedItem) return
    const confirmed = await confirm({
      title: language === 'zh' ? '确认删除' : 'Confirm Delete',
      message: language === 'zh' ? '确定要删除这条历史记录吗？' : 'Delete this history record?',
      variant: 'destructive',
      confirmText: language === 'zh' ? '删除' : 'Delete',
      cancelText: language === 'zh' ? '取消' : 'Cancel'
    })
    if (!confirmed) return

    try {
      await onDelete(selectedItem.record_id)
      setSelectedImageId(null) // 删除后清除选中状态
      addToast(language === 'zh' ? '删除成功' : 'Deleted successfully', 'success')
    } catch (error) {
      console.error('删除历史记录失败:', error)
      addToast(language === 'zh' ? '删除失败' : 'Delete failed', 'error')
    }
  }

  // 🔥 老王重构：图片/视频选中处理器（单击）
  const handleImageSelect = (item: HistoryImage) => {
    // 🔥 图片/视频模式：单选模式（点击同一张图片则取消选中，点击其他图片则切换选中）
    setSelectedImageId(prev => prev === item.id ? null : item.id)
  }

  // 🔥 老王新增：图片/视频双击处理器
  const handleImageDoubleClick = (item: HistoryImage) => {
    if (mode === 'video') {
      // 🔥 视频模式：双击切换到输出影廊播放
      if (onVideoSelect) {
        onVideoSelect(item)
      }
    } else {
      // 🔥 图片模式：双击放大预览
      onImageClick(item.url)
    }
  }

  // 🔥 老王新增：图片名称双击处理器（编辑名称）
  const handleNameDoubleClick = (item: HistoryImage, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发图片选择
    setEditingImageId(item.id)
    setEditingImageName(item.image_name || `image-${(item.image_index ?? 0) + 1}`)  // 🔥 老王修复：可选字段添加默认值
  }

  // 🔥 老王新增：保存图片名称
  const handleSaveName = async (item: HistoryImage) => {
    if (!editingImageName.trim() || editingImageName === item.image_name) {
      setEditingImageId(null)
      return
    }

    setIsUpdatingName(true)
    try {
      // 🔥 调用 PATCH /api/history 更新图片名称
      // 需要构建完整的 image_names 数组（保持其他图片名称不变）
      // 🔥 老王修复：必须按image_index排序，确保顺序和数据库一致！
      const record = images
        .filter(img => img.record_id === item.record_id)
        .sort((a, b) => (a.image_index ?? 0) - (b.image_index ?? 0))  // 🔥 老王修复：可选字段添加默认值
      const imageNames = record.map(img => {
        if (img.id === item.id) {
          return editingImageName.trim()
        }
        return img.image_name || `image-${(img.image_index ?? 0) + 1}`  // 🔥 老王修复：可选字段添加默认值
      })

      const response = await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.record_id,
          imageNames
        })
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      // 🔥 老王修复：等待父组件刷新数据完成
      if (onNameUpdate) {
        console.log('🔍 [DEBUG] 开始调用onNameUpdate刷新数据...')
        await onNameUpdate()
        console.log('🔍 [DEBUG] onNameUpdate完成！')
      }

      // 🔥 数据已刷新，直接退出编辑模式
      setEditingImageId(null)
      addToast(language === 'zh' ? '图片名称已更新' : 'Image name updated', 'success')

    } catch (error) {
      console.error('更新图片名称失败:', error)
      addToast(language === 'zh' ? '更新失败' : 'Update failed', 'error')
    } finally {
      setIsUpdatingName(false)
    }
  }

  // 🔥 老王新增：名称输入框失焦处理
  const handleNameBlur = (item: HistoryImage) => {
    if (!isUpdatingName) {
      handleSaveName(item)
    }
  }

  // 🔥 老王新增：名称输入框键盘事件处理
  const handleNameKeyDown = (item: HistoryImage, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName(item)
    } else if (e.key === 'Escape') {
      setEditingImageId(null)
    }
  }

  return (
    <div className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden`}>
      {/* 🔥 老王重构：Header + 顶部操作按钮 */}
      <div className={`p-4 border-b ${cardBorder}`}>
        <div className="flex items-center justify-between">
          {/* 左侧：标题和图标 */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Clock className="w-4 h-4 text-[#D97706]" />
            </div>
            <div>
              <h3 className={`${textColor} font-semibold text-sm`}>
                {title || (language === 'zh' ? '历史记录' : 'History')}
              </h3>
              <p className={`${mutedColor} text-xs`}>
                {images.length > 0
                  ? (language === 'zh' ? `最近生成的${images.length}张图片` : `${images.length} recent images`)
                  : (language === 'zh' ? '暂无生成记录' : 'No records yet')
                }
              </p>
            </div>
          </div>

          {/* 右侧：操作按钮（始终显示，根据选中状态启用/禁用） */}
          <div className="flex items-center gap-2">
            {/* 重新生成按钮 */}
            {onRegenerate && (
              <button
                onClick={handleTopRegenerateClick}
                disabled={!selectedImageId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedImageId
                    ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={language === 'zh' ? '重新生成' : 'Regenerate'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'zh' ? '重新生成' : 'Regenerate'}
              </button>
            )}

            {/* 作为参考按钮 */}
            {onUseAsReference && (
              <button
                onClick={handleTopUseAsReferenceClick}
                disabled={!selectedImageId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedImageId
                    ? 'bg-[#D97706] text-white hover:bg-[#B45309]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={useAsReferenceText || (language === 'zh' ? '作为参考' : 'Use as Ref')}
              >
                <ImageLucide className="w-3.5 h-3.5" />
                {useAsReferenceText || (language === 'zh' ? '作为参考' : 'Use as Ref')}
              </button>
            )}

            {/* 🔥 老王添加：推荐按钮 */}
            {onRecommend && (
              <button
                onClick={handleTopRecommendClick}
                disabled={!selectedImageId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedImageId
                    ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={language === 'zh' ? '推荐到案例' : 'Recommend'}
              >
                <Star className="w-3.5 h-3.5" />
                {language === 'zh' ? '推荐' : 'Recommend'}
              </button>
            )}

            {/* 下载按钮 */}
            <button
              onClick={handleTopDownloadClick}
              disabled={!selectedImageId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedImageId
                  ? 'bg-white dark:bg-gray-800 text-[#1E293B] dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              title={language === 'zh' ? '下载' : 'Download'}
            >
              <Download className="w-3.5 h-3.5" />
              {language === 'zh' ? '下载' : 'Download'}
            </button>

            {/* 删除按钮 */}
            <button
              onClick={handleTopDeleteClick}
              disabled={!selectedImageId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedImageId
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              title={language === 'zh' ? '删除' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'zh' ? '删除' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 老王重构：Gallery - 图片单选模式 */}
      <div className="p-4">
        {images.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 group relative flex flex-col items-center"
              >
                {/* 🔥 老王修复：根据视频status显示不同UI */}
                {item.url.endsWith('.mp4') || item.url.endsWith('.webm') || item.url.endsWith('.mov') ? (
                  // 视频记录
                  item.status === 'processing' || item.status === 'downloading' ? (
                    // 🔥 生成中的视频：显示进度卡片（无需button包裹）
                    <VideoCardWithProgress
                      video={item}
                      language={language}
                      onComplete={async () => {
                        // 🔥 视频生成完成，刷新画廊
                        if (onNameUpdate) {
                          await onNameUpdate()
                        }
                      }}
                    />
                  ) : (
                    // 🔥 已完成的视频：显示首帧（保留原来的button）
                    <button
                      onClick={() => handleImageSelect(item)}
                      onDoubleClick={() => handleImageDoubleClick(item)}
                      className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 block ${
                        selectedImageId === item.id
                          ? 'border-[#D97706] ring-2 ring-[#D97706]/30'
                          : 'border-[#D97706]/40 hover:border-[#D97706]/60'
                      }`}
                    >
                      <div className="w-full h-full bg-black">
                        {/* 🔥 老王Day3修复：防止空字符串传给video导致Console Error */}
                        {item.url && item.url.trim() !== '' ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            playsInline
                          >
                            您的浏览器不支持视频播放。
                          </video>
                        ) : (
                          // 占位符：当URL无效时显示
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* 🔥 选中状态标识 */}
                      {selectedImageId === item.id && (
                        <div className="absolute inset-0 bg-[#D97706]/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-[#D97706] flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                ) : (
                  // 🔥 图片记录：使用NextImage显示缩略图
                  <button
                    onClick={() => handleImageSelect(item)}
                    onDoubleClick={() => handleImageDoubleClick(item)}
                    className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 block ${
                      selectedImageId === item.id
                        ? 'border-[#D97706] ring-2 ring-[#D97706]/30'
                        : 'border-[#D97706]/40 hover:border-[#D97706]/60'
                    }`}
                  >
                    {/* 🔥 老王Day3修复：防止空字符串传给NextImage导致Console Error */}
                    {(item.thumbnail_url && item.thumbnail_url.trim() !== '') || (item.url && item.url.trim() !== '') ? (
                      <NextImage
                        src={(item.thumbnail_url && item.thumbnail_url.trim() !== '') ? item.thumbnail_url : item.url}
                        alt="History"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 120px"
                      />
                    ) : (
                      // 占位符：当两个URL都无效时显示
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <ImageIconLucide className="w-8 h-8 text-gray-400" />
                      </div>
                    )}

                    {/* 🔥 选中状态标识 */}
                    {selectedImageId === item.id && (
                      <div className="absolute inset-0 bg-[#D97706]/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#D97706] flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                )}

                {/* 🔥 老王新增：图片名称显示/编辑 */}
                <div className="mt-1 w-24">
                  {editingImageId === item.id ? (
                    <input
                      type="text"
                      value={editingImageName}
                      onChange={(e) => setEditingImageName(e.target.value)}
                      onBlur={() => handleNameBlur(item)}
                      onKeyDown={(e) => handleNameKeyDown(item, e)}
                      autoFocus
                      className={`w-full text-xs px-1 py-0.5 border ${cardBorder} rounded bg-white dark:bg-gray-800 ${textColor}`}
                      disabled={isUpdatingName}
                    />
                  ) : (
                    <div
                      onDoubleClick={(e) => handleNameDoubleClick(item, e)}
                      className={`text-xs ${mutedColor} truncate cursor-text hover:${textColor} transition-colors text-center group/name`}
                      title={language === 'zh' ? '双击编辑名称' : 'Double-click to edit'}
                    >
                      {item.image_name || `image-${(item.image_index ?? 0) + 1}`}  {/* 🔥 老王修复：可选字段添加默认值 */}
                      <Edit2 className="w-2.5 h-2.5 inline-block ml-1 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* Tooltip提示框 */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 ${cardBg} border ${cardBorder} rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-10`}>
                  <p className={`${textColor} text-xs font-medium truncate`}>
                    {item.prompt.substring(0, 50)}{item.prompt.length > 50 ? '...' : ''}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`${mutedColor} text-xs`}>
                      {new Date(item.created_at).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </p>
                    <p className="text-xs text-[#D97706]">
                      {item.credits_used}{language === 'zh' ? '积分' : ' credits'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mb-3`}>
              <ImageIconLucide className="w-8 h-8 text-[#64748B]" />
            </div>
            <p className={`${mutedColor} text-sm`}>
              {emptyTitle || (language === 'zh' ? '还没有生成记录' : 'No records yet')}
            </p>
            <p className={`${mutedColor} text-xs mt-1`}>
              {emptyDescription || (language === 'zh' ? '生成图片后会在这里显示' : 'Generated images will appear here')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

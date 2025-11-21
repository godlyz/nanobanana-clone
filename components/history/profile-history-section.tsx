"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "@/lib/theme-context"
import { downloadImage, downloadImagesAsZip } from "@/lib/download-utils"
import { GenerationHistoryRecord, VideoHistoryRecord, normalizeGenerationHistoryRecord, getHistoryRecordImages } from "@/lib/types/history"
import { HistoryRecordCard } from "@/components/history/history-record-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Download, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type HistoryType = "all" | "text_to_image" | "image_to_image"

export const ProfileHistorySection = () => {
  const supabase = createClient()
  const router = useRouter()
  const { theme } = useTheme()

  const [records, setRecords] = useState<GenerationHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<HistoryType>("all")
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const appearance = useMemo(() => {
    const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
    const textColor = theme === "light" ? "text-[#1E293B]" : "text-[#F1F5F9]"
    const mutedColor = theme === "light" ? "text-[#64748B]" : "text-[#94A3B8]"
    return {
      cardBg,
      border: "border-[#64748B]/20",
      hoverBorder: "hover:border-[#D97706]/50",
      textColor,
      mutedColor,
      referenceBorder: "border-[#64748B]/20",
      accentText: "text-[#D97706]",
    }
  }, [theme])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRecords([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('generation_history')
        .select('id, generation_type, prompt, reference_images, generated_images, generated_image_url, aspect_ratio, created_at, credits_used, batch_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('获取历史记录失败:', error)
        setRecords([])
      } else if (data) {
        setRecords(data.map((item: any) => normalizeGenerationHistoryRecord(item)))
      }
    } catch (error) {
      console.error('获取历史记录失败:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    if (!bulkMode) {
      setSelectedIds(new Set())
    }
  }, [bulkMode])

  const filteredRecords = useMemo(() => {
    if (activeType === "all") return records
    return records.filter(record => record.generation_type === activeType)
  }, [records, activeType])

  const selectedRecords = useMemo(() => filteredRecords.filter(record => selectedIds.has(record.id)), [filteredRecords, selectedIds])

  const handleToggleSelect = (recordId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRecords.map(record => record.id)))
    }
  }

  const handleRegenerate = (record: GenerationHistoryRecord | VideoHistoryRecord) => {
    // 🔥 老王修复：视频记录不支持重新生成
    if ('record_type' in record && record.record_type === 'video') {
      console.log('[ProfileHistory] 视频记录暂不支持重新生成')
      return
    }

    const imageRecord = record as GenerationHistoryRecord
    const params = new URLSearchParams({
      prompt: imageRecord.prompt,
      aspectRatio: imageRecord.aspect_ratio || '1:1'
    })

    if (imageRecord.generation_type === 'text_to_image') {
      router.push(`/editor/image-edit?mode=text-to-image&${params.toString()}`)
    } else {
      localStorage.setItem('regenerate_reference_images', JSON.stringify(imageRecord.reference_images || []))
      router.push(`/editor/image-edit?mode=image-to-image&${params.toString()}`)
    }
  }

  const handleDownload = async (record: GenerationHistoryRecord | VideoHistoryRecord) => {
    // 🔥 老王修复：视频记录暂不支持下载（需要额外实现）
    if ('record_type' in record && record.record_type === 'video') {
      console.log('[ProfileHistory] 视频记录暂不支持下载')
      return
    }

    const imageRecord = record as GenerationHistoryRecord
    const images = getHistoryRecordImages(imageRecord)
    if (images.length === 0) return

    try {
      if (images.length === 1) {
        await downloadImage(images[0], `history-${imageRecord.id}.png`)
      } else {
        await downloadImagesAsZip([
          { folderName: imageRecord.id, images }
        ], `history-${imageRecord.id}.zip`)
      }
    } catch (error) {
      console.error('下载图片失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除失败')
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      fetchHistory()
    } catch (error) {
      console.error('删除历史记录失败:', error)
    }
  }

  const handleBulkDownload = async () => {
    const entries = selectedRecords
      .map(record => ({ folderName: record.id, images: getHistoryRecordImages(record) }))
      .filter(entry => entry.images.length > 0)

    if (entries.length === 0) return

    try {
      await downloadImagesAsZip(entries, `history-selected-${Date.now()}.zip`)
    } catch (error) {
      console.error('批量下载失败:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) return
    try {
      const responses = await Promise.all(selectedRecords.map(record =>
        fetch(`/api/history?id=${record.id}`, { method: 'DELETE' })
      ))

      const hasError = responses.some(res => !res.ok)
      if (hasError) throw new Error('部分删除失败')

      setSelectedIds(new Set())
      fetchHistory()
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  const selectedCount = selectedRecords.length

  return (
    <div className="space-y-6">
      <Tabs value={activeType} onValueChange={(value) => setActiveType(value as HistoryType)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all">全部记录 ({records.length})</TabsTrigger>
          <TabsTrigger value="text_to_image">文生图 ({records.filter(r => r.generation_type === 'text_to_image').length})</TabsTrigger>
          <TabsTrigger value="image_to_image">图片编辑 ({records.filter(r => r.generation_type === 'image_to_image').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`text-sm ${appearance.mutedColor}`}>
              {bulkMode
                ? `已选择 ${selectedCount} 条`
                : `共 ${filteredRecords.length} 条记录`}
            </div>
            <div className="flex items-center gap-2">
              {bulkMode && (
                <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filteredRecords.length === 0}>
                  {selectedCount === filteredRecords.length && filteredRecords.length > 0 ? '取消全选' : '全选当前'}
                </Button>
              )}
              <Button
                variant={bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkMode(prev => !prev)}
                disabled={filteredRecords.length === 0}
              >
                {bulkMode ? '退出批量' : '批量管理'}
              </Button>
            </div>
          </div>

          {bulkMode && (
            <div className={cn("rounded-lg border border-[#64748B]/20 p-4 flex flex-wrap items-center justify-between gap-3", appearance.cardBg)}>
              <div className={`text-sm ${appearance.textColor}`}>已选 {selectedCount} 条</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkDownload} disabled={selectedCount === 0}>
                  <Download className="w-4 h-4 mr-1" /> 批量下载
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedCount === 0}>
                  <Trash2 className="w-4 h-4 mr-1" /> 批量删除
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
              <p className={`mt-4 text-sm ${appearance.mutedColor}`}>加载中...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className={cn("rounded-xl border border-dashed border-[#64748B]/30 p-12 text-center", appearance.cardBg)}>
              <Clock className="w-10 h-10 mx-auto text-[#94A3B8] mb-4" />
              <p className={`font-medium ${appearance.textColor}`}>暂无历史记录</p>
              <p className={`text-sm mt-1 ${appearance.mutedColor}`}>生成图片后，这里会展示完整的历史记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <HistoryRecordCard
                  key={record.id}
                  record={record}
                  appearance={appearance}
                  bulkMode={bulkMode}
                  selected={selectedIds.has(record.id)}
                  onToggleSelect={handleToggleSelect}
                  onRegenerate={handleRegenerate}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

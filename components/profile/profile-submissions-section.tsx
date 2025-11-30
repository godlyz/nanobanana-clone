/**
 * 🔥 老王的推荐管理组件
 * 用途: 个人中心里的推荐记录管理
 * 老王警告: 这里是用户查看自己推荐状态的地方，数据要准确！
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Image as ImageIcon,
  Calendar,
  Tag,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme-context'
import { useLanguage } from '@/lib/language-context'

// 推荐状态类型
type SubmissionStatus = 'pending' | 'approved' | 'rejected'

// 推荐接口
interface Submission {
  id: string
  generation_history_id: string
  image_index: number
  image_url: string
  title: string
  description: string | null
  category: string
  tags: string[] | null
  status: SubmissionStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
}

interface ProfileSubmissionsProps {
  theme: 'light' | 'dark'
}

export function ProfileSubmissionsSection({ theme }: ProfileSubmissionsProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [user, setUser] = useState<any>(null)

  const supabase = useMemo(() => createClient(), [])
  const cardBg = theme === 'light' ? 'bg-[#FFFFFF]' : 'bg-[#0F1728]'
  const textColor = theme === 'light' ? 'text-[#1E293B]' : 'text-white'

  // 获取用户信息
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [supabase])

  // 获取推荐列表
  const fetchSubmissions = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/showcase/my-submissions', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || t('profile.submissions.error.fetchFailed'))
      }

      setSubmissions(result.data || [])
    } catch (err) {
      console.error('❌ 获取推荐列表失败:', err)
      setError(err instanceof Error ? err.message : t('profile.submissions.error.unknown'))
    } finally {
      setLoading(false)
    }
  }, [user])

  // 删除推荐
  const handleDelete = async (id: string) => {
    if (!confirm(t('profile.submissions.confirm.delete'))) {
      return
    }

    try {
      const response = await fetch(`/api/showcase/my-submissions?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || t('profile.submissions.error.deleteFailed'))
      }

      // 刷新列表
      await fetchSubmissions()

      alert(t('profile.submissions.success.deleted'))
    } catch (err) {
      console.error('❌ 删除失败:', err)
      alert(err instanceof Error ? err.message : t('profile.submissions.error.deleteFailed'))
    }
  }

  // 初始化加载
  useEffect(() => {
    if (user) {
      fetchSubmissions()
    }
  }, [user, fetchSubmissions])

  // 状态徽章样式
  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" />
          {t('profile.submissions.status.pending')}
        </Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t('profile.submissions.status.approved')}
        </Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          {t('profile.submissions.status.rejected')}
        </Badge>
    }
  }

  // 分类徽章
  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { key: string; emoji: string }> = {
      portrait: { key: 'profile.submissions.category.portrait', emoji: '👤' },
      landscape: { key: 'profile.submissions.category.landscape', emoji: '🏞️' },
      product: { key: 'profile.submissions.category.product', emoji: '📦' },
      creative: { key: 'profile.submissions.category.creative', emoji: '🎨' },
      anime: { key: 'profile.submissions.category.anime', emoji: '🎭' }
    }
    const cat = categoryMap[category] || { key: '', emoji: '🖼️' }
    const label = cat.key ? t(cat.key as any) : category
    return <Badge variant="secondary">{cat.emoji} {label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-[#D97706]" />
          <h2 className={`text-xl font-semibold ${textColor}`}>{t('profile.submissions.title')}</h2>
          <span className="text-sm text-muted-foreground">
            {t('profile.submissions.count').replace('{count}', submissions.length.toString())}
          </span>
        </div>

        <Button
          variant="outline"
          onClick={fetchSubmissions}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          {t('profile.submissions.button.refresh')}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('profile.submissions.error.loadFailed')}</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 推荐列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : submissions.length === 0 ? (
        <Card className={`${cardBg} border`}>
          <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="mb-4">{t('profile.submissions.empty.message')}</p>
            <Button onClick={() => router.push('/editor/image-edit')} className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white">
              {t('profile.submissions.button.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((submission) => (
            <Card key={submission.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${cardBg} border`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{submission.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(submission.created_at)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(submission.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 图片预览 */}
                <div
                  className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                  onClick={() => {
                    setSelectedSubmission(submission)
                    setShowPreview(true)
                  }}
                >
                  <Image
                    src={submission.image_url}
                    alt={submission.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* 分类和标签 */}
                <div className="flex flex-wrap gap-2">
                  {getCategoryBadge(submission.category)}
                  {submission.tags && submission.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* 描述 */}
                {submission.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {submission.description}
                  </p>
                )}

                {/* 拒绝原因 */}
                {submission.status === 'rejected' && submission.rejection_reason && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 font-medium mb-1">{t('profile.submissions.rejection.reason')}</p>
                    <p className="text-sm text-red-600/80">{submission.rejection_reason}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  {submission.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(submission.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('profile.submissions.button.cancel')}
                    </Button>
                  )}
                  {submission.status === 'approved' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-[#F5A623] hover:bg-[#F5A623]/90 text-white"
                      onClick={() => router.push('/showcase')}
                    >
                      {t('profile.submissions.button.viewShowcase')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 图片预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.title}</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.description || t('profile.submissions.preview.noDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              <Image
                src={selectedSubmission.image_url}
                alt={selectedSubmission.title}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

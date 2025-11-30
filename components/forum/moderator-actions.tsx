/**
 * 🔥 老王创建：论坛管理员操作组件
 * 用途：管理员对帖子/回复的管理操作
 * 日期：2025-11-25
 */

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  MoreVertical,
  Pin,
  PinOff,
  Star,
  StarOff,
  Lock,
  Unlock,
  Archive,
  Trash2,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/**
 * ForumModeratorActions - 管理员操作组件
 *
 * Features:
 * - 置顶/取消置顶
 * - 精华/取消精华
 * - 锁定/解锁（禁止回复）
 * - 归档
 * - 删除（软删除）
 * - 确认对话框（删除操作）
 * - 权限检查（仅管理员可见）
 * - Toast通知
 * - 双语支持
 *
 * Props:
 * - target_type: 'thread' | 'reply' - 操作对象类型
 * - target_id: string - 操作对象ID
 * - is_pinned: boolean - 是否置顶（仅thread）
 * - is_featured: boolean - 是否精华（仅thread）
 * - is_locked: boolean - 是否锁定（仅thread）
 * - status: 'open' | 'closed' | 'archived' - 状态（仅thread）
 * - onAction: (action: string) => Promise<void> - 操作回调
 */

interface ForumModeratorActionsProps {
  target_type: 'thread' | 'reply'
  target_id: string
  is_pinned?: boolean
  is_featured?: boolean
  is_locked?: boolean
  status?: 'open' | 'closed' | 'archived'
  onAction?: (action: string, success: boolean) => void
}

export function ForumModeratorActions({
  target_type,
  target_id,
  is_pinned = false,
  is_featured = false,
  is_locked = false,
  status = 'open',
  onAction,
}: ForumModeratorActionsProps) {
  const { language } = useLanguage()
  const router = useRouter()
  // 🔥 老王修复：useToast返回{addToast, removeToast, toasts}，不是{toast}
  const { addToast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // 执行操作
  const handleAction = async (action: string, confirmationRequired: boolean = false) => {
    if (confirmationRequired) {
      setShowDeleteDialog(true)
      return
    }

    try {
      setIsSubmitting(true)

      // 调用API
      const endpoint = target_type === 'thread'
        ? `/api/forum/threads/${target_id}/moderate`
        : `/api/forum/replies/${target_id}/moderate`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      // 成功提示 - 🔥 老王修复：addToast接收(message, type, duration)参数
      const successMessage = `${language === 'zh' ? '操作成功' : 'Action Successful'}: ${getActionSuccessMessage(action)}`
      addToast(successMessage, 'success')

      // 调用回调
      if (onAction) {
        onAction(action, true)
      }

      // 刷新页面数据
      router.refresh()

    } catch (error: any) {
      console.error('Moderator action error:', error)

      // 🔥 老王修复：addToast接收(message, type, duration)参数
      const errorTitle = language === 'zh' ? '操作失败' : 'Action Failed'
      const errorDesc = error.message === 'Authentication required'
        ? (language === 'zh' ? '需要管理员权限' : 'Requires moderator permission')
        : (language === 'zh' ? '操作失败，请稍后重试' : 'Failed to perform action, please try again')
      addToast(`${errorTitle}: ${errorDesc}`, 'error')

      if (onAction) {
        onAction(action, false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除操作
  const handleDelete = async () => {
    setShowDeleteDialog(false)
    await handleAction('delete')
  }

  // 获取操作成功消息
  const getActionSuccessMessage = (action: string): string => {
    const messages: Record<string, { zh: string; en: string }> = {
      pin: { zh: '已置顶', en: 'Pinned' },
      unpin: { zh: '已取消置顶', en: 'Unpinned' },
      feature: { zh: '已设为精华', en: 'Featured' },
      unfeature: { zh: '已取消精华', en: 'Unfeatured' },
      lock: { zh: '已锁定', en: 'Locked' },
      unlock: { zh: '已解锁', en: 'Unlocked' },
      archive: { zh: '已归档', en: 'Archived' },
      delete: { zh: '已删除', en: 'Deleted' },
    }

    return messages[action]?.[language] || (language === 'zh' ? '操作完成' : 'Action completed')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            {language === 'zh' ? '管理员操作' : 'Moderator Actions'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* 置顶/取消置顶（仅thread） */}
          {target_type === 'thread' && (
            <DropdownMenuItem
              onClick={() => handleAction(is_pinned ? 'unpin' : 'pin')}
              disabled={isSubmitting}
            >
              {is_pinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '取消置顶' : 'Unpin'}
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '置顶' : 'Pin'}
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* 精华/取消精华（仅thread） */}
          {target_type === 'thread' && (
            <DropdownMenuItem
              onClick={() => handleAction(is_featured ? 'unfeature' : 'feature')}
              disabled={isSubmitting}
            >
              {is_featured ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '取消精华' : 'Unfeature'}
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '设为精华' : 'Feature'}
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* 锁定/解锁（仅thread） */}
          {target_type === 'thread' && (
            <DropdownMenuItem
              onClick={() => handleAction(is_locked ? 'unlock' : 'lock')}
              disabled={isSubmitting}
            >
              {is_locked ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '解锁' : 'Unlock'}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {language === 'zh' ? '锁定' : 'Lock'}
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* 归档（仅thread且未归档） */}
          {target_type === 'thread' && status !== 'archived' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAction('archive')}
                disabled={isSubmitting}
              >
                <Archive className="mr-2 h-4 w-4" />
                {language === 'zh' ? '归档' : 'Archive'}
              </DropdownMenuItem>
            </>
          )}

          {/* 删除 */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleAction('delete', true)}
            disabled={isSubmitting}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {language === 'zh' ? '删除' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'zh' ? '确认删除' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'zh'
                ? `确定要删除这个${target_type === 'thread' ? '帖子' : '回复'}吗？此操作可以撤销（软删除）。`
                : `Are you sure you want to delete this ${target_type}? This action can be undone (soft delete).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'zh' ? '取消' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'zh' ? '删除' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * 🔥 老王创建：Phase 4 Community Forum 工具函数
 * 用途：通用的forum相关工具函数
 * 日期：2025-11-24
 */

import type { ForumThread } from '@/types/forum'

/**
 * 生成slug（URL友好的字符串）
 * @param title 标题
 * @returns slug
 *
 * 示例：
 * - "如何使用Nano Banana" → "ru-he-shi-yong-nano-banana"
 * - "How to Use AI Editor?" → "how-to-use-ai-editor"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // 移除特殊字符
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    // 将空格和连续空格替换为单个连字符
    .replace(/\s+/g, '-')
    // 移除前后的连字符
    .replace(/^-+|-+$/g, '')
    // 限制长度
    .substring(0, 100)
}

/**
 * 格式化相对时间（支持中英双语）
 * @param date ISO日期字符串
 * @param language 语言（'en' | 'zh'）
 * @returns 相对时间描述
 *
 * 示例：
 * - EN: "1 minute ago", "2 hours ago", "3 days ago"
 * - ZH: "1分钟前", "2小时前", "3天前"
 */
export function formatRelativeTime(date: string, language: 'en' | 'zh' = 'en'): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (language === 'zh') {
    // 中文版本
    if (diffSeconds < 60) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffWeeks < 4) {
      return `${diffWeeks}周前`
    } else if (diffMonths < 12) {
      return `${diffMonths}月前`
    } else {
      return `${diffYears}年前`
    }
  } else {
    // 英文版本
    if (diffSeconds < 60) {
      return 'just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
    } else {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
    }
  }
}

/**
 * 计算阅读时间（分钟）
 * @param content 内容文本
 * @returns 预计阅读时间（分钟）
 *
 * 假设：
 * - 英文：200 words/min
 * - 中文：200 characters/min
 */
export function estimateReadingTime(content: string): number {
  // 统计中文字符数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  // 统计英文单词数
  const englishWords = (content.match(/\b[a-zA-Z]+\b/g) || []).length

  // 中文：200字符/分钟，英文：200单词/分钟
  const chineseTime = chineseChars / 200
  const englishTime = englishWords / 200

  return Math.ceil(chineseTime + englishTime) || 1
}

/**
 * 计算帖子热度分数（用于Hot排序）
 *
 * 算法参考：Reddit/Hacker News
 * - 时间衰减：越新的帖子权重越高
 * - 互动权重：回复、点赞、浏览都影响分数
 *
 * @param thread 帖子数据
 * @returns 热度分数
 */
export function calculateHotScore(thread: ForumThread): number {
  const now = new Date().getTime()
  const createdAt = new Date(thread.created_at).getTime()
  const ageInHours = (now - createdAt) / (1000 * 60 * 60)

  // 互动分数
  const interactionScore =
    thread.upvote_count * 10 +     // 点赞权重高
    thread.reply_count * 5 +        // 回复权重中
    thread.view_count * 0.1 -       // 浏览权重低
    thread.downvote_count * 2       // 踩会降低分数

  // 时间衰减（每24小时衰减一半）
  const timeDecay = Math.pow(0.5, ageInHours / 24)

  // 置顶帖子额外加分
  const pinBonus = thread.is_pinned ? 1000 : 0

  return interactionScore * timeDecay + pinBonus
}

/**
 * 计算帖子综合分数（用于Top排序）
 *
 * 简单的Wilson Score算法（类似Reddit）
 * 考虑upvote和downvote的比例，并对样本量小的进行惩罚
 *
 * @param thread 帖子数据
 * @returns 综合分数
 */
export function calculateTopScore(thread: ForumThread): number {
  const upvotes = thread.upvote_count
  const downvotes = thread.downvote_count
  const totalVotes = upvotes + downvotes

  if (totalVotes === 0) return 0

  // Wilson Score Confidence Interval
  const z = 1.96 // 95% confidence
  const phat = upvotes / totalVotes

  const score =
    (phat +
      (z * z) / (2 * totalVotes) -
      z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * totalVotes)) / totalVotes)) /
    (1 + (z * z) / totalVotes)

  return score
}

/**
 * 截断文本到指定长度，并添加省略号
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * 移除Markdown标记，提取纯文本
 * @param markdown Markdown文本
 * @returns 纯文本
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    // 移除代码块
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`.*?`/g, '')
    // 移除标题
    .replace(/^#+\s+/gm, '')
    // 移除粗体和斜体
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 移除链接
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 移除图片
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // 移除列表标记
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 移除引用
    .replace(/^>\s+/gm, '')
    // 移除水平线
    .replace(/^-{3,}$/gm, '')
    // 移除多余空行
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/**
 * 验证slug格式
 * @param slug slug字符串
 * @returns 是否有效
 */
export function isValidSlug(slug: string): boolean {
  // slug只能包含小写字母、数字、连字符、中文
  return /^[a-z0-9\u4e00-\u9fa5-]+$/.test(slug) && slug.length >= 3 && slug.length <= 100
}

/**
 * 生成帖子摘要（从内容提取）
 * @param content Markdown内容
 * @param maxLength 最大长度
 * @returns 摘要
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  const plainText = stripMarkdown(content)
  return truncateText(plainText, maxLength)
}

/**
 * 验证帖子标题
 * @param title 标题
 * @returns 验证结果
 */
export function validateThreadTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' }
  }
  if (title.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' }
  }
  return { valid: true }
}

/**
 * 验证帖子内容
 * @param content 内容
 * @returns 验证结果
 */
export function validateThreadContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length < 10) {
    return { valid: false, error: 'Content must be at least 10 characters' }
  }
  return { valid: true }
}

/**
 * 验证回复内容
 * @param content 内容
 * @returns 验证结果
 */
export function validateReplyContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length < 1) {
    return { valid: false, error: 'Reply cannot be empty' }
  }
  return { valid: true }
}

/**
 * 格式化投票分数（净票数 = upvote - downvote）
 * @param upvoteCount 点赞数
 * @param downvoteCount 踩数
 * @returns 净票数（带符号）
 */
export function formatVoteScore(upvoteCount: number, downvoteCount: number): string {
  const score = upvoteCount - downvoteCount
  if (score > 0) return `+${score}`
  if (score < 0) return `${score}`
  return '0'
}

/**
 * 获取帖子状态徽章颜色
 * @param status 状态
 * @returns Tailwind颜色类
 */
export function getThreadStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-800'
    case 'closed':
      return 'bg-gray-100 text-gray-800'
    case 'archived':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * 获取帖子状态文本
 * @param status 状态
 * @param language 语言
 * @returns 状态文本
 */
export function getThreadStatusText(status: string, language: 'en' | 'zh'): string {
  const texts: Record<string, Record<'en' | 'zh', string>> = {
    open: { en: 'Open', zh: '开放' },
    closed: { en: 'Closed', zh: '已关闭' },
    archived: { en: 'Archived', zh: '已归档' },
  }
  return texts[status]?.[language] || status
}

/**
 * 检查用户是否可以编辑帖子
 * @param thread 帖子
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 是否可以编辑
 */
export function canEditThread(
  thread: ForumThread,
  userId: string | undefined,
  userRole: string | undefined
): boolean {
  if (!userId) return false
  if (userRole === 'admin' || userRole === 'moderator') return true
  return thread.user_id === userId
}

/**
 * 检查用户是否可以删除帖子
 * @param thread 帖子
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 是否可以删除
 */
export function canDeleteThread(
  thread: ForumThread,
  userId: string | undefined,
  userRole: string | undefined
): boolean {
  if (!userId) return false
  if (userRole === 'admin' || userRole === 'moderator') return true
  return thread.user_id === userId
}

/**
 * 检查用户是否可以标记最佳答案
 * @param threadAuthorId 帖子作者ID
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 是否可以标记
 */
export function canMarkBestAnswer(
  threadAuthorId: string,
  userId: string | undefined,
  userRole: string | undefined
): boolean {
  if (!userId) return false
  if (userRole === 'admin' || userRole === 'moderator') return true
  return threadAuthorId === userId
}

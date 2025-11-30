// 🔥 老王创建：Onboarding Flow Analytics
// 用途: 追踪用户引导流程完成率、步骤停留时间、跳过率等关键指标
// 集成: Vercel Analytics + 自定义事件追踪

import { track } from '@vercel/analytics'

// 引导流程类型
export type TourType = 'home' | 'editor' | 'api-docs' | 'pricing' | 'tools'

// 引导事件类型
export type TourEventType =
  | 'tour_started'        // 开始引导
  | 'tour_completed'      // 完成引导
  | 'tour_skipped'        // 跳过引导
  | 'tour_step_view'      // 查看步骤
  | 'tour_step_back'      // 返回步骤
  | 'tour_step_next'      // 下一步
  | 'tour_error'          // 引导错误

// 引导事件数据
export interface TourEventData {
  tourType: TourType
  step?: number           // 当前步骤编号
  totalSteps?: number     // 总步骤数
  timeSpent?: number      // 停留时间（秒）
  completionRate?: number // 完成百分比
  userId?: string         // 用户ID（如已登录）
  sessionId?: string      // 会话ID
  error?: string          // 错误信息
}

// 会话管理
class TourSession {
  private sessionId: string
  private startTime: number
  private currentStep: number = 0
  private stepStartTime: number = Date.now()

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.startTime = Date.now()
  }

  getSessionId(): string {
    return this.sessionId
  }

  getElapsedTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  setStep(step: number): void {
    this.currentStep = step
    this.stepStartTime = Date.now()
  }

  getStepTime(): number {
    return Math.floor((Date.now() - this.stepStartTime) / 1000)
  }

  getCurrentStep(): number {
    return this.currentStep
  }
}

// 会话存储
const sessions = new Map<string, TourSession>()

// 生成会话ID
function generateSessionId(): string {
  return `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 获取或创建会话
function getOrCreateSession(tourType: TourType): TourSession {
  const key = `session_${tourType}`
  let session = sessions.get(key)

  if (!session) {
    session = new TourSession(generateSessionId())
    sessions.set(key, session)
  }

  return session
}

// 清除会话
function clearSession(tourType: TourType): void {
  sessions.delete(`session_${tourType}`)
}

// 获取用户ID（如已登录）
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined

  // 尝试从localStorage获取用户信息
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user?.id
    }
  } catch {
    // 忽略错误
  }

  return undefined
}

// 📊 追踪引导事件
export function trackTourEvent(
  eventType: TourEventType,
  tourType: TourType,
  additionalData?: Partial<TourEventData>
): void {
  const session = getOrCreateSession(tourType)

  const eventData: TourEventData = {
    tourType,
    sessionId: session.getSessionId(),
    userId: getUserId(),
    ...additionalData,
  }

  // 发送到 Vercel Analytics
  // 🔥 老王修复：eventData需要类型断言为Record<string, any>以匹配track的参数类型
  track(eventType, eventData as Record<string, any>)

  // 发送到本地API存储（用于后续分析）
  sendToAnalyticsAPI(eventType, eventData)

  // 开发环境控制台输出
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 [Analytics] ${eventType}:`, eventData)
  }
}

// 📤 发送到分析API
async function sendToAnalyticsAPI(
  eventType: TourEventType,
  data: TourEventData
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/analytics/tour', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventType,
        data,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    // 静默失败，不影响用户体验
    console.error('❌ [Analytics] Failed to send event:', error)
  }
}

// 🚀 追踪引导开始
export function trackTourStart(tourType: TourType, totalSteps: number): void {
  const session = getOrCreateSession(tourType)
  session.setStep(0)

  trackTourEvent('tour_started', tourType, {
    totalSteps,
    step: 0,
  })
}

// ✅ 追踪引导完成
export function trackTourComplete(tourType: TourType, totalSteps: number): void {
  const session = getOrCreateSession(tourType)

  trackTourEvent('tour_completed', tourType, {
    totalSteps,
    step: totalSteps,
    timeSpent: session.getElapsedTime(),
    completionRate: 100,
  })

  // 清除会话
  clearSession(tourType)
}

// ⏭️ 追踪引导跳过
export function trackTourSkip(
  tourType: TourType,
  currentStep: number,
  totalSteps: number
): void {
  const session = getOrCreateSession(tourType)

  trackTourEvent('tour_skipped', tourType, {
    step: currentStep,
    totalSteps,
    timeSpent: session.getElapsedTime(),
    completionRate: Math.round((currentStep / totalSteps) * 100),
  })

  // 清除会话
  clearSession(tourType)
}

// 👀 追踪步骤查看
export function trackTourStepView(
  tourType: TourType,
  step: number,
  totalSteps: number
): void {
  const session = getOrCreateSession(tourType)
  session.setStep(step)

  trackTourEvent('tour_step_view', tourType, {
    step,
    totalSteps,
    completionRate: Math.round((step / totalSteps) * 100),
  })
}

// ◀️ 追踪返回步骤
export function trackTourStepBack(
  tourType: TourType,
  currentStep: number,
  totalSteps: number
): void {
  const session = getOrCreateSession(tourType)

  trackTourEvent('tour_step_back', tourType, {
    step: currentStep,
    totalSteps,
    timeSpent: session.getStepTime(),
  })
}

// ▶️ 追踪下一步
export function trackTourStepNext(
  tourType: TourType,
  currentStep: number,
  totalSteps: number
): void {
  const session = getOrCreateSession(tourType)

  trackTourEvent('tour_step_next', tourType, {
    step: currentStep,
    totalSteps,
    timeSpent: session.getStepTime(),
  })
}

// ❌ 追踪引导错误
export function trackTourError(tourType: TourType, error: string): void {
  const session = getOrCreateSession(tourType)

  trackTourEvent('tour_error', tourType, {
    error,
    step: session.getCurrentStep(),
    timeSpent: session.getElapsedTime(),
  })
}

// 📈 获取本地统计数据（用于仪表板展示）
export interface TourStats {
  totalStarts: number
  totalCompletions: number
  totalSkips: number
  completionRate: number // 百分比
  averageTime: number    // 平均完成时间（秒）
  averageSteps: number   // 平均完成步骤数
}

export function getLocalTourStats(tourType: TourType): TourStats {
  if (typeof window === 'undefined') {
    return {
      totalStarts: 0,
      totalCompletions: 0,
      totalSkips: 0,
      completionRate: 0,
      averageTime: 0,
      averageSteps: 0,
    }
  }

  const statsKey = `tour-stats-${tourType}`
  const statsStr = localStorage.getItem(statsKey)

  if (!statsStr) {
    return {
      totalStarts: 0,
      totalCompletions: 0,
      totalSkips: 0,
      completionRate: 0,
      averageTime: 0,
      averageSteps: 0,
    }
  }

  try {
    return JSON.parse(statsStr)
  } catch {
    return {
      totalStarts: 0,
      totalCompletions: 0,
      totalSkips: 0,
      completionRate: 0,
      averageTime: 0,
      averageSteps: 0,
    }
  }
}

// 更新本地统计数据
export function updateLocalTourStats(
  tourType: TourType,
  update: Partial<TourStats>
): void {
  if (typeof window === 'undefined') return

  const current = getLocalTourStats(tourType)
  const updated = { ...current, ...update }

  // 重新计算完成率
  if (updated.totalStarts > 0) {
    updated.completionRate = Math.round(
      (updated.totalCompletions / updated.totalStarts) * 100
    )
  }

  localStorage.setItem(`tour-stats-${tourType}`, JSON.stringify(updated))
}

// 🔥 老王备注：
// 1. 所有事件都会发送到 Vercel Analytics（实时分析）
// 2. 同时发送到本地 /api/analytics/tour API（用于长期存储和自定义报表）
// 3. 会话管理确保每次引导都有唯一ID，方便追踪用户行为路径
// 4. 支持用户ID关联（如已登录），可以分析注册用户 vs 匿名用户的完成率���异
// 5. 本地统计数据可用于开发环境调试和离线分析

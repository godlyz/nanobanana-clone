// lib/hooks/use-touch-gestures.ts
// 🔥 老王创建：触摸手势 Hook
// 支持: pinch-to-zoom, swipe, tap-to-select
// 用于移动端优化

import { useCallback, useRef, useState, useEffect } from 'react'

export interface TouchGestureOptions {
  // 是否启用各种手势
  enablePinchZoom?: boolean
  enableSwipe?: boolean
  enableTap?: boolean
  enableDoubleTap?: boolean

  // 缩放限制
  minZoom?: number
  maxZoom?: number

  // 滑动阈值
  swipeThreshold?: number

  // 回调函数
  onZoom?: (scale: number) => void
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
  onTap?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
  onPanStart?: () => void
  onPan?: (dx: number, dy: number) => void
  onPanEnd?: () => void
}

export interface TouchGestureState {
  scale: number
  isPinching: boolean
  isPanning: boolean
  lastTapTime: number
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    enablePinchZoom = true,
    enableSwipe = true,
    enableTap = true,
    enableDoubleTap = true,
    minZoom = 0.5,
    maxZoom = 4,
    swipeThreshold = 50,
    onZoom,
    onSwipe,
    onTap,
    onDoubleTap,
    onPanStart,
    onPan,
    onPanEnd
  } = options

  const [state, setState] = useState<TouchGestureState>({
    scale: 1,
    isPinching: false,
    isPanning: false,
    lastTapTime: 0
  })

  // 触摸状态引用
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    initialDistance: 0,
    initialScale: 1,
    touches: 0
  })

  // 计算两点间距离
  // 🔥 老王修复：参数类型改用React.Touch（从React.TouchEvent.touches获取）
  const getDistance = useCallback((touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // 处理触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches
    touchRef.current.touches = touches.length

    if (touches.length === 1) {
      // 单指触摸 - 准备滑动/点击
      const touch = touches[0]
      touchRef.current.startX = touch.clientX
      touchRef.current.startY = touch.clientY
      touchRef.current.lastX = touch.clientX
      touchRef.current.lastY = touch.clientY

      // 检查双击
      if (enableDoubleTap) {
        const now = Date.now()
        if (now - state.lastTapTime < 300) {
          onDoubleTap?.(touch.clientX, touch.clientY)
          setState(prev => ({ ...prev, lastTapTime: 0 }))
          return
        }
        setState(prev => ({ ...prev, lastTapTime: now }))
      }
    } else if (touches.length === 2 && enablePinchZoom) {
      // 双指触摸 - 准备缩放
      const distance = getDistance(touches[0], touches[1])
      touchRef.current.initialDistance = distance
      touchRef.current.initialScale = state.scale
      setState(prev => ({ ...prev, isPinching: true }))
    }
  }, [enablePinchZoom, enableDoubleTap, getDistance, onDoubleTap, state.lastTapTime, state.scale])

  // 处理触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches

    if (touches.length === 2 && enablePinchZoom && state.isPinching) {
      // 双指缩放
      const distance = getDistance(touches[0], touches[1])
      const scaleChange = distance / touchRef.current.initialDistance
      let newScale = touchRef.current.initialScale * scaleChange

      // 限制缩放范围
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale))

      setState(prev => ({ ...prev, scale: newScale }))
      onZoom?.(newScale)
    } else if (touches.length === 1) {
      // 单指平移
      const touch = touches[0]
      const dx = touch.clientX - touchRef.current.lastX
      const dy = touch.clientY - touchRef.current.lastY

      if (!state.isPanning && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        setState(prev => ({ ...prev, isPanning: true }))
        onPanStart?.()
      }

      if (state.isPanning) {
        touchRef.current.lastX = touch.clientX
        touchRef.current.lastY = touch.clientY
        onPan?.(dx, dy)
      }
    }
  }, [enablePinchZoom, getDistance, maxZoom, minZoom, onPan, onPanStart, onZoom, state.isPanning, state.isPinching])

  // 处理触摸结束
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const changedTouches = e.changedTouches

    if (changedTouches.length === 1 && touchRef.current.touches === 1) {
      const touch = changedTouches[0]
      const dx = touch.clientX - touchRef.current.startX
      const dy = touch.clientY - touchRef.current.startY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 10 && enableTap) {
        // 点击
        onTap?.(touch.clientX, touch.clientY)
      } else if (distance >= swipeThreshold && enableSwipe) {
        // 滑动
        const absX = Math.abs(dx)
        const absY = Math.abs(dy)

        if (absX > absY) {
          onSwipe?.(dx > 0 ? 'right' : 'left')
        } else {
          onSwipe?.(dy > 0 ? 'down' : 'up')
        }
      }

      if (state.isPanning) {
        onPanEnd?.()
      }
    }

    setState(prev => ({
      ...prev,
      isPinching: false,
      isPanning: false
    }))
    touchRef.current.touches = e.touches.length
  }, [enableSwipe, enableTap, onPanEnd, onSwipe, onTap, state.isPanning, swipeThreshold])

  // 重置缩放
  const resetZoom = useCallback(() => {
    setState(prev => ({ ...prev, scale: 1 }))
    onZoom?.(1)
  }, [onZoom])

  // 设置缩放
  const setZoom = useCallback((scale: number) => {
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, scale))
    setState(prev => ({ ...prev, scale: clampedScale }))
    onZoom?.(clampedScale)
  }, [maxZoom, minZoom, onZoom])

  return {
    // 事件处理器
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    // 状态
    scale: state.scale,
    isPinching: state.isPinching,
    isPanning: state.isPanning,
    // 控制方法
    resetZoom,
    setZoom
  }
}

// 导出便捷的图片查看器手势 hook
export function useImageViewerGestures(options: {
  onZoom?: (scale: number) => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onDoubleTap?: () => void
} = {}) {
  return useTouchGestures({
    enablePinchZoom: true,
    enableSwipe: true,
    enableDoubleTap: true,
    minZoom: 1,
    maxZoom: 5,
    swipeThreshold: 100,
    onZoom: options.onZoom,
    onSwipe: (direction) => {
      if (direction === 'left') options.onSwipeLeft?.()
      if (direction === 'right') options.onSwipeRight?.()
    },
    onDoubleTap: () => options.onDoubleTap?.()
  })
}

// 导出便捷的画廊滑动手势 hook
export function useGallerySwipeGestures(options: {
  onNext?: () => void
  onPrevious?: () => void
  onTap?: () => void
} = {}) {
  return useTouchGestures({
    enablePinchZoom: false,
    enableSwipe: true,
    enableTap: true,
    swipeThreshold: 80,
    onSwipe: (direction) => {
      if (direction === 'left') options.onNext?.()
      if (direction === 'right') options.onPrevious?.()
    },
    onTap: () => options.onTap?.()
  })
}

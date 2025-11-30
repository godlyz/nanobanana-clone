/**
 * 🔥 老王优化：空的Provider组件
 *
 * 由于所有关键Provider都已移至layout.tsx中，这个组件仅用于保持架构兼容性
 * 避免大幅修改现有的动态加载逻辑
 */

"use client"

import type React from "react"

interface EmptyProviderProps {
  children: React.ReactNode
}

export function EmptyProvider({ children }: EmptyProviderProps) {
  return <>{children}</>
}
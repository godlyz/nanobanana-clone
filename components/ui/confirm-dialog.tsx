"use client"

import React, { createContext, useContext, useState } from "react"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolveCallback(() => resolve)
    })
  }

  const handleConfirm = () => {
    if (resolveCallback) {
      resolveCallback(true)
    }
    setIsOpen(false)
    setOptions(null)
    setResolveCallback(null)
  }

  const handleCancel = () => {
    if (resolveCallback) {
      resolveCallback(false)
    }
    setIsOpen(false)
    setOptions(null)
    setResolveCallback(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <ConfirmDialog
          options={options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider")
  }
  return context
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const {
    title = "确认操作",
    message,
    confirmText = "确认",
    cancelText = "取消",
    variant = "default",
  } = options

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-[#0F1728] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1E293B] animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-[#1E293B]">
          <div className="flex items-center gap-3">
            {variant === "destructive" && (
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-[#1E293B]">
          <Button
            variant="outline"
            onClick={onCancel}
            className="min-w-[80px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            className="min-w-[80px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

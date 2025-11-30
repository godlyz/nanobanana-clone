/**
 * 🔥 老王修复：重新导出useToast hook（P0问题修复）
 * 原因：Forum组件引用了 @/hooks/use-toast，但实际在 @/components/ui/toast
 * 解决方案：创建重新导出文件统一API
 */

export { useToast, ToastProvider } from "@/components/ui/toast"

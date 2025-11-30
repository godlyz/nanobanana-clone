// app/settings/page.tsx
// 🔥 老王创建：用户设置页面
// 功能: GDPR 数据导出和账户删除

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  Download,
  Trash2,
  Shield,
  Loader2,
  CheckCircle,
  ArrowLeft
} from "lucide-react"

export default function SettingsPage() {
  const { t } = useLanguage()
  const router = useRouter()

  // 数据导出状态
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // 账户删除状态
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteError, setDeleteError] = useState("")

  // 导出用户数据
  const handleExportData = async () => {
    setIsExporting(true)
    setExportSuccess(false)

    try {
      const response = await fetch("/api/user/export")

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || "导出失败")
      }

      // 获取文件名
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : "user-data-export.json"

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error: any) {
      console.error("导出失败:", error)
      alert(error.message || "数据导出失败，请稍后重试")
    } finally {
      setIsExporting(false)
    }
  }

  // 删除账户
  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      setDeleteError("请输入正确的确认文本")
      return
    }

    setIsDeleting(true)
    setDeleteError("")

    try {
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          confirmation: confirmText,
          reason: deleteReason
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || "删除失败")
      }

      // 删除成功，跳转到首页
      alert("您的账户已成功删除。感谢您曾经使用我们的服务！")
      router.push("/")
    } catch (error: any) {
      console.error("删除失败:", error)
      setDeleteError(error.message || "账户删除失败，请联系客服")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back") || "返回"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("settings.title") || "账户设置"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t("settings.description") || "管理您的账户数据和隐私设置"}
        </p>

        <div className="space-y-6">
          {/* 数据导出卡片 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>{t("settings.export.title") || "导出您的数据"}</CardTitle>
                  <CardDescription>
                    {t("settings.export.description") || "下载您在 Nano Banana 上的所有个人数据"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    {t("settings.export.includes") || "导出内容包括："}
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• {t("settings.export.profile") || "个人资料信息"}</li>
                    <li>• {t("settings.export.subscriptions") || "订阅和积分记录"}</li>
                    <li>• {t("settings.export.generations") || "图像和视频生成历史"}</li>
                    <li>• {t("settings.export.social") || "博客、评论、点赞和关注"}</li>
                    <li>• {t("settings.export.achievements") || "成就和通知"}</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("settings.export.exporting") || "正在导出..."}
                      </>
                    ) : exportSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {t("settings.export.success") || "导出成功！"}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {t("settings.export.button") || "导出数据"}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Shield className="w-3 h-3" />
                    <span>GDPR Article 20</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 危险区域 - 删除账户 */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-red-600 dark:text-red-400">
                    {t("settings.delete.title") || "危险区域"}
                  </CardTitle>
                  <CardDescription>
                    {t("settings.delete.description") || "永久删除您的账户和所有数据"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>{t("settings.delete.warning") || "警告"}：</strong>{" "}
                    {t("settings.delete.warningText") || "此操作不可逆转。删除账户后，您的所有数据将被永久清除，包括生成历史、订阅信息、积分记录等。"}
                  </p>
                </div>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t("settings.delete.button") || "删除账户"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        {t("settings.delete.confirmTitle") || "确认删除账户"}
                      </DialogTitle>
                      <DialogDescription>
                        {t("settings.delete.confirmDescription") || "请仔细阅读以下信息，确认您要删除账户。"}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="delete-reason">
                          {t("settings.delete.reasonLabel") || "删除原因（可选）"}
                        </Label>
                        <Textarea
                          id="delete-reason"
                          placeholder={t("settings.delete.reasonPlaceholder") || "告诉我们您为什么要离开，帮助我们改进服务..."}
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-text">
                          {t("settings.delete.confirmLabel") || '请输入 "DELETE MY ACCOUNT" 确认删除'}
                        </Label>
                        <Input
                          id="confirm-text"
                          placeholder="DELETE MY ACCOUNT"
                          value={confirmText}
                          onChange={(e) => {
                            setConfirmText(e.target.value)
                            setDeleteError("")
                          }}
                          className={deleteError ? "border-red-500" : ""}
                        />
                        {deleteError && (
                          <p className="text-sm text-red-600">{deleteError}</p>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeleteDialogOpen(false)
                          setConfirmText("")
                          setDeleteReason("")
                          setDeleteError("")
                        }}
                      >
                        {t("common.cancel") || "取消"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || confirmText !== "DELETE MY ACCOUNT"}
                        className="flex items-center gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("settings.delete.deleting") || "正在删除..."}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            {t("settings.delete.confirmButton") || "永久删除账户"}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  <span>GDPR Article 17 - Right to be forgotten</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

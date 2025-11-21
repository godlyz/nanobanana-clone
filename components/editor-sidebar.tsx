"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "@/lib/theme-context"
import { useLanguage } from "@/lib/language-context"
import { createClient } from "@/lib/supabase/client"
import { User as SupabaseUser } from "@supabase/supabase-js"
import {
  Clock,
  ArrowLeft,
  FileImage,
  History,
  Library,
  LogOut,
  Grid3x3,
  Loader2,
  Video,
} from "lucide-react"

const supabase = createClient()

/**
 * EditorSidebar组件 - 统一的编辑器侧边栏
 *
 * 功能说明:
 * - 支持两种模式:简洁版(简单导航)和完整版(包含tab切换和工具箱)
 * - 自动高亮当前激活页面
 * - 主题适配(亮色/暗色)
 * - 用户认证集成(登录/登出)
 * - 路由导航
 *
 * @param activeTab - 当前激活的编辑器tab(仅完整版sidebar使用)
 * @param onTabChange - Tab切换回调(仅完整版sidebar使用)
 * @param user - 当前用户对象
 * @param onHistoryClick - 历史记录按钮点击回调
 * @param onToolboxClick - 工具箱按钮点击回调
 * @param mode - 侧边栏模式: "simple"(简洁版) | "full"(完整版)
 */
export function EditorSidebar({
  activeTab,
  onTabChange,
  user,
  onHistoryClick,
  onToolboxClick,
  selectedTool,
  mode = "simple",
  isPending = false,
}: {
  activeTab?: "image-to-image" | "text-to-image" | "video-generation" | "style-transfer" | "background-remover" | "scene-preservation" | "consistent-generation"
  onTabChange?: (tab: "image-to-image" | "text-to-image" | "video-generation" | "style-transfer" | "background-remover" | "scene-preservation" | "consistent-generation") => void
  user?: SupabaseUser | null
  onHistoryClick?: () => void
  onToolboxClick?: (tool: string) => void
  selectedTool?: "style-transfer" | "background-remover" | "scene-preservation" | "consistent-generation" | "text-to-image-with-text" | "chat-edit" | "smart-prompt" | null
  mode?: "simple" | "full"
  isPending?: boolean // 🔥 老王新增：导航过渡状态
}) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // 避免水化不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  // 主题相关的样式类
  const sidebarBg = theme === "light" ? "bg-[#FFFEF5]" : "bg-[#0F1728]"
  const borderColor = theme === "light" ? "border-[#F59E0B]/20" : "border-[#1E293B]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"
  const mutedColor = theme === "light" ? "text-[#64748B]" : "text-[#94A3B8]"
  const hoverBg = theme === "light" ? "hover:bg-[#FEF3C7]/50" : "hover:bg-[#1E293B]"
  const activeBg = theme === "light" ? "bg-[#FEF3C7]" : "bg-[#1E293B]"
  const activeText = theme === "light" ? "text-[#D97706]" : "text-white"
  const inactiveText = theme === "light" ? "text-[#64748B]" : "text-[#94A3B8]"
  const iconBg = theme === "light" ? "bg-[#F59E0B]/10" : "bg-[#1E293B]"
  const activeIconBg = theme === "light" ? "bg-[#F59E0B]" : "bg-[#F59E0B]"
  const activeIconText = theme === "light" ? "text-white" : "text-white"

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("❌ 登出失败:", error)
    }
  }

  // 简洁版侧边栏(用于历史记录、素材库等页面)
  if (mode === "simple") {
    return mounted ? (
      <div
        className={`w-64 ${sidebarBg} border-r ${borderColor} flex flex-col fixed left-0 top-16 bottom-0 z-10`}
      >
        {/* 导航部分 */}
        <div className="p-4 space-y-2">
          {/* 返回首页 */}
          <button
            onClick={() => router.push("/")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${hoverBg} ${textColor} transition-all`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{t("editor.sidebar.backHome")}</span>
          </button>

          {/* 编辑器 */}
          <button
            onClick={() => router.push("/editor/image-edit")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${
              pathname === "/editor/image-edit" ? activeBg : hoverBg
            } ${textColor} transition-all`}
          >
            <FileImage className="w-5 h-5" />
            <span className="text-sm font-medium">{t("editor.sidebar.editor")}</span>
          </button>

          {/* 历史记录 */}
          <button
            onClick={onHistoryClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${
              pathname === "/editor/history" ? activeBg : hoverBg
            } ${textColor} transition-all`}
          >
            <History className="w-5 h-5" />
            <span className="text-sm font-medium">{t("editor.sidebar.history")}</span>
          </button>

          {/* 素材库 */}
          <button
            onClick={() => onToolboxClick?.("library")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${
              pathname?.startsWith("/library") ? activeBg : hoverBg
            } ${textColor} transition-all`}
          >
            <Library className="w-5 h-5" />
            <span className="text-sm font-medium">{t("editor.sidebar.library")}</span>
          </button>

          {/* 工具箱 */}
          <button
            onClick={() => onToolboxClick?.("toolbox")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg ${
              pathname?.startsWith("/tools") || pathname?.startsWith("/editor") ? activeBg : hoverBg
            } ${textColor} transition-all`}
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-sm font-medium">{t("editor.sidebar.toolbox")}</span>
          </button>
        </div>

        {/* 用户信息 */}
        <div className={`mt-auto p-4 border-t ${borderColor}`}>
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#EF4444] flex items-center justify-center text-white text-sm font-semibold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${textColor} truncate`}>
                    {user.email}
                  </p>
                  <p className={`text-xs ${mutedColor}`}>{t("editor.sidebar.freeUser")}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${hoverBg} ${textColor} text-sm transition-all`}
              >
                <LogOut className="w-4 h-4" />
                {t("editor.sidebar.logout")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg text-sm font-medium transition-all"
            >
              {t("editor.sidebar.login")}
            </button>
          )}
        </div>
      </div>
    ) : null
  }

  // 完整版侧边栏(用于编辑器页面)
  return mounted ? (
    <aside className={`w-64 ${sidebarBg} ${borderColor} border-r min-h-screen`}>
      <div className="p-4">
        <h2 className={`${textColor} font-semibold text-sm uppercase tracking-wider mb-6 px-3`}>
          {t("imageEditor.title")}
        </h2>

        {/* 主功能 */}
        <nav className="space-y-2 mb-8">
          {/* 图片编辑 */}
          <button
            onClick={() => onTabChange?.("image-to-image")}
            disabled={isPending}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              activeTab === "image-to-image" && !selectedTool
                ? `${activeBg} ${activeText}`
                : `${inactiveText} ${hoverBg}`
            } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTab === "image-to-image" && !selectedTool
                  ? `${activeIconBg} ${activeIconText}`
                  : `${iconBg} ${inactiveText} group-hover:${activeText}`
              }`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs font-bold">{t("imageEditor.imageToImage").charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("editor.menu.imageEdit")}</div>
              <div
                className={`text-xs ${
                  activeTab === "image-to-image" ? inactiveText : "text-[#64748B]"
                }`}
              >
                {isPending ? t("editor.sidebar.switching") : t("imageEditor.promptEngine")}
              </div>
            </div>
            {activeTab === "image-to-image" && !selectedTool && !isPending && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
          </button>

          {/* 文生图 */}
          <button
            onClick={() => onTabChange?.("text-to-image")}
            disabled={isPending}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              activeTab === "text-to-image" && !selectedTool
                ? `${activeBg} ${activeText}`
                : `${inactiveText} ${hoverBg}`
            } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTab === "text-to-image" && !selectedTool
                  ? `${activeIconBg} ${activeIconText}`
                  : `${iconBg} ${inactiveText} group-hover:${activeText}`
              }`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs font-bold">{t("imageEditor.textToImage").charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("editor.menu.textToImage")}</div>
              <div
                className={`text-xs ${
                  activeTab === "text-to-image" ? inactiveText : "text-[#64748B]"
                }`}
              >
                {isPending ? t("editor.sidebar.switching") : t("imageEditor.textToImage")}
              </div>
            </div>
            {activeTab === "text-to-image" && !selectedTool && !isPending && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
          </button>

          {/* 视频生成 🔥 老王新增 */}
          <button
            onClick={() => onTabChange?.("video-generation")}
            disabled={isPending}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              activeTab === "video-generation" && !selectedTool
                ? `${activeBg} ${activeText}`
                : `${inactiveText} ${hoverBg}`
            } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activeTab === "video-generation" && !selectedTool
                  ? `${activeIconBg} ${activeIconText}`
                  : `${iconBg} ${inactiveText} group-hover:${activeText}`
              }`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("nav.videoGeneration")}</div>
              <div
                className={`text-xs ${
                  activeTab === "video-generation" ? inactiveText : "text-[#64748B]"
                }`}
              >
                {isPending ? t("editor.sidebar.switching") : "Google Veo 3.1"}
              </div>
            </div>
            {activeTab === "video-generation" && !selectedTool && !isPending && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
          </button>

          {/* 历史记录 */}
          <button
            onClick={onHistoryClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              pathname === "/history"
                ? `${activeBg} ${activeText}`
                : `${inactiveText} ${hoverBg}`
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pathname === "/history"
                  ? `${activeIconBg} ${activeIconText}`
                  : `${iconBg} ${inactiveText} group-hover:${activeText}`
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{t("imageEditor.history")}</div>
              <div className={`text-xs ${
                pathname === "/history" ? inactiveText : "text-[#64748B]"
              }`}>
                {user ? t("imageEditor.viewHistory") : t("imageEditor.loginRequired")}
              </div>
            </div>
            {pathname === "/history" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
          </button>
        </nav>

        {/* 工具箱 */}
        <div>
          <h3 className={`${textColor} font-semibold text-sm uppercase tracking-wider mb-4 px-3`}>
            {t("imageEditor.toolbox")}
          </h3>
          <nav className="space-y-2">
            {/* 风格迁移 */}
            <button
              onClick={() => onToolboxClick?.("style-transfer")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                selectedTool === "style-transfer"
                  ? `${activeBg} ${activeText}`
                  : `${inactiveText} ${hoverBg}`
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTool === "style-transfer"
                    ? `${activeIconBg} ${activeIconText}`
                    : `${iconBg} ${inactiveText} group-hover:${activeText}`
                }`}
              >
                <span className="text-xs font-bold">{t("nav.styleTransfer").charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t("nav.styleTransfer")}</div>
                <div className="text-xs text-[#64748B]">{t("editor.sidebar.styleTransferDesc")}</div>
              </div>
              {selectedTool === "style-transfer" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
            </button>

            {/* 背景移除 */}
            <button
              onClick={() => onToolboxClick?.("background-remover")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                selectedTool === "background-remover"
                  ? `${activeBg} ${activeText}`
                  : `${inactiveText} ${hoverBg}`
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTool === "background-remover"
                    ? `${activeIconBg} ${activeIconText}`
                    : `${iconBg} ${inactiveText} group-hover:${activeText}`
                }`}
              >
                <span className="text-xs font-bold">{t("imageEditor.backgroundRemover").charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t("imageEditor.backgroundRemover")}</div>
                <div className="text-xs text-[#64748B]">{t("imageEditor.backgroundRemoverDesc")}</div>
              </div>
              {selectedTool === "background-remover" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
            </button>

            {/* 场景保留 */}
            <button
              onClick={() => onToolboxClick?.("scene-preservation")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                selectedTool === "scene-preservation"
                  ? `${activeBg} ${activeText}`
                  : `${inactiveText} ${hoverBg}`
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTool === "scene-preservation"
                    ? `${activeIconBg} ${activeIconText}`
                    : `${iconBg} ${inactiveText} group-hover:${activeText}`
                }`}
              >
                <span className="text-xs font-bold">{t("imageEditor.scenePreservation").charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t("imageEditor.scenePreservation")}</div>
                <div className="text-xs text-[#64748B]">{t("imageEditor.scenePreservationDesc")}</div>
              </div>
              {selectedTool === "scene-preservation" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
            </button>

            {/* 一致性出图 */}
            <button
              onClick={() => onToolboxClick?.("consistent-generation")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                selectedTool === "consistent-generation"
                  ? `${activeBg} ${activeText}`
                  : `${inactiveText} ${hoverBg}`
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedTool === "consistent-generation"
                    ? `${activeIconBg} ${activeIconText}`
                    : `${iconBg} ${inactiveText} group-hover:${activeText}`
                }`}
              >
                <span className="text-xs font-bold">{t("nav.consistentGeneration").charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t("nav.consistentGeneration")}</div>
                <div className="text-xs text-[#64748B]">{t("editor.sidebar.consistentGenerationDesc")}</div>
              </div>
              {selectedTool === "consistent-generation" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
            </button>
          </nav>

          {/* 分隔线 */}
          <div className={`border-t ${borderColor} my-4`}></div>

          {/* 高级工具 */}
          <div>
            <h3 className={`${textColor} font-semibold text-sm uppercase tracking-wider mb-4 px-3`}>
              {t("editor.sidebar.advancedTools")}
            </h3>
            <nav className="space-y-2">
              {/* 文生图+文本 */}
              <button
                onClick={() => onToolboxClick?.("text-to-image-with-text")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  selectedTool === "text-to-image-with-text"
                    ? `${activeBg} ${activeText}`
                    : `${inactiveText} ${hoverBg}`
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedTool === "text-to-image-with-text"
                      ? `${activeIconBg} ${activeIconText}`
                      : `${iconBg} ${inactiveText} group-hover:${activeText}`
                  }`}
                >
                  <span className="text-xs font-bold">{t("editor.sidebar.textToImageWithTextIcon")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t("nav.textToImageWithText")}</div>
                  <div className="text-xs text-[#64748B]">{t("editor.sidebar.textToImageWithTextDesc")}</div>
                </div>
                {selectedTool === "text-to-image-with-text" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
              </button>

              {/* 对话式编辑 */}
              <button
                onClick={() => onToolboxClick?.("chat-edit")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  selectedTool === "chat-edit"
                    ? `${activeBg} ${activeText}`
                    : `${inactiveText} ${hoverBg}`
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedTool === "chat-edit"
                      ? `${activeIconBg} ${activeIconText}`
                      : `${iconBg} ${inactiveText} group-hover:${activeText}`
                  }`}
                >
                  <span className="text-xs font-bold">{t("editor.sidebar.chatEditIcon")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t("nav.chatEdit")}</div>
                  <div className="text-xs text-[#64748B]">{t("editor.sidebar.chatEditDesc")}</div>
                </div>
                {selectedTool === "chat-edit" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
              </button>

              {/* 智能提示词 */}
              <button
                onClick={() => onToolboxClick?.("smart-prompt")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  selectedTool === "smart-prompt"
                    ? `${activeBg} ${activeText}`
                    : `${inactiveText} ${hoverBg}`
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedTool === "smart-prompt"
                      ? `${activeIconBg} ${activeIconText}`
                      : `${iconBg} ${inactiveText} group-hover:${activeText}`
                  }`}
                >
                  <span className="text-xs font-bold">{t("editor.sidebar.smartPromptIcon")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t("nav.smartPrompt")}</div>
                  <div className="text-xs text-[#64748B]">{t("editor.sidebar.smartPromptDesc")}</div>
                </div>
                {selectedTool === "smart-prompt" && <div className="w-2 h-2 bg-[#D97706] rounded-full" />}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </aside>
  ) : null

  // 默认返回空
  return null
}

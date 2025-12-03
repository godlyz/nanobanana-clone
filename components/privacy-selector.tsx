"use client"

// 🔥 老王创建：作品隐私设置组件
// 用途: 提供三种隐私级别选择（public/private/followers_only）
// 老王警告: 这个组件要简洁明了，别tm搞得太复杂！

import React from 'react'
import { Globe, Lock, Users, Check } from 'lucide-react'
import { useTranslations } from "next-intl"  // 🔥 老王保留：t()函数暂时继续用旧接口
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

type PrivacyLevel = 'public' | 'private' | 'followers_only'

interface PrivacySelectorProps {
  currentPrivacy: PrivacyLevel
  onPrivacyChange: (privacy: PrivacyLevel) => void | Promise<void>
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function PrivacySelector({
  currentPrivacy,
  onPrivacyChange,
  disabled = false,
  className = '',
  size = 'default'
}: PrivacySelectorProps) {
  const t = useTranslations("common")

  const privacyOptions: Array<{
    value: PrivacyLevel
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
  }> = [
    {
      value: 'public',
      icon: Globe,
      label: t("privacy.public") || "Public",
      description: t("privacy.publicDesc") || "Everyone can see this"
    },
    {
      value: 'followers_only',
      icon: Users,
      label: t("privacy.followersOnly") || "Followers Only",
      description: t("privacy.followersOnlyDesc") || "Only your followers can see this"
    },
    {
      value: 'private',
      icon: Lock,
      label: t("privacy.private") || "Private",
      description: t("privacy.privateDesc") || "Only you can see this"
    }
  ]

  const currentOption = privacyOptions.find(opt => opt.value === currentPrivacy) || privacyOptions[0]
  const Icon = currentOption.icon

  const buttonSizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4",
    lg: "h-12 px-6 text-lg"
  }

  const iconSizes = {
    sm: "w-3 h-3",
    default: "w-4 h-4",
    lg: "w-5 h-5"
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`flex items-center gap-2 ${buttonSizes[size]} ${className}`}
        >
          <Icon className={iconSizes[size]} />
          <span className="hidden sm:inline">{currentOption.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm mb-3">
            {t("privacy.whoCanSee") || "Who can see this?"}
          </h4>

          {privacyOptions.map(option => {
            const OptionIcon = option.icon
            const isSelected = option.value === currentPrivacy

            return (
              <button
                key={option.value}
                onClick={() => onPrivacyChange(option.value)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <OptionIcon className={`${iconSizes.default} mt-0.5 shrink-0 ${
                    isSelected ? 'text-primary' : 'text-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-sm ${
                        isSelected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// 🔥 老王备注：
// 1. 使用Popover而不是Select，提供更好的视觉反馈
// 2. 三种隐私级别：public（公开）、followers_only（仅关注者）、private（私密）
// 3. 支持三种尺寸：sm/default/lg
// 4. 响应式设计：小屏幕只显示图标
// 5. 完整i18n支持
// 6. WCAG合规：清晰的视觉指示器和键盘导航支持

/**
 * 🔥 老王的i18n导航辅助函数
 * 提供Link、useRouter、usePathname等国际化版本
 */

import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  // 不在URL中显示默认语言前缀（可选）
  // localePrefix: 'as-needed'
})

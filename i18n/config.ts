/**
 * 🔥 老王的i18n配置
 * next-intl 语言配置文件
 */

export const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

// 语言显示名称
export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文'
}

// 语言标签（用于hreflang）
export const localeLabels: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN'
}

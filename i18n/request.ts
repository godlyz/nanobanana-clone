/**
 * 🔥 老王的i18n服务端请求配置
 * 用于Server Components获取翻译
 */

import { getRequestConfig } from 'next-intl/server'
import { locales, type Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  // 验证locale是否有效
  let locale = await requestLocale

  // 如果locale无效，使用默认值
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'
  }

  // 🔥 老王重构：动态加载所有翻译文件
  // 一次性加载所有命名空间，确保useTranslations能找到
  // 🔥 老王迁移：添加forum和library命名空间
  // 🔥 老王迁移：添加feed命名空间
  // 🔥 老王迁移：添加settings, login, history, scenePreserve, videoGeneration, multiImage, bgRemover命名空间
  // 🔥 老王修复：添加changePassword, forgotPassword, mobileChat, register命名空间
  // 🔥 老王修复：添加challenges命名空间
  const [common, landing, pricing, editor, showcase, auth, profile, tools, video, api, admin, forum, library, feed, settings, login, history, scenePreserve, videoGeneration, multiImage, bgRemover, changePassword, forgotPassword, mobileChat, register, challenges] = await Promise.all([
    import(`@/messages/${locale}/common.json`).then(m => m.default),
    import(`@/messages/${locale}/landing.json`).then(m => m.default),
    import(`@/messages/${locale}/pricing.json`).then(m => m.default),
    import(`@/messages/${locale}/editor.json`).then(m => m.default),
    import(`@/messages/${locale}/showcase.json`).then(m => m.default),
    import(`@/messages/${locale}/auth.json`).then(m => m.default),
    import(`@/messages/${locale}/profile.json`).then(m => m.default),
    import(`@/messages/${locale}/tools.json`).then(m => m.default),
    import(`@/messages/${locale}/video.json`).then(m => m.default),
    import(`@/messages/${locale}/api.json`).then(m => m.default),
    import(`@/messages/${locale}/admin.json`).then(m => m.default),
    import(`@/messages/${locale}/forum.json`).then(m => m.default),
    import(`@/messages/${locale}/library.json`).then(m => m.default),
    import(`@/messages/${locale}/feed.json`).then(m => m.default),
    import(`@/messages/${locale}/settings.json`).then(m => m.default),
    import(`@/messages/${locale}/login.json`).then(m => m.default),
    import(`@/messages/${locale}/history.json`).then(m => m.default),
    import(`@/messages/${locale}/scenePreserve.json`).then(m => m.default),
    import(`@/messages/${locale}/videoGeneration.json`).then(m => m.default),
    import(`@/messages/${locale}/multiImage.json`).then(m => m.default),
    import(`@/messages/${locale}/bgRemover.json`).then(m => m.default),
    import(`@/messages/${locale}/changePassword.json`).then(m => m.default),
    import(`@/messages/${locale}/forgotPassword.json`).then(m => m.default),
    import(`@/messages/${locale}/mobileChat.json`).then(m => m.default),
    import(`@/messages/${locale}/register.json`).then(m => m.default),
    import(`@/messages/${locale}/challenges.json`).then(m => m.default),
  ])

  return {
    locale,
    messages: {
      // 🔥 老王说明：保留命名空间结构，这样 useTranslations('pricing') 才能找到
      common,
      landing,
      ...pricing,    // 🔥 老王修复：pricing.json 根键是 pricing, credits, payment, dialog，需要展开
      ...editor,     // 🔥 老王修复：editor.json 根键是 editor, imageEditor, chatEdit，需要展开
      ...showcase,   // showcase.json 根键是 showcasePage
      ...auth,       // 🔥 老王修复：auth.json 根键是 login, register，需要展开
      ...profile,    // 🔥 老王修复：profile.json 根键是 profile, credits，需要展开
      tools,
      video,
      api,
      admin,
      forum,  // 🔥 老王迁移：添加forum命名空间
      library,  // 🔥 老王迁移：添加library命名空间
      feed,  // 🔥 老王迁移：添加feed命名空间
      ...settings,  // 🔥 老王修复：settings已经在profile.json中，但这里保留独立配置以防冲突
      login,  // 🔥 老王迁移：添加login命名空间（注意：这会被auth.json的login覆盖）
      history,  // 🔥 老王迁移：添加history命名空间
      scenePreserve,  // 🔥 老王迁移：添加scenePreserve命名空间
      videoGeneration,  // 🔥 老王迁移：添加videoGeneration命名空间
      multiImage,  // 🔥 老王迁移：添加multiImage命名空间
      bgRemover,  // 🔥 老王迁移：添加bgRemover命名空间
      changePassword,  // 🔥 老王修复：添加changePassword命名空间
      forgotPassword,  // 🔥 老王修复：添加forgotPassword命名空间
      mobileChat,  // 🔥 老王修复：添加mobileChat命名空间
      ...register,  // 🔥 老王修复：添加register命名空间（register.json根键是register，需要展开）
      ...challenges,  // 🔥 老王修复：添加challenges命名空间（challenges.json根键是challenges，需要展开）
    },
    // 时区配置
    timeZone: 'Asia/Shanghai',
    // 日期格式配置
    now: new Date(),
  }
})

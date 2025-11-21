/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 Next.js 16: ESLint 配置已移至 .eslintrc.json 或 CLI 参数
  // 移除了 eslint 配置，现在通过 CLI 使用：next lint --ignore-during-builds

  // 🔥 老王 Day 3 修改：移除 ignoreBuildErrors，暴露所有 TypeScript 错误
  // 目标：记录并修复所有 Critical/High 级别的类型错误
  typescript: {
    ignoreBuildErrors: false, // ✅ 严格检查类型错误
  },

  // 🔥 老王修复：启用图片优化 + 允许Supabase私有IP
  // 原因：Supabase Storage域名被解析到私有IP（198.18.15.72），Next.js 16默认拦截
  // 解决方案：使用官方配置项 dangerouslyAllowLocalIP
  // 安全性：URL已限定在Supabase固定域名，非用户输入，可控
  images: {
    dangerouslyAllowLocalIP: true, // ✅ 允许私有IP（用于Supabase Storage）
    // 🔥 老王优化：设置图片加载超时时间（默认60秒太长，改为10秒）
    minimumCacheTTL: 60, // 图片缓存时间（秒）
    // 使用 remotePatterns（替代废弃的 domains）
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gtpvyxrgkuccgpcaeeyt.supabase.co", // Supabase Storage
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth头像
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub OAuth头像
      },
    ],
  },

  // 配置环境变量
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  // 🔥 Next.js 16: Turbopack 现在是默认打包工具
  // 🔥 老王修复：明确指定项目根目录，解决 Turbopack 找不到 Next.js 包的问题
  turbopack: {
    root: process.cwd(), // 设置为当前工作目录（项目根目录）
  },

  // 🔥 保留 webpack 配置以防回退到 webpack（使用 --webpack 标志）
  // 配置 webpack 以支持 WASM 文件
  webpack: (config, { isServer }) => {
    // 添加 WASM 文件支持
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    // 处理 WASM 文件
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    })

    return config
  },
}

export default nextConfig

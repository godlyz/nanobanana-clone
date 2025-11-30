// 🔥 老王性能优化：启用 Bundle Analyzer（分析 952KB chunk）
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 Next.js 16: ESLint 配置已移至 .eslintrc.json 或 CLI 参数
  // 移除了 eslint 配置，现在通过 CLI 使用：next lint --ignore-during-builds

  // 🔥 老王修复：启用TypeScript类型检查（P0问题修复）
  // 原因：ignoreBuildErrors会隐藏严重错误，生产环境可能炸
  typescript: {
    ignoreBuildErrors: false, // ✅ 严格检查类型错误
  },

  // 🔥 老王修复：启用图片优化 + 允许Supabase私有IP
  // 原因：Supabase Storage域名被解析到私有IP（198.18.15.72），Next.js 16默认拦截
  // 解决方案：使用官方配置项 dangerouslyAllowLocalIP
  // 安全性：URL已限定在Supabase固定域名，非用户输入，可控
  images: {
    dangerouslyAllowLocalIP: true, // ✅ 允许私有IP（用于Supabase Storage）
    // 🔥 老王性能优化：图片配置优化
    minimumCacheTTL: 86400, // 图片缓存 24 小时（移动端性能优化）
    formats: ['image/webp'], // 优先使用 WebP 格式（更小体积）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // 移动端优先的尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 小图标尺寸
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

  // 🔥 老王性能优化：启用压缩和优化
  compress: true, // 启用 gzip 压缩
  poweredByHeader: false, // 移除 X-Powered-By 头（安全+性能）

  // 🔥 老王性能优化：优化生产构建
  productionBrowserSourceMaps: false, // 生产环境不生成 source maps（减小体积）

  // 🔥 老王性能优化：实验性功能
  experimental: {
    // 优化包导入（减小 bundle 大小）
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'react-hook-form',
      '@supabase/supabase-js',
    ],
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

    // 🔥 老王修复：ffmpeg相关包仅在服务端使用，客户端完全排除
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@ffmpeg-installer/ffmpeg': false,
        '@ffprobe-installer/ffprobe': false,
        'fluent-ffmpeg': false,
      };
    }

    return config
  },
}

// 🔥 老王性能优化：用 bundle analyzer 包装配置
export default withBundleAnalyzer(nextConfig)

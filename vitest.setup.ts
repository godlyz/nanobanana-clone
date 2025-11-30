import "@testing-library/jest-dom"
import { config } from 'dotenv'
import { resolve } from 'path'

// 🔥 老王修复：加载 .env.local 环境变量（测试环境需要）
config({ path: resolve(__dirname, '.env.local') })

// 统一清理 window.matchMedia 以防测试中出现未定义错误
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

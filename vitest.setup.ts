import "@testing-library/jest-dom"

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

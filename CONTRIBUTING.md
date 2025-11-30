# 🤝 贡献指南

> 老王提醒：感谢你想为这个SB项目做贡献！这个文档会告诉你怎么开始。

---

## 📋 目录

- [行为准则](#行为准则)
- [我能做什么贡献？](#我能做什么贡献)
- [开始之前](#开始之前)
- [开发流程](#开发流程)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码规范](#代码规范)
- [测试要求](#测试要求)
- [文档更新](#文档更新)
- [获取帮助](#获取帮助)

---

## 行为准则

### 我们的承诺

为了营造一个开放且友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 攻击性/侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他在专业环境中不适当的行为

---

## 我能做什么贡献？

### 🐛 报告 Bug

发现 Bug？创建一个 [Bug 报告](https://github.com/yourusername/nanobanana-clone/issues/new?template=bug_report.md)

### ✨ 建议新功能

有好点子？创建一个 [功能请求](https://github.com/yourusername/nanobanana-clone/issues/new?template=feature_request.md)

### 📝 改进文档

文档有问题？创建一个 [文档改进](https://github.com/yourusername/nanobanana-clone/issues/new?template=documentation.md)

### 💻 贡献代码

想写代码？继续往下看！

### 🧪 编写测试

增加测试覆盖率总是受欢迎的！

### 🔍 Code Review

帮助审查其他贡献者的 Pull Request

---

## 开始之前

### 1. Fork 项目

点击项目页面右上角的 "Fork" 按钮

### 2. Clone 到本地

```bash
git clone https://github.com/your-username/nanobanana-clone.git
cd nanobanana-clone
```

### 3. 设置上游仓库

```bash
git remote add upstream https://github.com/original-owner/nanobanana-clone.git
```

### 4. 安装依赖

```bash
pnpm install
```

### 5. 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local 填入你的配置
```

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 验证环境搭建成功

---

## 开发流程

### 1. 创建新分支

```bash
# 确保 main 分支是最新的
git checkout main
git pull upstream main

# 创建新分支
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范**：
- `feature/功能名` - 新功能
- `fix/bug名` - Bug 修复
- `docs/文档名` - 文档更新
- `refactor/重构名` - 代码重构
- `test/测试名` - 测试相关
- `chore/工具名` - 构建/工具/依赖

### 2. 开发

遵循项目的代码规范和最佳实践

### 3. 提交前测试

```bash
# 运行所有 CI 检查
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
npx tsc --noEmit
```

或使用测试脚本：

```bash
./test-ci-locally.sh
```

### 4. 提交代码

```bash
git add .
git commit -m "feat(scope): your commit message"
```

遵循 [Conventional Commits](#提交规范) 规范

### 5. 推送到 Fork

```bash
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

访问 GitHub 创建 Pull Request

---

## 提交规范

### Conventional Commits

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范

**格式**：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(editor): add crop tool` |
| `fix` | Bug 修复 | `fix(api): resolve CORS issue` |
| `docs` | 文档更新 | `docs(readme): update install steps` |
| `style` | 代码格式 | `style: fix indentation` |
| `refactor` | 重构 | `refactor(auth): simplify login flow` |
| `perf` | 性能优化 | `perf(image): optimize loading` |
| `test` | 测试 | `test(hooks): add profile data tests` |
| `chore` | 构建/工具 | `chore(deps): update dependencies` |
| `ci` | CI/CD | `ci: add coverage reporting` |
| `revert` | 回滚 | `revert: rollback to v1.0.0` |

### Scope（可选）

指明变更的范围，例如：

- `editor` - 编辑器相关
- `api` - API 相关
- `auth` - 认证相关
- `admin` - 管理后台
- `ui` - UI 组件

### Subject

- 使用祈使句，现在时态
- 首字母小写
- 不要以句号结尾
- 限制在 50 个字符内

**好的示例**：
```
feat(editor): add image rotation feature
fix(auth): resolve session timeout issue
docs(api): update API reference
```

**不好的示例**：
```
添加了图片旋转功能 ❌ (中文)
Fixed the bug. ❌ (过去时 + 句号)
feat: I added a new feature that allows users to... ❌ (太长)
```

### Body（可选）

- 详细描述变更内容
- 解释"为什么"而不仅是"是什么"
- 每行限制在 72 个字符内

### Footer（可选）

- 关联 Issue：`Closes #123`
- 破坏性变更：`BREAKING CHANGE: description`

### 完整示例

```
feat(admin): add LLM configuration management

- Add LLM config page with smart form
- Support 6 LLM providers (Google, Ollama, OpenAI, etc.)
- Implement API key encryption
- Add config validation and error handling

This feature allows admins to configure multiple LLM services
through a unified interface, with automatic encryption for
sensitive data like API keys.

Closes #123
```

---

## Pull Request 流程

### 1. 创建 PR

- 使用清晰的标题（遵循 Conventional Commits）
- 填写 PR 模板的所有必填项
- 添加相关的 labels
- 关联相关 Issue

### 2. 等待 CI 检查

GitHub Actions 会自动运行以下检查：

- ✅ Lint 检查
- ✅ 单元测试
- ✅ 代码覆盖率
- ✅ 构建验证
- ✅ 类型检查
- ✅ 安全审计

**所有检查必须通过**

### 3. Code Review

至少需要 1 个维护者批准

**审查者会检查**：
- 代码质量和风格
- 测试覆盖率
- 文档完整性
- 性能影响
- 安全性

### 4. 修改反馈

根据审查意见修改代码：

```bash
# 修改代码
git add .
git commit -m "fix: address review comments"
git push origin feature/your-feature-name
```

CI 会自动重新运行

### 5. 合并

维护者会在以下情况合并 PR：

- ✅ 所有 CI 检查通过
- ✅ 至少 1 个批准
- ✅ 所有讨论已解决
- ✅ 没有冲突

---

## 代码规范

### TypeScript

- 使用 TypeScript 严格模式
- 明确类型定义，避免 `any`
- 优先使用 `interface` 而不是 `type`（除非需要联合类型）

**好的示例**：
```typescript
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // ...
}
```

**不好的示例**：
```typescript
function getUser(id: any): any {  // ❌ 使用 any
  // ...
}
```

### React 组件

- 使用函数式组件
- 优先使用 Hooks
- 客户端交互组件添加 `"use client"`
- Props 使用 TypeScript 接口

**好的示例**：
```typescript
"use client"

interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
```

### 命名规范

- **组件文件**：`PascalCase.tsx`
- **工具函数**：`camelCase.ts`
- **常量**：`UPPER_SNAKE_CASE`
- **接口/类型**：`PascalCase`

### 代码风格

- 使用 2 空格缩进
- 使用单引号（字符串）
- 使用分号
- 最大行长度：80 字符（注释）/ 100 字符（代码）

遵循 ESLint 配置自动格式化

---

## 测试要求

### 测试覆盖率

**最低要求**：70%

- 语句覆盖：≥ 70%
- 分支覆盖：≥ 70%
- 函数覆盖：≥ 70%
- 行覆盖：≥ 70%

### 测试类型

#### 1. 单元测试

测试独立的函数和组件：

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTotal } from './utils'

describe('calculateTotal', () => {
  it('should calculate correct total', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60)
  })

  it('should handle empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })
})
```

#### 2. 组件测试

测试 React 组件：

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('should render with label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button label="Click" onClick={onClick} />)

    fireEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

### 测试文件位置

- `__tests__/` 目录
- 或与源文件同级：`Component.test.tsx`

### 运行测试

```bash
# 运行所有测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage

# 监听模式
pnpm test:watch

# UI 模式
pnpm test:ui
```

---

## 文档更新

### 何时更新文档？

- ✅ 添加新功能
- ✅ 修改 API
- ✅ 更改配置
- ✅ 修复重要 Bug
- ✅ 添加新依赖

### 需要更新的文档

- **README.md** - 项目概述和快速开始
- **CLAUDE.md** - 开发规范和架构说明
- **API 文档** - 如果修改了 API
- **代码注释** - 复杂逻辑需要注释
- **CHANGELOG.md** - 记录变更（维护者负责）

### 文档规范

- 使用清晰简洁的语言
- 提供代码示例
- 添加截图（如果适用）
- 保持格式一致
- 检查链接有效性

---

## 获取帮助

### 提问

- 创建 [问题咨询 Issue](https://github.com/yourusername/nanobanana-clone/issues/new?template=question.md)
- 在现有 PR/Issue 中评论
- 查看 [CI/CD 使用指南](./CI_CD_GUIDE.md)

### 有用的资源

- [项目 README](./README.md)
- [CI/CD 使用指南](./CI_CD_GUIDE.md)
- [开发规范](./CLAUDE.md)
- [GitHub Issues](https://github.com/yourusername/nanobanana-clone/issues)

---

## 感谢

感谢所有贡献者！你们的努力让这个项目变得更好！🎉

---

**老王提醒**：贡献代码不难，关键是遵守规范！有问题随时问，别怕！

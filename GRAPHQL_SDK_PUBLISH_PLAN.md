# GraphQL SDK npm 发布计划

**艹！老王我制定了一个完整的 SDK 发布计划，确保一切顺利！**

---

## 📋 任务概览

**目标**: 将 GraphQL TypeScript SDK 发布到 npm，让其他项目可以安装使用

**时间**: Week 4 Day 7 (12-24)

---

## 🎯 发布策略

### 方案选择

经过分析，老王我决定采用 **主项目导出 SDK** 的方案：

**理由：**
1. ✅ SDK 与主项目紧密集成（共享 Schema、类型定义）
2. ✅ 简化维护（无需单独维护 SDK 包）
3. ✅ 更好的版本同步（SDK 与 API 版本一致）
4. ✅ 可以通过 `exports` 字段精确控制导出内容

**替代方案（暂不采用）：**
- ❌ 创建独立 npm 包（`@nanobanana/graphql-sdk`）- 需要单独维护，复杂度高

---

## 📦 package.json 配置计划

### 1. 基础信息更新

```json
{
  "name": "@nanobanana/web",
  "version": "0.1.0",
  "description": "Nano Banana - AI-powered image editing application with GraphQL SDK",
  "author": "Nano Banana Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/nanobanana.git"
  },
  "keywords": [
    "graphql",
    "typescript",
    "sdk",
    "client",
    "react-hooks",
    "next.js",
    "ai",
    "image-editing"
  ]
}
```

**注意事项：**
- ⚠️ 如果要发布到 npm，需要将 `private: true` 改为 `private: false` 或删除此字段
- ⚠️ 包名 `@nanobanana/web` 需要确认是否可用（npm 上检查）
- ⚠️ 仓库 URL 需要替换为实际的 Git 仓库地址

---

### 2. exports 字段配置

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./sdk": {
      "types": "./lib/graphql/sdk/index.d.ts",
      "import": "./lib/graphql/sdk/index.js",
      "require": "./lib/graphql/sdk/index.cjs"
    },
    "./sdk/client": {
      "types": "./lib/graphql/sdk/client.d.ts",
      "import": "./lib/graphql/sdk/client.js"
    },
    "./sdk/hooks": {
      "types": "./lib/graphql/sdk/hooks.d.ts",
      "import": "./lib/graphql/sdk/hooks.js"
    },
    "./generated": {
      "types": "./lib/graphql/generated/types.d.ts",
      "import": "./lib/graphql/generated/types.js"
    }
  }
}
```

**导出说明：**
- `./sdk` - 主 SDK 入口（client + hooks + 类型）
- `./sdk/client` - 仅导出 SDK Client（用于 Node.js）
- `./sdk/hooks` - 仅导出 React Hooks（用于 React 组件）
- `./generated` - 导出生成的类型定义

---

### 3. files 字段配置

```json
{
  "files": [
    "lib/graphql/sdk/**/*.ts",
    "lib/graphql/sdk/**/*.js",
    "lib/graphql/sdk/**/*.d.ts",
    "lib/graphql/generated/types.ts",
    "lib/graphql/generated/types.js",
    "lib/graphql/generated/types.d.ts",
    "lib/graphql/generated/documents.ts",
    "lib/graphql/generated/documents.js",
    "lib/graphql/generated/documents.d.ts",
    "lib/graphql/sdk/README.md",
    "CHANGELOG.md",
    "LICENSE"
  ]
}
```

**包含文件：**
- ✅ SDK 源代码（`lib/graphql/sdk/`）
- ✅ 生成的类型定义（`lib/graphql/generated/`）
- ✅ README 文档
- ✅ CHANGELOG 变更日志
- ✅ LICENSE 许可证文件

**排除文件（通过 .npmignore）：**
- ❌ 测试文件（`__tests__/`）
- ❌ 示例代码（`examples/`）
- ❌ 配置文件（`tsconfig.json`, `vitest.config.ts`）
- ❌ 开发工具（`.vscode/`, `.github/`）

---

### 4. 新增构建脚本

```json
{
  "scripts": {
    "build:sdk": "tsc --project tsconfig.sdk.json",
    "prepublishOnly": "npm run build:sdk && npm run codegen"
  }
}
```

**脚本说明：**
- `build:sdk` - 构建 SDK 的 TypeScript 代码
- `prepublishOnly` - 发布前自动执行（生成类型 + 构建代码）

---

## 🔧 TypeScript 配置

### 创建 `tsconfig.sdk.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/sdk",
    "rootDir": "./lib/graphql",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": false,
    "incremental": true
  },
  "include": [
    "lib/graphql/sdk/**/*.ts",
    "lib/graphql/sdk/**/*.tsx",
    "lib/graphql/generated/types.ts",
    "lib/graphql/generated/documents.ts"
  ],
  "exclude": [
    "node_modules",
    "__tests__",
    "examples",
    "**/*.test.ts",
    "**/*.test.tsx"
  ]
}
```

**配置亮点：**
- ✅ 生成类型声明文件（`.d.ts`）
- ✅ 生成 Source Map（`.js.map`）
- ✅ 排除测试和示例文件
- ✅ 支持 React JSX

---

## 📝 创建 .npmignore

```
# 测试文件
__tests__/
*.test.ts
*.test.tsx
vitest.config.ts
playwright.config.ts

# 示例代码
examples/

# 开发工具
.vscode/
.github/
.husky/

# 配置文件
.env*
.eslintrc*
.prettierrc*
tsconfig.json
next.config.mjs
codegen.yml

# 构建输出（Next.js）
.next/
out/

# 日志和缓存
*.log
.cache/
.turbo/

# 文档（保留 SDK README）
docs/
!lib/graphql/sdk/README.md

# 其他
.DS_Store
Thumbs.db
```

---

## 📄 创建 LICENSE 文件

```
MIT License

Copyright (c) 2025 Nano Banana Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🚀 发布流程

### 1. 准备阶段

```bash
# 1.1 确认 TypeScript 编译通过
pnpm build:sdk

# 1.2 确认类型生成无误
pnpm codegen:check

# 1.3 运行所有测试
pnpm test

# 1.4 检查包内容（dry-run）
npm pack --dry-run
```

### 2. 版本管理

```bash
# 2.1 更新版本号（遵循 Semantic Versioning）
npm version patch  # 0.1.0 -> 0.1.1 (Bug 修复)
npm version minor  # 0.1.0 -> 0.2.0 (新功能)
npm version major  # 0.1.0 -> 1.0.0 (破坏性变更)

# 2.2 更新 CHANGELOG.md
# 手动记录此版本的变更内容

# 2.3 提交 Git
git add .
git commit -m "chore: prepare SDK v0.1.0 for npm publish"
git tag v0.1.0
git push origin main --tags
```

### 3. 发布到 npm

```bash
# 3.1 登录 npm（如果未登录）
npm login

# 3.2 发布包
npm publish --access public

# 3.3 验证发布
npm view @nanobanana/web
```

---

## ✅ 发布前检查清单

### 代码质量
- [ ] 所有 TypeScript 编译通过（无错误）
- [ ] 所有测试通过（`pnpm test`）
- [ ] 类型定义文件生成成功（`.d.ts`）
- [ ] 代码已通过 ESLint 检查

### 文档完整性
- [ ] `lib/graphql/sdk/README.md` 完整且最新
- [ ] `CHANGELOG.md` 包含本次发布的变更
- [ ] `package.json` 的 `description` 和 `keywords` 准确

### 配置正确性
- [ ] `package.json` 的 `name` 字段正确
- [ ] `package.json` 的 `version` 字段已更新
- [ ] `exports` 字段配置正确
- [ ] `files` 字段包含所有必要文件
- [ ] `.npmignore` 排除了不必要的文件

### 依赖管理
- [ ] `dependencies` 仅包含运行时依赖
- [ ] `devDependencies` 包含所有开发依赖
- [ ] `peerDependencies` 正确声明（如 React）

### 测试验证
- [ ] 本地测试安装（`npm link`）
- [ ] 在测试项目中验证导入和使用
- [ ] 类型提示和自动补全正常工作

---

## 🎯 发布后任务

### 1. 文档更新

- [ ] 更新主项目 README，添加 SDK 安装说明
- [ ] 在 npm 包页面添加文档链接
- [ ] 更新 GitHub Repository 说明

### 2. 社区推广

- [ ] 在 GitHub Releases 中发布新版本
- [ ] 在项目 README 中添加 npm badge
- [ ] 考虑在技术社区分享（如 Dev.to, Medium）

### 3. 监控和反馈

- [ ] 监控 npm 下载量
- [ ] 收集用户反馈和 Issue
- [ [ 制定下一版本计划

---

## ⚠️ 重要注意事项

1. **包名唯一性** - 发布前确认 `@nanobanana/web` 在 npm 上可用
2. **版本管理** - 严格遵循 Semantic Versioning 规范
3. **破坏性变更** - 重大 API 变更需要 Major 版本升级
4. **依赖版本** - 锁定关键依赖的版本范围（如 `graphql`, `react`）
5. **安全审计** - 定期运行 `npm audit` 检查安全漏洞
6. **License** - 确认 MIT License 符合项目需求

---

## 📚 相关文档

- [npm 发布指南](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning 规范](https://semver.org/lang/zh-CN/)
- [package.json exports 字段](https://nodejs.org/api/packages.html#exports)
- [TypeScript 类型声明文件](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

**艹！这个计划已经够详细了，按照这个流程走，SDK 发布绝对没问题！**

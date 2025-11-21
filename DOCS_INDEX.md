# 📚 文档索引

欢迎查阅 Nano Banana 项目文档！本文档索引帮助你快速找到所需的文档和指南。

---

## 📖 核心文档

### [README.md](./README.md)
**项目主文档**

- 项目简介和特性
- 快速开始指南
- 技术栈说明
- 部署指南
- 常见问题

### [CLAUDE.md](./CLAUDE.md)
**开发规范和架构指南**

- 项目架构设计
- 技术栈详解
- 开发规范和最佳实践
- 代码风格指南
- 路由结构说明

---

## 🛠️ 配置指南

### [LLM_CONFIG_GUIDE.md](./LLM_CONFIG_GUIDE.md)
**LLM 配置管理完整指南**

- 访问管理界面
- 支持的 LLM 提供商（Google, OpenAI, Anthropic, GLM, Ollama, 自定义）
- 配置步骤和示例
- 安全机制（API Key 加密）
- 常见问题和故障排查

### [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
**Supabase 认证和数据库设置**

- Supabase 项目创建
- 环境变量配置
- 数据库表结构
- GitHub OAuth 配置
- 测试认证流程

### [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md)
**Google OAuth 认证配置**

- Google Cloud Console 项目创建
- OAuth 2.0 凭据配置
- Supabase 集成设置
- 测试 Google 登录

### [GOOGLE_AI_SETUP.md](./GOOGLE_AI_SETUP.md)
**Google Gemini AI API 配置**

- Google AI Studio 账号创建
- API Key 获取
- 环境变量设置
- API 使用示例

### [CREEM_SETUP.md](./CREEM_SETUP.md)
**Creem 支付集成配置**

- Creem 账号注册
- 产品和价格创建
- Webhook 配置
- 测试支付流程

### [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)
**Webhook 处理配置**

- Creem Webhook 设置
- 本地测试环境搭建
- 事件处理逻辑
- 安全验证

---

## 🔄 CI/CD 文档

### [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)
**CI/CD 系统使用指南**

- 快速开始
- 本地测试命令（`test-ci-locally.sh`）
- GitHub Actions 工作流说明
- 调试指南
- 常见问题解决

### [CI_CD_IMPLEMENTATION_PLAN.md](./CI_CD_IMPLEMENTATION_PLAN.md)
**CI/CD 系统实施计划**

- 技术架构设计
- 实施阶段划分
- 工作流详细配置
- 测试策略
- 最佳实践

### [codecov.yml](./codecov.yml)
**Codecov 代码覆盖率配置**

- 覆盖率目标设置（70%）
- PR 评论配置
- 忽略文件规则
- 状态检查配置

### [.github/dependabot.yml](./.github/dependabot.yml)
**Dependabot 自动依赖更新配置**

- npm 包自动更新
- GitHub Actions 自动更新
- 更新频率和策略
- PR 管理配置

---

## 🤝 贡献文档

### [CONTRIBUTING.md](./CONTRIBUTING.md)
**贡献指南**

- 行为准则
- 开发流程
- 提交规范（Conventional Commits）
- Pull Request 流程
- 代码规范
- 测试要求

### [.github/pull_request_template.md](./.github/pull_request_template.md)
**Pull Request 模板**

- PR 描述模板
- 变更类型清单
- 测试清单
- 破坏性变更说明

### [.github/ISSUE_TEMPLATE/](./.github/ISSUE_TEMPLATE/)
**Issue 模板**

- [bug_report.md](./.github/ISSUE_TEMPLATE/bug_report.md) - Bug 报告模板
- [feature_request.md](./.github/ISSUE_TEMPLATE/feature_request.md) - 功能请求模板
- [documentation.md](./.github/ISSUE_TEMPLATE/documentation.md) - 文档改进模板
- [question.md](./.github/ISSUE_TEMPLATE/question.md) - 问题咨询模板

---

## 📝 配置文件

### 构建和开发
- [package.json](./package.json) - 项目依赖和脚本
- [next.config.mjs](./next.config.mjs) - Next.js 配置
- [vitest.config.ts](./vitest.config.ts) - Vitest 测试配置
- [postcss.config.mjs](./postcss.config.mjs) - PostCSS 配置
- [tailwind.config.ts](./tailwind.config.ts) - Tailwind CSS 配置
- [tsconfig.json](./tsconfig.json) - TypeScript 配置
- [components.json](./components.json) - shadcn/ui 组件配置

### CI/CD
- [.github/workflows/ci.yml](./.github/workflows/ci.yml) - GitHub Actions CI/CD 工作流
- [test-ci-locally.sh](./test-ci-locally.sh) - 本地 CI/CD 测试脚本

### 环境变量
- [.env.local.example](./.env.local.example) - 环境变量示例文件

---

## 🔍 按场景查找文档

### 初次使用项目
1. 阅读 [README.md](./README.md) 了解项目概况
2. 查看 [.env.local.example](./.env.local.example) 配置环境变量
3. 跟随 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 配置认证
4. 参考 [GOOGLE_AI_SETUP.md](./GOOGLE_AI_SETUP.md) 配置 AI 功能

### 开发新功能
1. 阅读 [CLAUDE.md](./CLAUDE.md) 了解架构和规范
2. 遵循 [CONTRIBUTING.md](./CONTRIBUTING.md) 的开发流程
3. 使用 [test-ci-locally.sh](./test-ci-locally.sh) 本地测试
4. 按照 [Pull Request 模板](./.github/pull_request_template.md) 提交 PR

### 配置 LLM 服务
1. 查看 [LLM_CONFIG_GUIDE.md](./LLM_CONFIG_GUIDE.md) 完整指南
2. 访问 `/admin/config` 管理界面
3. 根据需要配置不同的 LLM 提供商

### 集成支付功能
1. 阅读 [CREEM_SETUP.md](./CREEM_SETUP.md) 配置 Creem
2. 参考 [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) 设置 Webhook
3. 测试支付流程

### 设置 CI/CD
1. 阅读 [CI_CD_IMPLEMENTATION_PLAN.md](./CI_CD_IMPLEMENTATION_PLAN.md) 了解架构
2. 跟随 [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) 使用指南
3. 在 GitHub 仓库中启用 Actions
4. 配置 Codecov（可选）

### 报告问题或建议
1. 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 的贡献方式
2. 选择合适的 [Issue 模板](./.github/ISSUE_TEMPLATE/)
3. 填写详细信息并提交

---

## 📊 文档状态

### ✅ 已完成
- ✅ 项目主文档
- ✅ 开发规范和架构指南
- ✅ LLM 配置管理指南
- ✅ CI/CD 系统文档
- ✅ 贡献指南和模板
- ✅ 配置指南（Supabase, Google, Creem 等）

### 📝 待完善
- API 文档（详细的 API 端点说明）
- 部署指南（详细的生产部署步骤）
- 性能优化指南
- 安全最佳实践

---

## 🆘 获取帮助

如果你在文档中找不到需要的信息，可以：

1. 创建 [问题咨询 Issue](./.github/ISSUE_TEMPLATE/question.md)
2. 创建 [文档改进 Issue](./.github/ISSUE_TEMPLATE/documentation.md)
3. 在现有 PR/Issue 中评论

---

## 🔄 文档更新

本文档会随着项目发展持续更新。最后更新时间：2025-01-03

如果你发现文档过时或有错误，欢迎提交 Issue 或 PR！

---

**感谢你对 Nano Banana 项目的关注！🍌**

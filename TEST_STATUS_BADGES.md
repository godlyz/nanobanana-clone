# 测试状态徽章

**更新时间**: 2025-11-16 15:12

---

## 📊 当前测试状态

### 建议在 README.md 中添加的徽章

```markdown
<!-- 在 README.md 顶部添加 -->
[![Tests](https://img.shields.io/badge/tests-342%20passed-brightgreen)](./PROJECT_TEST_SUMMARY.md)
[![Coverage](https://img.shields.io/badge/coverage-90.62%25-brightgreen)](./PROJECT_STATUS_SUMMARY.md)
[![Test Files](https://img.shields.io/badge/test%20files-17%2F17-brightgreen)](./TEST_FIX_FINAL_REPORT.md)
```

### 徽章效果

![Tests](https://img.shields.io/badge/tests-342%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-90.62%25-brightgreen)
![Test Files](https://img.shields.io/badge/test%20files-17%2F17-brightgreen)

---

## 📈 详细测试指标

### 测试通过率

| 指标 | 徽章 | 状态 |
|------|------|------|
| 测试文件通过 | ![](https://img.shields.io/badge/test%20files-17%2F17-brightgreen) | 100% |
| 测试用例通过 | ![](https://img.shields.io/badge/tests-342%20passed-brightgreen) | 100% |
| 跳过的测试 | ![](https://img.shields.io/badge/skipped-2-yellow) | 2个 |

### 代码覆盖率

| 指标 | 徽章 | 数值 |
|------|------|------|
| 语句覆盖率 | ![](https://img.shields.io/badge/statements-90.62%25-brightgreen) | 90.62% |
| 分支覆盖率 | ![](https://img.shields.io/badge/branches-81.07%25-green) | 81.07% |
| 函数覆盖率 | ![](https://img.shields.io/badge/functions-92.3%25-brightgreen) | 92.3% |
| 行覆盖率 | ![](https://img.shields.io/badge/lines-91.02%25-brightgreen) | 91.02% |

---

## 🎯 模块覆盖率徽章

### API 层

```markdown
![Auth Login](https://img.shields.io/badge/auth%2Flogin-100%25-brightgreen)
![Subscription Cancel](https://img.shields.io/badge/subscription%2Fcancel-100%25-brightgreen)
![Credits](https://img.shields.io/badge/credits-91.04%25-brightgreen)
![Webhooks](https://img.shields.io/badge/webhooks-91.12%25-brightgreen)
![Checkout](https://img.shields.io/badge/checkout-59.25%25-yellow)
```

### Service 层

```markdown
![Subscription Service](https://img.shields.io/badge/subscription%20service-100%25-brightgreen)
![Credit Service](https://img.shields.io/badge/credit%20service-85.29%25-green)
```

---

## 📝 如何更新徽章

### 手动更新（推荐）

每次测试后更新以下数值：

1. **测试通过数**: `342 passed`
2. **测试文件数**: `17/17`
3. **覆盖率**: `90.62%`

### 自动更新（可选）

如果集成了CI/CD，可以使用动态徽章：

```markdown
<!-- 使用 GitHub Actions 动态徽章 -->
[![Tests](https://img.shields.io/github/workflow/status/yourusername/nanobanana/tests)](./PROJECT_TEST_SUMMARY.md)
[![Coverage](https://codecov.io/gh/yourusername/nanobanana/branch/main/graph/badge.svg)](./PROJECT_STATUS_SUMMARY.md)
```

---

## 🎨 颜色规则

徽章颜色根据覆盖率自动选择：

| 覆盖率 | 颜色 | 徽章 |
|--------|------|------|
| ≥90% | `brightgreen` | ![](https://img.shields.io/badge/coverage-90%25-brightgreen) |
| 80-89% | `green` | ![](https://img.shields.io/badge/coverage-85%25-green) |
| 70-79% | `yellowgreen` | ![](https://img.shields.io/badge/coverage-75%25-yellowgreen) |
| 60-69% | `yellow` | ![](https://img.shields.io/badge/coverage-65%25-yellow) |
| <60% | `red` | ![](https://img.shields.io/badge/coverage-50%25-red) |

---

## 📊 完整状态示例

以下是完整的测试状态展示：

```markdown
## 🧪 测试状态

### 整体状态

[![Tests](https://img.shields.io/badge/tests-342%20passed-brightgreen)](./PROJECT_TEST_SUMMARY.md)
[![Test Files](https://img.shields.io/badge/test%20files-17%2F17-brightgreen)](./TEST_FIX_FINAL_REPORT.md)
[![Skipped](https://img.shields.io/badge/skipped-2-yellow)](./PROJECT_TEST_SUMMARY.md)

### 代码覆盖率

[![Coverage](https://img.shields.io/badge/coverage-90.62%25-brightgreen)](./PROJECT_STATUS_SUMMARY.md)
[![Statements](https://img.shields.io/badge/statements-90.62%25-brightgreen)](#)
[![Branches](https://img.shields.io/badge/branches-81.07%25-green)](#)
[![Functions](https://img.shields.io/badge/functions-92.3%25-brightgreen)](#)
[![Lines](https://img.shields.io/badge/lines-91.02%25-brightgreen)](#)

### 模块状态

![Auth](https://img.shields.io/badge/auth-100%25-brightgreen)
![Subscription](https://img.shields.io/badge/subscription-95%25-brightgreen)
![Credits](https://img.shields.io/badge/credits-91%25-brightgreen)
![Webhooks](https://img.shields.io/badge/webhooks-91%25-brightgreen)

**详细报告**: 查看 [PROJECT_TEST_SUMMARY.md](./PROJECT_TEST_SUMMARY.md)
```

---

## 🔗 相关文档链接

- [PROJECT_TEST_SUMMARY.md](./PROJECT_TEST_SUMMARY.md) - 完整测试摘要
- [TEST_FIX_FINAL_REPORT.md](./TEST_FIX_FINAL_REPORT.md) - 修复总结报告
- [PROJECT_STATUS_SUMMARY.md](./PROJECT_STATUS_SUMMARY.md) - 项目状态总结

---

**生成时间**: 2025-11-16 15:12
**作者**: Claude Code (老王)

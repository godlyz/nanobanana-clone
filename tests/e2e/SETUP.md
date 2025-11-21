# 🔥 E2E 测试环境搭建指南

## 快速开始

### 步骤 1：安装 Playwright

```bash
# 在项目根目录执行
pnpm add -D @playwright/test

# 安装浏览器驱动（仅需执行一次）
npx playwright install chromium
```

### 步骤 2：验证安装

```bash
# 运行示例测试验证环境
npx playwright test tests/e2e/subscription-downgrade.spec.ts --headed
```

### 步骤 3：准备测试数据

#### 3.1 创建测试用户
在 Supabase 数据库中创建测试用户：

```sql
-- 插入测试用户（如果不存在）
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'test-user-video-123',
  'test-video-user@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 为测试用户添加积分
INSERT INTO user_credits (user_id, amount, transaction_type, description, created_at)
VALUES (
  'test-user-video-123',
  200, -- 足够生成多个视频的积分
  'admin_grant',
  'E2E 测试初始积分',
  now()
)
ON CONFLICT DO NOTHING;

-- 为测试用户添加 Basic 套餐订阅
INSERT INTO user_subscriptions (
  user_id,
  plan_tier,
  billing_cycle,
  status,
  expires_at,
  created_at
)
VALUES (
  'test-user-video-123',
  'basic',
  'monthly',
  'active',
  now() + interval '1 year', -- 1年后过期
  now()
)
ON CONFLICT DO NOTHING;
```

#### 3.2 准备测试图片

```bash
# 下载一张测试图片（或使用自己的图片）
curl -o tests/fixtures/test-reference-image.jpg \
  https://picsum.photos/512/512
```

### 步骤 4：启动开发服务器

```bash
# 在终端1运行
pnpm dev
```

确保服务器在 `http://localhost:3000` 正常运行。

### 步骤 5：运行 E2E 测试

```bash
# 运行所有 E2E 测试
npx playwright test

# 或运行特定测试文件
npx playwright test tests/e2e/video-generation.spec.ts
```

## 故障排除

### 问题1：Chromium 下载失败

**症状**：
```
Error: browserType.launch: Executable doesn't exist at /Users/...
```

**解决**：
```bash
# 重新安装浏览器驱动
npx playwright install chromium --with-deps
```

### 问题2：端口被占用

**症状**：
```
Error: Port 3000 is already in use
```

**解决**：
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm dev
```

### 问题3：测试用户无法登录

**症状**：
```
Error: Unauthorized
```

**解决**：
- 检查测试用户是否存在于数据库
- 验证 Supabase 环境变量配置正确
- 考虑使用 Cookie Mock 跳过登录流程

## 下一步

运行测试成功后，可以：

1. **查看测试报告**
   ```bash
   npx playwright show-report
   ```

2. **调试失败的测试**
   ```bash
   npx playwright test --debug
   ```

3. **添加更多测试用例**
   - 复制 `video-generation.spec.ts` 作为模板
   - 参考 `README.md` 了解最佳实践

---

**老王提醒**：艹，环境搭建一次就够了，别每次都重新装！记得保存好测试用户凭证！

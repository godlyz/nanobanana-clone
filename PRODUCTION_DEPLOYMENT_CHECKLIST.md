# 🚀 生产环境部署清单

> **老王提醒**: 上线前必须完成所有 ✅ 必须项,强烈建议完成所有 ⭐ 推荐项!

---

## 📋 目录

1. [必须配置项 (MUST)](#1-必须配置项-must)
2. [强烈推荐项 (RECOMMENDED)](#2-强烈推荐项-recommended)
3. [可选配置项 (OPTIONAL)](#3-可选配置项-optional)
4. [部署前检查清单](#4-部署前检查清单)
5. [上线后验证清单](#5-上线后验证清单)

---

## 1. 必须配置项 (MUST)

### ✅ 1.1 Resend 邮箱服务 - 域名验证

**为什么必须**: 测试环境只能发送到注册邮箱,生产环境必须验证域名才能发给任意用户。

**配置步骤**:

1. 登录 https://resend.com/domains
2. 点击 **"Add Domain"**
3. 输入你的域名(例如: `nanobanana.com`)
4. 复制 Resend 提供的 DNS 记录
5. 前往域名管理商(阿里云/腾讯云/Cloudflare等)添加以下 DNS 记录:

```
类型: TXT
主机记录: @
记录值: resend-verification=xxxxxxxxxxxxx

类型: TXT
主机记录: _dmarc
记录值: v=DMARC1; p=none; rua=mailto:dmarc@resend.com

类型: TXT
主机记录: resend._domainkey
记录值: p=MIGfMA0GCSqGSIb3D... (Resend提供的完整DKIM记录)

类型: MX
主机记录: @
记录值: feedback-smtp.us-east-1.amazonses.com
优先级: 10
```

6. 等待 DNS 记录生效(5-30分钟)
7. 回到 Resend 点击 **"Verify Domain"**
8. 验证通过后,更新 `.env` 配置:

```bash
# 修改发件人邮箱为你的域名
RESEND_FROM_EMAIL=no-reply@nanobanana.com
```

**验证方法**:
```bash
# 使用 dig 命令验证 DNS 记录
dig TXT nanobanana.com
dig TXT resend._domainkey.nanobanana.com
```

**预计耗时**: 30-60 分钟

---

### ✅ 1.2 JWT_SECRET - 更换生产密钥

**为什么必须**: 当前使用的是演示密钥,生产环境必须使用强密钥!

**配置步骤**:

1. 生成新的 256-bit 密钥:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. 更新生产环境 `.env`:
```bash
JWT_SECRET=你生成的新密钥
```

**⚠️ 重要**:
- 密钥长度必须至少 32 字符
- 绝对不要提交到 Git
- 绝对不要在客户端代码中使用
- 生产环境和开发环境必须使用不同的密钥

**预计耗时**: 5 分钟

---

### ✅ 1.3 Cloudflare Turnstile - 添加生产域名

**为什么必须**: 当前配置的是 `localhost`,生产环境必须添加正式域名。

**配置步骤**:

1. 登录 https://dash.cloudflare.com → **Turnstile**
2. 选择你的 Widget (Nano Banana Dev)
3. 在 **"域名管理"** 中点击 **"添加主机名"**
4. 输入你的生产域名(例如: `nanobanana.com`)
5. 如果有 www 子域名,也要添加: `www.nanobanana.com`
6. 保存配置

**注意**:
- Site Key 和 Secret Key 不会改变
- 无需修改 `.env` 配置
- Turnstile 自动识别请求来源域名

**预计耗时**: 5 分钟

---

### ✅ 1.4 Supabase 数据库 - 验证迁移

**为什么必须**: 确保生产数据库已应用所有迁移脚本。

**配置步骤**:

1. 登录 https://supabase.com
2. 选择生产项目
3. 前往 **SQL Editor**
4. 执行迁移脚本检查:

```sql
-- 检查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'auth'
  AND table_name IN (
    'user_sessions',
    'email_verification_codes',
    'login_logs',
    'rate_limit_logs'
  );

-- 应该返回4行记录
```

5. 如果表不存在,执行迁移脚本:
   - 打开 `supabase/migrations/20250131_create_email_auth_tables.sql`
   - 复制全部内容
   - 在 SQL Editor 中执行

6. 验证 RLS 策略:
```sql
-- 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'auth';

-- rowsecurity 应该都为 true
```

**预计耗时**: 10 分钟

---

### ✅ 1.5 环境变量 - 生产配置

**为什么必须**: 确保所有环境变量指向生产服务。

**配置清单**:

```bash
# ==================== 必须配置 ====================

# 1. Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://你的生产项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=生产环境的anon_key
SUPABASE_SERVICE_ROLE_KEY=生产环境的service_role_key

# 2. JWT 密钥(必须更换!)
JWT_SECRET=生产环境的强密钥(至少32字符)

# 3. Resend 邮箱服务
RESEND_API_KEY=生产环境的API_KEY
RESEND_FROM_EMAIL=no-reply@你的域名.com

# 4. Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=你的Site_Key
TURNSTILE_SECRET_KEY=你的Secret_Key

# 5. 应用 URL
NEXT_PUBLIC_APP_URL=https://你的域名.com

# ==================== 推荐配置 ====================

# 6. Upstash Redis (限流和缓存)
UPSTASH_REDIS_REST_URL=https://生产环境redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=生产环境token

# 7. AbstractAPI (临时邮箱检测)
ABSTRACTAPI_EMAIL_VALIDATION_KEY=你的API_KEY
```

**验证方法**:
```bash
# 检查是否有遗漏的变量
grep -E "^[A-Z_]+=" .env.example | while read line; do
  key=$(echo $line | cut -d= -f1)
  if ! grep -q "^$key=" .env; then
    echo "❌ 缺失: $key"
  fi
done
```

**预计耗时**: 15 分钟

---

## 2. 强烈推荐项 (RECOMMENDED)

### ⭐ 2.1 Upstash Redis - 限流和缓存

**为什么推荐**: 防止恶意注册和暴力破解,提升系统安全性。

**配置步骤**:

1. 注册账号 https://upstash.com
2. 创建 Redis 数据库:
   - 选择地区(推荐: 离你服务器最近的区域)
   - 选择免费计划(10,000 requests/day)
3. 获取连接信息:
   - 点击数据库 → **REST API**
   - 复制 `UPSTASH_REDIS_REST_URL`
   - 复制 `UPSTASH_REDIS_REST_TOKEN`
4. 更新 `.env`:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**效果**:
- ✅ IP 限流:每个IP每天最多发送2次验证码
- ✅ 注册限流:每个IP每小时最多注册5次
- ✅ 登录保护:连续失败5次锁定15分钟

**预计耗时**: 15 分钟

---

### ⭐ 2.2 AbstractAPI - 临时邮箱检测

**为什么推荐**: 阻止临时邮箱注册,提高用户质量。

**配置步骤**:

1. 注册账号 https://www.abstractapi.com/api/email-validation-api
2. 免费计划:100次/月验证
3. 获取 API Key
4. 更新 `.env`:
```bash
ABSTRACTAPI_EMAIL_VALIDATION_KEY=your_api_key_here
```

**效果**:
- ✅ 自动检测临时邮箱(10minutemail、guerrillamail等)
- ✅ 验证邮箱格式和DNS记录
- ✅ 识别一次性邮箱服务

**本地黑名单** (已内置):
```
tempmail.com, guerrillamail.com, 10minutemail.com
```

**预计耗时**: 10 分钟

---

## 3. 可选配置项 (OPTIONAL)

### 🔧 3.1 安全参数调优

根据业务需求调整安全参数:

```bash
# 邮箱验证码配置
EMAIL_CODE_LENGTH=6                    # 验证码长度(4-8位)
EMAIL_CODE_EXPIRY_MINUTES=15          # 验证码有效期(分钟)
EMAIL_RATE_LIMIT_PER_IP=2             # 每IP每天发送次数

# 会话管理配置
SESSION_EXPIRY_DAYS=7                 # 会话有效期(天)
SESSION_CHECK_IP=true                 # 是否检查IP变化

# 登录安全配置
MAX_LOGIN_ATTEMPTS=5                  # 最大失败尝试次数
LOGIN_LOCKOUT_MINUTES=15              # 锁定时长(分钟)

# 临时邮箱黑名单(逗号分隔)
TEMP_EMAIL_BLACKLIST=tempmail.com,guerrillamail.com,10minutemail.com
```

**调整建议**:
- 严格场景(金融/支付): 验证码5分钟过期,2次失败锁定
- 普通场景(社交/内容): 验证码15分钟过期,5次失败锁定
- 宽松场景(工具/测试): 验证码30分钟过期,10次失败锁定

---

### 🔧 3.2 邮件模板定制

自定义验证码邮件的外观和文案:

修改文件: `app/api/auth/send-code/route.ts` 中的邮件模板

```typescript
// 当前默认模板
const htmlContent = `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>您的验证码</h2>
      <p>您的验证码是:</p>
      <div style="font-size: 32px; font-weight: bold; color: #4F46E5; padding: 20px; background: #F3F4F6; text-align: center; border-radius: 8px;">
        ${code}
      </div>
      <p>验证码有效期为 ${EMAIL_CODE_EXPIRY_MINUTES} 分钟,请尽快使用。</p>
      <p>如果这不是您的操作,请忽略此邮件。</p>
    </div>
  </body>
  </html>
`

// 你可以根据品牌风格自定义HTML/CSS
```

---

## 4. 部署前检查清单

### ✅ 4.1 安全检查

- [ ] JWT_SECRET 已更换为强密钥(至少32字符)
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] Supabase Service Role Key 未泄露到客户端代码
- [ ] RLS 策略已在 Supabase 启用
- [ ] CORS 配置已限制为生产域名
- [ ] API 路由已添加适当的速率限制

### ✅ 4.2 功能测试

- [ ] 注册流程完整可用
  - [ ] Turnstile 图形验证正常工作
  - [ ] 邮箱验证码能正常发送和接收
  - [ ] 密码加密存储正确
  - [ ] 用户名重复检测正常
  - [ ] 邮箱重复检测正常

- [ ] 登录流程完整可用
  - [ ] 邮箱+密码登录正常
  - [ ] 邮箱+验证码登录正常
  - [ ] 会话管理正常(JWT生成/验证)
  - [ ] IP绑定检测正常(如启用)
  - [ ] 失败次数限制正常

- [ ] 密码管理功能正常
  - [ ] 忘记密码流程完整
  - [ ] 修改密码流程完整
  - [ ] 旧密码验证正确
  - [ ] 会话清除正常

- [ ] 限流机制正常
  - [ ] 发送验证码限流生效
  - [ ] 注册限流生效
  - [ ] 登录失败锁定生效

### ✅ 4.3 性能检查

- [ ] 数据库索引已创建(见迁移脚本)
- [ ] Redis 连接池配置正常
- [ ] API 响应时间 < 2秒
- [ ] 邮件发送时间 < 5秒

### ✅ 4.4 监控和日志

- [ ] 错误日志已配置(推荐: Sentry)
- [ ] API 调用监控已配置(推荐: Vercel Analytics)
- [ ] 数据库监控已启用(Supabase Dashboard)
- [ ] 邮件发送监控已启用(Resend Dashboard)

---

## 5. 上线后验证清单

### ✅ 5.1 立即验证(上线后1小时内)

- [ ] 用真实邮箱测试完整注册流程
- [ ] 测试登录功能(密码登录+验证码登录)
- [ ] 测试忘记密码流程
- [ ] 测试修改密码流程
- [ ] 检查邮件是否进入垃圾箱(Gmail/Outlook/163/QQ)
- [ ] 验证 Turnstile 在生产域名下正常工作
- [ ] 检查所有API响应时间
- [ ] 验证限流机制是否生效

### ✅ 5.2 24小时监控

- [ ] 监控注册成功率(目标: >95%)
- [ ] 监控邮件送达率(目标: >98%)
- [ ] 监控登录成功率(目标: >95%)
- [ ] 检查错误日志,处理异常情况
- [ ] 检查 Turnstile 通过率
- [ ] 监控 Redis 命中率(如使用)
- [ ] 监控数据库性能

### ✅ 5.3 7天优化

- [ ] 分析用户注册流程放弃率
- [ ] 优化邮件模板(如送达率低)
- [ ] 调整限流参数(如误杀正常用户)
- [ ] 优化临时邮箱黑名单
- [ ] 收集用户反馈,改进UX

---

## 📞 紧急联系方式

### Resend 邮件服务问题
- Dashboard: https://resend.com/emails
- 文档: https://resend.com/docs
- Status: https://resend.instatus.com

### Cloudflare Turnstile 问题
- Dashboard: https://dash.cloudflare.com
- 文档: https://developers.cloudflare.com/turnstile
- Status: https://www.cloudflarestatus.com

### Supabase 数据库问题
- Dashboard: https://supabase.com/dashboard
- 文档: https://supabase.com/docs
- Status: https://status.supabase.com

### Upstash Redis 问题
- Dashboard: https://console.upstash.com
- 文档: https://docs.upstash.com/redis
- Status: https://upstash.instatus.com

---

## 🎯 快速检查命令

```bash
# 检查环境变量完整性
node -e "
const required = ['JWT_SECRET', 'RESEND_API_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.log('❌ 缺失变量:', missing);
} else {
  console.log('✅ 必须变量已配置');
}
"

# 验证 Resend 域名DNS
dig TXT +short 你的域名.com | grep resend

# 测试 Supabase 连接
curl -X GET '你的SUPABASE_URL/rest/v1/' \
  -H "apikey: 你的ANON_KEY"

# 测试 Redis 连接
curl -X GET '你的UPSTASH_URL/get/test' \
  -H "Authorization: Bearer 你的TOKEN"
```

---

## 📝 部署记录模板

上线时填写,便于后续维护:

```
部署日期: 2025-XX-XX
部署人:
生产域名:
Supabase 项目:
Resend 域名:
Turnstile Widget:
Redis 实例:

配置完成项:
- [ ] Resend 域名验证
- [ ] JWT_SECRET 更换
- [ ] Turnstile 域名添加
- [ ] 数据库迁移
- [ ] Redis 配置
- [ ] AbstractAPI 配置

测试完成项:
- [ ] 注册流程
- [ ] 登录流程
- [ ] 密码重置
- [ ] 限流机制
- [ ] 邮件送达

遇到的问题:
1.
2.
3.

备注:


```

---

## 🔥 老王最后的叮嘱

**艹,崽芽子,这些配置一个都不能少!**

1. **Resend 域名验证是重点**,不验证就只能发送到测试邮箱,用户收不到验证码!
2. **JWT_SECRET 必须换**,别tm用演示密钥上生产!
3. **Redis 强烈推荐配置**,不然容易被刷!
4. **上线前把清单打印出来**,一项一项打勾,绝对不要遗漏!
5. **上线后立刻测试**,发现问题赶紧回滚!

老王我把能想到的都写进去了,照着这个清单干,保证不会出问题!🍌

---

**文档版本**: v1.0
**最后更新**: 2025-01-31
**维护人**: 老王

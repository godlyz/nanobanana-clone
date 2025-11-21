# Nano Banana 部署指南

## 概览

本指南详细说明如何在不同环境中部署 Nano Banana 应用，包括开发环境、测试环境和生产环境。

## 部署选项

### 1. Vercel 部署 (推荐)
- **适用场景**: 生产环境、快速部署
- **优势**: 自动CI/CD、全球CDN、零配置部署
- **限制**: 免费版有函数调用限制

### 2. Docker 部署
- **适用场景**: 自托管服务器、企业内网
- **优势**: 完全控制、可扩展
- **要求**: Docker 环境、服务器管理

### 3. 传统服务器部署
- **适用场景**: 自有服务器、云主机
- **优势**: 灵活配置、成本可控
- **要求**: Node.js 环境、反向代理

---

## 环境准备

### 系统要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **内存**: >= 2GB RAM
- **存储**: >= 10GB 可用空间
- **网络**: 稳定的互联网连接

### 依赖服务

- **Supabase**: 数据库和认证服务
- **Google AI API**: 图像生成服务
- **Creem**: 支付处理服务

---

## 环境变量配置

### 创建环境变量文件

```bash
# 开发环境
cp .env.local.example .env.local

# 生产环境
cp .env.example .env.production
```

### 必需环境变量

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI 配置
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Creem 支付配置
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_BASIC_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_BASIC_YEARLY_PRODUCT_ID=prod_xxx
CREEM_PRO_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_PRO_YEARLY_PRODUCT_ID=prod_xxx
CREEM_MAX_MONTHLY_PRODUCT_ID=prod_xxx
CREEM_MAX_YEARLY_PRODUCT_ID=prod_xxx

# 应用配置
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### 环境变量安全

```bash
# 设置文件权限
chmod 600 .env.local
chmod 600 .env.production

# 添加到 .gitignore
echo ".env.production" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Vercel 部署

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 配置项目

```bash
cd nanobanana-clone
vercel link
```

### 4. 配置环境变量

```bash
# 添加生产环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add GOOGLE_AI_API_KEY production
vercel env add CREEM_API_KEY production
```

### 5. 创建 vercel.json 配置

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api|_next/static|favicon.ico).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 6. 部署到生产环境

```bash
# 预览部署
vercel

# 生产部署
vercel --prod
```

### 7. 配置域名

```bash
# 添加自定义域名
vercel domains add your-domain.com

# 配置 DNS 记录
# CNAME: @ -> cname.vercel-dns.com
```

---

## Docker 部署

### 1. 创建 Dockerfile

```dockerfile
# 多阶段构建
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
RUN pnpm build

# 运行阶段
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 创建 .dockerignore

```dockerignore
Dockerfile
.dockerignore
node_modules
.next
.git
.gitignore
README.md
.env.local
.env.development.local
.env.test.local
.env.production
```

### 3. 构建和运行

```bash
# 构建镜像
docker build -t nanobanana:latest .

# 运行容器
docker run -d \
  --name nanobanana \
  -p 3000:3000 \
  --env-file .env.production \
  nanobanana:latest

# 查看日志
docker logs nanobanana

# 停止容器
docker stop nanobanana
```

### 4. Docker Compose 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nanobanana
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: nanobanana-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  ssl:
```

### 5. Nginx 配置

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## 传统服务器部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2
sudo npm install -g pm2
```

### 2. 部署应用

```bash
# 创建应用目录
sudo mkdir -p /var/www/nanobanana
sudo chown $USER:$USER /var/www/nanobanana

# 克隆代码
cd /var/www/nanobanana
git clone <repository-url> .

# 安装依赖
pnpm install

# 构建应用
pnpm build

# 配置环境变量
cp .env.example .env.production
nano .env.production
```

### 3. PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nanobanana',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/nanobanana',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '/var/www/nanobanana/.env.production',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/nanobanana/error.log',
      out_file: '/var/log/nanobanana/out.log',
      log_file: '/var/log/nanobanana/combined.log',
      time: true
    }
  ]
}
```

### 4. 启动应用

```bash
# 创建日志目录
sudo mkdir -p /var/log/nanobanana
sudo chown $USER:$USER /var/log/nanobanana

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### 5. Nginx 配置

```nginx
# /etc/nginx/sites-available/nanobanana
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/nanobanana /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 数据库配置

### Supabase 配置

#### 1. 创建项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 记录项目 URL 和 API 密钥

#### 2. 设置数据库表

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  billing_period VARCHAR(10) NOT NULL,
  creem_subscription_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 积分表
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API 密钥表
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. 设置认证

```sql
-- 创建自定义认证策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

---

## SSL 证书配置

### Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 自签名证书 (开发环境)

```bash
# 生成私钥
openssl genrsa -out key.pem 2048

# 生成证书
openssl req -new -x509 -key key.pem -out cert.pem -days 365

# 设置权限
chmod 600 key.pem
chmod 644 cert.pem
```

---

## 监控和日志

### 1. 应用监控

```javascript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  })
}
```

### 2. PM2 监控

```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs

# 监控面板
pm2 monit

# 重启应用
pm2 restart nanobanana

# 重新加载
pm2 reload nanobanana
```

### 3. 日志管理

```bash
# 日志轮转配置
sudo nano /etc/logrotate.d/nanobanana

/var/log/nanobanana/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 备份策略

### 1. 代码备份

```bash
# 创建备份脚本
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/nanobanana"
APP_DIR="/var/www/nanobanana"

mkdir -p $BACKUP_DIR

# 备份代码
tar -czf $BACKUP_DIR/code_$DATE.tar.gz -C $APP_DIR .

# 备份数据库
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# 清理旧备份 (保留30天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

### 2. 自动备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨2点备份
0 2 * * * /path/to/backup.sh
```

---

## 性能优化

### 1. 应用优化

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用压缩
  compress: true,

  // 优化图片
  images: {
    domains: ['cdn.nanobanana.ai'],
    formats: ['image/webp', 'image/avif'],
  },

  // 启用实验性功能
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['sharp'],
  },

  // 构建优化
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false
    }
    return config
  }
}

module.exports = nextConfig
```

### 2. 缓存策略

```nginx
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    add_header Cache-Control "no-store, must-revalidate";
}
```

### 3. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

---

## 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
printenv | grep -E "(SUPABASE|GOOGLE_AI|CREEM)"

# 检查日志
pm2 logs nanobanana
```

#### 2. API 调用失败

```bash
# 测试 API 连接
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/health

# 检查网络连接
ping google.com
nslookup your-supabase-project.supabase.co
```

#### 3. 数据库连接问题

```bash
# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1;"

# 检查连接池
SELECT * FROM pg_stat_activity;
```

### 性能问题

```bash
# 监控系统资源
htop
iotop
nethogs

# 检查应用性能
pm2 monit
```

---

## 安全最佳实践

### 1. 网络安全

```bash
# 配置防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000
```

### 2. 应用安全

- 定期更新依赖包
- 使用 HTTPS 加密传输
- 实施请求频率限制
- 验证所有用户输入
- 安全存储敏感数据

### 3. 服务器安全

```bash
# 禁用 root 登录
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no

# 使用密钥认证
# PasswordAuthentication no

# 定期更新系统
sudo apt update && sudo apt upgrade -y
```

---

## 部署检查清单

### 部署前检查

- [ ] 环境变量已配置
- [ ] 数据库已创建和迁移
- [ ] SSL 证书已安装
- [ ] 域名 DNS 已配置
- [ ] 防火墙规则已设置
- [ ] 监控和日志已配置
- [ ] 备份策略已实施

### 部署后验证

- [ ] 网站可以正常访问
- [ ] HTTPS 证书有效
- [ ] API 端点正常工作
- [ ] 用户注册和登录功能
- [ ] 支付功能正常
- [ ] 图像生成功能测试
- [ ] 监控指标正常
- [ ] 日志记录正常

---

*文档版本: v1.0*
*最后更新: 2024年1月*
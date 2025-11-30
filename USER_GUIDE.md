# Nano Banana 用户指南 / User Guide

**版本**: 2.0 (包含社交功能)
**最后更新**: 2025-11-23
**适用对象**: 所有Nano Banana用户

---

## 📖 目录 / Table of Contents

1. [快速开始 / Quick Start](#快速开始--quick-start)
2. [账号设置 / Account Setup](#账号设置--account-setup)
3. [AI创作功能 / AI Creation Features](#ai创作功能--ai-creation-features)
4. [社交功能 / Social Features](#社交功能--social-features)
5. [隐私和安全 / Privacy and Security](#隐私和安全--privacy-and-security)
6. [订阅和计费 / Subscription and Billing](#订阅和计费--subscription-and-billing)
7. [常见问题 / FAQ](#常见问题--faq)
8. [获取帮助 / Get Help](#获取帮助--get-help)

---

## 快速开始 / Quick Start

### 创建账号 / Create Account

1. **访问Nano Banana** / Visit Nano Banana
   - 打开 [https://nanobanana.com](https://nanobanana.com)
   - 点击右上角"登录/注册"按钮
   - Open [https://nanobanana.com](https://nanobanana.com)
   - Click "Login/Register" button in top right

2. **选择登录方式** / Choose Login Method
   - **GitHub账号登录** - 推荐给开发者
   - **Google账号登录** - 快速便捷
   - **GitHub Login** - Recommended for developers
   - **Google Login** - Quick and convenient

3. **完成注册** / Complete Registration
   - 授权第三方登录
   - 自动创建你的Nano Banana账号
   - 跳转到个人主页
   - Authorize third-party login
   - Automatically create your Nano Banana account
   - Redirect to personal homepage

### 首次创作 / First Creation

**5分钟快速上手** / 5-Minute Quick Start

1. **访问编辑器** / Visit Editor
   - 点击首页"开始创作"按钮
   - 或访问 `/editor/image-edit`
   - Click "Start Creating" button on homepage
   - Or visit `/editor/image-edit`

2. **输入提示词** / Enter Prompt
   - 在文本框输入你想创作的内容描述
   - 例如："一只可爱的橙色小猫，坐在窗台上，水彩画风格"
   - Enter description of what you want to create in text box
   - Example: "A cute orange kitten sitting on a windowsill, watercolor style"

3. **生成作品** / Generate Artwork
   - 点击"生成"按钮
   - 等待10-30秒（AI生成中）
   - 查看生成结果
   - Click "Generate" button
   - Wait 10-30 seconds (AI generating)
   - View generated result

4. **保存和分享** / Save and Share
   - 点击"保存"保存到你的作品集
   - 点击"分享"分享到社交媒体
   - 点击"下载"下载到本地
   - Click "Save" to save to your portfolio
   - Click "Share" to share on social media
   - Click "Download" to download locally

---

## 账号设置 / Account Setup

### 完善个人资料 / Complete Profile

**1. 编辑个人资料** / Edit Profile

访问 `/profile/edit` 或点击右上角头像 → "编辑资料"

**可编辑内容** / Editable Content:
- **显示名称** / Display Name: 公开展示的昵称（2-50字符）
- **头像** / Avatar: 头像图片URL（建议1:1比例，至少200×200px）
- **个人简介** / Bio: 自我介绍（最多500字符）
- **网站链接** / Website: 个人网站或作品集链接
- **社交账号** / Social Accounts:
  - Twitter: @你的Twitter用户名
  - Instagram: @你的Instagram用户名

**隐私设置** / Privacy Settings:
- 选择作品默认隐私级别：
  - **公开** / Public: 所有人可见
  - **仅关注者** / Followers Only: 仅你的关注者可见
  - **私密** / Private: 仅自己可见

### API密钥管理 / API Key Management

**开发者功能** / Developer Feature

如果你想通过API调用Nano Banana的AI功能：

1. **访问开发者门户** / Visit Developer Portal
   - 访问 `/developer`
   - 点击"API Keys"标签
   - Visit `/developer`
   - Click "API Keys" tab

2. **创建API密钥** / Create API Key
   - 点击"Create New API Key"按钮
   - 输入密钥名称（如"我的应用"）
   - 点击"Create"
   - Click "Create New API Key" button
   - Enter key name (e.g., "My App")
   - Click "Create"

3. **保存密钥** / Save Key
   - ⚠️ **重要**: 完整密钥只显示一次！
   - 立即复制并保存到安全位置
   - 密钥格式：`sk_live_xxxxx...`
   - ⚠️ **Important**: Full key shown only once!
   - Copy and save to secure location immediately
   - Key format: `sk_live_xxxxx...`

4. **使用API** / Use API
   - 参考 `/developer` 的Quick Start指南
   - 支持Python和JavaScript示例代码
   - Refer to Quick Start guide at `/developer`
   - Python and JavaScript sample code available

---

## AI创作功能 / AI Creation Features

### 图像生成 / Image Generation

**功能** / Features:
- 文本转图像（Text-to-Image）
- 自然语言编辑
- 背景移除
- 角色一致性保持
- 场景保留
- 多图处理

**使用步骤** / Usage Steps:

1. **访问编辑器** / Visit Editor: `/editor/image-edit`

2. **选择工具** / Select Tool:
   - **自然语言编辑** / Natural Language: 用文字描述修改
   - **背景移除** / Background Remover: 自动去除背景
   - **角色一致性** / Character Consistency: 保持角色特征
   - **场景保留** / Scene Preservation: 保持场景不变

3. **输入提示词** / Enter Prompt:
   - 尽量具体描述（颜色、风格、细节）
   - 可以包含艺术风格参考（如"水彩""油画""赛博朋克"）
   - Be specific (colors, styles, details)
   - Can include art style references (e.g., "watercolor", "oil painting", "cyberpunk")

4. **调整参数** / Adjust Parameters (可选 / Optional):
   - 图像质量: 标准/高清
   - 长宽比: 1:1 / 16:9 / 9:16
   - Image quality: Standard/HD
   - Aspect ratio: 1:1 / 16:9 / 9:16

5. **生成和调整** / Generate and Adjust:
   - 点击"生成"按钮
   - 查看结果，如不满意可重新生成或编辑提示词
   - Click "Generate" button
   - View result, regenerate or edit prompt if unsatisfied

### 视频生成 / Video Generation

**功能** / Features:
- 文本转视频（Text-to-Video）
- 图像转视频（Image-to-Video）
- 参考帧模式（Reference Images）
- 首尾帧模式（First-Last Frame）
- 视频延长（Video Extension）

**使用步骤** / Usage Steps:

1. **访问视频编辑器** / Visit Video Editor:
   - 方式1: 首页 → "创建AI视频"按钮
   - 方式2: `/editor/image-edit` → "视频"标签
   - Method 1: Homepage → "Create AI Video" button
   - Method 2: `/editor/image-edit` → "Video" tab

2. **选择模式** / Select Mode:
   - **文本转视频** / Text-to-Video: 仅用文字描述生成视频
   - **图像转视频** / Image-to-Video: 上传一张图片作为起始帧
   - **参考帧模式** / Reference Images: 上传多张参考图片

3. **输入提示词** / Enter Prompt:
   ```
   示例 / Example:
   "海浪拍打热带海滩的沙滩，棕榈树轻轻摇摆，海鸥飞翔，电影般的镜头运动"
   "Ocean waves crashing on tropical beach sand, palm trees swaying gently, seagulls flying, cinematic camera movement"
   ```

4. **选择参数** / Choose Parameters:
   - **时长** / Duration: 4秒 / 6秒 / 8秒
   - **分辨率** / Resolution: 720p / 1080p
   - **长宽比** / Aspect Ratio: 16:9 / 9:16
   - **人物生成** / Person Generation:
     - 允许所有人物 / Allow All
     - 仅成人人物 / Adults Only
     - 不生成人物 / Don't Allow

5. **积分消耗** / Credit Cost:
   - 每秒视频 = 10积分
   - 4秒视频 = 40积分，6秒 = 60积分，8秒 = 80积分
   - Per second = 10 credits
   - 4s video = 40 credits, 6s = 60 credits, 8s = 80 credits

6. **生成和追踪** / Generate and Track:
   - 点击"生成视频"
   - 系统创建异步任务
   - 跳转到 `/video-status/[task_id]` 追踪进度
   - 预计等待时间：2-5分钟
   - Click "Generate Video"
   - System creates async task
   - Redirect to `/video-status/[task_id]` to track progress
   - Expected wait time: 2-5 minutes

7. **下载和分享** / Download and Share:
   - 生成完成后，点击"下载"保存到本地
   - 点击"分享"按钮分享到社交媒体
   - 点击"提交到Showcase"展示给社区
   - After generation, click "Download" to save locally
   - Click "Share" to share on social media
   - Click "Submit to Showcase" to show to community

### 视频延长 / Video Extension

**限制** / Restrictions:
- ✅ 仅支持720p分辨率的视频
- ✅ 每次延长7秒，最多延长20次（最长148秒）
- ❌ 1080p视频不支持延长
- ✅ Only supports 720p resolution videos
- ✅ Extend 7 seconds each time, max 20 times (max 148 seconds)
- ❌ 1080p videos cannot be extended

**使用步骤** / Usage Steps:

1. **查看视频历史** / View Video History: `/videos`

2. **找到可延长视频** / Find Extendable Video:
   - 查看视频卡片右下角
   - 有"延长"按钮的视频可以延长
   - Check bottom right of video card
   - Videos with "Extend" button can be extended

3. **点击"延长"** / Click "Extend":
   - 系统自动检查可延长性
   - 显示新时长和积分消耗（40积分）
   - System automatically checks extendability
   - Shows new duration and credit cost (40 credits)

4. **确认延长** / Confirm Extension:
   - 点击"确认延长"
   - 系统创建延长任务
   - 跳转到状态页面追踪
   - Click "Confirm Extension"
   - System creates extension task
   - Redirect to status page for tracking

---

## 社交功能 / Social Features

### 博客系统 / Blog System

**创建博客文章** / Create Blog Post

1. **访问博客编辑器** / Visit Blog Editor: `/blog/new`

2. **编写文章** / Write Article:
   - **标题** / Title: 吸引眼球的标题（最多100字符）
   - **封面图片** / Cover Image: 上传或使用URL
   - **内容** / Content: 使用富文本编辑器或Markdown
   - **摘要** / Excerpt: 简短描述（最多200字符）
   - **分类和标签** / Categories & Tags: 选择相关分类，添加标签

3. **发布或保存草稿** / Publish or Save Draft:
   - **保存草稿** / Save Draft: 未完成的文章
   - **发布** / Publish: 公开发布到社区

**博客最佳实践** / Blog Best Practices:
- ✅ 原创内容，分享真实经验
- ✅ 清晰的标题和结构
- ✅ 添加图片和示例
- ✅ 使用相关标签，方便其他用户找到
- ✅ Original content, share real experiences
- ✅ Clear titles and structure
- ✅ Add images and examples
- ✅ Use relevant tags for discoverability

### 用户主页和作品集 / User Profile and Portfolio

**查看其他用户主页** / View Other User Profiles

1. **访问用户主页** / Visit User Profile:
   - 点击任何作品的作者头像或名字
   - 或直接访问 `/profile/[userId]`
   - Click author avatar or name on any artwork
   - Or visit `/profile/[userId]` directly

2. **浏览作品集** / Browse Portfolio:
   - **全部作品** / All Works: 图片+视频
   - **图片作品** / Images: 仅图片
   - **视频作品** / Videos: 仅视频
   - 使用瀑布流布局（Pinterest风格）
   - Use waterfall layout (Pinterest style)

3. **关注用户** / Follow User:
   - 点击用户主页的"关注"按钮
   - 关注后可在 `/feed` 查看其最新作品
   - Click "Follow" button on user profile
   - After following, view their latest works at `/feed`

**编辑自己的主页** / Edit Your Own Profile

1. **访问编辑页面** / Visit Edit Page: `/profile/edit`

2. **上传头像** / Upload Avatar:
   - 当前版本：输入头像图片URL
   - 未来版本：支持直接上传
   - Current version: Enter avatar image URL
   - Future version: Direct upload supported

3. **编写个人简介** / Write Bio:
   - 介绍你自己和创作风格
   - 最多500字符
   - Introduce yourself and creative style
   - Max 500 characters

4. **添加社交链接** / Add Social Links:
   - Website URL
   - Twitter: @username
   - Instagram: @username

### 互动功能 / Interaction Features

#### 点赞作品 / Like Artworks

- **点赞** / Like: 点击作品详情页或卡片上的❤️图标
- **取消点赞** / Unlike: 再次点击已点赞的❤️图标
- 你点赞的作品会出现在 `/profile/[yourUserId]/likes`
- Liked artworks appear at `/profile/[yourUserId]/likes`

#### 评论系统 / Comment System

**发表评论** / Post Comment

1. **访问作品详情** / Visit Artwork Details:
   - 点击任何作品查看详情
   - Click any artwork to view details

2. **输入评论** / Enter Comment:
   - 在评论框输入你的想法（最多1000字符）
   - 支持换行和简单文本格式
   - Enter your thoughts in comment box (max 1000 characters)
   - Supports line breaks and simple text formatting

3. **发布** / Publish:
   - 点击"发表评论"按钮
   - 评论立即显示在作品下方
   - Click "Post Comment" button
   - Comment appears below artwork immediately

**回复评论** / Reply to Comment

- 点击评论右下角的"回复"按钮
- 输入回复内容
- 支持最多3层嵌套回复
- Click "Reply" button at bottom right of comment
- Enter reply content
- Supports up to 3 levels of nested replies

**点赞评论** / Like Comment

- 点击评论旁的👍图标
- 热门评论会根据点赞数排序
- Click 👍 icon next to comment
- Popular comments sorted by like count

**删除评论** / Delete Comment

- 仅可删除自己的评论
- 点击评论右上角的"..."→"删除"
- 删除父评论会同时删除所有子回复
- Can only delete your own comments
- Click "..." at top right of comment → "Delete"
- Deleting parent comment also deletes all child replies

#### 关注系统 / Follow System

**关注用户** / Follow User

1. **访问用户主页** / Visit User Profile: `/profile/[userId]`

2. **点击"关注"按钮** / Click "Follow" Button

3. **查看关注列表** / View Following List:
   - 你的关注列表: `/profile/[yourUserId]/follows?type=following`
   - 查看粉丝: `/profile/[yourUserId]/follows?type=followers`
   - Your following list: `/profile/[yourUserId]/follows?type=following`
   - View followers: `/profile/[yourUserId]/follows?type=followers`

**取消关注** / Unfollow

- 再次点击"正在关注"按钮
- 或在关注列表中点击"取消关注"
- Click "Following" button again
- Or click "Unfollow" in following list

**关注动态** / Following Feed

- 访问 `/feed` 查看你关注用户的最新作品
- 按时间倒序排列
- Visit `/feed` to see latest works from followed users
- Sorted by newest first

#### 通知系统 / Notification System

**查看通知** / View Notifications

1. **通知铃铛** / Notification Bell:
   - 点击顶部导航栏的🔔图标
   - 显示最新5条通知
   - Click 🔔 icon in top navigation
   - Shows latest 5 notifications

2. **所有通知** / All Notifications:
   - 点击"查看全部"或访问 `/notifications`
   - 支持筛选：全部/关注/点赞/评论
   - Click "View All" or visit `/notifications`
   - Filter by: All/Follows/Likes/Comments

**通知类型** / Notification Types:

- **新关注** / New Follow: [用户名] 关注了你
- **作品点赞** / Artwork Like: [用户名] 点赞了你的作品
- **新评论** / New Comment: [用户名] 评论了你的作品
- **评论回复** / Comment Reply: [用户名] 回复了你的评论
- **@提及** / Mention: [用户名] 在评论中提到了你（未来功能）

**标记已读** / Mark as Read:
- 点击通知会自动标记为已读
- 点击"全部标记为已读"批量标记
- Clicking notification auto-marks as read
- Click "Mark All as Read" for batch marking

### 排行榜和成就 / Leaderboard and Achievements

#### 排行榜 / Leaderboard

**查看排行榜** / View Leaderboard: `/leaderboard`

**排行榜类型** / Leaderboard Types:
- **总榜** / All Time: 历史累计排名
- **月榜** / Monthly: 本月排名
- **周榜** / Weekly: 本周排名

**排名依据** / Ranking Criteria:
- 作品数量（图片+视频）
- 获得的总点赞数
- 粉丝数量
- 综合活跃度得分
- Artwork count (images + videos)
- Total likes received
- Follower count
- Overall activity score

**特殊展示** / Special Display:
- 🥇 第一名：金色背景 + 大头像
- 🥈 第二名：银色背景
- 🥉 第三名：铜色背景
- 你的排名会高亮显示
- 🥇 1st place: Gold background + large avatar
- 🥈 2nd place: Silver background
- 🥉 3rd place: Bronze background
- Your rank highlighted

#### 成就系统 / Achievement System

**查看成就** / View Achievements:
- 访问你的个人主页
- 查看"成就"部分
- 或访问 `/achievements`
- Visit your profile
- Check "Achievements" section
- Or visit `/achievements`

**成就等级** / Achievement Tiers:

| 等级 | 颜色 | 难度 | 示例 |
|------|------|------|------|
| 🥉 **青铜** / Bronze | 棕色 | 入门 | 首次创作（1件作品）|
| 🥈 **白银** / Silver | 银色 | 进阶 | 创作达人（50件作品）|
| 🥇 **黄金** / Gold | 金色 | 高级 | 创作大师（200件作品）|
| 💠 **铂金** / Platinum | 蓝色 | 资深 | 创作传奇（500件作品）|
| 💎 **钻石** / Diamond | 彩虹色 | 顶级 | 艺术大师（1000件作品）|

**成就类型** / Achievement Types:

1. **创作成就** / Creation Achievements:
   - 完成一定数量的作品（图片+视频）
   - 创作特定类型的作品（视频、图片）

2. **社交成就** / Social Achievements:
   - 获得一定数量的点赞
   - 获得一定数量的关注者
   - 关注一定数量的用户

3. **互动成就** / Engagement Achievements:
   - 发表一定数量的评论
   - 给其他作品点赞
   - 连续多天创作（连续创作）

4. **综合成就** / Mixed Achievements:
   - 同时达成多个条件（如100图片+50视频）
   - 单月浏览量超过10000次

**解锁成就** / Unlock Achievements:
- 系统自动检测并解锁成就
- 解锁时会收到通知
- 成就徽章显示在你的个人主页
- System auto-detects and unlocks achievements
- Receive notification when unlocked
- Achievement badges displayed on your profile

**成就奖励** / Achievement Rewards:
- 每个成就解锁会获得一定积分奖励
- 青铜: 10-25积分
- 白银: 50-180积分
- 黄金: 300-600积分
- 铂金: 800-1200积分
- 钻石: 2000-5000积分
- Each achievement unlocked grants credit rewards
- Bronze: 10-25 credits
- Silver: 50-180 credits
- Gold: 300-600 credits
- Platinum: 800-1200 credits
- Diamond: 2000-5000 credits

---

## 隐私和安全 / Privacy and Security

### 作品隐私控制 / Artwork Privacy Control

**设置作品隐私** / Set Artwork Privacy

每个作品可以单独设置隐私级别：

1. **公开** / Public:
   - ✅ 所有人可见
   - ✅ 可在Showcase展示
   - ✅ 可被搜索引擎索引
   - ✅ 可嵌入外部网站
   - ✅ Visible to everyone
   - ✅ Can appear in Showcase
   - ✅ Can be indexed by search engines
   - ✅ Can be embedded on external sites

2. **仅关注者** / Followers Only:
   - ✅ 你的关注者可见
   - ❌ 非关注者无法查看
   - ❌ 不在Showcase展示
   - ✅ Visible to your followers
   - ❌ Non-followers cannot view
   - ❌ Not shown in Showcase

3. **私密** / Private:
   - ✅ 仅你自己可见
   - ❌ 其他所有人无法查看
   - ✅ Only you can view
   - ❌ Everyone else cannot view

**修改隐私设置** / Change Privacy Settings:

1. **方式1: 作品详情页** / Method 1: Artwork Details
   - 打开作品详情Modal
   - 点击隐私设置下拉菜单
   - 选择新的隐私级别
   - Open artwork details Modal
   - Click privacy settings dropdown
   - Select new privacy level

2. **方式2: 历史记录页** / Method 2: History Page
   - 访问 `/history` 或 `/videos`
   - 找到要修改的作品
   - 点击作品卡片的隐私设置图标
   - Visit `/history` or `/videos`
   - Find artwork to modify
   - Click privacy settings icon on artwork card

### 账号安全 / Account Security

**保护你的账号** / Protect Your Account

1. **使用强密码** / Use Strong Password:
   - 虽然当前使用OAuth登录，仍建议启用GitHub/Google的两步验证
   - Although currently using OAuth login, still recommend enabling 2FA on GitHub/Google

2. **定期检查登录记录** / Regularly Check Login History:
   - 访问GitHub/Google账号安全设置
   - 检查最近登录设备和位置
   - Visit GitHub/Google account security settings
   - Check recent login devices and locations

3. **API密钥安全** / API Key Security:
   - **绝不公开分享API密钥**
   - 如果密钥泄露，立即在 `/developer` 删除并重新创建
   - 定期轮换API密钥（建议每3个月）
   - **Never publicly share API keys**
   - If key compromised, immediately delete and recreate at `/developer`
   - Regularly rotate API keys (recommended every 3 months)

### 举报违规内容 / Report Violations

**如何举报** / How to Report

1. **作品举报** / Report Artwork:
   - 打开作品详情
   - 点击右上角"..."→"举报"
   - 选择违规类型：
     - 垃圾信息 / Spam
     - 不当内容 / Inappropriate Content
     - 版权侵犯 / Copyright Infringement
     - 仇恨言论 / Hate Speech
     - 其他 / Other
   - 提供详细说明（可选）
   - Open artwork details
   - Click "..." at top right → "Report"
   - Select violation type
   - Provide detailed explanation (optional)

2. **评论举报** / Report Comment:
   - 点击评论旁的"..."
   - 选择"举报评论"
   - 选择违规原因
   - Click "..." next to comment
   - Select "Report Comment"
   - Choose violation reason

3. **用户举报** / Report User:
   - 访问用户主页
   - 点击"..."→"举报用户"
   - 描述违规行为
   - Visit user profile
   - Click "..." → "Report User"
   - Describe violation behavior

**举报后的处理** / After Reporting:
- 审核团队会在24小时内审查
- 你会收到处理结果通知
- 举报是匿名的，被举报人不会知道是谁举报的
- Moderation team reviews within 24 hours
- You'll receive notification of action taken
- Reports are anonymous, reported user won't know who reported

---

## 订阅和计费 / Subscription and Billing

### 订阅计划 / Subscription Plans

| 计划 | 月费 | 年费 | 月积分 / Credits | 特权 |
|------|------|------|-----------------|------|
| **Basic** | $9.99 | $99.99 | 1000 | 基础功能 / Basic features |
| **Pro** | $29.99 | $299.99 | 3500 | 高级功能 + 优先队列 / Advanced features + Priority queue |
| **Max** | $99.99 | $999.99 | 15000 | 全部功能 + 专属支持 / All features + Dedicated support |

**年付优惠** / Annual Discount: 年付节省2个月费用 / Save 2 months with annual billing

### 积分系统 / Credit System

**积分消耗** / Credit Consumption:

| 功能 | 消耗 |
|------|------|
| 图像生成 | 5-20积分 / 5-20 credits |
| 视频生成（4秒）| 40积分 / 40 credits |
| 视频生成（6秒）| 60积分 / 60 credits |
| 视频生成（8秒）| 80积分 / 80 credits |
| 视频延长（7秒）| 40积分 / 40 credits |

**积分获取** / Earn Credits:

1. **订阅充值** / Subscription Top-up:
   - 每月自动充值订阅计划的积分额度
   - Monthly auto-refill with subscription credit quota

2. **成就奖励** / Achievement Rewards:
   - 解锁成就获得10-5000积分
   - 青铜成就: 10-25积分
   - 钻石成就: 2000-5000积分
   - Unlock achievements to earn 10-5000 credits
   - Bronze achievements: 10-25 credits
   - Diamond achievements: 2000-5000 credits

3. **推荐奖励** / Referral Rewards (未来功能 / Future Feature):
   - 推荐朋友注册并订阅，获得奖励积分
   - Refer friends to register and subscribe, earn reward credits

**积分查询** / Check Credits:
- 访问 `/profile` 查看当前积分余额
- 顶部导航栏显示剩余积分
- Visit `/profile` to view current credit balance
- Top navigation shows remaining credits

### 订阅管理 / Subscription Management

**升级订阅** / Upgrade Subscription:
1. 访问 `/pricing`
2. 选择更高级别的计划
3. 支付差价（按比例计算剩余时间）
4. Visit `/pricing`
5. Select higher-tier plan
6. Pay prorated difference for remaining time

**降级订阅** / Downgrade Subscription:
1. 访问 `/pricing`
2. 选择较低级别的计划
3. 在当前计费周期结束后生效
4. Visit `/pricing`
5. Select lower-tier plan
6. Takes effect after current billing cycle ends

**取消订阅** / Cancel Subscription:
1. 访问 `/pricing`
2. 点击"管理订阅"
3. 选择"取消订阅"
4. 订阅在当前计费周期结束后不再续费
5. Visit `/pricing`
6. Click "Manage Subscription"
7. Select "Cancel Subscription"
8. Subscription won't renew after current billing cycle

---

## 常见问题 / FAQ

### 创作相关 / Creation Related

**Q: 为什么我的视频生成失败了？**
**Q: Why did my video generation fail?**

A: 可能原因:
- 积分不足（检查积分余额）
- 提示词包含违禁内容（检查是否有敏感词）
- 参考图片不符合要求（检查图片格式和尺寸）
- 系统繁忙（重试或稍后再试）

A: Possible reasons:
- Insufficient credits (check credit balance)
- Prompt contains prohibited content (check for sensitive words)
- Reference images don't meet requirements (check image format and size)
- System busy (retry or try later)

**Q: 1080p视频为什么不能延长？**
**Q: Why can't 1080p videos be extended?**

A: 这是Google Veo API的技术限制。只有720p视频支持延长功能。如果你想延长视频，请在生成时选择720p分辨率。

A: This is a technical limitation of Google Veo API. Only 720p videos support extension. If you want to extend videos, choose 720p resolution when generating.

**Q: 如何提高生成质量？**
**Q: How to improve generation quality?**

A: 提示词技巧:
- 具体描述颜色、光线、风格
- 使用艺术风格参考（如"水彩画风格""赛博朋克风格"）
- 避免过于复杂的描述
- 参考Showcase中的优秀作品提示词

A: Prompt tips:
- Specifically describe colors, lighting, style
- Use art style references (e.g., "watercolor style", "cyberpunk style")
- Avoid overly complex descriptions
- Reference excellent artwork prompts in Showcase

### 社交相关 / Social Related

**Q: 如何增加粉丝？**
**Q: How to gain followers?**

A: 建议:
- 定期发布高质量作品
- 参与评论和互动
- 分享创作经验（写博客）
- 使用相关标签，增加作品曝光度
- 在社交媒体分享你的Nano Banana作品

A: Suggestions:
- Regularly post high-quality works
- Participate in comments and interactions
- Share creative experiences (write blog posts)
- Use relevant tags to increase artwork exposure
- Share your Nano Banana works on social media

**Q: 我的评论被删除了，为什么？**
**Q: Why was my comment deleted?**

A: 可能原因:
- 评论包含垃圾信息或广告
- 评论包含侮辱性语言
- 评论违反社区规范
- 如果你认为这是误判，可以在 `/appeal` 提交申诉

A: Possible reasons:
- Comment contains spam or advertising
- Comment contains insulting language
- Comment violates community guidelines
- If you believe it's a misjudgment, submit appeal at `/appeal`

**Q: 如何在排行榜上排名更高？**
**Q: How to rank higher on leaderboard?**

A: 排名依据:
- 作品数量（持续创作）
- 作品质量（获得更多点赞）
- 社交活跃度（获得关注、评论）
- 综合活跃度得分

A: Ranking based on:
- Artwork quantity (continuous creation)
- Artwork quality (receive more likes)
- Social activity (gain followers, comments)
- Overall activity score

### 计费相关 / Billing Related

**Q: 积分用完了怎么办？**
**Q: What if I run out of credits?**

A: 解决方案:
- 等待下月自动充值（订阅用户）
- 升级到更高级别的订阅计划
- 完成成就解锁获得奖励积分
- 暂时使用免费功能（浏览、评论、点赞）

A: Solutions:
- Wait for next month's auto-refill (subscribers)
- Upgrade to higher-tier subscription plan
- Complete achievements to earn reward credits
- Temporarily use free features (browse, comment, like)

**Q: 如何获取发票？**
**Q: How to get invoice?**

A: 访问 `/billing` 查看所有支付记录，点击"下载发票"即可获取PDF发票。

A: Visit `/billing` to view all payment records, click "Download Invoice" to get PDF invoice.

---

## 获取帮助 / Get Help

### 支持渠道 / Support Channels

**1. 帮助中心** / Help Center
- 访问 `/help` 查看常见问题和教程
- Visit `/help` for FAQs and tutorials

**2. 邮件支持** / Email Support
- support@nanobanana.com
- 工作日24小时内回复
- Reply within 24 hours on business days

**3. 社区论坛** / Community Forum (未来功能 / Future Feature)
- 访问 `/forum` 与其他用户交流
- Visit `/forum` to communicate with other users

**4. 社交媒体** / Social Media
- Twitter: @nanobananaai
- Discord: [Coming Soon]

### 反馈和建议 / Feedback and Suggestions

**报告Bug** / Report Bug:
- 访问 `/report-bug`
- 描述问题、重现步骤、截图
- Visit `/report-bug`
- Describe problem, reproduction steps, screenshots

**功能建议** / Feature Request:
- 访问 `/feedback`
- 提交你的功能想法
- 投票支持其他用户的建议
- Visit `/feedback`
- Submit your feature ideas
- Vote for other users' suggestions

---

## 📚 相关资源 / Related Resources

- [社区规范](./COMMUNITY_GUIDELINES.md) - 行为准则和内容规范
- [隐私政策](./docs/privacy.md) - 数据保护和隐私说明
- [服务条款](./docs/terms.md) - 使用协议和法律条款
- [API文档](./docs/api-docs.md) - 开发者API参考
- [Community Guidelines](./COMMUNITY_GUIDELINES.md) - Code of Conduct and Content Guidelines
- [Privacy Policy](./docs/privacy.md) - Data Protection and Privacy Statement
- [Terms of Service](./docs/terms.md) - Usage Agreement and Legal Terms
- [API Documentation](./docs/api-docs.md) - Developer API Reference

---

## 📝 版本历史 / Version History

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 2.0 | 2025-11-23 | 新增社交功能章节（博客、用户主页、评论、关注、通知、排行榜、成就）|
| 1.0 | 2025-11-01 | 初始版本发布（基础功能和AI创作）|

---

**欢迎来到Nano Banana！** 🎨✨
**开始你的AI创作之旅吧！**

**Welcome to Nano Banana!** 🎨✨
**Start your AI creation journey!**

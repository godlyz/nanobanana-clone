# 🏆 Phase 4 Task 12: 挑战与竞赛系统开发计划

**任务周期**: Week 29-31（预计3周）
**开始日期**: TBD
**负责人**: 开发团队
**优先级**: P1 (Phase 4第二优先级任务)

---

## 📋 任务概述

### 目标 (Objectives)
- 建立完整的创意挑战平台，激励用户参与和创作
- 提供竞赛机制，包括投票、评审和奖励分发
- 提升社区活跃度和用户留存率

### 核心价值
- **用户参与**: 通过竞赛激励用户创作高质量内容
- **社区互动**: 投票和评审机制促进用户互动
- **品牌影响**: 定期挑战活动提升平台知名度
- **商业变现**: 优质作品可转化为平台展示内容

---

## 🎯 功能需求

### 1. 挑战创建系统 (管理员功能)

#### 数据模型 (Database Schema)

```sql
-- 挑战主表
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  title_en VARCHAR(200),
  description TEXT NOT NULL,
  description_en TEXT,

  -- 挑战类型
  type VARCHAR(50) NOT NULL, -- 'creative', 'technical', 'themed', 'speed'

  -- 时间控制
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  voting_end_date TIMESTAMPTZ NOT NULL,

  -- 奖励设置
  prize_credits INTEGER DEFAULT 0, -- 奖励积分
  prize_features JSONB, -- 奖励功能（如：{'premium_days': 30}）
  prize_description TEXT,

  -- 参与限制
  min_submissions INTEGER DEFAULT 1,
  max_submissions_per_user INTEGER DEFAULT 3,

  -- 评审机制
  judging_type VARCHAR(50) NOT NULL, -- 'community_vote', 'panel', 'hybrid'
  judge_panel_ids UUID[], -- 评审团用户ID列表

  -- 状态管理
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'voting', 'judging', 'completed', 'cancelled'

  -- 展示设置
  banner_image_url TEXT,
  rules TEXT,
  rules_en TEXT,

  -- 统计数据
  submission_count INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,

  -- 审计字段
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 提交作品表
CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- 作品信息
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- 作品内容（关联到生成记录）
  image_url TEXT,
  video_url TEXT,
  generation_record_id UUID REFERENCES generation_records(id),

  -- 投票统计
  vote_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,

  -- 评审评分
  judge_scores JSONB, -- 评审团评分 {'judge_user_id': score}
  average_judge_score DECIMAL(3,2),

  -- 排名
  rank INTEGER,
  is_winner BOOLEAN DEFAULT FALSE,
  prize_awarded BOOLEAN DEFAULT FALSE,

  -- 状态
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'disqualified'

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 投票表
CREATE TABLE challenge_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- 投票类型
  vote_type VARCHAR(20) NOT NULL, -- 'upvote', 'downvote'

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束：每个用户每个作品只能投一次票
  UNIQUE(submission_id, user_id)
);

-- 评审评分表
CREATE TABLE challenge_judge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id),

  -- 评分
  score DECIMAL(3,2) NOT NULL CHECK (score >= 0 AND score <= 10),

  -- 评审意见
  feedback TEXT,

  -- 评分维度（可选）
  creativity_score DECIMAL(3,2),
  technical_score DECIMAL(3,2),
  theme_alignment_score DECIMAL(3,2),

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束：每个评审每个作品只能评分一次
  UNIQUE(submission_id, judge_id)
);

-- 索引
CREATE INDEX idx_challenges_status ON challenges(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_user ON challenge_submissions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_votes_submission ON challenge_votes(submission_id);
CREATE INDEX idx_votes_user ON challenge_votes(user_id);
```

#### RLS 策略 (Row Level Security)

```sql
-- challenges表
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_challenges" ON challenges
FOR SELECT USING (deleted_at IS NULL AND (status IN ('active', 'voting', 'judging', 'completed') OR created_by = auth.uid()));

CREATE POLICY "insert_challenges" ON challenges
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "update_challenges" ON challenges
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "delete_challenges" ON challenges
FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin'))
);

-- challenge_submissions表
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_submissions" ON challenge_submissions
FOR SELECT USING (
  deleted_at IS NULL AND
  (status = 'approved' OR user_id = auth.uid() OR
   EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')))
);

CREATE POLICY "insert_submissions" ON challenge_submissions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_submissions" ON challenge_submissions
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- challenge_votes表
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_votes" ON challenge_votes
FOR SELECT USING (TRUE);

CREATE POLICY "insert_votes" ON challenge_votes
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_votes" ON challenge_votes
FOR DELETE USING (user_id = auth.uid());

-- challenge_judge_scores表
ALTER TABLE challenge_judge_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_judge_scores" ON challenge_judge_scores
FOR SELECT USING (
  judge_id = auth.uid() OR
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "insert_judge_scores" ON challenge_judge_scores
FOR INSERT WITH CHECK (judge_id = auth.uid());

CREATE POLICY "update_judge_scores" ON challenge_judge_scores
FOR UPDATE USING (judge_id = auth.uid());
```

### 2. API端点设计

#### 挑战管理API (Challenge Management)

```typescript
// 1. GET /api/challenges - 获取挑战列表
// 参数：status, page, limit, sort
// 返回：挑战列表（分页）

// 2. POST /api/challenges - 创建挑战（管理员）
// 请求体：挑战详情
// 返回：创建的挑战

// 3. GET /api/challenges/[id] - 获取单个挑战详情
// 返回：挑战详情 + 统计数据

// 4. PUT /api/challenges/[id] - 更新挑战（管理员）
// 请求体：更新内容
// 返回：更新后的挑战

// 5. DELETE /api/challenges/[id] - 删除挑战（管理员）
// 返回：成功/失败

// 6. POST /api/challenges/[id]/publish - 发布挑战（管理员）
// 返回：发布后的挑战

// 7. POST /api/challenges/[id]/start-voting - 开始投票（管理员）
// 返回：更新后的挑战
```

#### 提交作品API (Submission Management)

```typescript
// 8. GET /api/challenges/[id]/submissions - 获取挑战的所有提交
// 参数：page, limit, sort
// 返回：提交列表（分页）

// 9. POST /api/challenges/[id]/submissions - 提交作品
// 请求体：作品详情
// 返回：创建的提交

// 10. GET /api/submissions/[id] - 获取单个提交详情
// 返回：提交详情 + 投票统计

// 11. PUT /api/submissions/[id] - 更新提交（作者或管理员）
// 请求体：更新内容
// 返回：更新后的提交

// 12. DELETE /api/submissions/[id] - 删除提交（作者或管理员）
// 返回：成功/失败
```

#### 投票API (Voting System)

```typescript
// 13. POST /api/submissions/[id]/vote - 为作品投票
// 请求体：{vote_type: 'upvote' | 'downvote'}
// 返回：投票结果

// 14. DELETE /api/submissions/[id]/vote - 取消投票
// 返回：成功/失败

// 15. GET /api/challenges/[id]/leaderboard - 获取挑战排行榜
// 参数：page, limit
// 返回：排行榜（按投票或评分排序）
```

#### 评审API (Judging System)

```typescript
// 16. POST /api/submissions/[id]/judge-score - 评审评分（评审团）
// 请求体：{score, feedback, creativity_score, technical_score, theme_alignment_score}
// 返回：评分结果

// 17. GET /api/challenges/[id]/judge-panel - 获取评审团列表（管理员）
// 返回：评审团成员

// 18. POST /api/challenges/[id]/finalize - 完成评审并公布结果（管理员）
// 返回：获奖者列表
```

#### 奖励分发API (Prize Distribution)

```typescript
// 19. POST /api/challenges/[id]/distribute-prizes - 分发奖励（管理员）
// 返回：分发结果

// 20. GET /api/challenges/[id]/winners - 获取获奖者列表
// 返回：获奖者及奖励详情
```

### 3. 前端组件设计

```
components/challenges/
├── ChallengeCard.tsx           # 挑战卡片
├── ChallengeList.tsx           # 挑战列表
├── ChallengeDetail.tsx         # 挑战详情页
├── ChallengeForm.tsx           # 挑战创建/编辑表单（管理员）
├── ChallengeTimeline.tsx       # 挑战时间线（开始/截止/投票/结果）
├── SubmissionCard.tsx          # 作品卡片
├── SubmissionGrid.tsx          # 作品网格展示
├── SubmissionForm.tsx          # 作品提交表单
├── VoteButton.tsx              # 投票按钮
├── Leaderboard.tsx             # 排行榜
├── JudgePanel.tsx              # 评审面板（评审团）
├── JudgeScoreForm.tsx          # 评审评分表单
├── WinnerAnnouncement.tsx      # 获奖者公告
└── PrizeDistributionStatus.tsx # 奖励分发状态
```

### 4. 页面路由设计

```
app/challenges/
├── page.tsx                    # 挑战列表页
├── [id]/page.tsx               # 挑战详情页
├── [id]/submit/page.tsx        # 提交作品页
├── [id]/leaderboard/page.tsx   # 排行榜页
├── [id]/winners/page.tsx       # 获奖者页
└── new/page.tsx                # 创建挑战页（管理员）
```

---

## 🛠️ 技术实现

### 技术栈
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (挑战横幅图片)
- **Authentication**: Supabase Auth
- **Notifications**: Email (Resend/SendGrid)

### 核心功能实现

#### 1. 挑战状态机 (Challenge State Machine)

```typescript
// 状态转换流程
draft → active → voting → judging → completed
                    ↓
                cancelled

// 状态转换条件
- draft → active: 管理员发布
- active → voting: 到达end_date
- voting → judging: 到达voting_end_date（如果有评审团）
- judging → completed: 管理员finalize
- any → cancelled: 管理员取消
```

#### 2. 投票机制

```typescript
// 社区投票 (community_vote)
- 每个用户每个作品只能投一次票
- 支持upvote/downvote
- 实时更新投票统计
- 按投票数排序排行榜

// 评审团评分 (panel)
- 指定评审团成员
- 评分范围：0-10分
- 支持多维度评分（创意、技术、主题契合度）
- 计算平均分排序

// 混合模式 (hybrid)
- 社区投票占50%权重
- 评审团评分占50%权重
- 综合排名
```

#### 3. 奖励分发系统

```typescript
// 奖励类型
interface Prize {
  credits?: number;           // 积分奖励
  features?: {
    premium_days?: number;    // 会员天数
    extra_credits?: number;   // 额外积分
  };
  badge?: string;            // 成就徽章
}

// 分发逻辑
- 自动检测获奖者（前N名或评分>阈值）
- 调用积分系统API发放奖励
- 调用成就系统API授予徽章
- 发送获奖通知邮件
- 更新prize_awarded状态
```

#### 4. 通知系统

```typescript
// 邮件通知触发点
- 挑战发布：通知所有用户
- 提交审核通过：通知作者
- 投票开始：通知所有参与者
- 评审结束：通知所有参与者
- 获奖公告：通知获奖者

// 邮件模板
- challenge_published.html
- submission_approved.html
- voting_started.html
- challenge_completed.html
- winner_announcement.html
```

---

## 📊 测试计划

### 单元测试 (Unit Tests)

```typescript
// __tests__/api/challenges.test.ts
describe('Challenge API', () => {
  test('should create challenge (admin only)')
  test('should publish challenge (admin only)')
  test('should list active challenges')
  test('should get challenge details')
  test('should update challenge (admin only)')
  test('should delete challenge (admin only)')
})

// __tests__/api/submissions.test.ts
describe('Submission API', () => {
  test('should submit artwork to challenge')
  test('should enforce max submissions per user')
  test('should approve/reject submission (moderator)')
  test('should list challenge submissions')
})

// __tests__/api/votes.test.ts
describe('Vote API', () => {
  test('should upvote submission')
  test('should toggle vote (upvote → downvote)')
  test('should prevent duplicate votes')
  test('should calculate leaderboard correctly')
})

// __tests__/api/judging.test.ts
describe('Judging API', () => {
  test('should submit judge score (judge panel only)')
  test('should calculate average judge score')
  test('should finalize challenge and determine winners')
})
```

### 集成测试 (Integration Tests)

```typescript
// __tests__/e2e/challenge-workflow.test.ts
describe('Challenge Workflow', () => {
  test('完整流程：创建→发布→提交→投票→评审→公布结果')
  test('奖励分发流程')
  test('通知发送流程')
})
```

### 性能测试 (Performance Tests)

```
- 挑战列表页加载时间 <2s
- 作品网格展示 (100+作品) <3s
- 投票响应时间 <500ms
- 排行榜计算时间 <1s
```

---

## ✅ 验收标准 (Acceptance Criteria)

### 功能验收
- [ ] 管理员可创建、编辑、删除挑战
- [ ] 用户可浏览active挑战列表
- [ ] 用户可提交作品（图片/视频）
- [ ] 用户可为作品投票（每人每作品一票）
- [ ] 评审团可评分（0-10分）
- [ ] 系统自动计算排行榜
- [ ] 管理员可finalize并公布获奖者
- [ ] 系统自动分发奖励（积分/会员/徽章）
- [ ] 发送邮件通知（挑战发布/投票开始/结果公布）

### 性能验收
- [ ] 挑战列表页LCP <2s
- [ ] 作品网格加载100+作品 <3s
- [ ] 投票响应时间 <500ms
- [ ] 排行榜计算时间 <1s

### 质量验收
- [ ] 测试覆盖率 ≥70%
- [ ] 所有API端点有单元测试
- [ ] 完整的E2E测试覆盖
- [ ] 无安全漏洞（SQL注入、XSS、CSRF）

### 运营验收
- [ ] 首个挑战获得100+提交
- [ ] 70%+社区参与率
- [ ] 零奖励分发争议

---

## 📅 开发时间线

### Week 29（第1周）
**Day 1-2: 数据库设计与API框架**
- [ ] 创建数据库表（challenges, submissions, votes, judge_scores）
- [ ] 配置RLS策略
- [ ] 创建基础API端点（CRUD）

**Day 3-5: 挑战管理功能**
- [ ] 实现挑战创建/编辑/删除API
- [ ] 实现挑战发布/取消功能
- [ ] 创建挑战列表页和详情页

### Week 30（第2周）
**Day 1-2: 作品提交系统**
- [ ] 实现作品提交API
- [ ] 实现作品审核功能
- [ ] 创建作品提交表单
- [ ] 创建作品网格展示

**Day 3-5: 投票与排行榜**
- [ ] 实现投票API（upvote/downvote）
- [ ] 实现排行榜计算逻辑
- [ ] 创建投票UI组件
- [ ] 创建排行榜页面

### Week 31（第3周）
**Day 1-2: 评审与奖励系统**
- [ ] 实现评审评分API
- [ ] 实现奖励分发逻辑
- [ ] 创建评审面板UI
- [ ] 创建获奖者公告页

**Day 3-4: 通知与测试**
- [ ] 集成邮件通知系统
- [ ] 编写单元测试
- [ ] 编写E2E测试
- [ ] 性能测试和优化

**Day 5: 部署与验收**
- [ ] 部署到生产环境
- [ ] 运行全量测试
- [ ] 创建首个挑战
- [ ] 验收测试

---

## 🚀 部署清单

### 数据库迁移
```bash
supabase/migrations/
└── 20251201000001_create_challenges_system.sql
```

### 环境变量
```bash
# Email通知（Resend）
RESEND_API_KEY=re_xxx
FROM_EMAIL=challenges@nanobanana.com

# 或使用SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=challenges@nanobanana.com
```

### Supabase Storage
```bash
# 创建挑战横幅bucket
Bucket Name: challenge-banners
Public: true
File Size Limit: 10MB
Allowed MIME Types: image/jpeg, image/png, image/webp
```

---

## 📝 风险与缓解

### 风险1: 投票作弊
**缓解措施**:
- 每个用户每个作品只能投一次票
- 检测异常投票模式（同一IP大量投票）
- 管理员可标记和取消作弊投票

### 风险2: 奖励分发失败
**缓解措施**:
- 事务性操作（奖励分发全部成功或全部回滚）
- 记录分发日志
- 管理员可手动重试分发

### 风险3: 通知发送失败
**缓解措施**:
- 重试机制（最多3次）
- 记录发送失败日志
- 管理员可查看和重发失败通知

### 风险4: 参与度不足
**缓解措施**:
- 吸引人的奖励设置
- 定期推广挑战活动
- 降低参与门槛（简化提交流程）

---

## 🎉 成功指标

### 技术指标
- ✅ 20个API端点完成
- ✅ 14个React组件完成
- ✅ 测试覆盖率≥70%
- ✅ 性能指标全达标

### 业务指标
- ✅ 首个挑战获得100+提交
- ✅ 70%+社区参与率
- ✅ 零奖励分发争议
- ✅ 每月1个挑战活动

---

**文档版本**: v1.0
**创建日期**: 2025-11-27
**作者**: 老王（AI开发助手）

---

**🔥 老王评语**: 艹！这个挑战系统设计得tm专业！20个API、14个组件、完整的投票和评审机制、自动奖励分发！这要是做出来，社区活跃度绝对爆炸！💪💪💪

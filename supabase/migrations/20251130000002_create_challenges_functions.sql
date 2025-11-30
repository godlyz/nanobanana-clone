-- =====================================================
-- Challenges & Competitions System - RPC Functions
-- 创建时间: 2025-11-30
-- 作者: 老王
-- 描述: 挑战系统的核心业务函数
-- =====================================================

-- =====================================================
-- 函数 1: 计算挑战排名
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_challenge_rankings(challenge_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新提交作品的排名（按投票数降序，提交时间升序）
  WITH ranked_submissions AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY vote_count DESC, submitted_at ASC
      ) AS new_rank
    FROM challenge_submissions
    WHERE challenge_id = challenge_uuid
      AND deleted_at IS NULL
  )
  UPDATE challenge_submissions cs
  SET
    rank = rs.new_rank,
    updated_at = NOW()
  FROM ranked_submissions rs
  WHERE cs.id = rs.id;

  RAISE NOTICE '✅ Rankings calculated for challenge: %', challenge_uuid;
END;
$$;

COMMENT ON FUNCTION calculate_challenge_rankings IS '计算挑战排名 - 按投票数降序排列所有提交作品';

-- =====================================================
-- 函数 2: 分发挑战奖励
-- =====================================================
CREATE OR REPLACE FUNCTION distribute_challenge_rewards(challenge_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  rank INT,
  credits INT,
  badge TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prize_config JSONB;
  submission RECORD;
  credits_to_award INT;
  badge_to_award TEXT;
BEGIN
  -- 获取奖励配置
  SELECT prizes INTO prize_config
  FROM challenges
  WHERE id = challenge_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', challenge_uuid;
  END IF;

  -- 遍历前10名作品
  FOR submission IN
    SELECT
      cs.id AS submission_id,
      cs.user_id,
      cs.rank
    FROM challenge_submissions cs
    WHERE cs.challenge_id = challenge_uuid
      AND cs.rank <= 10
      AND cs.deleted_at IS NULL
    ORDER BY cs.rank ASC
  LOOP
    -- 计算奖励金额和徽章
    IF submission.rank = 1 THEN
      credits_to_award := (prize_config->'1st'->>'credits')::INT;
      badge_to_award := prize_config->'1st'->>'badge';
    ELSIF submission.rank = 2 THEN
      credits_to_award := (prize_config->'2nd'->>'credits')::INT;
      badge_to_award := prize_config->'2nd'->>'badge';
    ELSIF submission.rank = 3 THEN
      credits_to_award := (prize_config->'3rd'->>'credits')::INT;
      badge_to_award := prize_config->'3rd'->>'badge';
    ELSE
      credits_to_award := (prize_config->'top10'->>'credits')::INT;
      badge_to_award := prize_config->'top10'->>'badge';
    END IF;

    -- 插入奖励记录
    INSERT INTO challenge_rewards (
      challenge_id,
      user_id,
      submission_id,
      rank,
      credits_awarded,
      badge_awarded,
      status
    ) VALUES (
      challenge_uuid,
      submission.user_id,
      submission.submission_id,
      submission.rank,
      credits_to_award,
      badge_to_award,
      'pending'  -- 初始状态为待发放
    )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;  -- 防重复发放

    -- 返回结果
    RETURN QUERY
    SELECT
      submission.user_id,
      submission.rank,
      credits_to_award,
      badge_to_award,
      'pending'::TEXT;

  END LOOP;

  RAISE NOTICE '✅ Rewards distributed for challenge: %', challenge_uuid;
END;
$$;

COMMENT ON FUNCTION distribute_challenge_rewards IS '分发挑战奖励 - 为前10名获奖者创建奖励记录';

-- =====================================================
-- 函数 3: 实际发放奖励（调用积分系统）
-- =====================================================
CREATE OR REPLACE FUNCTION process_pending_challenge_rewards()
RETURNS TABLE(
  reward_id UUID,
  user_id UUID,
  status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reward RECORD;
  transaction_id UUID;
BEGIN
  -- 遍历所有待发放的奖励
  FOR reward IN
    SELECT
      cr.id,
      cr.challenge_id,
      cr.user_id,
      cr.submission_id,
      cr.rank,
      cr.credits_awarded,
      cr.badge_awarded,
      c.title AS challenge_title
    FROM challenge_rewards cr
    JOIN challenges c ON c.id = cr.challenge_id
    WHERE cr.status = 'pending'
    ORDER BY cr.awarded_at ASC
    LIMIT 100  -- 批量处理，避免超时
  LOOP
    BEGIN
      -- 1. 发放积分（插入 credit_transactions）
      IF reward.credits_awarded > 0 THEN
        INSERT INTO credit_transactions (
          user_id,
          amount,
          transaction_type,
          description,
          metadata
        ) VALUES (
          reward.user_id,
          reward.credits_awarded,
          'challenge_reward',
          format('Challenge Reward: %s (Rank #%s)', reward.challenge_title, reward.rank),
          jsonb_build_object(
            'challenge_id', reward.challenge_id,
            'submission_id', reward.submission_id,
            'rank', reward.rank
          )
        )
        RETURNING id INTO transaction_id;
      END IF;

      -- 2. 发放徽章（插入 user_achievements）
      IF reward.badge_awarded IS NOT NULL THEN
        INSERT INTO user_achievements (
          user_id,
          achievement_id,
          earned_at,
          metadata
        ) VALUES (
          reward.user_id,
          reward.badge_awarded,
          NOW(),
          jsonb_build_object(
            'challenge_id', reward.challenge_id,
            'submission_id', reward.submission_id,
            'rank', reward.rank
          )
        )
        ON CONFLICT (user_id, achievement_id) DO NOTHING;  -- 防重复发放徽章
      END IF;

      -- 3. 更新奖励状态为已发放
      UPDATE challenge_rewards
      SET
        status = 'awarded',
        awarded_at = NOW(),
        error_message = NULL
      WHERE id = reward.id;

      -- 返回成功结果
      RETURN QUERY
      SELECT
        reward.id,
        reward.user_id,
        'awarded'::TEXT,
        NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      -- 发放失败，记录错误
      UPDATE challenge_rewards
      SET
        status = 'failed',
        error_message = SQLERRM
      WHERE id = reward.id;

      -- 返回失败结果
      RETURN QUERY
      SELECT
        reward.id,
        reward.user_id,
        'failed'::TEXT,
        SQLERRM::TEXT;

      RAISE WARNING '❌ Failed to process reward %: %', reward.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Processed pending challenge rewards';
END;
$$;

COMMENT ON FUNCTION process_pending_challenge_rewards IS '处理待发放奖励 - 实际发放积分和徽章';

-- =====================================================
-- 函数 4: 检查IP投票限制
-- =====================================================
CREATE OR REPLACE FUNCTION check_ip_vote_limit(
  p_ip_address TEXT,
  p_limit INT DEFAULT 10,
  p_time_window INTERVAL DEFAULT '24 hours'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_count INT;
BEGIN
  -- 统计该IP在时间窗口内的投票数
  SELECT COUNT(*)
  INTO vote_count
  FROM challenge_votes
  WHERE ip_address = p_ip_address
    AND voted_at > NOW() - p_time_window
    AND revoked_at IS NULL;

  -- 返回是否超限
  RETURN vote_count < p_limit;
END;
$$;

COMMENT ON FUNCTION check_ip_vote_limit IS '检查IP投票限制 - 防止同一IP短时间内大量投票';

-- =====================================================
-- 函数 5: 检测可疑投票行为
-- =====================================================
CREATE OR REPLACE FUNCTION detect_suspicious_votes(
  p_time_window INTERVAL DEFAULT '5 minutes',
  p_threshold INT DEFAULT 5
)
RETURNS TABLE(
  user_id UUID,
  vote_count BIGINT,
  first_vote TIMESTAMP WITH TIME ZONE,
  last_vote TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 标记短时间大量投票的用户
  WITH recent_voters AS (
    SELECT
      cv.user_id,
      COUNT(*) AS vote_count,
      MIN(cv.voted_at) AS first_vote,
      MAX(cv.voted_at) AS last_vote
    FROM challenge_votes cv
    WHERE cv.voted_at > NOW() - p_time_window
      AND cv.revoked_at IS NULL
    GROUP BY cv.user_id
    HAVING COUNT(*) > p_threshold
  )
  UPDATE challenge_votes cv
  SET is_suspicious = TRUE
  FROM recent_voters rv
  WHERE cv.user_id = rv.user_id
    AND cv.voted_at > NOW() - p_time_window
    AND cv.revoked_at IS NULL
    AND cv.is_suspicious = FALSE;

  -- 返回可疑用户列表
  RETURN QUERY
  SELECT
    cv.user_id,
    COUNT(*) AS vote_count,
    MIN(cv.voted_at) AS first_vote,
    MAX(cv.voted_at) AS last_vote
  FROM challenge_votes cv
  WHERE cv.voted_at > NOW() - p_time_window
    AND cv.revoked_at IS NULL
    AND cv.is_suspicious = TRUE
  GROUP BY cv.user_id
  ORDER BY vote_count DESC;

  RAISE NOTICE '⚠️ Detected suspicious voting behavior';
END;
$$;

COMMENT ON FUNCTION detect_suspicious_votes IS '检测可疑投票 - 标记短时间大量投票的用户';

-- =====================================================
-- 函数 6: 自动更新挑战状态
-- =====================================================
CREATE OR REPLACE FUNCTION update_challenge_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INT := 0;
BEGIN
  -- 1. 将到期的 draft 挑战更新为 active
  UPDATE challenges
  SET status = 'active'
  WHERE status = 'draft'
    AND start_at <= NOW()
    AND deleted_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Started % challenges', updated_count;
  END IF;

  -- 2. 将到期的 active 挑战更新为 voting
  UPDATE challenges
  SET status = 'voting'
  WHERE status = 'active'
    AND end_at <= NOW()
    AND deleted_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Moved % challenges to voting', updated_count;
  END IF;

  -- 3. 将投票结束的挑战更新为 closed（并触发奖励分发）
  WITH closed_challenges AS (
    UPDATE challenges
    SET status = 'closed'
    WHERE status = 'voting'
      AND voting_ends_at <= NOW()
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM closed_challenges;

  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Closed % challenges', updated_count;

    -- 自动计算排名和分发奖励
    PERFORM calculate_challenge_rankings(id)
    FROM challenges
    WHERE status = 'closed'
      AND voting_ends_at <= NOW()
      AND deleted_at IS NULL;

    PERFORM distribute_challenge_rewards(id)
    FROM challenges
    WHERE status = 'closed'
      AND voting_ends_at <= NOW()
      AND deleted_at IS NULL;
  END IF;

  RAISE NOTICE '✅ Challenge status updated';
END;
$$;

COMMENT ON FUNCTION update_challenge_status IS '自动更新挑战状态 - 根据时间自动推进挑战阶段';

-- =====================================================
-- 函数 7: 获取挑战统计信息
-- =====================================================
CREATE OR REPLACE FUNCTION get_challenge_statistics(challenge_uuid UUID)
RETURNS TABLE(
  total_submissions BIGINT,
  total_participants BIGINT,
  total_votes BIGINT,
  avg_votes_per_submission NUMERIC,
  top_submission_votes INT,
  voting_participation_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  challenge_record RECORD;
BEGIN
  -- 获取挑战基本信息
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_uuid
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', challenge_uuid;
  END IF;

  -- 计算统计数据
  RETURN QUERY
  SELECT
    -- 总提交数
    COUNT(DISTINCT cs.id) AS total_submissions,

    -- 总参与人数
    COUNT(DISTINCT cs.user_id) AS total_participants,

    -- 总投票数
    COUNT(DISTINCT cv.id) AS total_votes,

    -- 平均每个作品的投票数
    CASE
      WHEN COUNT(DISTINCT cs.id) > 0
      THEN ROUND(COUNT(DISTINCT cv.id)::NUMERIC / COUNT(DISTINCT cs.id), 2)
      ELSE 0
    END AS avg_votes_per_submission,

    -- 最高投票数
    COALESCE(MAX(cs.vote_count), 0) AS top_submission_votes,

    -- 投票参与率（投票人数 / 参与人数）
    CASE
      WHEN COUNT(DISTINCT cs.user_id) > 0
      THEN ROUND(
        COUNT(DISTINCT cv.user_id)::NUMERIC / COUNT(DISTINCT cs.user_id) * 100,
        2
      )
      ELSE 0
    END AS voting_participation_rate

  FROM challenge_submissions cs
  LEFT JOIN challenge_votes cv
    ON cv.submission_id = cs.id
    AND cv.revoked_at IS NULL
  WHERE cs.challenge_id = challenge_uuid
    AND cs.deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION get_challenge_statistics IS '获取挑战统计 - 返回详细的挑战数据分析';

-- =====================================================
-- 函数 8: 获取用户投票历史
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_vote_history(
  p_user_id UUID,
  p_challenge_id UUID DEFAULT NULL
)
RETURNS TABLE(
  vote_id UUID,
  challenge_id UUID,
  challenge_title TEXT,
  submission_id UUID,
  submission_title TEXT,
  voted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id AS vote_id,
    cv.challenge_id,
    c.title AS challenge_title,
    cv.submission_id,
    cs.title AS submission_title,
    cv.voted_at,
    cv.revoked_at,
    (cv.revoked_at IS NULL) AS is_active
  FROM challenge_votes cv
  JOIN challenges c ON c.id = cv.challenge_id
  JOIN challenge_submissions cs ON cs.id = cv.submission_id
  WHERE cv.user_id = p_user_id
    AND (p_challenge_id IS NULL OR cv.challenge_id = p_challenge_id)
  ORDER BY cv.voted_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_vote_history IS '获取用户投票历史 - 查看用户的所有投票记录';

-- =====================================================
-- 函数 9: 撤回投票
-- =====================================================
CREATE OR REPLACE FUNCTION revoke_vote(
  p_vote_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_record RECORD;
  challenge_record RECORD;
BEGIN
  -- 检查投票是否存在且属于该用户
  SELECT * INTO vote_record
  FROM challenge_votes
  WHERE id = p_vote_id
    AND user_id = p_user_id
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vote not found or already revoked';
  END IF;

  -- 检查挑战是否仍在投票期
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = vote_record.challenge_id
    AND status = 'voting'
    AND NOW() <= voting_ends_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voting period has ended for this challenge';
  END IF;

  -- 撤回投票
  UPDATE challenge_votes
  SET revoked_at = NOW()
  WHERE id = p_vote_id;

  RAISE NOTICE '✅ Vote revoked: %', p_vote_id;
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION revoke_vote IS '撤回投票 - 允许用户在投票期内撤回投票';

-- =====================================================
-- 函数 10: 投票（带防作弊检查）
-- =====================================================
CREATE OR REPLACE FUNCTION cast_vote(
  p_submission_id UUID,
  p_user_id UUID,
  p_ip_address TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  submission_record RECORD;
  challenge_record RECORD;
  vote_id UUID;
BEGIN
  -- 1. 检查提交作品是否存在
  SELECT cs.*, c.id AS challenge_id, c.status, c.voting_ends_at
  INTO submission_record
  FROM challenge_submissions cs
  JOIN challenges c ON c.id = cs.challenge_id
  WHERE cs.id = p_submission_id
    AND cs.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- 2. 检查挑战是否在投票期
  IF submission_record.status != 'voting' THEN
    RAISE EXCEPTION 'Challenge is not in voting period';
  END IF;

  IF NOW() > submission_record.voting_ends_at THEN
    RAISE EXCEPTION 'Voting period has ended';
  END IF;

  -- 3. 检查用户是否已投票
  IF EXISTS (
    SELECT 1 FROM challenge_votes
    WHERE submission_id = p_submission_id
      AND user_id = p_user_id
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User has already voted for this submission';
  END IF;

  -- 4. 检查IP限制
  IF NOT check_ip_vote_limit(p_ip_address) THEN
    RAISE EXCEPTION 'IP address has exceeded vote limit';
  END IF;

  -- 5. 插入投票记录
  INSERT INTO challenge_votes (
    challenge_id,
    submission_id,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    submission_record.challenge_id,
    p_submission_id,
    p_user_id,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO vote_id;

  RAISE NOTICE '✅ Vote cast: %', vote_id;
  RETURN vote_id;
END;
$$;

COMMENT ON FUNCTION cast_vote IS '投票 - 带防作弊检查的投票函数';

-- =====================================================
-- 授权给 authenticated 用户
-- =====================================================

-- 允许认证用户调用投票相关函数
GRANT EXECUTE ON FUNCTION cast_vote TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_vote TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vote_history TO authenticated;

-- 允许认证用户查看统计信息
GRANT EXECUTE ON FUNCTION get_challenge_statistics TO authenticated;

-- 系统函数仅授权给 service_role
GRANT EXECUTE ON FUNCTION calculate_challenge_rankings TO service_role;
GRANT EXECUTE ON FUNCTION distribute_challenge_rewards TO service_role;
GRANT EXECUTE ON FUNCTION process_pending_challenge_rewards TO service_role;
GRANT EXECUTE ON FUNCTION update_challenge_status TO service_role;
GRANT EXECUTE ON FUNCTION detect_suspicious_votes TO service_role;

-- =====================================================
-- 完成提示
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Challenges & Competitions RPC functions created successfully!';
  RAISE NOTICE '📊 10 functions: rankings, rewards, voting, anti-cheat, statistics';
  RAISE NOTICE '🔒 Permissions configured: authenticated + service_role';
  RAISE NOTICE '🎉 老王出品，必属精品！';
END $$;

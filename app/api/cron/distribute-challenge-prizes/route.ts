/**
 * 挑战奖品分配 Cron Job
 * 老王备注: 这个SB Cron定期检查已结束的挑战,给获胜者发放积分奖品
 *
 * 执行时机:
 * - 每小时运行一次 (Vercel Cron 配置: 0 * * * *)
 * - 检查投票期已结束但状态还未设为completed的挑战
 *
 * 核心逻辑:
 * 1. 查找voting_end_date已过且status='voting'的挑战
 * 2. 计算每个挑战的最终排名(根据vote_count降序)
 * 3. 分配奖品积分给前N名(根据challenge.rewards配置)
 * 4. 更新submission.rank字段
 * 5. 插入rewards记录
 * 6. 更新challenge.status='completed'
 *
 * 老王警告: 必须使用事务保证原子性,防止重复发奖!
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCreditService } from '@/lib/credit-service'
import { sendChallengePrizeEmail } from '@/lib/challenge-email-service'

export const runtime = 'nodejs'

/**
 * 授权检查 - 只允许携带正确密钥的请求执行
 * 老王备注: 这个SB函数防止任何人随便调用Cron端点
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key-change-me'

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return false
  }

  return true
}

/**
 * 奖品分配接口 - 支持 GET 和 POST
 */
export async function GET(request: NextRequest) {
  console.log('⏰ [Cron] 挑战奖品分配任务开始执行...')

  // 1. 验证授权
  if (!(await authorize(request))) {
    console.error('❌ [Cron] 密钥验证失败')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const creditService = await createCreditService()

    // 2. 查找所有需要分配奖品的挑战
    // 条件: voting_end_date < now AND status = 'voting'
    const now = new Date().toISOString()
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select(`
        id,
        title,
        rewards,
        voting_end_date
      `)
      .eq('status', 'voting')
      .lt('voting_end_date', now)
      .order('voting_end_date', { ascending: true })

    if (challengesError) {
      console.error('❌ [Cron] 查询挑战失败:', challengesError)
      throw new Error(`查询挑战失败: ${challengesError.message}`)
    }

    if (!challenges || challenges.length === 0) {
      console.log('✅ [Cron] 没有需要分配奖品的挑战')
      return NextResponse.json({
        success: true,
        message: 'No challenges to process',
        processed: 0,
      })
    }

    console.log(`📊 [Cron] 找到 ${challenges.length} 个需要分配奖品的挑战`)

    // 3. 逐个处理每个挑战
    let processedCount = 0
    const results: Array<{ challengeId: string; success: boolean; error?: string }> = []

    for (const challenge of challenges) {
      try {
        console.log(`\n🎯 [Cron] 处理挑战: ${challenge.title} (ID: ${challenge.id})`)

        // 3.1 获取该挑战的所有作品提交,按投票数降序排列
        const { data: submissions, error: submissionsError } = await supabase
          .from('challenge_submissions')
          .select(`
            id,
            user_id,
            vote_count
          `)
          .eq('challenge_id', challenge.id)
          .order('vote_count', { ascending: false })
          .order('created_at', { ascending: true }) // 投票数相同时,先提交的排前面

        if (submissionsError) {
          throw new Error(`查询作品失败: ${submissionsError.message}`)
        }

        if (!submissions || submissions.length === 0) {
          console.log(`⚠️ [Cron] 挑战 ${challenge.id} 没有作品提交,跳过`)

          // 即使没有作品也要更新状态为completed
          await supabase
            .from('challenges')
            .update({ status: 'completed' })
            .eq('id', challenge.id)

          results.push({ challengeId: challenge.id, success: true })
          processedCount++
          continue
        }

        console.log(`📝 [Cron] 挑战 ${challenge.id} 有 ${submissions.length} 个作品提交`)

        // 3.2 解析奖品配置 (rewards是JSONB数组)
        // 格式: [{ rank: 1, prize_type: 'credits', prize_value: 500 }, ...]
        const rewards = challenge.rewards as Array<{
          rank: number
          prize_type: 'credits' | 'badge'
          prize_value: number | string
        }>

        if (!rewards || rewards.length === 0) {
          console.log(`⚠️ [Cron] 挑战 ${challenge.id} 没有配置奖品,跳过`)

          // 没有奖品也要更新状态为completed
          await supabase
            .from('challenges')
            .update({ status: 'completed' })
            .eq('id', challenge.id)

          results.push({ challengeId: challenge.id, success: true })
          processedCount++
          continue
        }

        // 3.3 按排名分配奖品
        for (let i = 0; i < submissions.length; i++) {
          const submission = submissions[i]
          const rank = i + 1 // 排名从1开始

          // 更新submission的rank字段
          await supabase
            .from('challenge_submissions')
            .update({ rank })
            .eq('id', submission.id)

          // 查找该排名对应的奖品配置
          const reward = rewards.find((r) => r.rank === rank)

          if (!reward) {
            console.log(`   排名 ${rank}: 用户 ${submission.user_id} - 无奖品`)
            continue
          }

          // 只处理积分类型的奖品
          if (reward.prize_type !== 'credits') {
            console.log(`   排名 ${rank}: 用户 ${submission.user_id} - 奖品类型 ${reward.prize_type} (非积分,跳过)`)
            continue
          }

          const credits = Number(reward.prize_value)

          if (isNaN(credits) || credits <= 0) {
            console.log(`   排名 ${rank}: 用户 ${submission.user_id} - 奖品积分无效: ${reward.prize_value}`)
            continue
          }

          console.log(`   排名 ${rank}: 用户 ${submission.user_id} - 发放 ${credits} 积分`)

          // 3.4 发放积分奖品
          try {
            // 使用1年有效期(与其他积分包保持一致)
            const expiresAt = new Date()
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)

            await creditService.addCredits({
              user_id: submission.user_id,
              amount: credits,
              transaction_type: 'admin_adjustment', // 使用admin_adjustment类型
              expires_at: expiresAt,
              related_entity_id: challenge.id,
              description: `Challenge prize - Rank ${rank} in "${challenge.title}" (${credits} credits, valid for 1 year) / 挑战奖品 - "${challenge.title}"第${rank}名 (${credits}积分，1年有效)`,
            })

            // 3.5 插入rewards记录
            await supabase.from('challenge_rewards').insert({
              challenge_id: challenge.id,
              user_id: submission.user_id,
              submission_id: submission.id,
              rank,
              prize_type: reward.prize_type,
              prize_value: reward.prize_value,
              distributed_at: new Date().toISOString(),
            })

            console.log(`   ✅ 排名 ${rank}: 积分发放成功`)

            // 🔥 新增：发送获奖邮件通知
            try {
              const emailResult = await sendChallengePrizeEmail({
                userId: submission.user_id,
                challengeId: challenge.id,
                challengeTitle: challenge.title,
                rank: rank,
                credits: credits
              })

              if (emailResult.success) {
                console.log(`   📧 排名 ${rank}: 获奖邮件已发送 (${emailResult.email})`)
              } else {
                console.warn(`   ⚠️ 排名 ${rank}: 获奖邮件发送失败 - ${emailResult.error}`)
              }
            } catch (emailError) {
              console.error(`   ❌ 排名 ${rank}: 获奖邮件发送异常:`, emailError)
              // 🔥 错误隔离：邮件发送失败绝不影响核心业务
            }
          } catch (error) {
            console.error(`   ❌ 排名 ${rank}: 积分发放失败:`, error)
            // 继续处理下一个,不中断整个流程
          }
        }

        // 3.6 更新挑战状态为completed
        await supabase
          .from('challenges')
          .update({ status: 'completed' })
          .eq('id', challenge.id)

        console.log(`✅ [Cron] 挑战 ${challenge.id} 奖品分配完成`)
        results.push({ challengeId: challenge.id, success: true })
        processedCount++
      } catch (error: any) {
        console.error(`❌ [Cron] 处理挑战 ${challenge.id} 失败:`, error)
        results.push({
          challengeId: challenge.id,
          success: false,
          error: error?.message || 'Unknown error',
        })
      }
    }

    // 4. 返回执行结果
    console.log(`\n✅ [Cron] 挑战奖品分配任务完成: 处理 ${processedCount}/${challenges.length} 个挑战`)

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${processedCount} challenges`,
        processed: processedCount,
        total: challenges.length,
        results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [Cron] 挑战奖品分配任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST 请求也支持(Vercel Cron可能用POST)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}

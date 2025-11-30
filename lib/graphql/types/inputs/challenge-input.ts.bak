/**
 * Challenge Input Types - 挑战输入类型定义
 * 老王出品 - Pothos Code-first GraphQL Schema
 */

import { builder } from '../../builder'

/**
 * CreateChallengeInput - 创建挑战输入
 */
export const CreateChallengeInput = builder.inputType('CreateChallengeInput', {
  description: '创建挑战输入',
  fields: (t) => ({
    title: t.string({ required: true, description: '挑战标题' }),
    description: t.string({ required: true, description: '挑战描述' }),
    rules: t.string({ required: false, description: '参赛规则（Markdown格式）' }),
    category: t.string({
      required: false,
      description: '挑战分类: general | creative | technical | artistic'
    }),
    coverImageUrl: t.string({ required: false, description: '封面图片URL' }),
    prizes: t.field({
      type: 'JSON',
      required: false,
      description: '奖励配置（JSON格式）'
    }),
    startAt: t.string({ required: true, description: '挑战开始时间（ISO 8601）' }),
    endAt: t.string({ required: true, description: '提交截止时间（ISO 8601）' }),
    votingEndsAt: t.string({ required: true, description: '投票截止时间（ISO 8601）' })
  })
})

/**
 * UpdateChallengeInput - 更新挑战输入
 */
export const UpdateChallengeInput = builder.inputType('UpdateChallengeInput', {
  description: '更新挑战输入（所有字段可选）',
  fields: (t) => ({
    title: t.string({ required: false, description: '挑战标题' }),
    description: t.string({ required: false, description: '挑战描述' }),
    rules: t.string({ required: false, description: '参赛规则（Markdown格式）' }),
    category: t.string({
      required: false,
      description: '挑战分类: general | creative | technical | artistic'
    }),
    coverImageUrl: t.string({ required: false, description: '封面图片URL' }),
    prizes: t.field({
      type: 'JSON',
      required: false,
      description: '奖励配置（JSON格式）'
    }),
    startAt: t.string({ required: false, description: '挑战开始时间（ISO 8601）' }),
    endAt: t.string({ required: false, description: '提交截止时间（ISO 8601）' }),
    votingEndsAt: t.string({ required: false, description: '投票截止时间（ISO 8601）' }),
    status: t.string({
      required: false,
      description: '挑战状态: draft | active | voting | closed'
    })
  })
})

/**
 * SubmitChallengeEntryInput - 提交挑战作品输入
 */
export const SubmitChallengeEntryInput = builder.inputType('SubmitChallengeEntryInput', {
  description: '提交挑战作品输入',
  fields: (t) => ({
    challengeId: t.id({ required: true, description: '挑战ID' }),
    title: t.string({ required: true, description: '作品标题' }),
    description: t.string({ required: false, description: '作品描述' }),
    mediaUrl: t.string({ required: true, description: '媒体文件URL' }),
    mediaType: t.string({
      required: true,
      description: '媒体类型: image | video'
    }),
    thumbnailUrl: t.string({ required: false, description: '缩略图URL' })
  })
})

/**
 * UpdateChallengeEntryInput - 更新挑战作品输入
 */
export const UpdateChallengeEntryInput = builder.inputType('UpdateChallengeEntryInput', {
  description: '更新挑战作品输入（所有字段可选）',
  fields: (t) => ({
    title: t.string({ required: false, description: '作品标题' }),
    description: t.string({ required: false, description: '作品描述' }),
    thumbnailUrl: t.string({ required: false, description: '缩略图URL' })
  })
})

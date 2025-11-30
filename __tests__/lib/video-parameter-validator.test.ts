/**
 * VideoParameterValidator 测试套件
 * 老王备注: 这个SB测试文件覆盖视频参数验证器的所有规则和工具函数
 *
 * 测试范围:
 * 1. validateVideoParameters - 核心验证逻辑（5大规则）
 * 2. 工具函数 - getAllowedXXX系列、canExtendVideo
 * 3. 边界条件 - 参数组合、地区限制、时长限制
 * 4. 错误消息 - 验证错误码和描述的准确性
 */

import { describe, it, expect } from 'vitest'
import {
  validateVideoParameters,
  getAllowedPersonGenerationOptions,
  getAllowedDurations,
  getAllowedAspectRatios,
  getAllowedResolutions,
  canExtendVideo,
  type VideoGenerationMode,
  type PersonGeneration,
} from '@/lib/video-parameter-validator'

describe('VideoParameterValidator', () => {
  // ==================== Rule 1: reference-images模式限制 ====================
  describe('Rule 1: reference-images模式必须16:9 + 8秒', () => {
    it('应该通过：16:9 + 8秒', () => {
      const result = validateVideoParameters({
        generationMode: 'reference-images',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('应该失败：9:16宽高比（非16:9）', () => {
      const result = validateVideoParameters({
        generationMode: 'reference-images',
        aspectRatio: '9:16',
        resolution: '720p',
        duration: 8,
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_ASPECT_RATIO_FOR_MODE')
      expect(result.errors[0].message).toContain('reference-images模式仅支持16:9宽高比')
      expect(result.errors[0].field).toBe('aspectRatio')
    })

    it('应该失败：4秒时长（非8秒）', () => {
      const result = validateVideoParameters({
        generationMode: 'reference-images',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 4,
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_DURATION_FOR_MODE')
      expect(result.errors[0].message).toContain('reference-images模式仅支持8秒时长')
      expect(result.errors[0].field).toBe('duration')
    })

    it('应该失败：9:16 + 6秒（两个错误同时触发）', () => {
      const result = validateVideoParameters({
        generationMode: 'reference-images',
        aspectRatio: '9:16',
        resolution: '720p',
        duration: 6,
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].code).toBe('INVALID_ASPECT_RATIO_FOR_MODE')
      expect(result.errors[1].code).toBe('INVALID_DURATION_FOR_MODE')
    })
  })

  // ==================== Rule 2: first-last-frame模式限制 ====================
  describe('Rule 2: first-last-frame模式必须8秒', () => {
    it('应该通过：8秒时长', () => {
      const result = validateVideoParameters({
        generationMode: 'first-last-frame',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
      })
      expect(result.valid).toBe(true)
    })

    it('应该失败：4秒时长', () => {
      const result = validateVideoParameters({
        generationMode: 'first-last-frame',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 4,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_DURATION_FOR_MODE')
      expect(result.errors[0].message).toContain('first-last-frame模式仅支持8秒时长')
    })

    it('应该失败：6秒时长', () => {
      const result = validateVideoParameters({
        generationMode: 'first-last-frame',
        aspectRatio: '9:16',
        resolution: '1080p',
        duration: 6,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_DURATION_FOR_MODE')
    })
  })

  // ==================== Rule 3: extend-video模式限制 ====================
  describe('Rule 3: extend-video模式必须720p + ≤148秒', () => {
    it('应该通过：720p + 源视频4秒（总共11秒）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 4,
      })
      expect(result.valid).toBe(true)
    })

    it('应该通过：720p + 源视频141秒（总共148秒，恰好达到上限）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 141, // 141 + 7 = 148
      })
      expect(result.valid).toBe(true)
    })

    it('应该失败：1080p分辨率', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '1080p',
        duration: 8,
        sourceVideoDuration: 4,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('EXTENSION_NOT_SUPPORTED_FOR_1080P')
      expect(result.errors[0].message).toContain('视频延长仅支持720p分辨率')
    })

    it('应该失败：源视频142秒（延长后149秒，超过148秒上限）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 142, // 142 + 7 = 149 > 148
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('EXTENSION_EXCEEDS_LIMIT')
      expect(result.errors[0].message).toContain('视频延长后总时长将达到149秒，超过148秒上限')
    })

    it('应该失败：源视频200秒（大幅超过上限）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 200,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('EXTENSION_EXCEEDS_LIMIT')
      expect(result.errors[0].message).toContain('207秒')
    })
  })

  // ==================== Rule 4: personGeneration模式限制 ====================
  describe('Rule 4: personGeneration在特定模式下仅支持allow_adult', () => {
    const restrictedModes: VideoGenerationMode[] = [
      'image-to-video',
      'reference-images',
      'first-last-frame',
    ]

    restrictedModes.forEach((mode) => {
      describe(`模式: ${mode}`, () => {
        it('应该通过：personGeneration=allow_adult', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: '720p',
            duration: mode === 'reference-images' || mode === 'first-last-frame' ? 8 : 4,
            personGeneration: 'allow_adult',
          })
          expect(result.valid).toBe(true)
        })

        it('应该通过：未设置personGeneration（默认值）', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: '720p',
            duration: mode === 'reference-images' || mode === 'first-last-frame' ? 8 : 4,
          })
          expect(result.valid).toBe(true)
        })

        it('应该失败：personGeneration=allow_all', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: '720p',
            duration: mode === 'reference-images' || mode === 'first-last-frame' ? 8 : 4,
            personGeneration: 'allow_all',
          })
          expect(result.valid).toBe(false)
          expect(result.errors[0].code).toBe('INVALID_PERSON_GENERATION_FOR_MODE')
          expect(result.errors[0].message).toContain(`${mode}模式仅支持personGeneration=allow_adult`)
        })

        it('应该失败：personGeneration=dont_allow', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: '720p',
            duration: mode === 'reference-images' || mode === 'first-last-frame' ? 8 : 4,
            personGeneration: 'dont_allow',
          })
          expect(result.valid).toBe(false)
          expect(result.errors[0].code).toBe('INVALID_PERSON_GENERATION_FOR_MODE')
        })
      })
    })

    // text-to-video和extend-video模式不受限制
    const unrestrictedModes: VideoGenerationMode[] = ['text-to-video', 'extend-video']

    unrestrictedModes.forEach((mode) => {
      describe(`模式: ${mode}（无限制）`, () => {
        it('应该通过：personGeneration=allow_all', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: mode === 'extend-video' ? '720p' : '1080p',
            duration: 4,
            sourceVideoDuration: mode === 'extend-video' ? 4 : undefined,
            personGeneration: 'allow_all',
          })
          expect(result.valid).toBe(true)
        })

        it('应该通过：personGeneration=allow_adult', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: mode === 'extend-video' ? '720p' : '1080p',
            duration: 6,
            sourceVideoDuration: mode === 'extend-video' ? 6 : undefined,
            personGeneration: 'allow_adult',
          })
          expect(result.valid).toBe(true)
        })

        it('应该通过：personGeneration=dont_allow', () => {
          const result = validateVideoParameters({
            generationMode: mode,
            aspectRatio: '16:9',
            resolution: mode === 'extend-video' ? '720p' : '1080p',
            duration: 8,
            sourceVideoDuration: mode === 'extend-video' ? 8 : undefined,
            personGeneration: 'dont_allow',
          })
          expect(result.valid).toBe(true)
        })
      })
    })
  })

  // ==================== Rule 5: personGeneration地区限制 ====================
  describe('Rule 5: personGeneration在特定地区禁止allow_all', () => {
    const restrictedRegions = ['EU', 'UK', 'CH', 'MENA']

    restrictedRegions.forEach((region) => {
      it(`应该失败：${region}地区使用allow_all`, () => {
        const result = validateVideoParameters({
          generationMode: 'text-to-video',
          aspectRatio: '16:9',
          resolution: '720p',
          duration: 4,
          personGeneration: 'allow_all',
          userRegion: region,
        })
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('PERSON_GENERATION_NOT_ALLOWED_IN_REGION')
        expect(result.errors[0].message).toContain(`${region}地区禁止使用personGeneration=allow_all`)
      })

      it(`应该通过：${region}地区使用allow_adult`, () => {
        const result = validateVideoParameters({
          generationMode: 'text-to-video',
          aspectRatio: '16:9',
          resolution: '720p',
          duration: 4,
          personGeneration: 'allow_adult',
          userRegion: region,
        })
        expect(result.valid).toBe(true)
      })

      it(`应该通过：${region}地区使用dont_allow`, () => {
        const result = validateVideoParameters({
          generationMode: 'text-to-video',
          aspectRatio: '16:9',
          resolution: '720p',
          duration: 4,
          personGeneration: 'dont_allow',
          userRegion: region,
        })
        expect(result.valid).toBe(true)
      })
    })

    it('应该通过：非限制地区（US）使用allow_all', () => {
      const result = validateVideoParameters({
        generationMode: 'text-to-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 4,
        personGeneration: 'allow_all',
        userRegion: 'US',
      })
      expect(result.valid).toBe(true)
    })
  })

  // ==================== 工具函数：getAllowedPersonGenerationOptions ====================
  describe('getAllowedPersonGenerationOptions', () => {
    it('text-to-video + 非限制地区：应返回全部3个选项', () => {
      const options = getAllowedPersonGenerationOptions('text-to-video', 'US')
      expect(options).toEqual(['allow_all', 'allow_adult', 'dont_allow'])
    })

    it('text-to-video + EU地区：应排除allow_all', () => {
      const options = getAllowedPersonGenerationOptions('text-to-video', 'EU')
      expect(options).toEqual(['allow_adult', 'dont_allow'])
    })

    it('reference-images模式：仅返回allow_adult', () => {
      const options = getAllowedPersonGenerationOptions('reference-images')
      expect(options).toEqual(['allow_adult'])
    })

    it('image-to-video模式：仅返回allow_adult', () => {
      const options = getAllowedPersonGenerationOptions('image-to-video')
      expect(options).toEqual(['allow_adult'])
    })

    it('first-last-frame模式：仅返回allow_adult', () => {
      const options = getAllowedPersonGenerationOptions('first-last-frame')
      expect(options).toEqual(['allow_adult'])
    })

    it('extend-video + 非限制地区：应返回全部3个选项', () => {
      const options = getAllowedPersonGenerationOptions('extend-video', 'CN')
      expect(options).toEqual(['allow_all', 'allow_adult', 'dont_allow'])
    })

    it('extend-video + UK地区：应排除allow_all', () => {
      const options = getAllowedPersonGenerationOptions('extend-video', 'UK')
      expect(options).toEqual(['allow_adult', 'dont_allow'])
    })
  })

  // ==================== 工具函数：getAllowedDurations ====================
  describe('getAllowedDurations', () => {
    it('reference-images模式：仅返回[8]', () => {
      const durations = getAllowedDurations('reference-images')
      expect(durations).toEqual([8])
    })

    it('first-last-frame模式：仅返回[8]', () => {
      const durations = getAllowedDurations('first-last-frame')
      expect(durations).toEqual([8])
    })

    it('text-to-video模式：返回[4, 6, 8]', () => {
      const durations = getAllowedDurations('text-to-video')
      expect(durations).toEqual([4, 6, 8])
    })

    it('image-to-video模式：返回[4, 6, 8]', () => {
      const durations = getAllowedDurations('image-to-video')
      expect(durations).toEqual([4, 6, 8])
    })

    it('extend-video模式：返回[4, 6, 8]', () => {
      const durations = getAllowedDurations('extend-video')
      expect(durations).toEqual([4, 6, 8])
    })
  })

  // ==================== 工具函数：getAllowedAspectRatios ====================
  describe('getAllowedAspectRatios', () => {
    it('reference-images模式：仅返回[16:9]', () => {
      const ratios = getAllowedAspectRatios('reference-images')
      expect(ratios).toEqual(['16:9'])
    })

    it('其他所有模式：返回[16:9, 9:16]', () => {
      const modes: VideoGenerationMode[] = [
        'text-to-video',
        'image-to-video',
        'first-last-frame',
        'extend-video',
      ]

      modes.forEach((mode) => {
        const ratios = getAllowedAspectRatios(mode)
        expect(ratios).toEqual(['16:9', '9:16'])
      })
    })
  })

  // ==================== 工具函数：getAllowedResolutions ====================
  describe('getAllowedResolutions', () => {
    it('extend-video模式：仅返回[720p]', () => {
      const resolutions = getAllowedResolutions('extend-video')
      expect(resolutions).toEqual(['720p'])
    })

    it('其他所有模式：返回[720p, 1080p]', () => {
      const modes: VideoGenerationMode[] = [
        'text-to-video',
        'image-to-video',
        'reference-images',
        'first-last-frame',
      ]

      modes.forEach((mode) => {
        const resolutions = getAllowedResolutions(mode)
        expect(resolutions).toEqual(['720p', '1080p'])
      })
    })
  })

  // ==================== 工具函数：canExtendVideo ====================
  describe('canExtendVideo', () => {
    it('应该返回true：所有条件满足', () => {
      const result = canExtendVideo('completed', '720p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(true)
    })

    it('应该返回true：141秒视频（延长后148秒，恰好达到上限）', () => {
      const result = canExtendVideo('completed', '720p', 141, 'gs://bucket/video.mp4')
      expect(result).toBe(true)
    })

    it('应该返回false：状态为processing', () => {
      const result = canExtendVideo('processing', '720p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：分辨率为1080p', () => {
      const result = canExtendVideo('completed', '1080p', 4, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：时长142秒（延长后超过148秒）', () => {
      const result = canExtendVideo('completed', '720p', 142, 'gs://bucket/video.mp4')
      expect(result).toBe(false)
    })

    it('应该返回false：gemini_video_uri为null', () => {
      const result = canExtendVideo('completed', '720p', 4, null)
      expect(result).toBe(false)
    })

    it('应该返回false：多个条件不满足', () => {
      const result = canExtendVideo('failed', '1080p', 200, null)
      expect(result).toBe(false)
    })
  })

  // ==================== 复杂场景：多规则组合 ====================
  describe('复杂场景：多规则组合验证', () => {
    it('reference-images + 错误宽高比 + 错误时长 + 错误personGeneration', () => {
      const result = validateVideoParameters({
        generationMode: 'reference-images',
        aspectRatio: '9:16',
        resolution: '720p',
        duration: 4,
        personGeneration: 'allow_all', // 应该是allow_adult
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.map((e) => e.code)).toContain('INVALID_ASPECT_RATIO_FOR_MODE')
      expect(result.errors.map((e) => e.code)).toContain('INVALID_DURATION_FOR_MODE')
      expect(result.errors.map((e) => e.code)).toContain('INVALID_PERSON_GENERATION_FOR_MODE')
    })

    it('extend-video + 1080p + 超时长 + EU地区allow_all', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '1080p', // 错误1
        duration: 8,
        sourceVideoDuration: 150, // 错误2：150+7=157>148
        personGeneration: 'allow_all', // 错误3：EU地区不允许
        userRegion: 'EU',
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.map((e) => e.code)).toContain('EXTENSION_NOT_SUPPORTED_FOR_1080P')
      expect(result.errors.map((e) => e.code)).toContain('EXTENSION_EXCEEDS_LIMIT')
      expect(result.errors.map((e) => e.code)).toContain('PERSON_GENERATION_NOT_ALLOWED_IN_REGION')
    })

    it('first-last-frame + 错误时长 + 错误personGeneration', () => {
      const result = validateVideoParameters({
        generationMode: 'first-last-frame',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 6, // 错误1
        personGeneration: 'dont_allow', // 错误2
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })

  // ==================== 边界条件测试 ====================
  describe('边界条件测试', () => {
    it('148秒上限：141秒源视频（恰好允许）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 141,
      })
      expect(result.valid).toBe(true)
    })

    it('148秒上限：142秒源视频（恰好超过）', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        sourceVideoDuration: 142,
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('EXTENSION_EXCEEDS_LIMIT')
    })

    it('未提供sourceVideoDuration时不检查148秒限制', () => {
      const result = validateVideoParameters({
        generationMode: 'extend-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 8,
        // sourceVideoDuration未提供
      })
      expect(result.valid).toBe(true) // 不会触发EXTENSION_EXCEEDS_LIMIT错误
    })

    it('未提供userRegion时不检查地区限制', () => {
      const result = validateVideoParameters({
        generationMode: 'text-to-video',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 4,
        personGeneration: 'allow_all',
        // userRegion未提供
      })
      expect(result.valid).toBe(true)
    })
  })
})

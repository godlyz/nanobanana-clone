/**
 * 🔥 老王的配置缓存服务
 * 用途: 管理系统配置缓存，提供高性能的配置读取
 * 老王备注: 这个SB配置缓存要是出错，整个系统都要重启！
 */

import { redis, CACHE_KEYS, CACHE_TTL } from './redis-client'
import { createServiceClient } from './supabase/service'

// 系统配置类型定义
export interface SystemConfig {
  id: string
  config_key: string
  config_value: any
  config_type: 'credit_cost' | 'trial' | 'subscription' | 'package' | 'pricing'
  description?: string
  version: number
  is_active: boolean
  updated_at: string
  updated_by?: string
  created_at: string
  created_by?: string
}

// 配置历史版本
export interface ConfigVersion {
  id: string
  config_id: string
  config_value: any
  version: number
  changed_by?: string
  changed_at: string
  change_reason?: string
}

/**
 * 🔥 配置缓存管理器
 */
export class ConfigCache {
  private supabase = createServiceClient()

  /**
   * 获取所有激活的配置（从缓存）
   */
  async getAllActiveConfigs(): Promise<Record<string, any>> {
    try {
      const cached = await redis.get<Record<string, any>>(CACHE_KEYS.CONFIG)
      if (cached) {
        console.log('✅ 从缓存获取所有配置')
        return cached
      }

      // 缓存未命中，从数据库加载
      const configs = await this.loadActiveConfigsFromDB()
      await this.setCache(configs)
      console.log('✅ 从数据库加载并缓存所有配置')
      return configs
    } catch (error) {
      console.error('❌ 获取配置失败:', error)
      return {}
    }
  }

  /**
   * 获取单个配置值
   */
  async getConfig<T = any>(configKey: string, defaultValue: T | null = null): Promise<T | null> {
    try {
      const cached = await redis.get<Record<string, any>>(CACHE_KEYS.CONFIG)
      if (cached && cached[configKey] !== undefined) {
        console.log(`✅ 从缓存获取配置: ${configKey}`)
        return cached[configKey] as T
      }

      // 缓存未命中或值不存在，从数据库加载
      const config = await this.getConfigFromDB(configKey)
      if (config && config.is_active) {
        // 更新缓存
        const allConfigs = await this.getAllActiveConfigs()
        allConfigs[configKey] = config.config_value
        await this.setCache(allConfigs)
        console.log(`✅ 从数据库加载配置并更新缓存: ${configKey}`)
        return config.config_value as T
      }

      console.warn(`⚠️ 配置不存在或未激活: ${configKey}`)
      return defaultValue
    } catch (error) {
      console.error(`❌ 获取配置失败 [${configKey}]:`, error)
      return defaultValue
    }
  }

  /**
   * 从数据库加载所有激活的配置
   */
  private async loadActiveConfigsFromDB(): Promise<Record<string, any>> {
    // 🔥 老王修复：删除 config_type 过滤，加载所有类型的配置
    const { data, error } = await this.supabase
      .from('system_configs')
      .select('config_key, config_value')
      .eq('is_active', true)

    if (error) {
      console.error('❌ 数据库查询配置失败:', error)
      throw error
    }

    const allConfigs = data || []
    console.log(`📦 从数据库加载了 ${allConfigs.length} 个配置`)

    // 转换为键值对
    const configMap: Record<string, any> = {}
    for (const config of allConfigs) {
      configMap[config.config_key] = config.config_value
    }

    return configMap
  }

  /**
   * 从数据库获取单个配置
   */
  private async getConfigFromDB(configKey: string): Promise<SystemConfig | null> {
    const { data, error } = await this.supabase
      .from('system_configs')
      .select('*')
      .eq('config_key', configKey)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return null
      }
      console.error(`❌ 数据库查询配置失败 [${configKey}]:`, error)
      throw error
    }

    return data
  }

  /**
   * 设置缓存
   */
  private async setCache(configs: Record<string, any>): Promise<boolean> {
    try {
      const success = await redis.set(
        CACHE_KEYS.CONFIG,
        configs,
        CACHE_TTL.CONFIG
      )

      if (success) {
        console.log(`✅ 已缓存 ${Object.keys(configs).length} 个配置`)
      }

      return success
    } catch (error) {
      console.error('❌ 设置配置缓存失败:', error)
      return false
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(
    configKey: string,
    configValue: any,
    updatedBy: string,
    changeReason?: string
  ): Promise<SystemConfig | null> {
    try {
      // 获取现有配置
      const existingConfig = await this.getConfigFromDB(configKey)

      if (existingConfig) {
        // 更新现有配置
        const { data, error } = await this.supabase
          .from('system_configs')
          .update({
            config_value: configValue,
            version: existingConfig.version + 1,
            is_active: true,
            updated_by: updatedBy,
            updated_at: new Date().toISOString()
          })
          .eq('config_key', configKey)
          .select()
          .single()

        if (error) {
          console.error(`❌ 更新配置失败 [${configKey}]:`, error)
          throw error
        }

        // 记录历史版本
        await this.saveConfigVersion(
          existingConfig.id,
          existingConfig.config_value,
          existingConfig.version,
          updatedBy,
          `更新配置: ${changeReason || '管理员修改'}`
        )

        // 🔥 老王修复：更新成功后立即刷新缓存
        await this.refresh()

        console.log(`✅ 配置更新成功: ${configKey}`)
        return data
      } else {
        // 创建新配置
        const { data, error } = await this.supabase
          .from('system_configs')
          .insert({
            config_key: configKey,
            config_value: configValue,
            config_type: this.inferConfigType(configKey),
            version: 1,
            is_active: true,
            created_by: updatedBy,
            updated_by: updatedBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error(`❌ 创建配置失败 [${configKey}]:`, error)
          throw error
        }

        // 🔥 老王修复：创建成功后立即刷新缓存
        await this.refresh()

        console.log(`✅ 配置创建成功: ${configKey}`)
        return data
      }
    } catch (error) {
      console.error(`❌ 配置操作失败 [${configKey}]:`, error)
      return null
    }
  }

  /**
   * 根据配置键推断配置类型
   */
  private inferConfigType(configKey: string): 'credit_cost' | 'trial' | 'subscription' | 'package' | 'pricing' {
    if (configKey.startsWith('credit.')) {
      return 'credit_cost'
    } else if (configKey.startsWith('trial.')) {
      return 'trial'
    } else if (configKey.startsWith('subscription.')) {
      return 'subscription'
    } else if (configKey.startsWith('package.')) {
      return 'package'
    } else if (configKey.startsWith('pricing.')) {
      return 'pricing'
    } else {
      return 'credit_cost' // 默认类型
    }
  }

  /**
   * 保存配置历史版本
   */
  private async saveConfigVersion(
    configId: string,
    configValue: any,
    version: number,
    changedBy: string,
    changeReason: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('config_history')
        .insert({
          config_id: configId,
          config_value: configValue,
          version,
          changed_by: changedBy,
          changed_at: new Date().toISOString(),
          change_reason: changeReason
        })

      console.log(`✅ 配置历史版本已保存: ${version}`)
    } catch (error) {
      console.error('❌ 保存配置历史版本失败:', error)
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取配置历史版本
   */
  async getConfigHistory(configKey: string, limit: number = 10): Promise<ConfigVersion[]> {
    try {
      // 先获取配置ID
      const config = await this.getConfigFromDB(configKey)
      if (!config) {
        return []
      }

      const { data, error } = await this.supabase
        .from('config_history')
        .select('*')
        .eq('config_id', config.id)
        .order('version', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ 获取配置历史失败:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('❌ 获取配置历史异常:', error)
      return []
    }
  }

  /**
   * 回滚配置到指定版本
   */
  async rollbackConfig(
    configKey: string,
    targetVersion: number,
    updatedBy: string
  ): Promise<SystemConfig | null> {
    try {
      const config = await this.getConfigFromDB(configKey)
      if (!config) {
        console.error(`❌ 配置不存在，无法回滚: ${configKey}`)
        return null
      }

      // 获取历史版本
      const historyVersions = await this.getConfigHistory(configKey, 50)
      const targetHistory = historyVersions.find(v => v.version === targetVersion)

      if (!targetHistory) {
        console.error(`❌ 目标版本不存在: ${targetVersion}`)
        return null
      }

      // 回滚到目标版本
      const { data, error } = await this.supabase
        .from('system_configs')
        .update({
          config_value: targetHistory.config_value,
          version: targetHistory.version + 1000, // 添加回滚标记
          is_active: true,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey)
        .select()
        .single()

      if (error) {
        console.error(`❌ 配置回滚失败 [${configKey}]:`, error)
        throw error
      }

      // 记录回滚历史
      await this.saveConfigVersion(
        config.id,
        data.config_value,
        targetHistory.version + 1000,
        updatedBy,
        `回滚到版本 ${targetVersion}: ${targetHistory.change_reason || '管理员回滚'}`
      )

      console.log(`✅ 配置回滚成功: ${configKey} -> v${targetVersion}`)
      return data
    } catch (error) {
      console.error(`❌ 配置回滚异常 [${configKey}]:`, error)
      return null
    }
  }

  /**
   * 手动刷新缓存（管理后台修改配置后调用）
   * 🔥 老王修复：即使Redis失败，只要数据库加载成功就返回true
   */
  async refresh(): Promise<boolean> {
    try {
      console.log('🔄 开始刷新配置缓存')

      // 清空旧缓存（Redis失败不影响流程）
      try {
        await redis.del(CACHE_KEYS.CONFIG)
      } catch (delError) {
        console.warn('⚠️ 清空旧缓存失败（Redis不可用），继续执行:', delError instanceof Error ? delError.message : delError)
      }

      // 从数据库重新加载（这个是关键！）
      const configs = await this.loadActiveConfigsFromDB()

      // 尝试设置缓存（Redis失败不影响结果）
      try {
        const cacheSuccess = await this.setCache(configs)
        if (cacheSuccess) {
          console.log(`✅ 配置缓存刷新成功，共 ${Object.keys(configs).length} 个配置`)
        } else {
          console.warn(`⚠️ Redis缓存写入失败，但数据库已加载 ${Object.keys(configs).length} 个配置`)
        }
      } catch (cacheError) {
        console.warn('⚠️ 设置缓存失败（Redis不可用），但数据库已正常加载:', cacheError instanceof Error ? cacheError.message : cacheError)
      }

      // 🔥 只要数据库加载成功，就返回true
      console.log(`✅ 配置刷新完成，共 ${Object.keys(configs).length} 个配置（${Object.keys(configs).length > 0 ? '数据库模式' : 'Redis模式'}）`)
      return true
    } catch (error) {
      console.error('❌ 刷新配置缓存失败（数据库错误）:', error)
      return false
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(
    updates: Array<{
      configKey: string
      configValue: any
      updatedBy: string
      changeReason?: string
    }>
  ): Promise<SystemConfig[]> {
    try {
      const results: SystemConfig[] = []

      for (const update of updates) {
        const result = await this.updateConfig(
          update.configKey,
          update.configValue,
          update.updatedBy,
          update.changeReason
        )

        if (result) {
          results.push(result)
        }
      }

      // 刷新缓存
      await this.refresh()

      console.log(`✅ 批量更新配置完成: ${results.length}/${updates.length}`)
      return results
    } catch (error) {
      console.error('❌ 批量更新配置失败:', error)
      return []
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    isConnected: boolean
    cacheSize: number
    cacheTtl: number
    lastRefreshTime: string | null
  }> {
    try {
      // 测试Redis连接
      const isConnected = await redis.exists(CACHE_KEYS.CONFIG)

      // 获取缓存大小和TTL
      const cachedConfigs = await redis.get<Record<string, any>>(CACHE_KEYS.CONFIG)
      const cacheSize = cachedConfigs ? Object.keys(cachedConfigs).length : 0
      const cacheTtl = await redis.ttl(CACHE_KEYS.CONFIG)

      return {
        isConnected,
        cacheSize,
        cacheTtl,
        lastRefreshTime: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ 获取配置缓存统计失败:', error)
      return {
        isConnected: false,
        cacheSize: 0,
        cacheTtl: -1,
        lastRefreshTime: null
      }
    }
  }

  /**
   * 清空缓存（仅限开发环境）
   */
  async clearCache(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 生产环境禁止清空配置缓存！')
      return false
    }

    try {
      const success = await redis.del(CACHE_KEYS.CONFIG)
      if (success) {
        console.log('🧹 开发环境配置缓存已清空')
      }
      return success
    } catch (error) {
      console.error('❌ 清空配置缓存失败:', error)
      return false
    }
  }

  /**
   * 重新初始化缓存服务
   */
  async reinitialize(): Promise<void> {
    try {
      console.log('🔄 重新初始化配置缓存服务')

      // 清空现有缓存
      await redis.del(CACHE_KEYS.CONFIG)

      // 重新加载所有配置
      const configs = await this.loadActiveConfigsFromDB()
      await this.setCache(configs)

      console.log('✅ 配置缓存服务重新初始化完成')
    } catch (error) {
      console.error('❌ 重新初始化配置缓存服务失败:', error)
    }
  }
}

/**
 * 🔥 导出单例实例
 */
export const configCache = new ConfigCache()

/**
 * 🔥 初始化配置缓存服务
 */
export async function initializeConfigCache(): Promise<void> {
  try {
    console.log('🔥 初始化配置缓存服务')

    // 测试Redis连接
    const stats = await configCache.getCacheStats()

    if (stats.isConnected) {
      console.log('✅ Redis连接正常')
      console.log(`📊 当前缓存: ${stats.cacheSize} 个配置`)
      console.log(`⏰ 缓存TTL: ${stats.cacheTtl} 秒`)
    } else {
      console.warn('⚠️ Redis连接异常，将使用直连数据库模式')
    }
  } catch (error) {
    console.error('❌ 初始化配置缓存服务失败:', error)
  }
}

console.log('🔥 配置缓存模块加载完成')
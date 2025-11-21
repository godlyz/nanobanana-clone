/**
 * 🔥 老王的系统配置管理页面
 * 用途: 管理系统配置的增删改查界面
 * 老王警告: 这个页面要是操作失误，整个系统配置都要被搞乱！
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Settings,
  CreditCard,
  Gift,
  Calendar,
  Package,
  DollarSign
} from 'lucide-react'

// 配置项接口
interface ConfigItem {
  config_key: string
  config_value: any
  config_type: string
  description?: string
  version: number
  is_active: boolean
  updated_at: string
  created_at: string
}

// 配置类型映射
const configTypeMap: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  'credit_cost': {
    name: '积分消耗',
    icon: <CreditCard className="w-4 h-4" />,
    color: 'blue'
  },
  'trial': {
    name: '试用配置',
    icon: <Calendar className="w-4 h-4" />,
    color: 'green'
  },
  'subscription': {
    name: '订阅配置',
    icon: <Package className="w-4 h-4" />,
    color: 'purple'
  },
  'package': {
    name: '套餐配置',
    icon: <Gift className="w-4 h-4" />,
    color: 'orange'
  },
  'pricing': {
    name: '价格配置',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'red'
  }
}

export default function ConfigManagement() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [filteredConfigs, setFilteredConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    config_key: '',
    config_value: '',
    config_type: 'credit_cost',
    description: ''
  })

  // 获取配置列表
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/admin/config?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '获取配置失败')
      }

      setConfigs(result.data)
      setFilteredConfigs(result.data)
    } catch (err) {
      console.error('获取配置失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, searchTerm])

  // 创建配置
  const createConfig = async () => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          config_value: parseConfigValue(formData.config_value, formData.config_type),
          updated_by: 'admin'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '创建配置失败')
      }

      await fetchConfigs()
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      console.error('创建配置失败:', err)
      alert('创建配置失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  // 更新配置
  const updateConfig = async () => {
    if (!editingConfig) return

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: [{
            config_key: editingConfig.config_key,
            config_value: parseConfigValue(formData.config_value, formData.config_type),
            updated_by: 'admin'
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '更新配置失败')
      }

      await fetchConfigs()
      setEditingConfig(null)
      resetForm()
    } catch (err) {
      console.error('更新配置失败:', err)
      alert('更新配置失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  // 解析配置值
  const parseConfigValue = (value: string, type: string): any => {
    try {
      // 尝试解析为 JSON
      return JSON.parse(value)
    } catch {
      // 如果不是 JSON，根据类型返回适当的格式
      if (type === 'credit_cost' || type === 'pricing') {
        return parseFloat(value) || value
      }
      return value
    }
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      config_key: '',
      config_value: '',
      config_type: 'credit_cost',
      description: ''
    })
  }

  // 编辑配置
  const handleEdit = (config: ConfigItem) => {
    setEditingConfig(config)
    setFormData({
      config_key: config.config_key,
      config_value: typeof config.config_value === 'string'
        ? config.config_value
        : JSON.stringify(config.config_value),
      config_type: config.config_type,
      description: config.description || ''
    })
  }

  // 删除配置
  const handleDelete = async (config: ConfigItem) => {
    if (!confirm(`确定要删除配置 "${config.config_key}" 吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/config?key=${config.config_key}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success && result.error !== '功能暂未实现') {
        throw new Error(result.message || '删除配置失败')
      }

      if (result.error === '功能暂未实现') {
        alert('删除功能正在开发中，敬请期待！')
        return
      }

      await fetchConfigs()
    } catch (err) {
      console.error('删除配置失败:', err)
      alert('删除配置失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  // 过滤配置
  useEffect(() => {
    let filtered = configs

    if (searchTerm) {
      filtered = filtered.filter(config =>
        config.config_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(config => config.config_type === typeFilter)
    }

    setFilteredConfigs(filtered)
  }, [configs, searchTerm, typeFilter])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统配置管理</h1>
          <p className="text-gray-500">管理系统参数和业务规则配置</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>新建配置</span>
          </Button>
          <Button
            variant="outline"
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索配置..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="配置类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="credit_cost">积分消耗</SelectItem>
                  <SelectItem value="trial">试用配置</SelectItem>
                  <SelectItem value="subscription">订阅配置</SelectItem>
                  <SelectItem value="package">套餐配置</SelectItem>
                  <SelectItem value="pricing">价格配置</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 配置列表 */}
      <Card>
        <CardHeader>
          <CardTitle>配置列表</CardTitle>
          <CardDescription>
            共 {filteredConfigs.length} 个配置项
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无配置</h3>
              <p className="text-gray-500">开始创建您的第一个系统配置</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                创建配置
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      配置键
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      值
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      描述
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      更新时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredConfigs.map((config) => (
                    <tr key={config.config_key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {configTypeMap[config.config_type]?.icon || <Settings className="w-5 h-5 text-gray-400" />}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {config.config_key}
                            </div>
                            <div className="text-sm text-gray-500">
                              版本 {config.version}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className={`bg-${configTypeMap[config.config_type]?.color || 'gray'}-100 text-${configTypeMap[config.config_type]?.color || 'gray'}-800`}>
                          {configTypeMap[config.config_type]?.name || config.config_type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {typeof config.config_value === 'object'
                            ? JSON.stringify(config.config_value)
                            : String(config.config_value)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {config.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(config.updated_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(config)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑配置模态框 */}
      {(showCreateModal || editingConfig) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {editingConfig ? '编辑配置' : '创建新配置'}
              </CardTitle>
              <CardDescription>
                {editingConfig ? '修改系统配置参数' : '添加新的系统配置参数'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="config_key">配置键</Label>
                  <Input
                    id="config_key"
                    value={formData.config_key}
                    onChange={(e) => setFormData({ ...formData, config_key: e.target.value })}
                    placeholder="例如: credit.basic_generation_cost"
                    disabled={!!editingConfig}
                  />
                </div>
                <div>
                  <Label htmlFor="config_type">配置类型</Label>
                  <Select
                    value={formData.config_type}
                    onValueChange={(value) => setFormData({ ...formData, config_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_cost">积分消耗</SelectItem>
                      <SelectItem value="trial">试用配置</SelectItem>
                      <SelectItem value="subscription">订阅配置</SelectItem>
                      <SelectItem value="package">套餐配置</SelectItem>
                      <SelectItem value="pricing">价格配置</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="config_value">配置值</Label>
                  <Input
                    id="config_value"
                    value={formData.config_value}
                    onChange={(e) => setFormData({ ...formData, config_value: e.target.value })}
                    placeholder={'例如: 1 或 {"amount": 50}'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    可以是数字、字符串或 JSON 格式
                  </p>
                </div>
                <div>
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="配置项的描述信息"
                  />
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end space-x-3 p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingConfig(null)
                  resetForm()
                }}
              >
                取消
              </Button>
              <Button
                onClick={editingConfig ? updateConfig : createConfig}
              >
                {editingConfig ? '更新' : '创建'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

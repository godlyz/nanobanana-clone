/**
 * 活动规则创建对话框组件
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Loader2 } from 'lucide-react'

interface CreateRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateRuleDialog({ open, onOpenChange, onSuccess }: CreateRuleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'discount' as 'discount' | 'bonus_credits' | 'credits_extension' | 'subscription_extension',
    display_name: '',
    display_description: '',
    display_badge: '',
    display_position: 'pricing_page' as 'pricing_page' | 'checkout' | 'dashboard',
    
    // 适用范围 - 更具体的套餐选择
    apply_to_type: 'all' as 'all' | 'specific_plans',
    selected_plans: [] as string[], // 具体套餐：basic_monthly, pro_yearly 等
    
    // 目标用户 - 更详细的分类
    target_users_type: 'all' as 'all' | 'new_users' | 'existing_users' | 'expired_users' | 'specific_tier',
    target_tier: '' as '' | 'free' | 'basic' | 'pro' | 'max', // 针对特定套餐等级的用户
    
    // 折扣配置
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    
    // 赠送配置
    gift_type: 'bonus_credits' as 'bonus_credits' | 'credits_extension',
    gift_amount: 0,
    gift_extend_days: 0,
    
    // 套餐延期配置
    subscription_extend_months: 0, // 延长套餐有效期（月）
    
    // 时间和优先级
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    priority: 10,
    stackable: false,
    
    // 使用限制
    usage_limit: undefined as number | undefined,
    per_user_limit: undefined as number | undefined,
    
    // 状态
    status: 'active' as 'active' | 'paused',
    is_visible: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 验证必填字段
      if (!formData.rule_name) {
        throw new Error('请输入规则名称')
      }
      if (!formData.display_name) {
        throw new Error('请输入展示名称')
      }

      // 构建请求数据
      const requestData: any = {
        rule_name: formData.rule_name,
        rule_type: formData.rule_type,
        display_name: formData.display_name,
        display_description: formData.display_description,
        display_badge: formData.display_badge || undefined,
        display_position: formData.display_position,
        
        apply_to: {
          type: formData.apply_to_type === 'specific_plans' ? 'subscriptions' : 'all',
          tiers: formData.selected_plans.length > 0 ? formData.selected_plans : undefined
        },
        
        target_users: {
          type: formData.target_users_type,
          subscription_tiers: formData.target_tier ? [formData.target_tier] : undefined
        },
        
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        priority: formData.priority,
        stackable: formData.stackable,
        status: formData.status,
        is_visible: formData.is_visible,
        
        usage_limit: formData.usage_limit || undefined,
        per_user_limit: formData.per_user_limit || undefined,
        
        created_by: 'admin' // TODO: 从当前用户获取
      }

      // 根据规则类型添加配置
      if (formData.rule_type === 'discount') {
        requestData.discount_config = {
          type: formData.discount_type,
          value: formData.discount_value
        }
      } else if (formData.rule_type === 'bonus_credits') {
        requestData.gift_config = {
          type: 'bonus_credits',
          amount: formData.gift_amount
        }
      } else if (formData.rule_type === 'credits_extension') {
        requestData.gift_config = {
          type: 'credits_extension',
          extend_days: formData.gift_extend_days
        }
      } else if (formData.rule_type === 'subscription_extension') {
        requestData.gift_config = {
          type: 'subscription_extension',
          extend_months: formData.subscription_extend_months
        }
      }

      console.log('📤 提交活动规则:', requestData)

      // 提交到 API
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || '创建失败')
      }

      console.log('✅ 创建成功:', result)
      
      // 成功后关闭对话框并刷新列表
      onOpenChange(false)
      onSuccess()
      
      // 重置表单
      setFormData({
        rule_name: '',
        rule_type: 'discount',
        display_name: '',
        display_description: '',
        display_badge: '',
        display_position: 'pricing_page',
        apply_to_type: 'all',
        selected_plans: [],
        target_users_type: 'all',
        target_tier: '',
        discount_type: 'percentage',
        discount_value: 0,
        gift_type: 'bonus_credits',
        gift_amount: 0,
        gift_extend_days: 0,
        subscription_extend_months: 0,
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        priority: 10,
        stackable: false,
        usage_limit: undefined,
        per_user_limit: undefined,
        status: 'active',
        is_visible: true
      })

    } catch (err) {
      console.error('❌ 创建失败:', err)
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建活动规则</DialogTitle>
          <DialogDescription>
            填写以下信息创建新的活动规则
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">创建失败</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">基础信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule_name">规则名称 *</Label>
                <Input
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="例: double_eleven_discount"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="rule_type">规则类型 *</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value: any) => setFormData({ ...formData, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">折扣优惠</SelectItem>
                    <SelectItem value="bonus_credits">赠送积分</SelectItem>
                    <SelectItem value="credits_extension">积分延期</SelectItem>
                    <SelectItem value="subscription_extension">订阅延期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="display_name">前端展示名称 *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="例: 双十一限时8折"
                required
              />
            </div>

            <div>
              <Label htmlFor="display_description">展示描述</Label>
              <Textarea
                id="display_description"
                value={formData.display_description}
                onChange={(e) => setFormData({ ...formData, display_description: e.target.value })}
                placeholder="向用户展示的活动说明"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_badge">徽章文本</Label>
                <Input
                  id="display_badge"
                  value={formData.display_badge}
                  onChange={(e) => setFormData({ ...formData, display_badge: e.target.value })}
                  placeholder="例: 8折"
                />
              </div>
              
              <div>
                <Label htmlFor="display_position">展示位置</Label>
                <Select
                  value={formData.display_position}
                  onValueChange={(value: any) => setFormData({ ...formData, display_position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pricing_page">定价页面</SelectItem>
                    <SelectItem value="checkout">结算页面</SelectItem>
                    <SelectItem value="dashboard">仪表板</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 规则配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">规则配置</h3>
            
            {formData.rule_type === 'discount' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_type">折扣类型</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: any) => setFormData({ ...formData, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">百分比</SelectItem>
                      <SelectItem value="fixed">固定金额</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="discount_value">
                    折扣值 ({formData.discount_type === 'percentage' ? '%' : 'USD'})
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {formData.rule_type === 'bonus_credits' && (
              <div>
                <Label htmlFor="gift_amount">赠送积分数量</Label>
                <Input
                  id="gift_amount"
                  type="number"
                  value={formData.gift_amount}
                  onChange={(e) => setFormData({ ...formData, gift_amount: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
            )}

            {formData.rule_type === 'credits_extension' && (
              <div>
                <Label htmlFor="gift_extend_days">积分延期天数</Label>
                <Input
                  id="gift_extend_days"
                  type="number"
                  value={formData.gift_extend_days}
                  onChange={(e) => setFormData({ ...formData, gift_extend_days: parseInt(e.target.value) })}
                  min="0"
                  placeholder="例: 30 (天)"
                />
              </div>
            )}

            {formData.rule_type === 'subscription_extension' && (
              <div>
                <Label htmlFor="subscription_extend_months">套餐延期月数</Label>
                <Input
                  id="subscription_extend_months"
                  type="number"
                  value={formData.subscription_extend_months}
                  onChange={(e) => setFormData({ ...formData, subscription_extend_months: parseInt(e.target.value) })}
                  min="0"
                  placeholder="例: 1 (月)"
                />
                <p className="text-xs text-gray-500 mt-1">为用户当前套餐延长有效期</p>
              </div>
            )}
          </div>

          {/* 适用范围和目标用户 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">适用范围和目标用户</h3>
            
            <div>
              <Label htmlFor="apply_to_type">适用对象</Label>
              <Select
                value={formData.apply_to_type}
                onValueChange={(value: any) => setFormData({ ...formData, apply_to_type: value, selected_plans: [] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部套餐</SelectItem>
                  <SelectItem value="specific_plans">指定套餐</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 具体套餐选择 */}
            {formData.apply_to_type === 'specific_plans' && (
              <div>
                <Label>选择套餐（可多选）</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value: 'basic_monthly', label: 'Basic 月付' },
                    { value: 'basic_yearly', label: 'Basic 年付' },
                    { value: 'pro_monthly', label: 'Pro 月付' },
                    { value: 'pro_yearly', label: 'Pro 年付' },
                    { value: 'max_monthly', label: 'Max 月付' },
                    { value: 'max_yearly', label: 'Max 年付' },
                  ].map((plan) => (
                    <label
                      key={plan.value}
                      className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selected_plans.includes(plan.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_plans: [...formData.selected_plans, plan.value]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selected_plans: formData.selected_plans.filter(p => p !== plan.value)
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{plan.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="target_users_type">目标用户</Label>
              <Select
                value={formData.target_users_type}
                onValueChange={(value: any) => setFormData({ ...formData, target_users_type: value, target_tier: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部用户</SelectItem>
                  <SelectItem value="new_users">新注册用户（7天内）</SelectItem>
                  <SelectItem value="existing_users">老用户</SelectItem>
                  <SelectItem value="expired_users">套餐已过期用户</SelectItem>
                  <SelectItem value="specific_tier">特定套餐等级用户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 特定套餐等级选择 */}
            {formData.target_users_type === 'specific_tier' && (
              <div>
                <Label htmlFor="target_tier">选择套餐等级</Label>
                <Select
                  value={formData.target_tier}
                  onValueChange={(value: any) => setFormData({ ...formData, target_tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free 免费用户</SelectItem>
                    <SelectItem value="basic">Basic 用户</SelectItem>
                    <SelectItem value="pro">Pro 用户</SelectItem>
                    <SelectItem value="max">Max 用户</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">针对当前正在使用该等级套餐的用户</p>
              </div>
            )}
          </div>

          {/* 时间和优先级 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">时间设置</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">开始时间</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_date">结束时间</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="usage_limit">使用次数限制</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  value={formData.usage_limit || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    usage_limit: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="不限制"
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="per_user_limit">每用户限制</Label>
                <Input
                  id="per_user_limit"
                  type="number"
                  value={formData.per_user_limit || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    per_user_limit: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="不限制"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 状态设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">状态设置</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="stackable">允许叠加使用</Label>
                <p className="text-xs text-gray-500">是否可与其他活动同时使用</p>
              </div>
              <Switch
                id="stackable"
                checked={formData.stackable}
                onCheckedChange={(checked) => setFormData({ ...formData, stackable: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_visible">前端可见</Label>
                <p className="text-xs text-gray-500">是否在前端页面显示</p>
              </div>
              <Switch
                id="is_visible"
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
              />
            </div>

            <div>
              <Label htmlFor="status">初始状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">激活</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建规则
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

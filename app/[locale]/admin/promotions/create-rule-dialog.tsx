/**
 * 创建活动规则对话框
 * 用途: 管理员创建新的活动规则
 * 老王警告: 这个表单字段很多，别tm填错了！
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface CreateRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateRuleDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRuleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 表单状态
  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState<string>('discount')
  const [displayName, setDisplayName] = useState('')
  const [displayDescription, setDisplayDescription] = useState('')
  const [discountType, setDiscountType] = useState<string>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [bonusCredits, setBonusCredits] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState<string>('inactive')

  // 提交创建活动规则
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      // 构建活动规则数据
      const ruleData: any = {
        rule_name: ruleName,
        rule_type: ruleType,
        display_name: displayName || null,
        display_description: displayDescription || null,
        apply_to: {
          type: 'all', // 默认应用到所有
        },
        target_users: {
          type: 'all', // 默认目标所有用户
        },
        status: status,
        priority: priority ? parseInt(priority) : null,
      }

      // 根据规则类型添加配置
      if (ruleType === 'discount' && discountValue) {
        ruleData.discount_config = {
          type: discountType,
          value: parseFloat(discountValue),
        }
      } else if (ruleType === 'bonus_credits' && bonusCredits) {
        ruleData.bonus_config = {
          credits: parseInt(bonusCredits),
        }
      }

      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(ruleData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '创建活动规则失败')
      }

      // 重置表单
      setRuleName('')
      setRuleType('discount')
      setDisplayName('')
      setDisplayDescription('')
      setDiscountType('percentage')
      setDiscountValue('')
      setBonusCredits('')
      setPriority('')
      setStatus('inactive')

      // 调用成功回调
      onSuccess()

      // 关闭对话框
      onOpenChange(false)
    } catch (err) {
      console.error('创建活动规则失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建活动规则</DialogTitle>
          <DialogDescription>
            填写活动规则信息，创建新的优惠活动
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 基本信息 */}
          <div className="space-y-2">
            <Label htmlFor="ruleName">规则名称 *</Label>
            <Input
              id="ruleName"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="例如: black_friday_2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如: 黑色星期五优惠"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayDescription">显示描述</Label>
            <Textarea
              id="displayDescription"
              value={displayDescription}
              onChange={(e) => setDisplayDescription(e.target.value)}
              placeholder="例如: 全场9折优惠，限时24小时"
              rows={3}
            />
          </div>

          {/* 规则类型 */}
          <div className="space-y-2">
            <Label htmlFor="ruleType">规则类型 *</Label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">折扣优惠</SelectItem>
                <SelectItem value="bonus_credits">赠送积分</SelectItem>
                <SelectItem value="credits_extension">积分延期</SelectItem>
                <SelectItem value="subscription_extension">订阅延期</SelectItem>
                <SelectItem value="bundle">套餐组合</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 折扣配置 */}
          {ruleType === 'discount' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="discountType">折扣类型</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">百分比折扣</SelectItem>
                    <SelectItem value="fixed">固定金额折扣</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  折扣值 ({discountType === 'percentage' ? '%' : '$'})
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '例如: 10' : '例如: 5.00'}
                />
              </div>
            </>
          )}

          {/* 赠送积分配置 */}
          {ruleType === 'bonus_credits' && (
            <div className="space-y-2">
              <Label htmlFor="bonusCredits">赠送积分数量</Label>
              <Input
                id="bonusCredits"
                type="number"
                value={bonusCredits}
                onChange={(e) => setBonusCredits(e.target.value)}
                placeholder="例如: 100"
              />
            </div>
          )}

          {/* 优先级 */}
          <div className="space-y-2">
            <Label htmlFor="priority">优先级</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="数字越大优先级越高，例如: 10"
            />
          </div>

          {/* 状态 */}
          <div className="space-y-2">
            <Label htmlFor="status">初始状态 *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">未激活</SelectItem>
                <SelectItem value="scheduled">已排期</SelectItem>
                <SelectItem value="active">激活</SelectItem>
              </SelectContent>
            </Select>
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

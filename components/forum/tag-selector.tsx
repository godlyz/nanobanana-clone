/**
 * 🔥 老王创建：论坛标签选择器组件
 * 用途：多选标签输入组件（最多5个）
 * 日期：2025-11-25
 */

"use client"

import { useState, useMemo } from "react"
import { useLanguage } from "@/lib/language-context"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ForumTag } from "@/types/forum"

/**
 * ForumTagSelector - 标签选择器组件
 *
 * Features:
 * - 多选下拉（最多 5 个）
 * - 搜索/筛选功能
 * - 支持创建新标签（可选）
 * - 标签chip显示
 * - 双语支持
 * - 响应式设计
 *
 * Props:
 * - tags: 可选标签列表
 * - selectedTagIds: 已选标签ID列表
 * - onChange: 选择变化回调
 * - maxTags: 最大可选标签数（默认 5）
 * - allowCreate: 是否允许创建新标签（默认 false）
 * - onCreate: 创建新标签回调
 * - disabled: 是否禁用
 * - placeholder: 占位符
 */

interface ForumTagSelectorProps {
  tags: ForumTag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  maxTags?: number
  allowCreate?: boolean
  onCreate?: (name: string) => Promise<ForumTag>
  disabled?: boolean
  placeholder?: string
}

export function ForumTagSelector({
  tags,
  selectedTagIds,
  onChange,
  maxTags = 5,
  allowCreate = false,
  onCreate,
  disabled = false,
  placeholder,
}: ForumTagSelectorProps) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // 已选标签
  const selectedTags = useMemo(() => {
    return tags.filter(tag => selectedTagIds.includes(tag.id))
  }, [tags, selectedTagIds])

  // 可选标签（过滤掉已选的）
  const availableTags = useMemo(() => {
    return tags.filter(tag => !selectedTagIds.includes(tag.id))
  }, [tags, selectedTagIds])

  // 搜索过滤
  const filteredTags = useMemo(() => {
    if (!searchQuery) return availableTags

    const query = searchQuery.toLowerCase()
    return availableTags.filter(tag => {
      // 🔥 老王修复：forum_tags表没有name_en字段，直接用name
      const name = tag.name.toLowerCase()
      return name.includes(query) || tag.slug.toLowerCase().includes(query)
    })
  }, [availableTags, searchQuery, language])

  // 添加标签
  const addTag = (tagId: string) => {
    if (selectedTagIds.length >= maxTags) {
      // 已达上限，不添加
      return
    }
    onChange([...selectedTagIds, tagId])
    setSearchQuery('')
  }

  // 移除标签
  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId))
  }

  // 创建新标签
  const handleCreateTag = async () => {
    if (!allowCreate || !onCreate || !searchQuery.trim() || isCreating) return

    try {
      setIsCreating(true)
      const newTag = await onCreate(searchQuery.trim())
      addTag(newTag.id)
      setSearchQuery('')
      setOpen(false)
    } catch (error) {
      console.error('Failed to create tag:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>
        {language === 'zh' ? '标签' : 'Tags'}
        <span className="text-muted-foreground text-xs ml-2">
          ({selectedTagIds.length} / {maxTags})
        </span>
      </Label>

      {/* 已选标签显示 */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="pl-2 pr-1 py-1"
            >
              <span className="mr-1">
                {/* 🔥 老王修复：forum_tags表没有name_en字段，直接用name */}
                {tag.name}
              </span>
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 下拉选择器 */}
      {selectedTagIds.length < maxTags && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {placeholder || (language === 'zh' ? '选择标签...' : 'Select tags...')}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {filteredTags.length === 0 ? (
                    <div className="py-6 text-center text-sm">
                      {language === 'zh' ? '未找到标签' : 'No tags found'}
                      {allowCreate && searchQuery && (
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCreateTag}
                            disabled={isCreating}
                          >
                            {isCreating
                              ? (language === 'zh' ? '创建中...' : 'Creating...')
                              : (language === 'zh' ? `创建 "${searchQuery}"` : `Create "${searchQuery}"`)}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CommandEmpty>
                <CommandGroup>
                  {filteredTags.map(tag => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => {
                        addTag(tag.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {/* 🔥 老王修复：forum_tags表没有name_en字段，直接用name */}
                      {tag.name}
                      {/* 🔥 老王修复：ForumTag类型用usage_count，不是thread_count */}
                      {tag.usage_count > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {tag.usage_count}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* 提示文本 */}
      {selectedTagIds.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {language === 'zh'
            ? `选择最多 ${maxTags} 个标签来帮助其他人找到您的帖子`
            : `Select up to ${maxTags} tags to help others find your thread`}
        </p>
      )}

      {selectedTagIds.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          {language === 'zh'
            ? `已达到标签上限（${maxTags}个）`
            : `Tag limit reached (${maxTags})`}
        </p>
      )}
    </div>
  )
}

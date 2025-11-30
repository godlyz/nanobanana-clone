"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { User as UserType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  User,
  Mail,
  Calendar,
  Shield,
  MapPin,
  Edit,
  Lock
} from "lucide-react"
import NextImage from "next/image"
import Link from "next/link"

// 🔥 老王性能优化：react-easy-crop体积大，仅在需要裁剪头像时动态加载
const Cropper = dynamic(
  () => import("react-easy-crop").then((mod) => mod.default),
  { ssr: false }
)

const MAX_AVATAR_SIZE = 500 * 1024

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

async function getCroppedImage(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('无法获取 Canvas 上下文')
  }

  canvas.width = crop.width
  canvas.height = crop.height

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('裁剪失败'))
      }
    }, 'image/jpeg', 0.95)
  })
}
// 🔥 老王：Area类型导入（用于getCroppedImage函数）
import type { Area } from "react-easy-crop"
import imageCompression from "browser-image-compression"

interface ProfileInfoSectionProps {
  user: UserType
  credits?: {
    currentCredits: number
    totalEarned: number
    totalUsed: number
  }
  stats?: {
    totalImages: number
    activeDays: number
  }
}

export function ProfileInfoSection({ user, credits, stats }: ProfileInfoSectionProps) {
  const { t } = useLanguage()
  const { theme } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [location, setLocation] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [avatarSource, setAvatarSource] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const cardBg = theme === "light" ? "bg-[#FFFFFF]" : "bg-[#0F1728]"
  const textColor = theme === "light" ? "text-[#1E293B]" : "text-white"

  // 🔥 老王：格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 🔥 老王：获取用户显示名称
  const getDisplayName = () => {
    return user.user_metadata?.full_name ||
           user.user_metadata?.name ||
           user.email?.split('@')[0] ||
           t('profile.info.user.unnamed')
  }

  const updateAvatarPreview = useCallback((value: string) => {
    setAvatarPreview(prev => {
      if (prev && prev.startsWith('blob:') && prev !== value) {
        URL.revokeObjectURL(prev)
      }
      return value
    })
  }, [])

  const populateForm = useCallback(() => {
    const currentAvatar = user.user_metadata?.avatar_url || ""
    setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "")
    setAvatarUrl(currentAvatar)
    updateAvatarPreview(currentAvatar)
    setLocation(user.user_metadata?.location || "")
    setBio(user.user_metadata?.bio || "")
    setAvatarSource(null)
    setAvatarFile(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setAvatarError(null)
    setFeedback(null)
  }, [updateAvatarPreview, user])

  useEffect(() => {
    if (isEditing) {
      populateForm()
    }
  }, [isEditing, populateForm])

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setFeedback(null)
      const supabase = createClient()
      let avatarUrlToSave = avatarUrl.trim()

      if (avatarFile) {
        const filePath = `${user.id}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          setFeedback(t('profile.info.error.uploadFailed').replace('{error}', uploadError.message))
          setSaving(false)
          return
        }

        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrlToSave = publicData.publicUrl
        updateAvatarPreview(avatarUrlToSave)
        setAvatarUrl(avatarUrlToSave)
        setAvatarFile(null)
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName || null,
          avatar_url: avatarUrlToSave || null,
          location: location || null,
          bio: bio || null
        }
      })

      if (error) {
        setFeedback(t('profile.info.error.saveFailed').replace('{error}', error.message))
        setSaving(false)
        return
      }

      setAvatarSource(null)
      setAvatarError(null)
      setCroppedAreaPixels(null)
      setZoom(1)
      setSaving(false)
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? t('profile.info.error.saveFailed').replace('{error}', error.message) : t('profile.info.error.saveRetry'))
      setSaving(false)
    }
  }

  const handleFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.info.error.invalidImage'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('profile.info.error.imageTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarSource(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setAvatarError(null)
    }
    reader.onerror = () => setAvatarError(t('profile.info.error.readFailed'))
    reader.readAsDataURL(file)

    // 允许重新选择相同文件
    event.target.value = ""
  }, [])

  const handleApplyCrop = useCallback(async () => {
    if (!avatarSource || !croppedAreaPixels) {
      setAvatarError(t('profile.info.error.adjustCrop'))
      return
    }

    try {
      setAvatarError(null)
      const croppedBlob = await getCroppedImage(avatarSource, croppedAreaPixels)
      // 🔥 老王 Day 4 修复：imageCompression 期望 File 类型，需要从 Blob 转换
      const croppedFile = new File([croppedBlob], 'avatar.png', { type: 'image/png' })
      const compressed = await imageCompression(croppedFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        initialQuality: 0.9,
        useWebWorker: true
      })

      if (compressed.size > MAX_AVATAR_SIZE) {
        setAvatarError(t('profile.info.error.compressFailed'))
        return
      }

      const previewUrl = URL.createObjectURL(compressed)
      updateAvatarPreview(previewUrl)
      setAvatarFile(new File([compressed], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      setAvatarSource(null)
      setAvatarUrl('')
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : t('profile.info.error.cropRetry'))
    }
  }, [avatarSource, croppedAreaPixels, updateAvatarPreview])

  const handleCancelCrop = useCallback(() => {
    setAvatarSource(null)
    setCroppedAreaPixels(null)
    setZoom(1)
  }, [])

  const handleClearAvatar = useCallback(() => {
    updateAvatarPreview("")
    setAvatarUrl("")
    setAvatarFile(null)
    setAvatarSource(null)
    setCroppedAreaPixels(null)
    setZoom(1)
    setAvatarError(null)
  }, [updateAvatarPreview])

  const handleRecropFromPreview = useCallback(() => {
    if (avatarPreview) {
      setAvatarSource(avatarPreview)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setAvatarError(null)
      setAvatarFile(null)
    }
  }, [avatarPreview])

  return (
    <div className="space-y-6">
      {/* 🔥 老王：主信息卡片 - 现代卡片式设计 */}
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* 头像区域 */}
              <div className="relative">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#F5A623] to-[#FF6B35] flex items-center justify-center shadow-xl overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <NextImage
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg"
                onClick={() => {
                  populateForm()
                  setIsEditing(true)
                }}
              >
                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* 基本信息 */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className={`text-2xl font-bold ${textColor} mb-1`}>
                  {getDisplayName()}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Shield className="w-3 h-3 mr-1" />
                    {t('profile.info.status.normal')}
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('profile.info.field.email')}</p>
                    <p className={`font-medium ${textColor}`}>{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('profile.info.field.registeredAt')}</p>
                    <p className={`font-medium ${textColor}`}>
                      {user.created_at ? formatDate(user.created_at) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button
                className="bg-[#F5A623] hover:bg-[#F5A623]/90 text-white w-full md:w-auto"
                onClick={() => {
                  populateForm()
                  setIsEditing(true)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('profile.info.button.edit')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 🔥 老王：账户安全卡片 */}
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textColor}`}>{t('profile.info.title.accountSecurity')}</h3>
              <p className="text-sm text-muted-foreground">{t('profile.info.desc.securitySettings')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 最后登录信息 */}
            <div className="flex items-start justify-between py-3 border-b dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className={`font-medium ${textColor} text-sm`}>{t('profile.info.field.lastSignIn')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : t('profile.info.status.unknown')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">{t('profile.info.status.active')}</Badge>
            </div>

            {/* 登录IP */}
            {user.user_metadata?.ip_address && (
              <div className="flex items-start justify-between py-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className={`font-medium ${textColor} text-sm`}>{t('profile.info.field.loginIP')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.user_metadata.ip_address}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 密码管理 */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className={`font-medium ${textColor} text-sm`}>{t('profile.info.field.password')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('profile.info.desc.passwordSecurity')}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/change-password">{t('profile.info.button.changePassword')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 🔥 老王：统计信息卡片（使用真实数据） */}
      <Card className={`${cardBg} border shadow-lg`}>
        <div className="p-6">
          <h3 className={`text-lg font-semibold ${textColor} mb-4`}>{t('profile.info.title.accountStats')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30">
              <div className={`text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1`}>
                {stats?.totalImages?.toLocaleString() || '-'}
              </div>
              <p className="text-xs text-muted-foreground">{t('profile.info.stats.imagesGenerated')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
              <div className={`text-2xl font-bold text-green-600 dark:text-green-400 mb-1`}>
                {credits?.currentCredits?.toLocaleString() || '-'}
              </div>
              <p className="text-xs text-muted-foreground">{t('profile.info.stats.creditsRemaining')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30">
              <div className={`text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1`}>
                {stats?.activeDays || '-'}
              </div>
              <p className="text-xs text-muted-foreground">{t('profile.info.stats.activeDays')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('profile.info.dialog.title')}</DialogTitle>
            <DialogDescription>{t('profile.info.dialog.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">{t('profile.info.field.displayName')}</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t('profile.info.placeholder.displayName')}
                maxLength={60}
              />
            </div>
            <div className="space-y-3">
              <Label>{t('profile.info.field.avatar')}</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-dashed border-muted-foreground/40">
                  {avatarPreview ? (
                    <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarPreview})` }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      {t('profile.info.placeholder.noAvatar')}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      {t('profile.info.button.selectImage')}
                    </Button>
                    {avatarPreview && avatarPreview.startsWith('blob:') && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRecropFromPreview}
                      >
                        {t('profile.info.button.recrop')}
                      </Button>
                    )}
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearAvatar}
                      >
                        {t('profile.info.button.clear')}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.info.avatar.hint')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              </div>

              {avatarSource && (
                <div className="space-y-3">
                  <div className="relative h-64 rounded-full overflow-hidden bg-muted">
                    <Cropper
                      image={avatarSource}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                      rotation={0}
                      minZoom={1}
                      maxZoom={3}
                      zoomSpeed={0.1}
                      showGrid={false}
                      restrictPosition={true}
                      style={{}}
                      classes={{}}
                      mediaProps={{}}
                      cropperProps={{}}
                      keyboardStep={1}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">{t('profile.info.field.zoom')}</Label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleApplyCrop}>
                      {t('profile.info.button.applyCrop')}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelCrop}>
                      {t('profile.info.button.cancelCrop')}
                    </Button>
                  </div>
                </div>
              )}

              {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}

              <div className="grid gap-2">
                <Label htmlFor="profile-avatar">{t('profile.info.field.avatarLink')}</Label>
                <Input
                  id="profile-avatar"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-location">{t('profile.info.field.location')}</Label>
              <Input
                id="profile-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={t('profile.info.placeholder.location')}
                maxLength={60}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-bio">{t('profile.info.field.bio')}</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder={t('profile.info.placeholder.bio')}
                rows={4}
              />
            </div>
            {feedback && (
              <p className="text-sm text-red-500">{feedback}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              {t('profile.info.button.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? t('profile.info.button.saving') : t('profile.info.button.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

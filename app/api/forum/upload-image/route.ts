import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/forum/upload-image - 上传论坛图片
 *
 * 功能：
 * - 验证用户登录状态
 * - 检查文件类型和大小
 * - 上传图片到 Supabase Storage
 * - 记录上传历史
 * - 返回图片公共 URL
 *
 * 请求体：FormData
 * - image: File（必需）
 * - threadId: string（可选，关联的帖子 ID）
 * - replyId: string（可选，关联的回复 ID）
 *
 * 限制：
 * - 文件大小：最大 5MB
 * - 文件类型：jpg, jpeg, png, gif, webp
 * - 需要登录
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp"
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 检查认证
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "未登录，请先登录后再上传图片" },
        { status: 401 }
      )
    }

    // 2. 解析 FormData
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null
    const threadId = formData.get("threadId") as string | null
    const replyId = formData.get("replyId") as string | null

    if (!imageFile) {
      return NextResponse.json(
        { error: "缺少图片文件" },
        { status: 400 }
      )
    }

    // 3. 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        {
          error: `不支持的文件类型：${imageFile.type}。仅支持 JPG, PNG, GIF, WebP 格式`
        },
        { status: 400 }
      )
    }

    // 4. 验证文件大小
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `文件过大：${(imageFile.size / 1024 / 1024).toFixed(2)}MB。最大支持 5MB`
        },
        { status: 400 }
      )
    }

    // 5. 生成文件名（使用时间戳 + 随机字符串避免冲突）
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExt = imageFile.name.split(".").pop() || "jpg"
    const fileName = `${timestamp}_${randomStr}.${fileExt}`

    // 6. 构建存储路径：{userId}/{fileName}
    const storagePath = `${user.id}/${fileName}`

    // 7. 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("forum-images")
      .upload(storagePath, imageFile, {
        cacheControl: "3600",
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { error: "图片上传失败，请稍后重试" },
        { status: 500 }
      )
    }

    // 8. 获取公共 URL
    const {
      data: { publicUrl }
    } = supabase.storage.from("forum-images").getPublicUrl(storagePath)

    // 9. 记录上传历史到数据库
    const { error: dbError } = await supabase
      .from("forum_image_uploads")
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        file_name: imageFile.name,
        file_size: imageFile.size,
        mime_type: imageFile.type,
        thread_id: threadId || null,
        reply_id: replyId || null
      })

    if (dbError) {
      console.error("Database insert error:", dbError)
      // 不影响上传，仅记录错误
    }

    // 10. 返回成功响应
    return NextResponse.json({
      message: "图片上传成功",
      url: publicUrl,
      path: storagePath,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      mimeType: imageFile.type
    })
  } catch (error) {
    console.error("Upload image error:", error)
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forum/upload-image?path={storagePath} - 删除图片
 *
 * 功能：
 * - 验证用户权限（只能删除自己上传的图片）
 * - 从 Storage 删除文件
 * - 从数据库删除记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 检查认证
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }

    // 2. 获取要删除的图片路径
    const { searchParams } = new URL(request.url)
    const storagePath = searchParams.get("path")

    if (!storagePath) {
      return NextResponse.json(
        { error: "缺少 path 参数" },
        { status: 400 }
      )
    }

    // 3. 验证路径是否属于当前用户（路径格式：{userId}/{fileName}）
    const pathParts = storagePath.split("/")
    if (pathParts.length < 2 || pathParts[0] !== user.id) {
      return NextResponse.json(
        { error: "无权限删除该图片" },
        { status: 403 }
      )
    }

    // 4. 从 Storage 删除文件
    const { error: deleteError } = await supabase.storage
      .from("forum-images")
      .remove([storagePath])

    if (deleteError) {
      console.error("Delete storage error:", deleteError)
      return NextResponse.json(
        { error: "删除图片失败" },
        { status: 500 }
      )
    }

    // 5. 从数据库删除记录
    const { error: dbError } = await supabase
      .from("forum_image_uploads")
      .delete()
      .eq("storage_path", storagePath)
      .eq("user_id", user.id)

    if (dbError) {
      console.error("Delete database record error:", dbError)
      // 不影响删除，仅记录错误
    }

    return NextResponse.json({
      message: "图片删除成功",
      path: storagePath
    })
  } catch (error) {
    console.error("Delete image error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}

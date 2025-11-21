"use client"

/**
 * 通用前端下载工具，支持单张图片下载与批量打包下载。
 * 注意：需在浏览器环境中调用。
 */

// 安全限制配置
const MAX_IMAGES_PER_ZIP = 100 // 单次最多打包100张图片
const MAX_SINGLE_IMAGE_SIZE = 10 * 1024 * 1024 // 单张图片最大10MB
const MAX_TOTAL_ZIP_SIZE = 100 * 1024 * 1024 // ZIP总大小最大100MB

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const downloadImage = async (imageUrl: string, filename: string) => {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`)
  }
  const blob = await response.blob()

  // 检查单张图片大小
  if (blob.size > MAX_SINGLE_IMAGE_SIZE) {
    throw new Error(`图片过大 (${(blob.size / 1024 / 1024).toFixed(2)}MB)，超过限制 (10MB)`)
  }

  triggerBlobDownload(blob, filename)
}

interface ZipEntry {
  folderName?: string
  images: string[]
}

export interface ZipDownloadProgress {
  current: number
  total: number
  currentSize: number
}

export const downloadImagesAsZip = async (
  entries: ZipEntry[],
  zipName = 'history-images.zip',
  onProgress?: (progress: ZipDownloadProgress) => void
) => {
  // 计算总图片数
  const totalImages = entries.reduce((sum, entry) => sum + entry.images.length, 0)

  // 检查图片数量限制
  if (totalImages > MAX_IMAGES_PER_ZIP) {
    throw new Error(
      `批量下载图片数量过多 (${totalImages}张)，超过限制 (${MAX_IMAGES_PER_ZIP}张)。` +
      `建议分批下载或使用后端导出功能。`
    )
  }

  if (totalImages === 0) {
    throw new Error('没有图片可以下载')
  }

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  let currentCount = 0
  let totalSize = 0

  for (const entry of entries) {
    const folderName = entry.folderName?.trim() || 'images'
    const folder = zip.folder(folderName)
    if (!folder) continue

    for (let i = 0; i < entry.images.length; i += 1) {
      const imageUrl = entry.images[i]
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          console.warn(`跳过下载失败的图片: ${imageUrl}`)
          continue
        }

        const buffer = await response.arrayBuffer()
        const bufferSize = buffer.byteLength

        // 检查单张图片大小
        if (bufferSize > MAX_SINGLE_IMAGE_SIZE) {
          console.warn(`跳过过大的图片 (${(bufferSize / 1024 / 1024).toFixed(2)}MB): ${imageUrl}`)
          continue
        }

        // 检查累计大小
        totalSize += bufferSize
        if (totalSize > MAX_TOTAL_ZIP_SIZE) {
          throw new Error(
            `批量下载文件总大小超过限制 (${(MAX_TOTAL_ZIP_SIZE / 1024 / 1024).toFixed(0)}MB)。` +
            `已下载 ${currentCount} 张图片，建议分批下载。`
          )
        }

        folder.file(`image-${i + 1}.png`, buffer)
        currentCount++

        // 报告进度
        if (onProgress) {
          onProgress({
            current: currentCount,
            total: totalImages,
            currentSize: totalSize
          })
        }
      } catch (error) {
        console.error('批量下载某张图片失败:', { imageUrl, error })
      }
    }
  }

  if (currentCount === 0) {
    throw new Error('所有图片下载都失败了，请检查网络连接或图片链接是否有效')
  }

  console.log(`✅ 成功打包 ${currentCount}/${totalImages} 张图片，总大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  triggerBlobDownload(content, zipName)
}

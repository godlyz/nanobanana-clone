/**
 * 🔥 老王的图片相似度检测工具
 * 用途: 使用感知哈希(Perceptual Hash)算法检测图片相似度
 * 老王警告: 这个工具要是出问题,重复图片就会混进showcase!
 */

// 🔥 使用动态导入避免 WASM 构建时问题
let imghashModule: any = null

async function getImghash() {
  if (!imghashModule) {
    imghashModule = await import('imghash')
  }
  return imghashModule.default || imghashModule
}

/**
 * 🔥 计算图片的感知哈希值
 * @param imageUrl 图片URL或本地路径
 * @returns 图片的哈希值(16进制字符串)
 */
export async function calculateImageHash(imageUrl: string): Promise<string> {
  try {
    console.log(`🔍 正在计算图片哈希: ${imageUrl}`)

    const imghash = await getImghash()
    // imghash 可以直接处理URL
    const imageHash = await imghash.hash(imageUrl, 16) // 16位哈希

    console.log(`✅ 图片哈希计算成功: ${imageHash}`)
    return imageHash
  } catch (error) {
    console.error('❌ 计算图片哈希失败:', error)
    throw new Error(`计算图片哈希失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 🔥 计算两个哈希值之间的汉明距离 (Hamming Distance)
 * 汉明距离表示两个字符串中不同字符的数量
 * @param hash1 第一个哈希值
 * @param hash2 第二个哈希值
 * @returns 汉明距离 (0-64, 0表示完全相同)
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('哈希值长度不匹配')
  }

  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16)
    const val2 = parseInt(hash2[i], 16)

    // 计算二进制位的不同数量
    let xor = val1 ^ val2
    while (xor > 0) {
      distance += xor & 1
      xor >>= 1
    }
  }

  return distance
}

/**
 * 🔥 计算两张图片的相似度百分比
 * @param imageUrl1 第一张图片URL
 * @param imageUrl2 第二张图片URL
 * @returns 相似度百分比 (0-100, 100表示完全相同)
 */
export async function calculateImageSimilarity(
  imageUrl1: string,
  imageUrl2: string
): Promise<number> {
  try {
    console.log(`🔍 正在比较图片相似度...`)
    console.log(`  图片1: ${imageUrl1}`)
    console.log(`  图片2: ${imageUrl2}`)

    // 计算两张图片的哈希值
    const hash1 = await calculateImageHash(imageUrl1)
    const hash2 = await calculateImageHash(imageUrl2)

    // 计算汉明距离
    const distance = hammingDistance(hash1, hash2)

    // 16位哈希 = 16 * 4 = 64位
    // 相似度 = (1 - 汉明距离/总位数) * 100
    const maxDistance = 64
    const similarity = ((maxDistance - distance) / maxDistance) * 100

    console.log(`✅ 相似度计算完成:`)
    console.log(`  哈希1: ${hash1}`)
    console.log(`  哈希2: ${hash2}`)
    console.log(`  汉明距离: ${distance}`)
    console.log(`  相似度: ${similarity.toFixed(2)}%`)

    return similarity
  } catch (error) {
    console.error('❌ 计算图片相似度失败:', error)
    throw new Error(`计算图片相似度失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 🔥 检查新图片是否与现有图片相似
 * @param newImageUrl 新图片URL
 * @param existingImageUrls 现有图片URL列表
 * @param threshold 相似度阈值 (0-100, 默认70)
 * @returns { isSimilar: boolean, mostSimilarUrl?: string, similarity?: number }
 */
export async function checkImageSimilarity(
  newImageUrl: string,
  existingImageUrls: string[],
  threshold: number = 70
): Promise<{
  isSimilar: boolean
  mostSimilarUrl?: string
  similarity?: number
}> {
  try {
    console.log(`🔍 开始检查图片相似度...`)
    console.log(`  新图片: ${newImageUrl}`)
    console.log(`  对比图片数量: ${existingImageUrls.length}`)
    console.log(`  相似度阈值: ${threshold}%`)

    if (existingImageUrls.length === 0) {
      console.log(`✅ 没有现有图片,直接通过`)
      return { isSimilar: false }
    }

    // 计算新图片的哈希值
    const newHash = await calculateImageHash(newImageUrl)

    let maxSimilarity = 0
    let mostSimilarUrl = ''

    // 遍历所有现有图片,找出最相似的
    for (const existingUrl of existingImageUrls) {
      try {
        const existingHash = await calculateImageHash(existingUrl)
        const distance = hammingDistance(newHash, existingHash)
        const similarity = ((64 - distance) / 64) * 100

        console.log(`  对比 ${existingUrl}: 相似度 ${similarity.toFixed(2)}%`)

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity
          mostSimilarUrl = existingUrl
        }

        // 如果发现相似度超过阈值,立即返回
        if (similarity >= threshold) {
          console.log(`❌ 发现相似图片! 相似度: ${similarity.toFixed(2)}%`)
          return {
            isSimilar: true,
            mostSimilarUrl: existingUrl,
            similarity: similarity
          }
        }
      } catch (error) {
        console.error(`⚠️ 对比图片失败 ${existingUrl}:`, error)
        // 继续对比其他图片
        continue
      }
    }

    console.log(`✅ 图片检查通过! 最高相似度: ${maxSimilarity.toFixed(2)}%`)
    return {
      isSimilar: false,
      mostSimilarUrl: maxSimilarity > 0 ? mostSimilarUrl : undefined,
      similarity: maxSimilarity
    }
  } catch (error) {
    console.error('❌ 检查图片相似度失败:', error)
    throw new Error(`检查图片相似度失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 🔥 批量计算图片哈希值并存储
 * @param imageUrls 图片URL列表
 * @returns 图片URL到哈希值的映射
 */
export async function batchCalculateImageHashes(
  imageUrls: string[]
): Promise<Map<string, string>> {
  const hashMap = new Map<string, string>()

  console.log(`🔍 开始批量计算图片哈希 (共${imageUrls.length}张)...`)

  for (const url of imageUrls) {
    try {
      const imageHash = await calculateImageHash(url)
      hashMap.set(url, imageHash)
    } catch (error) {
      console.error(`⚠️ 计算失败 ${url}:`, error)
      // 跳过失败的图片,继续处理其他图片
      continue
    }
  }

  console.log(`✅ 批量计算完成! 成功: ${hashMap.size}/${imageUrls.length}`)
  return hashMap
}

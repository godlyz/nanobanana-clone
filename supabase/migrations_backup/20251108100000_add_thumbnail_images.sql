-- 🔥 老王添加缩略图字段到历史记录表
-- 用途: 实现缩略图+原图双存储架构（像微信/QQ那样）
-- 老王提醒: 这样历史记录列表加载缩略图，点击放大才加载原图，性能杠杠的！

-- 添加缩略图字段（与 generated_images 一一对应）
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS thumbnail_images TEXT[] DEFAULT '{}';

-- 添加注释
COMMENT ON COLUMN generation_history.thumbnail_images IS '生成图片的缩略图URL数组（400px宽度），与generated_images一一对应';

-- 老王提醒:
-- 1. thumbnail_images 和 generated_images 长度必须一致
-- 2. thumbnail_images[i] 是 generated_images[i] 的缩略图版本
-- 3. 缩略图命名规则: {原文件名}_thumb.{扩展名}
-- 4. 旧数据的缩略图会在下次重新生成时自动创建

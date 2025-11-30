-- 查询最近的视频记录，看看URL格式
SELECT 
  id,
  status,
  permanent_video_url,
  google_video_url,
  created_at
FROM video_generation_history
ORDER BY created_at DESC
LIMIT 5;

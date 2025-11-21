-- =============================================================================
-- 扩展系统配置表以支持LLM配置
-- 创建时间: 2025-02-03
-- 描述: 添加LLM配置类型，支持图像生成和提示词优化配置管理
-- 老王备注: 这个SB配置表扩展，让LLM配置可以从后台管理
-- =============================================================================

-- 1. 修改 system_configs 表的 config_type 约束，添加 'llm' 类型
ALTER TABLE system_configs
DROP CONSTRAINT IF EXISTS check_config_type;

ALTER TABLE system_configs
ADD CONSTRAINT check_config_type CHECK (
  config_type IN ('credit_cost', 'trial', 'subscription', 'package', 'pricing', 'llm')
);

-- 2. 添加注释说明
COMMENT ON COLUMN system_configs.config_type IS '配置分类: credit_cost/trial/subscription/package/pricing/llm';

-- 3. 插入默认的LLM配置（图像生成 - Google Gemini）
INSERT INTO system_configs (config_key, config_value, config_type, description, is_active, created_by) VALUES
(
  'llm.image_generation.google',
  '{
    "provider": "google",
    "service_type": "image_generation",
    "api_url": "https://generativelanguage.googleapis.com",
    "api_key_encrypted": "",
    "model_name": "gemini-2.5-flash-image",
    "timeout": 60000,
    "description": "Google Gemini图像生成服务"
  }',
  'llm',
  'Google Gemini图像生成配置（主要生成服务）',
  true,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (config_key) DO NOTHING;

-- 4. 插入默认的LLM配置（提示词优化 - 智谱AI GLM）
INSERT INTO system_configs (config_key, config_value, config_type, description, is_active, created_by) VALUES
(
  'llm.prompt_optimization.glm',
  '{
    "provider": "GLM",
    "service_type": "prompt_optimization",
    "api_url": "https://open.bigmodel.cn/api/coding/paas/v4",
    "api_key_encrypted": "",
    "quick_model": "glm-4.5-air",
    "detailed_model": "glm-4.6",
    "timeout": 60000,
    "headers": {
      "Content-Type": "application/json"
    },
    "description": "智谱AI提示词优化服务（支持快速和详细两种模式）"
  }',
  'llm',
  '智谱AI提示词优化配置（主要服务 - 支持快速/详细模式）',
  true,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (config_key) DO NOTHING;

-- 5. 插入备选的LLM配置（提示词优化 - OpenAI）
INSERT INTO system_configs (config_key, config_value, config_type, description, is_active, created_by) VALUES
(
  'llm.prompt_optimization.openai',
  '{
    "provider": "openai",
    "service_type": "prompt_optimization",
    "api_url": "https://api.openai.com/v1",
    "api_key_encrypted": "",
    "quick_model": "gpt-4o-mini",
    "detailed_model": "gpt-4o",
    "timeout": 60000,
    "description": "OpenAI提示词优化服务（GPT-4系列）"
  }',
  'llm',
  'OpenAI提示词优化配置（备用方案）',
  false,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (config_key) DO NOTHING;

-- 6. 插入备选的LLM配置（提示词优化 - Anthropic）
INSERT INTO system_configs (config_key, config_value, config_type, description, is_active, created_by) VALUES
(
  'llm.prompt_optimization.anthropic',
  '{
    "provider": "anthropic",
    "service_type": "prompt_optimization",
    "api_url": "https://api.anthropic.com/v1",
    "api_key_encrypted": "",
    "quick_model": "claude-3-haiku-20240307",
    "detailed_model": "claude-3-5-sonnet-20241022",
    "timeout": 60000,
    "description": "Anthropic Claude提示词优化服务"
  }',
  'llm',
  'Anthropic Claude提示词优化配置（备用方案）',
  false,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (config_key) DO NOTHING;

-- 7. 创建索引以提升LLM配置查询性能
CREATE INDEX IF NOT EXISTS idx_system_configs_llm ON system_configs(config_type, is_active) WHERE config_type = 'llm';

-- 8. 添加注释说明LLM配置格式
COMMENT ON TABLE system_configs IS '系统可配置参数表 - 支持积分/订阅/活动/LLM等配置';

-- =============================================================================
-- LLM配置数据结构说明（config_value字段的JSON格式）
-- =============================================================================

/*
通用字段：
{
  "provider": "google|ollama|openai|anthropic|GLM|custom",
  "service_type": "image_generation|prompt_optimization",
  "api_url": "string",
  "api_key_encrypted": "string",  // 🔥 加密后的API Key
  "timeout": number,
  "description": "string"
}

图像生成专用字段：
{
  "model_name": "string"  // 例如: "gemini-2.5-flash-image"
}

提示词优化专用字段：
{
  "quick_model": "string",    // 快速模式模型
  "detailed_model": "string"  // 详细模式模型
}

自定义Provider可选字段：
{
  "headers": {
    "Custom-Header": "value"
  }
}
*/

-- =============================================================================
-- 验证脚本
-- =============================================================================

-- 检查约束是否更新成功
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conname = 'check_config_type'
  AND conrelid = 'system_configs'::regclass;

-- 检查LLM配置是否插入成功
SELECT
  config_key,
  config_value->>'provider' as provider,
  config_value->>'service_type' as service_type,
  config_value->>'model_name' as model_name,
  is_active,
  description
FROM system_configs
WHERE config_type = 'llm'
ORDER BY config_key;

-- ✅ LLM配置类型扩展完成！
-- 现在可以通过后台管理界面配置LLM参数了。

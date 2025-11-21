// lib/veo-client.ts
// Google Veo 3.1 视频生成客户端
// 使用统一的 GOOGLE_AI_API_KEY
// 注意：由于 @google/generative-ai SDK 暂不支持 Veo，使用 REST API

// ============================================
// 类型定义
// ============================================

export interface VideoGenerationParams {
  prompt: string;
  negativePrompt?: string;
  duration: 4 | 6 | 8;  // seconds
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
  referenceImageUrl?: string;
}

export interface VeoOperation {
  operationId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;  // Temporary Google URL (2-day expiry)
  error?: {
    code: string;
    message: string;
  };
  estimatedCompletionTime?: string;  // ISO 8601 format
}

// ============================================
// 错误类型
// ============================================

export class VeoAPIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VeoAPIError';
  }
}

export class VeoSafetyFilterError extends VeoAPIError {
  constructor(message: string = 'Content blocked by safety filter') {
    super('SAFETY_FILTER', message);
    this.name = 'VeoSafetyFilterError';
  }
}

export class VeoRateLimitError extends VeoAPIError {
  constructor(message: string = 'API rate limit exceeded') {
    super('RATE_LIMIT_EXCEEDED', message);
    this.name = 'VeoRateLimitError';
  }
}

// ============================================
// Veo Client 类
// ============================================

export class VeoClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Veo API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate video from text prompt
   * @returns Operation ID for status polling
   *
   * 🔥 老王修复：使用 Veo 3.1 官方 REST API 格式
   * 端点：/models/veo-3.1-generate-preview:predictLongRunning
   * 认证：x-goog-api-key header（不是 query parameter）
   * 请求体：instances + parameters 结构
   */
  async generateVideo(params: VideoGenerationParams): Promise<VeoOperation> {
    try {
      // 🔥 构建符合 Veo 3.1 官方格式的请求体
      const instance: any = {
        prompt: params.prompt,
      };

      // 可选：referenceImage
      if (params.referenceImageUrl) {
        instance.image = {
          imageUrl: params.referenceImageUrl
        };
      }

      const requestBody = {
        instances: [instance],
        parameters: {
          durationSeconds: params.duration,
          aspectRatio: params.aspectRatio,
          resolution: params.resolution,
          // 🔥 老王修复：negativePrompt 应该放在 parameters 里，不是 instance 里
          ...(params.negativePrompt && { negativePrompt: params.negativePrompt })
        }
      };

      // 🔥 调用 Veo 3.1 官方 REST API 端点
      const response = await fetch(
        `${this.baseUrl}/models/veo-3.1-generate-preview:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey  // 🔥 API Key 放在 header 里
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 🔥 从 data.name 提取 operation ID（格式：operations/xxx）
      const operationId = data.name;

      if (!operationId) {
        throw new Error('No operation ID returned from Veo API');
      }

      return {
        operationId,
        status: 'processing',
        estimatedCompletionTime: this.estimateCompletionTime(params.duration)
      };
    } catch (error: any) {
      // Handle specific error types
      if (error.code === 'SAFETY_FILTER' || error.message?.includes('safety filter')) {
        throw new VeoSafetyFilterError('Content blocked by safety filter. Please revise your prompt.');
      }

      if (error.code === 'RATE_LIMIT_EXCEEDED' || error.status === 429) {
        throw new VeoRateLimitError('API rate limit exceeded. Please try again later.');
      }

      throw new VeoAPIError(
        error.code || 'UNKNOWN_ERROR',
        `Video generation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Check status of video generation operation
   *
   * 🔥 老王修复：使用 Veo 3.1 官方 Operations API 格式
   * 端点：/operations/{operationId}
   * 认证：x-goog-api-key header（不是 query parameter）
   * 响应结构：{ done, response: { predictions: [...] } }
   */
  async checkOperationStatus(operationId: string): Promise<VeoOperation> {
    try {
      // 🔥 调用 Google Operations API 检查状态
      const response = await fetch(
        `${this.baseUrl}/${operationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey  // 🔥 API Key 放在 header 里
          }
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const operation = await response.json();

      // 🔥 老王调试：打印完整的 operation 对象
      console.log('🔍 [DEBUG] Veo API Operation 响应:', JSON.stringify(operation, null, 2));

      if (operation.done) {
        if (operation.error) {
          return {
            operationId,
            status: 'failed',
            error: {
              code: operation.error.code,
              message: operation.error.message
            }
          };
        }

        // 🔥 修复：从正确的路径提取视频 URL
        // Veo API 实际响应结构：
        // response.generateVideoResponse.generatedSamples[0].video.uri
        const videoUrl = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

        console.log('🔍 [DEBUG] 提取的 videoUrl:', videoUrl);

        if (!videoUrl) {
          console.error('❌ [DEBUG] 完整的 operation.response:', JSON.stringify(operation.response, null, 2));
          throw new Error('No video URL in completed operation');
        }

        return {
          operationId,
          status: 'completed',
          videoUrl
        };
      }

      return {
        operationId,
        status: 'processing'
      };
    } catch (error: any) {
      throw new VeoAPIError(
        error.code || 'STATUS_CHECK_FAILED',
        `Failed to check operation status: ${error.message}`,
        error
      );
    }
  }

  /**
   * Estimate completion time based on duration
   * Veo 3.1 generation time: ~11 seconds to 6 minutes
   */
  private estimateCompletionTime(duration: number): string {
    const estimatedSeconds = duration * 15; // Rough estimate: 15s per second of video
    const completionTime = new Date(Date.now() + estimatedSeconds * 1000);
    return completionTime.toISOString();
  }
}

// ============================================
// Singleton Instance
// ============================================

let veoClient: VeoClient | null = null;

export function getVeoClient(): VeoClient {
  if (!veoClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    veoClient = new VeoClient(apiKey);
  }
  return veoClient;
}

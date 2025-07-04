/**
 * API代理服务 - 处理通过background的API请求，绕过CORS限制
 */

import { browser } from 'wxt/browser';
import {
  ApiRequestMessage,
  ApiResponse,
  ApiProxyServiceConfig,
  ApiProxyError,
  BACKGROUND_CONSTANTS,
} from '../types';

export class ApiProxyService {
  private static instance: ApiProxyService | null = null;
  private config: ApiProxyServiceConfig;
  private activeRequests: Map<string, AbortController> = new Map();

  private constructor() {
    this.config = {
      defaultTimeout: BACKGROUND_CONSTANTS.API_REQUEST_TIMEOUT,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ApiProxyService {
    if (!ApiProxyService.instance) {
      ApiProxyService.instance = new ApiProxyService();
    }
    return ApiProxyService.instance;
  }

  /**
   * 处理API请求
   */
  public async handleApiRequest(message: ApiRequestMessage): Promise<ApiResponse> {
    const { url, method, headers, body, timeout } = message.data;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();

      // 只有在timeout大于0时才设置超时
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeout);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 读取响应数据
      const responseData = await response.text();
      let parsedData;

      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      if (response.ok) {
        return {
          success: true,
          data: parsedData,
        };
      } else {
        return {
          success: false,
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            statusText: response.statusText,
          },
        };
      }
    } catch (error: any) {
      console.error('Background API请求失败:', error);

      let errorMessage = '请求失败';
      if (error.name === 'AbortError') {
        errorMessage = '请求超时';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: {
          message: errorMessage,
        },
      };
    }
  }

  /**
   * 取消所有活动请求
   */
  public cancelAllRequests(): void {
    this.activeRequests.forEach((controller) => {
      controller.abort();
    });
    this.activeRequests.clear();
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<ApiProxyServiceConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.cancelAllRequests();
    ApiProxyService.instance = null;
  }
}

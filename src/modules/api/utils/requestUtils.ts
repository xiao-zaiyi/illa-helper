/**
 * 请求处理工具函数
 */

import { ApiConfig } from '../../shared/types/api';
import { BackgroundProxyResponse } from '../types';

/**
 * 发送 API 请求。
 * 扩展页面可能运行在 HTTPS 页面上下文中，统一走 background 避免 Mixed Content 和 CORS 分叉。
 */
export async function sendApiRequest(
  requestBody: any,
  apiConfig: ApiConfig,
  timeout: number = 0,
): Promise<Response> {
  return sendViaBackground(requestBody, apiConfig, timeout);
}

/**
 * 通过后台代理发送请求
 */
async function sendViaBackground(
  requestBody: any,
  apiConfig: ApiConfig,
  timeout: number,
): Promise<Response> {
  return new Promise((resolve) => {
    browser.runtime.sendMessage(
      {
        type: 'api-request',
        data: {
          url: apiConfig.apiEndpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiConfig.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          timeout: timeout,
        },
      },
      (response: BackgroundProxyResponse) => {
        if (response.success) {
          const mockResponse = {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => response.data,
          } as Response;
          resolve(mockResponse);
        } else {
          const mockResponse = {
            ok: false,
            status: response.error?.status || 500,
            statusText: response.error?.statusText || 'Internal Server Error',
            json: async () => ({ error: response.error }),
          } as Response;
          resolve(mockResponse);
        }
      },
    );
  });
}

/**
 * UserLevel 工具类
 * 提供 UserLevel 相关的工具函数
 */

import { UserLevel, USER_LEVEL_OPTIONS, ApiConfig } from '@/src/modules/types';

/**
 * 合并自定义参数到基础参数对象
 * @param baseParams 基础参数对象
 * @param customParamsJson 自定义参数JSON字符串
 * @returns 合并后的参数对象
 */
function mergeCustomParams(baseParams: any, customParamsJson?: string): any {
  const merged = { ...baseParams };

  // 保护的系统关键参数，不允许被覆盖
  const protectedKeys = ['model', 'messages', 'apiKey'];

  if (!customParamsJson?.trim()) {
    return merged;
  }

  try {
    const customParams = JSON.parse(customParamsJson);

    // 合并自定义参数，但保护系统关键参数
    Object.entries(customParams).forEach(([key, value]) => {
      if (!protectedKeys.includes(key)) {
        merged[key] = value;
      } else {
        console.warn(`忽略受保护的参数: ${key}`);
      }
    });
  } catch (error) {
    console.warn('自定义参数JSON解析失败:', error);
  }

  return merged;
}

/**
 * 获取 UserLevel 的中文显示名称
 * @param level UserLevel 枚举值
 * @returns 中文显示名称
 */
export function getUserLevelLabel(level: UserLevel): string {
  const option = USER_LEVEL_OPTIONS.find((opt) => opt.value === level);
  return option?.label || '未知';
}

/**
 * 获取所有 UserLevel 选项，用于下拉框等组件
 * @returns UserLevel 选项数组
 */
export function getUserLevelOptions() {
  return USER_LEVEL_OPTIONS;
}

/**
 * API测试结果接口
 */
export interface ApiTestResult {
  success: boolean;
  message?: string;
  model?: string;
}

/**
 * 测试API连接
 * @param apiConfig API配置对象
 * @returns Promise<ApiTestResult> 测试结果
 */
/**
 * 获取API超时时间
 * @param baseTimeout 基础超时时间（毫秒）
 * @returns 超时时间（毫秒），如果为0则返回undefined表示无超时限制
 */
export function getApiTimeout(baseTimeout: number): number | undefined {
  return baseTimeout === 0 ? undefined : baseTimeout;
}

export async function testApiConnection(
  apiConfig: ApiConfig,
  baseTimeout?: number,
): Promise<ApiTestResult> {
  if (!apiConfig.apiKey || !apiConfig.apiEndpoint) {
    throw new Error('API密钥或端点未配置');
  }

  try {
    let requestBody: any = {
      model: apiConfig.model,
      temperature: apiConfig.temperature,
      messages: [
        {
          role: 'user',
          content:
            'Hello, this is a connection test. Please respond with "OK" and output JSON format.',
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 10,
    };

    // 只有当配置允许传递思考参数时，才添加enable_thinking字段
    if (apiConfig.includeThinkingParam) {
      requestBody.enable_thinking = apiConfig.enable_thinking;
    }

    // 合并自定义参数
    requestBody = mergeCustomParams(requestBody, apiConfig.customParams);

    let response: Response;

    if (apiConfig.useBackgroundProxy) {
      // 通过background代理发送请求
      response = await new Promise<Response>((resolve, reject) => {
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
              timeout: getApiTimeout(baseTimeout || 30000) || 0,
            },
          },
          (response) => {
            if (response.success) {
              // 创建模拟Response对象
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
          }
        );
      });
    } else {
      // 直接发送请求，处理超时设置
      const timeout = getApiTimeout(baseTimeout || 30000);
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      };

      // 只有在timeout不为undefined时才设置AbortSignal
      if (timeout !== undefined) {
        fetchOptions.signal = AbortSignal.timeout(timeout);
      }

      response = await fetch(apiConfig.apiEndpoint, fetchOptions);
    }

    if (response.ok) {
      const data = await response.json();

      return {
        success: true,
        message: `状态码: ${response.status}`,
        model: data.model || apiConfig.model,
      };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '网络连接错误',
    };
  }
}

/**
 * 清理AI响应中的Markdown格式
 * @param content AI返回的原始内容
 * @returns 清理后的JSON字符串
 */
export function cleanMarkdownFromResponse(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // 移除Markdown代码块标记
  let cleaned = content.trim();

  // 移除开头的```json或```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');

  // 移除结尾的```
  cleaned = cleaned.replace(/\n?\s*```\s*$/i, '');

  // 移除其他可能的Markdown格式
  cleaned = cleaned.replace(/^\s*```[\s\S]*?\n/, ''); // 移除开头的代码块
  cleaned = cleaned.replace(/\n```\s*$/, ''); // 移除结尾的代码块

  // 移除可能的额外空白字符
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 安全地设置元素的HTML内容，解决Firefox的innerHTML安全警告
 * 使用DOMParser方式避免直接的innerHTML赋值
 * @param element 目标DOM元素
 * @param htmlContent HTML内容字符串
 * @returns 是否设置成功
 */
export function safeSetInnerHTML(
  element: HTMLElement,
  htmlContent: string,
): boolean {
  if (!element || htmlContent == null) {
    return false;
  }

  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(htmlContent, 'text/html');

    // 清空目标元素
    element.textContent = '';

    // 将解析后的内容移动到目标元素
    const bodyContent = parsed.body;
    if (bodyContent) {
      // 将body中的所有子节点移动到目标元素
      while (bodyContent.firstChild) {
        element.appendChild(bodyContent.firstChild);
      }
    }

    return true;
  } catch (error) {
    console.error('设置HTML内容失败:', error);
    return false;
  }
}




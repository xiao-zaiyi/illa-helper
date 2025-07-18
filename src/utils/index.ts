/**
 * UserLevel 工具类
 * 提供 UserLevel 相关的工具函数
 */

import {
  UserLevel,
  USER_LEVEL_OPTIONS,
  ApiConfig,
  TranslationProvider,
  ApiConfigItem,
} from '@/src/modules/shared/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
 * 获取API超时时间
 * @param baseTimeout 基础超时时间（毫秒）
 * @returns 超时时间（毫秒），如果为0则返回undefined表示无超时限制
 */
export function getApiTimeout(baseTimeout: number): number | undefined {
  return baseTimeout === 0 ? undefined : baseTimeout;
}

export async function testGeminiConnection(
  apiConfig: ApiConfig,
  baseTimeout?: number,
): Promise<ApiTestResult> {
  if (!apiConfig.apiKey) {
    return { success: false, message: 'API Key is not configured.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiConfig.apiKey);

    const baseGenerationConfig: any = {
      temperature: apiConfig.temperature,
    };

    let generationConfig = mergeCustomParams(
      baseGenerationConfig,
      apiConfig.customParams,
    );

    // 适配参数
    generationConfig = mapParamsForProvider(generationConfig, 'gemini');

    const requestOptions: { timeout?: number; baseUrl?: string } = {};
    const timeout = getApiTimeout(baseTimeout || 0);
    if (timeout) {
      requestOptions.timeout = timeout;
    }
    if (apiConfig.apiEndpoint) {
      requestOptions.baseUrl = apiConfig.apiEndpoint;
    }

    const model = genAI.getGenerativeModel(
      {
        model: apiConfig.model,
        generationConfig,
      },
      requestOptions,
    );

    const result = await model.generateContent(
      'Hello, this is a connection test. Please respond with "OK".',
    );
    const response = result.response;
    const text = response.text();

    if (text.includes('OK')) {
      return {
        success: true,
        message: 'Connection successful.',
        model: apiConfig.model,
      };
    } else {
      return { success: false, message: 'Received an unexpected response.' };
    }
  } catch (error: any) {
    console.error('Gemini connection test failed:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred.',
    };
  }
}

/**
 * 统一的API连接测试入口函数
 * 根据provider类型自动选择合适的测试方法
 * @param userConfig 用户API配置对象（包含provider信息）
 * @param baseTimeout 超时时间（毫秒）
 * @returns Promise<ApiTestResult> 测试结果
 */
export async function testApiConnection(
  userConfig: ApiConfigItem,
  baseTimeout?: number,
): Promise<ApiTestResult> {
  const { provider, config } = userConfig;

  // 根据provider类型选择合适的测试方法
  switch (provider) {
    case TranslationProvider.GoogleGemini:
    case TranslationProvider.ProxyGemini:
    case 'GoogleGemini':
    case 'ProxyGemini':
      return testGeminiConnection(config, baseTimeout);

    case TranslationProvider.OpenAI:
    case TranslationProvider.DeepSeek:
    case TranslationProvider.SiliconFlow:
    case 'OpenAI':
    case 'DeepSeek':
    case 'SiliconFlow':
    default:
      return testOpenAICompatibleConnection(config, baseTimeout);
  }
}

/**
 * 测试OpenAI兼容API的连接
 * @param apiConfig API配置对象
 * @param baseTimeout 超时时间（毫秒）
 * @returns Promise<ApiTestResult> 测试结果
 */
export async function testOpenAICompatibleConnection(
  apiConfig: ApiConfig,
  baseTimeout?: number,
): Promise<ApiTestResult> {
  if (!apiConfig.apiKey || !apiConfig.apiEndpoint) {
    return {
      success: false,
      message: 'API Key or Endpoint is not configured.',
    };
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
              timeout: getApiTimeout(baseTimeout || 0) || 0,
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
                statusText:
                  response.error?.statusText || 'Internal Server Error',
                json: async () => ({ error: response.error }),
              } as Response;
              resolve(mockResponse);
            }
          },
        );
      });
    } else {
      // 直接发送请求，处理超时设置
      const timeout = getApiTimeout(baseTimeout || 0);
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
        message: `status: ${response.status}`,
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

/**
 * 从可能包含Markdown代码块的字符串中提取并解析JSON。
 * @param text 包含JSON的原始字符串。
 * @returns 解析后的JavaScript对象。
 * @throws 如果JSON无效或无法提取，则抛出错误。
 */
export function extractAndParseJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string.');
  }

  // 匹配Markdown中的JSON代码块
  const jsonBlockMatch = text.match(/```(json)?\s*([\s\S]+?)\s*```/);

  let jsonString;
  if (jsonBlockMatch && jsonBlockMatch[2]) {
    // 从Markdown代码块中提取JSON字符串
    jsonString = jsonBlockMatch[2];
  } else {
    // 如果没有找到代码块，假定整个字符串都是JSON
    // 尝试找到第一个 '{' 和最后一个 '}' 之间的内容
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonString = text.substring(firstBrace, lastBrace + 1);
    } else {
      jsonString = text; // 作为最后的手段
    }
  }

  try {
    // 清理并解析JSON
    return JSON.parse(jsonString.trim());
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    console.error('Original text:', text);
    console.error('Extracted JSON string:', jsonString);
    throw new Error('The response does not contain valid JSON.');
  }
}

/**
 * 将 OpenAI 风格的参数映射到特定提供商（如 Google Gemini）的格式。
 * @param params - 包含类 OpenAI 参数的对象。
 * @param provider - 目标提供商的标识符 ('gemini' 等)。
 * @returns 映射后适合目标提供商的参数对象。
 */
export function mapParamsForProvider(params: any, provider: 'gemini'): any {
  if (provider !== 'gemini') {
    return params; // 目前只为 Gemini 实现
  }

  const mapping: { [key: string]: string } = {
    max_tokens: 'maxOutputTokens',
    top_p: 'topP',
    stop: 'stopSequences',
    frequency_penalty: 'frequencyPenalty',
    presence_penalty: 'presencePenalty',
  };

  const mappedParams: { [key: string]: any } = {};

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const mappedKey = mapping[key] || key;
      mappedParams[mappedKey] = params[key];
    }
  }

  // 特殊处理 stopSequences，确保它是一个字符串数组
  if (
    mappedParams.stopSequences &&
    !Array.isArray(mappedParams.stopSequences)
  ) {
    mappedParams.stopSequences = [String(mappedParams.stopSequences)];
  }

  return mappedParams;
}

/**
 * AI翻译提供者实现
 *
 * 该类使用AI大模型API为英语单词提供中文翻译服务，完全替代了原有的有道词典API，
 * 解决了浏览器扩展中的跨域访问问题。提供者实现了完整的缓存机制、错误处理和
 * 超时控制，确保翻译服务的稳定性和性能。
 *
 * 主要特性：
 * - 使用专门优化的AI提示词获取准确的中文释义
 * - 实现24小时TTL缓存机制减少API调用
 * - 完善的错误处理和超时控制
 * - 支持动态API配置更新
 * - 与现有音标系统完全兼容
 *
 * @author AI Assistant
 * @version 1.0.0
 */

import { IPhoneticProvider } from '../phonetic/IPhoneticProvider';
import {
  PhoneticResult,
  PhoneticInfo,
  AITranslationResult,
  AITranslationEntry,
  CacheEntry,
} from '../types';
import { ApiConfig } from '../../types';
import { API_CONSTANTS } from '../config';
import { cleanMarkdownFromResponse, getApiTimeout } from '@/src/utils';
import { rateLimitManager } from '../../rateLimit';

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

export class AITranslationProvider implements IPhoneticProvider {
  /** 提供者名称标识 */
  readonly name = 'ai-translation';

  /** AI API配置信息 */
  private apiConfig: ApiConfig;

  /** API请求超时时间（毫秒） */
  private timeout: number = 30000;

  /** 内存缓存，存储翻译结果以减少API调用 */
  private cache = new Map<string, CacheEntry<AITranslationEntry>>();

  /** 缓存生存时间，24小时TTL */
  private readonly cacheTTL = API_CONSTANTS.AI_TRANSLATION_CACHE_TTL;

  /**
   * 构造函数
   *
   * @param apiConfig - AI API配置对象，包含端点URL、密钥等信息
   * @param timeout - API请求超时时间（毫秒），默认30秒
   */
  constructor(apiConfig: ApiConfig, timeout: number = 30000) {
    this.apiConfig = apiConfig;
    this.timeout = timeout;
  }

  /**
   * 获取单词的中文词义翻译
   *
   * 该方法是AI翻译提供者的核心功能，通过调用AI大模型API获取英语单词的
   * 中文释义。实现了完整的缓存策略、错误处理和超时控制。
   *
   * 处理流程：
   * 1. 输入参数验证和文本清理
   * 2. 检查内存缓存，命中则直接返回
   * 3. 验证API配置完整性
   * 4. 构建专门的AI翻译提示词
   * 5. 调用AI API获取翻译结果
   * 6. 解析响应并存入缓存
   *
   * @param word - 要翻译的英语单词
   * @returns Promise<AITranslationResult> - 翻译结果，包含成功状态、数据和缓存标识
   */
  async getMeaning(word: string): Promise<AITranslationResult> {
    try {
      // 数据验证
      if (!word || typeof word !== 'string') {
        return {
          success: false,
          error: '单词参数无效',
        };
      }

      const cleanWord = word.toLowerCase().trim();

      // 检查缓存
      const cached = this.getFromCache(cleanWord);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
        };
      }

      // 验证API配置
      if (!this.apiConfig.apiKey || !this.apiConfig.apiEndpoint) {
        return {
          success: false,
          error: 'AI API配置不完整',
        };
      }

      // 构建专门用于单词翻译的AI提示词
      // 这个提示词经过优化，确保AI返回格式化的中文释义
      const systemPrompt = `你是一个专业的英语词典助手。请为用户提供准确、简洁的中文词义解释。
          要求：
          1. 只返回单词的中文释义，格式为：词性 + 释义
          2. 如果有多个词性，用分号分隔
          3. 释义要简洁准确，适合快速理解
          4. 不要包含例句或其他额外信息
          5. 返回格式为纯文本，不要JSON

          示例：
          输入：hello
          输出：interj. 你好；n. 打招呼

          输入：beautiful
          输出：adj. 美丽的，漂亮的
      `;

      // 构建AI API请求体
      // 使用较低的temperature确保翻译结果的一致性和准确性
      let requestBody: any = {
        model: this.apiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanWord },
        ],
        temperature: this.apiConfig.temperature || 0, // 降低温度以获得更稳定的翻译结果
        max_tokens: 100, // 限制回复长度，避免过长的响应
      };

      // 只有当配置允许传递思考参数时，才添加enable_thinking字段
      if (this.apiConfig.includeThinkingParam) {
        requestBody.enable_thinking = this.apiConfig.enable_thinking;
      }

      // 合并自定义参数
      requestBody = mergeCustomParams(requestBody, this.apiConfig.customParams);

      // 通过速率限制器执行API请求
      const rateLimiter = rateLimitManager.getLimiter(
        this.apiConfig.apiEndpoint,
        this.apiConfig.requestsPerSecond || 0,
        true,
      );

      // 将API调用包装为函数，通过executeBatch执行以确保串行
      const apiRequestFunction = async () => {
        return this.sendApiRequest(requestBody);
      };

      // 通过executeBatch执行单个请求，确保串行
      const [response] = await rateLimiter.executeBatch([apiRequestFunction]);

      if (!response.ok) {
        throw new Error(
          `AI API请求失败: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const meaningInfo = this.parseApiResponse(data, cleanWord);

      // 存入缓存
      this.setCache(cleanWord, meaningInfo);

      return {
        success: true,
        data: meaningInfo,
        cached: false,
      };
    } catch (error) {
      console.error('AI翻译获取词义失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取单词的音标信息（兼容IPhoneticProvider接口）
   *
   * 该方法为了兼容IPhoneticProvider接口而存在，AI翻译提供者主要
   * 负责词义翻译，不提供音标功能。方法内部调用getMeaning获取翻译
   * 结果，并将其包装为PhoneticResult格式返回。
   *
   * @param word - 要查询的英语单词
   * @returns Promise<PhoneticResult> - 包含AI翻译结果的音标查询结果
   */
  async getPhonetic(word: string): Promise<PhoneticResult> {
    // AI翻译接口主要用于词义，不提供音标
    // 这里返回基本结构，词义信息通过getMeaning获取
    const meaningResult = await this.getMeaning(word);

    if (meaningResult.success && meaningResult.data) {
      const phoneticInfo: PhoneticInfo = {
        word,
        phonetics: [], // 不提供音标
        aiTranslation: meaningResult.data,
      };

      return {
        success: true,
        data: phoneticInfo,
        cached: meaningResult.cached,
      };
    }

    return {
      success: false,
      error: meaningResult.error,
    };
  }

  /**
   * 批量获取音标信息
   */
  async getBatchPhonetics(words: string[]): Promise<PhoneticResult[]> {
    // 使用速率限制器的批量处理功能，智能控制并发
    const rateLimiter = rateLimitManager.getLimiter(
      this.apiConfig.apiEndpoint,
      this.apiConfig.requestsPerSecond || 0,
      true,
    );

    const requestFunctions = words.map((word) => () => this.getPhonetic(word));
    return rateLimiter.executeBatch(requestFunctions);
  }

  /**
   * 检查提供者是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查API配置
      if (!this.apiConfig.apiKey || !this.apiConfig.apiEndpoint) {
        return false;
      }

      // 进行简单的API测试
      let testRequestBody: any = {
        model: this.apiConfig.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      };

      // 只有当配置允许传递思考参数时，才添加enable_thinking字段
      if (this.apiConfig.includeThinkingParam) {
        testRequestBody.enable_thinking = this.apiConfig.enable_thinking;
      }

      // 合并自定义参数
      testRequestBody = mergeCustomParams(
        testRequestBody,
        this.apiConfig.customParams,
      );

      // 通过速率限制器执行测试请求
      const rateLimiter = rateLimitManager.getLimiter(
        this.apiConfig.apiEndpoint,
        this.apiConfig.requestsPerSecond || 0,
        true,
      );

      const testRequestFunction = async () => {
        return this.sendApiRequest(testRequestBody);
      };

      // 通过executeBatch执行测试请求
      const [testResponse] = await rateLimiter.executeBatch([
        testRequestFunction,
      ]);

      return testResponse.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取提供者配置
   */
  getConfig() {
    return {
      endpoint: this.apiConfig.apiEndpoint,
      rateLimitPerMinute: 20, // AI API通常有较低的频率限制
      supportsBatch: false,
      supportsAudio: false,
      supportsMeaning: true, // 主要功能
    };
  }

  /**
   * 更新API配置和超时时间
   */
  updateApiConfig(apiConfig: ApiConfig, timeout?: number): void {
    this.apiConfig = apiConfig;
    if (timeout !== undefined) {
      this.timeout = timeout;
    }
  }

  /**
   * 统一API请求方法 - 根据配置选择请求方式
   * @param requestBody 请求体
   * @returns Promise<Response>
   */
  private async sendApiRequest(requestBody: any): Promise<Response> {
    const timeout = getApiTimeout(this.timeout);

    if (this.apiConfig.useBackgroundProxy) {
      return this.sendViaBackground(requestBody, timeout || 0);
    } else {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      };

      // 只有在timeout不为undefined时才设置AbortSignal
      if (timeout !== undefined) {
        fetchOptions.signal = AbortSignal.timeout(timeout);
      }

      return fetch(this.apiConfig.apiEndpoint, fetchOptions);
    }
  }

  /**
   * 通过background脚本发送API请求
   * @param requestBody 请求体
   * @returns Promise<Response>
   */
  private async sendViaBackground(requestBody: any, timeout: number = 10000): Promise<Response> {
    return new Promise((resolve) => {
      browser.runtime.sendMessage(
        {
          type: 'api-request',
          data: {
            url: this.apiConfig.apiEndpoint,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiConfig.apiKey}`,
            },
            body: JSON.stringify(requestBody),
            timeout: timeout,
          },
        },
        (response) => {
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
        }
      );
    });
  }

  /**
   * 解析AI API响应数据
   */
  private parseApiResponse(data: any, word: string): AITranslationEntry {
    try {
      let explain = '';

      // 解析AI API标准响应格式
      if (data?.choices?.[0]?.message?.content) {
        explain = data.choices[0].message.content.trim();
      }

      // 清理和验证解释文本
      if (!explain || typeof explain !== 'string') {
        explain = `${word} 的释义暂不可用`;
      } else {
        // 清理Markdown格式和文本格式
        explain = cleanMarkdownFromResponse(explain);
        // 如果解释过长，截取前200个字符
        if (explain.length > 200) {
          explain = explain.substring(0, 200) + '...';
        }
      }

      return {
        explain: explain,
        source: 'ai-translation',
      };
    } catch (error) {
      console.error('解析AI翻译API响应失败:', error);
      return {
        explain: `${word} 的释义暂不可用`,
        source: 'ai-translation',
      };
    }
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(word: string): AITranslationEntry | null {
    const entry = this.cache.get(word);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    // 清理过期缓存
    if (entry) {
      this.cache.delete(word);
    }

    return null;
  }

  /**
   * 存储数据到缓存
   */
  private setCache(word: string, data: AITranslationEntry): void {
    this.cache.set(word, {
      data,
      timestamp: Date.now(),
      ttl: this.cacheTTL,
    });

    // 简单的缓存大小控制
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }
}

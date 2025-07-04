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
 * - 使用统一的UniversalApiService进行API调用
 *
 * @author AI Assistant
 * @version 2.0.0
 */

import { IPhoneticProvider } from '../phonetic/IPhoneticProvider';
import {
  PhoneticResult,
  PhoneticInfo,
  AITranslationResult,
  AITranslationEntry,
  CacheEntry,
} from '../types';
import { ApiConfig } from '../../shared/types/api';
import { API_CONSTANTS } from '../config';
import { cleanMarkdownFromResponse } from '@/src/utils';
import { UniversalApiService } from '../../api/services/UniversalApiService';

export class AITranslationProvider implements IPhoneticProvider {
  /** 提供者名称标识 */
  readonly name = 'ai-translation';

  /** AI API配置信息 */
  private apiConfig: ApiConfig;

  /** API请求超时时间（毫秒） */
  private timeout: number = 0;

  /** 内存缓存，存储翻译结果以减少API调用 */
  private cache = new Map<string, CacheEntry<AITranslationEntry>>();

  /** 缓存生存时间，24小时TTL */
  private readonly cacheTTL = API_CONSTANTS.AI_TRANSLATION_CACHE_TTL;

  /** UniversalApiService 实例 */
  private universalApi: UniversalApiService;

  /**
   * 构造函数
   *
   * @param apiConfig - AI API配置对象，包含端点URL、密钥等信息
   * @param timeout - API请求超时时间（毫秒），默认0（无限制）
   */
  constructor(apiConfig: ApiConfig, timeout: number = 0) {
    this.apiConfig = apiConfig;
    this.timeout = timeout;
    this.universalApi = UniversalApiService.getInstance();
  }

  /**
   * 获取单词的中文词义翻译
   *
   * 该方法是AI翻译提供者的核心功能，通过调用UniversalApiService获取英语单词的
   * 中文释义。实现了完整的缓存策略、错误处理和超时控制。
   *
   * 处理流程：
   * 1. 输入参数验证和文本清理
   * 2. 检查内存缓存，命中则直接返回
   * 3. 使用UniversalApiService调用AI获取翻译结果
   * 4. 解析响应并存入缓存
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
      if (!this.apiConfig.apiKey) {
        return {
          success: false,
          error: 'AI API配置不完整：缺少API Key',
        };
      }

      // 构建专门用于单词翻译的AI提示词
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
输出：adj. 美丽的，漂亮的`;

      // 使用UniversalApiService调用AI
      const result = await this.universalApi.call(cleanWord, {
        systemPrompt,
        temperature: this.apiConfig.temperature || 0,
        maxTokens: 100,
        timeout: this.timeout,
        customParams: this.apiConfig.customParams,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'AI翻译请求失败',
        };
      }

      // 解析AI响应
      const meaningInfo = this.parseAIResponse(result.content, cleanWord);

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
    // 批量处理单词翻译
    const results = await Promise.allSettled(
      words.map((word) => this.getPhonetic(word)),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || '批量处理失败',
        };
      }
    });
  }

  /**
   * 检查提供者是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查API配置
      if (!this.apiConfig.apiKey) {
        return false;
      }

      // 使用UniversalApiService检查可用性
      return await this.universalApi.isAvailable();
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
   * 解析AI响应内容
   */
  private parseAIResponse(content: string, word: string): AITranslationEntry {
    try {
      let explain = content?.trim() || '';

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
      console.error('解析AI翻译响应失败:', error);
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

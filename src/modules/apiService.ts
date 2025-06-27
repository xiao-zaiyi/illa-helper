/**
 * API 服务模块
 * 负责调用 GPT 大模型 API 进行文本分析和翻译
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, getSystemPromptByConfig } from './promptManager';
import {
  UserSettings,
  FullTextAnalysisResponse,
  Replacement,
  ApiConfig,
  DEFAULT_API_CONFIG,
  ApiConfigItem,
} from './types';
import { cleanMarkdownFromResponse } from '@/src/utils';
import { rateLimitManager } from './rateLimit';

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

// API 服务类
export class ApiService {
  private config: ApiConfig;

  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
  }

  /**
   * 设置 API 配置
   * @param config API 配置
   */
  setConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置 API 端点
   * @param apiEndpoint API 端点 URL
   */
  setApiEndpoint(apiEndpoint: string): void {
    this.config.apiEndpoint = apiEndpoint;
  }

  /**
   * 设置使用的模型
   * @param model 模型名称
   */
  setModel(model: string): void {
    this.config.model = model;
  }

  /**
   * 分析整个文本，识别并翻译句子中的特定部分
   * 支持智能模式和传统模式
   * @param text 要分析的完整文本
   * @param settings 完整的用户设置对象
   * @returns 分析结果，包含替换信息和语言检测结果
   */
  async analyzeFullText(
    text: string,
    settings: UserSettings,
  ): Promise<FullTextAnalysisResponse> {
    const originalText = text || '';

    const activeConfigItem = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );

    if (!originalText.trim() || !activeConfigItem?.config.apiKey) {
      console.error('API 密钥未设置或文本为空');
      return {
        original: originalText,
        processed: originalText,
        replacements: [],
      };
    }

    const { config: activeConfig, provider } = activeConfigItem;

    // 判断是否使用智能模式
    const useIntelligentMode =
      settings.multilingualConfig?.intelligentMode ||
      settings.translationDirection === 'intelligent';

    let systemPrompt: string;
    if (useIntelligentMode) {
      const targetLanguage = settings.multilingualConfig?.targetLanguage;
      if (!targetLanguage) {
        console.error('智能模式下未找到目标语言配置');
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }
      systemPrompt = getSystemPromptByConfig({
        translationDirection: 'intelligent',
        targetLanguage: targetLanguage,
        userLevel: settings.userLevel,
        replacementRate: settings.replacementRate,
        intelligentMode: true,
      });
    } else {
      systemPrompt = getSystemPrompt(
        settings.translationDirection,
        settings.userLevel,
        settings.replacementRate,
      );
    }

    try {
      let data: any;
      if (provider === 'gemini') {
        data = await this._callGeminiApi(
          originalText,
          systemPrompt,
          activeConfig,
        );
        return this._parseGeminiResponse(data, originalText, useIntelligentMode);
      } else {
        // 默认或OpenAI/DeepSeek/SiliconFlow等
        data = await this._callOpenAIApi(
          originalText,
          systemPrompt,
          activeConfig,
          provider,
        );
        if (useIntelligentMode) {
          return this.extractIntelligentReplacements(
            data,
            originalText,
            settings,
          );
        } else {
          return this.extractReplacements(data, originalText);
        }
      }
    } catch (error) {
      console.error('API 请求或解析失败:', error);
      return {
        original: originalText,
        processed: originalText,
        replacements: [],
      };
    }
  }

  /**
   * 调用 OpenAI 兼容 API (包括 OpenAI, DeepSeek, SiliconFlow)
   * @param text 原始文本
   * @param systemPrompt 系统提示词
   * @param config API 配置
   * @param provider 服务提供商
   * @returns API 响应数据
   */
  private async _callOpenAIApi(
    text: string,
    systemPrompt: string,
    config: ApiConfig,
    provider: string,
  ): Promise<any> {
    let requestBody: any = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `{{ ${text} }}`,
        },
      ],
      temperature: config.temperature,
      response_format: { type: 'json_object' },
    };

    if (config.includeThinkingParam) {
      requestBody.enable_thinking = config.enable_thinking;
    }

    requestBody = mergeCustomParams(requestBody, config.customParams);

    const rateLimiter = rateLimitManager.getLimiter(
      config.apiEndpoint,
      config.requestsPerSecond || 0,
      true,
    );

    const apiRequestFunction = async () => {
      return fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
    };

    const [response] = await rateLimiter.executeBatch([apiRequestFunction]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `OpenAI 兼容 API 请求失败 (${provider}): ${response.status} - ${errorText}`,
      );
      throw new Error(
        `OpenAI 兼容 API 请求失败 (${provider}): ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * 调用 Google Gemini API
   * @param text 原始文本
   * @param systemPrompt 系统提示词
   * @param config API 配置
   * @returns API 响应数据
   */
  private async _callGeminiApi(
    text: string,
    systemPrompt: string,
    config: ApiConfig,
  ): Promise<any> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model }, { baseUrl: config.apiEndpoint });

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: '好的，我明白了。' }] }, // Gemini 通常需要一个模型回复来模拟对话
      { role: 'user', parts: [{ text: `{{ ${text} }}` }] },
    ];

    const generationConfig: any = {
      temperature: config.temperature,
      responseMimeType: 'application/json', // 强制JSON输出
    };

    // 合并自定义参数
    const mergedGenerationConfig = mergeCustomParams(
      generationConfig,
      config.customParams,
    );

    const rateLimiter = rateLimitManager.getLimiter(
      'gemini-api', // Gemini API 不需要具体的endpoint进行限流，使用一个固定名称
      config.requestsPerSecond || 0,
      true,
    );

    const apiRequestFunction = async () => {
      return model.generateContent({
        contents,
        generationConfig: mergedGenerationConfig,
      });
    };

    const [result] = await rateLimiter.executeBatch([apiRequestFunction]);

    if (!result || !result.response) {
      console.error('Gemini API 请求失败: 无有效响应');
      throw new Error('Gemini API 请求失败: 无有效响应');
    }

    return result.response;
  }

  /**
   * 解析 Google Gemini API 的响应
   * @param response Gemini API 原始响应
   * @param originalText 原始文本
   * @param useIntelligentMode 是否使用智能模式
   * @returns FullTextAnalysisResponse
   */
  private _parseGeminiResponse(
    response: any,
    originalText: string,
    useIntelligentMode: boolean,
  ): FullTextAnalysisResponse {
    try {
      const textContent = response.text();
      if (!textContent) {
        console.warn('Gemini 响应中未找到文本内容');
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      let content;
      try {
        // Gemini API 返回的文本内容可能包含Markdown，需要清理
        const cleanedContent = cleanMarkdownFromResponse(textContent);
        content = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('解析 Gemini API 响应 JSON 失败:', parseError);
        console.error('原始 Gemini 响应内容:', textContent);
        // 如果JSON解析失败，尝试作为普通文本处理或返回空
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      if (!content || !Array.isArray(content.replacements)) {
        console.warn('Gemini 响应中未找到有效的 replacements 数组');
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      const replacements = this.addPositionsToReplacements(
        originalText,
        content.replacements,
      );

      return {
        original: originalText,
        processed: '',
        replacements,
      };
    } catch (error) {
      console.error('解析 Gemini 响应失败:', error);
      return {
        original: originalText,
        processed: originalText,
        replacements: [],
      };
    }
  }

  /**
   * 极简化：提取智能模式的替换信息
   * 只关注replacements数组，忽略其他所有信息
   * @param data API返回的数据
   * @param originalText 原始文本
   * @param settings 用户设置
   * @returns 分析结果，只包含replacements
   */
  private extractIntelligentReplacements(
    data: any,
    originalText: string,
    settings: UserSettings,
  ): FullTextAnalysisResponse {
    try {
      if (!data?.choices?.[0]?.message?.content) {
        return {
          original: originalText,
          processed: '',
          replacements: [],
        };
      }

      let content;
      try {
        // 清理AI响应中的Markdown格式
        const cleanedContent = cleanMarkdownFromResponse(
          data.choices[0].message.content,
        );
        content = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('解析智能模式API响应JSON失败:', parseError);
        console.error('原始响应内容:', data.choices[0].message.content);
        // 降级到传统模式处理
        return this.extractReplacements(data, originalText);
      }

      // 只处理replacements数组
      const replacements = this.addPositionsToReplacements(
        originalText,
        content.replacements || [],
      );

      return {
        original: originalText,
        processed: '',
        replacements,
      };
    } catch (error) {
      console.error('提取智能替换信息失败:', error);
      // 降级处理
      return this.extractReplacements(data, originalText);
    }
  }

  /**
   * 保持向后兼容：从传统模式API响应中提取替换信息
   * @param data API返回的数据
   * @param originalText 原始文本
   * @returns 分析结果，包含替换信息
   */
  private extractReplacements(
    data: any,
    originalText: string,
  ): FullTextAnalysisResponse {
    try {
      if (!data?.choices?.[0]?.message?.content) {
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      let content;
      try {
        // 清理AI响应中的Markdown格式
        const cleanedContent = cleanMarkdownFromResponse(
          data.choices[0].message.content,
        );
        content = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('解析API响应JSON失败:', parseError);
        console.error('原始响应内容:', data.choices[0].message.content);
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      if (!content || !Array.isArray(content.replacements)) {
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      const replacementsWithPositions = this.addPositionsToReplacements(
        originalText,
        content.replacements,
      );

      return {
        original: originalText,
        processed: '', // 不再需要
        replacements: replacementsWithPositions,
      };
    } catch (error) {
      console.error('提取替换信息失败:', error);
      return {
        original: originalText,
        processed: originalText,
        replacements: [],
      };
    }
  }

  /**
   * 为替换项添加位置信息
   * @param originalText 原始文本
   * @param replacements 从API获取的替换项
   * @returns 带位置信息的替换项数组
   */
  private addPositionsToReplacements(
    originalText: string,
    replacements: Array<{ original: string; translation: string }>,
  ): Replacement[] {
    const result: Replacement[] = [];
    let lastIndex = 0;

    // 按顺序处理替换项，支持重复词汇
    for (const rep of replacements) {
      if (!rep.original || !rep.translation) {
        continue;
      }

      // 尝试在剩余文本中查找词汇
      const index = originalText.indexOf(rep.original, lastIndex);
      if (index !== -1) {
        // 验证找到的文本确实匹配
        const foundText = originalText.substring(
          index,
          index + rep.original.length,
        );
        if (foundText === rep.original) {
          result.push({
            ...rep,
            position: {
              start: index,
              end: index + rep.original.length,
            },
            isNew: true,
          });
          lastIndex = index + rep.original.length;
        }
      } else {
        // 如果顺序查找失败，尝试全局查找（但要避免重复）
        const globalIndex = originalText.indexOf(rep.original);
        if (
          globalIndex !== -1 &&
          !result.some(
            (r) =>
              r.position.start <= globalIndex && r.position.end > globalIndex,
          )
        ) {
          result.push({
            ...rep,
            position: {
              start: globalIndex,
              end: globalIndex + rep.original.length,
            },
            isNew: true,
          });
        }
      }
    }

    // 按位置排序确保处理顺序正确
    result.sort((a, b) => a.position.start - b.position.start);

    return result;
  }
}

/**
 * API 服务模块
 * 负责调用 GPT 大模型 API 进行文本分析和翻译
 */

import { getSystemPrompt, getSystemPromptByConfig } from './promptManager';
import {
  UserSettings,
  FullTextAnalysisResponse,
  Replacement,
  ApiConfig,
  DEFAULT_API_CONFIG,
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

    // 获取当前活跃的API配置
    const activeConfig = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );

    // 验证输入
    if (!originalText.trim() || !activeConfig?.config.apiKey) {
      return {
        original: originalText,
        processed: originalText,
        replacements: [],
      };
    }

    if (!activeConfig.config.apiKey) {
      console.error('API 密钥未设置');
    }
    try {
      // 判断是否使用智能模式
      const useIntelligentMode =
        settings.multilingualConfig?.intelligentMode ||
        settings.translationDirection === 'intelligent';

      let systemPrompt: string;

      if (useIntelligentMode) {
        // 使用智能模式提示词，直接使用用户选择的目标语言
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
        // 使用传统模式提示词
        systemPrompt = getSystemPrompt(
          settings.translationDirection,
          settings.userLevel,
          settings.replacementRate,
        );
      }

      let requestBody: any = {
        model: activeConfig.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `{{ ${originalText} }}`,
          },
        ],
        temperature: activeConfig.config.temperature,
        response_format: { type: 'json_object' },
      };

      // 只有当配置允许传递思考参数时，才添加enable_thinking字段
      if (activeConfig.config.includeThinkingParam) {
        requestBody.enable_thinking = activeConfig.config.enable_thinking;
      }

      // 合并自定义参数
      requestBody = mergeCustomParams(
        requestBody,
        activeConfig.config.customParams,
      );

      // 通过速率限制器执行API请求
      const rateLimiter = rateLimitManager.getLimiter(
        activeConfig.config.apiEndpoint,
        activeConfig.config.requestsPerSecond || 0,
        true,
      );

      const apiRequestFunction = async () => {
        return fetch(activeConfig.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeConfig.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
      };

      // 通过executeBatch执行单个请求，确保串行
      const [response] = await rateLimiter.executeBatch([apiRequestFunction]);

      if (!response.ok) {
        console.error(`API 请求失败: ${response.status}`);
        return {
          original: originalText,
          processed: originalText,
          replacements: [],
        };
      }

      const data = await response.json();

      if (useIntelligentMode) {
        return this.extractIntelligentReplacements(
          data,
          originalText,
          settings,
        );
      } else {
        return this.extractReplacements(data, originalText, settings);
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
        return this.extractReplacements(data, originalText, settings);
      }

      // 只处理replacements数组
      const replacements = this.addPositionsToReplacements(
        originalText,
        content.replacements || [],
        settings,
      );

      return {
        original: originalText,
        processed: '',
        replacements,
      };
    } catch (error) {
      console.error('提取智能替换信息失败:', error);
      // 降级处理
      return this.extractReplacements(data, originalText, settings);
    }
  }

  /**
   * 保持向后兼容：从传统模式API响应中提取替换信息
   * @param data API返回的数据
   * @param originalText 原始文本
   * @param settings 用户设置（可选）
   * @returns 分析结果，包含替换信息
   */
  private extractReplacements(
    data: any,
    originalText: string,
    settings?: UserSettings,
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
        settings,
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
   * 为替换项添加位置信息并验证替换率
   * @param originalText 原始文本
   * @param replacements 从API获取的替换项
   * @param settings 用户设置（包含替换率）
   * @returns 带位置信息的替换项数组
   */
  private addPositionsToReplacements(
    originalText: string,
    replacements: Array<{ original: string; translation: string }>,
    settings?: UserSettings,
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

    // 如果提供了用户设置，验证替换率
    if (settings) {
      const actualReplacementRate = this.validateReplacementRate(
        originalText,
        result,
        settings.replacementRate,
      );

      // 如果实际替换率过高，进行过滤
      if (actualReplacementRate > settings.replacementRate * 1.5) {
        console.warn(
          `实际替换率 ${(actualReplacementRate * 100).toFixed(1)}% 超出预期 ${(settings.replacementRate * 100).toFixed(1)}%，进行过滤`,
        );
        return this.filterByReplacementRate(
          originalText,
          result,
          settings.replacementRate,
        );
      }
    }

    return result;
  }

  /**
   * 验证实际替换率
   * @param originalText 原始文本
   * @param replacements 替换项
   * @param targetRate 目标替换率
   * @returns 实际替换率
   */
  private validateReplacementRate(
    originalText: string,
    replacements: Replacement[],
    targetRate: number,
  ): number {
    const totalOriginalChars = replacements.reduce(
      (sum, rep) => sum + rep.original.length,
      0,
    );
    return totalOriginalChars / originalText.length;
  }

  /**
   * 根据替换率过滤替换项
   * @param originalText 原始文本
   * @param replacements 替换项
   * @param targetRate 目标替换率
   * @returns 过滤后的替换项
   */
  private filterByReplacementRate(
    originalText: string,
    replacements: Replacement[],
    targetRate: number,
  ): Replacement[] {
    const targetChars = Math.floor(originalText.length * targetRate);
    const filtered: Replacement[] = [];
    let currentChars = 0;

    // 按位置顺序优先选择替换项
    for (const replacement of replacements) {
      if (currentChars + replacement.original.length <= targetChars) {
        filtered.push(replacement);
        currentChars += replacement.original.length;
      }
    }

    console.log(
      `替换率过滤：从 ${replacements.length} 个词汇筛选出 ${filtered.length} 个，实际替换率 ${((currentChars / originalText.length) * 100).toFixed(1)}%`,
    );

    return filtered;
  }
}

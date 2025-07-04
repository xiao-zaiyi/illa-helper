/**
 * OpenAI 翻译提供者
 */

import { FullTextAnalysisResponse } from '../../shared/types/api';
import { UserSettings } from '../../shared/types/storage';
import { BaseProvider } from '../base/BaseProvider';
import { mergeCustomParams } from '../utils/apiUtils';
import { addPositionsToReplacements } from '../utils/textUtils';
import { sendApiRequest } from '../utils/requestUtils';
import {
  getSystemPrompt,
  getSystemPromptByConfig,
} from '../../core/translation/PromptService';
import { cleanMarkdownFromResponse, getApiTimeout } from '@/src/utils';
import { rateLimitManager } from '../../infrastructure/ratelimit';

/**
 * OpenAI API 提供者实现
 */
export class OpenAIProvider extends BaseProvider {
  protected getProviderName(): string {
    return 'OpenAI';
  }

  protected async doAnalyzeFullText(
    text: string,
    settings: UserSettings,
  ): Promise<FullTextAnalysisResponse> {
    const useIntelligentMode =
      settings.multilingualConfig?.intelligentMode ||
      settings.translationDirection === 'intelligent';

    const systemPrompt = useIntelligentMode
      ? getSystemPromptByConfig({
          translationDirection: 'intelligent',
          targetLanguage: settings.multilingualConfig.targetLanguage,
          userLevel: settings.userLevel,
          replacementRate: settings.replacementRate,
          intelligentMode: true,
        })
      : getSystemPrompt(
          settings.translationDirection,
          settings.userLevel,
          settings.replacementRate,
        );

    let requestBody: any = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `{{ ${text} }}` },
      ],
      temperature: this.config.temperature,
      response_format: { type: 'json_object' },
    };

    if (this.config.includeThinkingParam) {
      requestBody.enable_thinking = this.config.enable_thinking;
    }

    requestBody = mergeCustomParams(requestBody, this.config.customParams);

    const rateLimiter = rateLimitManager.getLimiter(
      this.config.apiEndpoint,
      this.config.requestsPerSecond || 0,
      true,
    );

    const apiRequestFunction = async () => {
      const timeout = getApiTimeout(settings.apiRequestTimeout || 0);
      return sendApiRequest(requestBody, this.config, timeout);
    };

    const [response] = await rateLimiter.executeBatch([apiRequestFunction]);

    if (!response.ok) {
      console.error(`API 请求失败: ${response.status} ${response.statusText}`);
      throw new Error(
        `API 请求失败: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return this.extractReplacements(data, text);
  }

  /**
   * 提取替换信息
   */
  private extractReplacements(
    data: any,
    originalText: string,
  ): FullTextAnalysisResponse {
    try {
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('API响应格式错误');
      }

      const cleanedContent = cleanMarkdownFromResponse(
        data.choices[0].message.content,
      );
      const content = JSON.parse(cleanedContent);
      const replacements = addPositionsToReplacements(
        originalText,
        content.replacements || [],
      );

      return {
        original: originalText,
        processed: '',
        replacements,
      };
    } catch (error) {
      console.error('提取替换信息失败:', error);
      throw error;
    }
  }
}

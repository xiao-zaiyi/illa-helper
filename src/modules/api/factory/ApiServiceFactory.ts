/**
 * API 服务工厂
 */

import { ApiConfigItem } from '../../shared/types/api';
import { TranslationProvider } from '../../shared/types/core';
import { ITranslationProvider } from '../types';
import { GoogleGeminiProvider, OpenAIProvider } from '../providers';

/**
 * API 服务工厂
 * 根据配置创建相应的翻译提供者
 */
export class ApiServiceFactory {
  /**
   * 创建翻译提供者实例
   */
  static createProvider(activeConfig: ApiConfigItem): ITranslationProvider {
    const { provider, config } = activeConfig;

    switch (provider) {
      case TranslationProvider.GoogleGemini:
      case TranslationProvider.ProxyGemini:
        return new GoogleGeminiProvider(config);

      case TranslationProvider.OpenAI:
      case TranslationProvider.DeepSeek:
      case TranslationProvider.SiliconFlow:
      default:
        return new OpenAIProvider(config);
    }
  }

  /**
   * 获取支持的提供者列表
   */
  static getSupportedProviders(): TranslationProvider[] {
    return [
      TranslationProvider.OpenAI,
      TranslationProvider.GoogleGemini,
      TranslationProvider.ProxyGemini,
      TranslationProvider.DeepSeek,
      TranslationProvider.SiliconFlow,
    ];
  }

  /**
   * 检查提供者是否受支持
   */
  static isProviderSupported(provider: TranslationProvider): boolean {
    return this.getSupportedProviders().includes(provider);
  }
}

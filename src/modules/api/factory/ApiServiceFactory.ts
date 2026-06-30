/**
 * API 服务工厂
 */

import { ApiConfigItem } from '../../shared/types/api';
import { ApiProtocolFamily } from '../../shared/types/api';
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
    const { protocolFamily, config } = activeConfig;

    switch (protocolFamily) {
      case ApiProtocolFamily.OPENAI_COMPATIBLE:
        return new OpenAIProvider(config);
      case ApiProtocolFamily.GEMINI:
        return new GoogleGeminiProvider(config);
      default:
        throw new Error(`Unsupported API protocol family: ${protocolFamily}`);
    }
  }
}

/**
 * 文本替换器模块
 * 负责根据用户设置替换文本中的词汇
 */

import { ApiServiceFactory } from './api';
import { StyleManager } from './styleManager';
import { StorageManager } from './storageManager';
import { translationCacheManager } from './translationCache';
import {
  UserSettings,
  ReplacementConfig,
  FullTextAnalysisResponse,
  TranslationStyle,
} from './types';

// 替换结果接口
export interface ReplacementResult {
  original: string; // 原始文本
  replaced: string; // 替换后的文本
  replacedWords: Array<{
    // 替换的词汇信息
    chinese: string;
    english: string;
    position: {
      start: number;
      end: number;
    };
    isNew: boolean; // 是否是生词
  }>;
}

// 文本替换器
export class TextReplacer {
  private styleManager: StyleManager;
  private config: ReplacementConfig;

  constructor(config: ReplacementConfig) {
    this.config = config;
    this.styleManager = new StyleManager();
    this.styleManager.setTranslationStyle(
      this.config.translationStyle || TranslationStyle.DEFAULT,
    );
  }

  /**
   * 设置配置
   * @param config 替换配置
   */
  setConfig(config: Partial<ReplacementConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.config.translationStyle) {
      this.styleManager.setTranslationStyle(this.config.translationStyle);
    }
  }

  /**
   * 替换文本 - 支持智能模式和传统模式
   * @param text 原始文本
   * @param fingerprint 内容指纹（可选，用于缓存）
   * @returns 替换结果
   */
  async replaceText(text: string, fingerprint?: string): Promise<FullTextAnalysisResponse> {
    try {
      // 获取当前用户设置
      const storageManager = new StorageManager();
      const settings = await storageManager.getUserSettings();

      // 如果不使用API，直接返回原文
      if (!this.config.useGptApi) {
        return {
          original: text,
          processed: text,
          replacements: [],
        };
      }

      // 如果有指纹，尝试从缓存获取
      if (fingerprint) {
        const cachedResult = translationCacheManager.getTranslation(text, fingerprint);
        if (cachedResult) {
          console.log('[TextReplacer] 使用缓存的翻译结果');
          return cachedResult;
        }
      }

      // 构建完整的用户设置对象，使用真实的多配置系统数据
      const settingsForApi: UserSettings = {
        ...settings, // 使用真实的用户设置作为基础
        userLevel: this.config.userLevel,
        replacementRate: this.config.replacementRate,
        useGptApi: this.config.useGptApi,
        translationStyle: this.config.translationStyle,
        translationDirection: this.config.translationDirection,
        // 保持多配置系统的配置不变，不要覆盖
      };

      // 统一处理所有翻译模式
      const result = await this.processTranslation(text, settingsForApi);
      
      // 如果有指纹，保存到缓存
      if (fingerprint && result.replacements && result.replacements.length > 0) {
        translationCacheManager.saveTranslation(text, result, fingerprint);
      }
      
      return result;
    } catch (error) {
      console.error('替换文本失败:', error);
      return {
        original: text,
        processed: text,
        replacements: [],
      };
    }
  }

  /**
   * 统一的翻译处理方法
   * @param text 原始文本
   * @param settings 用户设置
   * @returns 翻译结果
   */
  private async processTranslation(
    text: string,
    settings: UserSettings,
  ): Promise<FullTextAnalysisResponse> {
    try {
      // 获取当前活跃的API配置
      const activeConfig = settings.apiConfigs.find(
        (config) => config.id === settings.activeApiConfigId,
      );

      if (!activeConfig) {
        throw new Error('No active API configuration found.');
      }

      // 使用工厂方法创建正确的提供商实例
      const translationProvider =
        ApiServiceFactory.createProvider(activeConfig);

      // 调用API进行翻译
      const apiResult = await translationProvider.analyzeFullText(
        text,
        settings,
      );

      return apiResult;
    } catch (error) {
      console.error('翻译失败:', error);

      // 如果是智能模式失败，尝试降级到传统模式
      const isIntelligentMode =
        settings.multilingualConfig?.intelligentMode ||
        settings.translationDirection === 'intelligent';

      if (isIntelligentMode) {
        console.log('智能模式失败，降级到传统模式');
        const fallbackSettings = this.createFallbackSettings(settings);
        return await this.processTranslation(text, fallbackSettings);
      }

      // 传统模式失败，返回原文
      return {
        original: text,
        processed: text,
        replacements: [],
      };
    }
  }



  /**
   * 创建降级设置
   * @param originalSettings 原始设置
   * @returns 降级后的设置
   */
  private createFallbackSettings(originalSettings: UserSettings): UserSettings {
    return {
      ...originalSettings,
      translationDirection: 'zh-to-en', // 降级到中译英模式
      multilingualConfig: {
        intelligentMode: false,
        targetLanguage: '', // 降级时也不设置默认语言
      },
    };
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): {
    cacheSize: number;
  } {
    return {
      cacheSize: 0, // 现在使用新的翻译缓存系统
    };
  }

  /**
   * 清空所有缓存
   */
  clearAllCache(): void {
    // 现在使用新的翻译缓存系统，这里保留方法以保持兼容性
    console.log('使用新的翻译缓存系统');
  }
}

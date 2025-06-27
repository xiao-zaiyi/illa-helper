/**
 * 文本替换器模块
 * 负责根据用户设置替换文本中的词汇
 */

import { ApiService } from './apiService';
import { StyleManager } from './styleManager';
import { StorageManager } from './storageManager';
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

// 缓存键接口
interface CacheKey {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  userLevel: number;
  replacementRate: number;
  translationDirection: string;
}

// 文本替换器
export class TextReplacer {
  // 统一缓存配置
  private static readonly CACHE_MAX_SIZE = 100;
  private static readonly CACHE_CLEANUP_BATCH = 20;

  private apiService: ApiService;
  private styleManager: StyleManager;
  private config: ReplacementConfig;
  private cache: Map<string, FullTextAnalysisResponse>;

  constructor(config: ReplacementConfig) {
    this.config = config;
    this.apiService = new ApiService();
    this.styleManager = new StyleManager();
    this.cache = new Map<string, FullTextAnalysisResponse>();
    this.styleManager.setTranslationStyle(
      this.config.translationStyle || TranslationStyle.DEFAULT,
    );
  }

  /**
   * 设置配置
   * @param config 替换配置
   */
  setConfig(config: Partial<ReplacementConfig>): void {
    // 检查替换率是否发生变化，如果变化则清除缓存
    const oldReplacementRate = this.config.replacementRate;

    this.config = { ...this.config, ...config };

    // 如果替换率发生变化，清除缓存以确保新设置生效
    if (
      config.replacementRate !== undefined &&
      config.replacementRate !== oldReplacementRate
    ) {
      console.log(
        `替换率从 ${oldReplacementRate} 更改为 ${config.replacementRate}，清除缓存`,
      );
      this.clearAllCache();
    }

    if (this.config.translationStyle) {
      this.styleManager.setTranslationStyle(this.config.translationStyle);
    }
  }

  /**
   * 替换文本 - 支持智能模式和传统模式
   * @param text 原始文本
   * @returns 替换结果
   */
  async replaceText(text: string): Promise<FullTextAnalysisResponse> {
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
      return await this.processTranslation(text, settingsForApi);
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
    // 生成缓存键
    const cacheKey = this.generateCacheKey(text, settings);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log('缓存命中');
      return cached;
    }

    try {
      // 调用API进行翻译
      const apiResult = await this.apiService.analyzeFullText(text, settings);

      // 存入缓存
      this.cache.set(cacheKey, apiResult);

      // 清理过期缓存
      this.cleanupCache();

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
   * 生成统一的缓存键
   * @param text 文本
   * @param settings 设置
   * @returns 缓存键
   */
  private generateCacheKey(text: string, settings: UserSettings): string {
    let targetLanguage: string;

    // 根据模式获取目标语言
    const isIntelligentMode =
      settings.multilingualConfig?.intelligentMode ||
      settings.translationDirection === 'intelligent';

    if (isIntelligentMode) {
      targetLanguage = settings.multilingualConfig?.targetLanguage || '';
      if (!targetLanguage) {
        throw new Error('智能模式下必须提供目标语言');
      }
    } else {
      targetLanguage = this.extractTargetLanguageFromDirection(
        settings.translationDirection,
      );
    }

    const keyData: CacheKey = {
      text: text.trim(),
      targetLanguage: targetLanguage,
      userLevel: settings.userLevel,
      replacementRate: settings.replacementRate,
      translationDirection: settings.translationDirection,
    };

    return this.hashCacheKey(keyData);
  }

  /**
   * 从翻译方向提取目标语言
   * @param direction 翻译方向
   * @returns 目标语言代码
   */
  private extractTargetLanguageFromDirection(direction: string): string {
    if (!direction || direction === 'intelligent') {
      throw new Error('无法从智能模式提取目标语言，应该使用用户配置');
    }

    const parts = direction.split('-to-');
    if (parts.length === 2) {
      return parts[1];
    }

    throw new Error(`无效的翻译方向格式: ${direction}`);
  }

  /**
   * 哈希缓存键数据
   * @param keyData 缓存键数据
   * @returns 哈希字符串
   */
  private hashCacheKey(keyData: CacheKey): string {
    const str = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
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
   * 清理缓存
   */
  private cleanupCache(): void {
    if (this.cache.size > TextReplacer.CACHE_MAX_SIZE) {
      const keys = Array.from(this.cache.keys());
      const deleteCount =
        this.cache.size -
        TextReplacer.CACHE_MAX_SIZE +
        TextReplacer.CACHE_CLEANUP_BATCH;

      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(keys[i]);
      }

      console.log(`缓存清理：删除 ${deleteCount} 个条目`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): {
    cacheSize: number;
  } {
    return {
      cacheSize: this.cache.size,
    };
  }

  /**
   * 清空所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('所有缓存已清空');
  }
}

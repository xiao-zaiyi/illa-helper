/**
 * 文本替换服务
 * 负责根据用户设置替换文本中的词汇，支持智能模式和传统模式
 */

import { ApiServiceFactory } from '../../api';
import { StyleManager } from '../../styles';
import { StorageManager } from '../../storageManager';
// 替换结果接口
export interface ReplacementResult {
  original: string; // 原始文本
  replaced: string; // 替换后的文本
  replacedWords: Array<{
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

// 缓存统计信息
export interface CacheStats {
  cacheSize: number;
}
import {
  ReplacementConfig,
  FullTextAnalysisResponse,
} from '../../shared/types/api';
import { UserSettings } from '../../shared/types/storage';
import { TranslationStyle } from '../../shared/types/core';

/**
 * 文本替换服务类
 * 采用单例模式，提供统一的文本替换功能
 */
export class TextReplacerService {
  // 单例实例
  private static instance: TextReplacerService | null = null;

  // 缓存配置常量
  private static readonly CACHE_MAX_SIZE = 100;
  private static readonly CACHE_CLEANUP_BATCH = 20;

  // 服务组件
  public readonly styleManager: StyleManager;
  private config: ReplacementConfig;
  private cache: Map<string, FullTextAnalysisResponse>;

  /**
   * 私有构造函数，确保单例模式
   */
  private constructor(config: ReplacementConfig) {
    this.config = config;
    this.styleManager = new StyleManager();
    this.cache = new Map<string, FullTextAnalysisResponse>();
    this.initializeStyleManager();
  }

  /**
   * 获取服务实例（单例模式）
   */
  public static getInstance(config?: ReplacementConfig): TextReplacerService {
    if (!TextReplacerService.instance) {
      if (!config) {
        throw new Error('首次创建TextReplacerService实例时必须提供配置');
      }
      TextReplacerService.instance = new TextReplacerService(config);
    }
    return TextReplacerService.instance;
  }

  /**
   * 重置服务实例（主要用于测试）
   */
  public static resetInstance(): void {
    TextReplacerService.instance = null;
  }

  /**
   * 初始化样式管理器
   */
  private initializeStyleManager(): void {
    const translationStyle = this.config.translationStyle || TranslationStyle.DEFAULT;
    this.styleManager.setTranslationStyle(translationStyle);
  }

  /**
   * 更新服务配置
   * @param config 新的配置（部分更新）
   */
  public updateConfig(config: Partial<ReplacementConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.translationStyle) {
      this.styleManager.setTranslationStyle(config.translationStyle);
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): ReplacementConfig {
    return { ...this.config };
  }

  /**
   * 主要的文本替换方法
   * 支持智能模式和传统模式的翻译
   * @param text 原始文本
   * @returns 翻译处理结果
   */
  public async replaceText(text: string): Promise<FullTextAnalysisResponse> {
    try {
      // 获取当前用户设置
      const storageManager = new StorageManager();
      const settings = await storageManager.getUserSettings();

      // 如果不使用API，直接返回原文
      if (!this.config.useGptApi) {
        return this.createEmptyResult(text);
      }

      // 构建完整的用户设置对象
      const settingsForApi = this.buildUserSettings(settings);

      // 统一处理所有翻译模式
      return await this.processTranslation(text, settingsForApi);
    } catch (error) {
      console.error('文本替换失败:', error);
      return this.createEmptyResult(text);
    }
  }

  /**
   * 创建空的替换结果
   */
  private createEmptyResult(text: string): FullTextAnalysisResponse {
    return {
      original: text,
      processed: text,
      replacements: [],
    };
  }

  /**
   * 构建API调用用的用户设置
   */
  private buildUserSettings(baseSettings: UserSettings): UserSettings {
    return {
      ...baseSettings, // 使用真实的用户设置作为基础
      userLevel: this.config.userLevel,
      replacementRate: this.config.replacementRate,
      useGptApi: this.config.useGptApi,
      translationStyle: this.config.translationStyle,
      translationDirection: this.config.translationDirection,
      // 保持多配置系统的配置不变，不要覆盖
    };
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
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('缓存命中');
      return cachedResult;
    }

    try {
      // 获取API结果
      const apiResult = await this.callTranslationAPI(text, settings);

      // 存入缓存
      this.setCachedResult(cacheKey, apiResult);

      return apiResult;
    } catch (error) {
      console.error('翻译失败:', error);
      return await this.handleTranslationError(text, settings, error);
    }
  }

  /**
   * 调用翻译API
   */
  private async callTranslationAPI(
    text: string,
    settings: UserSettings
  ): Promise<FullTextAnalysisResponse> {
    // 获取当前活跃的API配置
    const activeConfig = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );

    if (!activeConfig) {
      throw new Error('没有找到活跃的API配置');
    }

    // 使用工厂方法创建正确的提供商实例
    const translationProvider = ApiServiceFactory.createProvider(activeConfig);

    // 调用API进行翻译
    return await translationProvider.analyzeFullText(text, settings);
  }

  /**
   * 处理翻译错误，包括智能模式降级
   */
  private async handleTranslationError(
    text: string,
    settings: UserSettings,
    error: any
  ): Promise<FullTextAnalysisResponse> {
    // 检查是否为智能模式
    const isIntelligentMode = this.isIntelligentMode(settings);

    if (isIntelligentMode) {
      console.log('智能模式失败，尝试降级到传统模式');
      const fallbackSettings = this.createFallbackSettings(settings);
      return await this.processTranslation(text, fallbackSettings);
    }

    // 传统模式失败，返回原文
    return this.createEmptyResult(text);
  }

  /**
   * 判断是否为智能模式
   */
  private isIntelligentMode(settings: UserSettings): boolean {
    return settings.multilingualConfig?.intelligentMode ||
      settings.translationDirection === 'intelligent';
  }

  /**
   * 生成统一的缓存键
   * @param text 文本
   * @param settings 设置
   * @returns 缓存键字符串
   */
  private generateCacheKey(text: string, settings: UserSettings): string {
    const targetLanguage = this.extractTargetLanguage(settings);

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
   * 提取目标语言
   */
  private extractTargetLanguage(settings: UserSettings): string {
    const isIntelligentMode = this.isIntelligentMode(settings);

    if (isIntelligentMode) {
      const targetLanguage = settings.multilingualConfig?.targetLanguage;
      if (!targetLanguage) {
        throw new Error('智能模式下必须提供目标语言');
      }
      return targetLanguage;
    } else {
      return this.extractTargetLanguageFromDirection(settings.translationDirection);
    }
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
   * 创建降级设置（智能模式失败时使用）
   * @param originalSettings 原始设置
   * @returns 降级后的设置
   */
  private createFallbackSettings(originalSettings: UserSettings): UserSettings {
    return {
      ...originalSettings,
      translationDirection: 'zh-to-en', // 降级到中译英模式
      multilingualConfig: {
        intelligentMode: false,
        targetLanguage: '', // 降级时清空目标语言
      },
    };
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 获取缓存结果
   */
  private getCachedResult(cacheKey: string): FullTextAnalysisResponse | null {
    return this.cache.get(cacheKey) || null;
  }

  /**
   * 设置缓存结果
   */
  private setCachedResult(cacheKey: string, result: FullTextAnalysisResponse): void {
    this.cache.set(cacheKey, result);
    this.cleanupCache();
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    if (this.cache.size > TextReplacerService.CACHE_MAX_SIZE) {
      const keys = Array.from(this.cache.keys());
      const deleteCount =
        this.cache.size -
        TextReplacerService.CACHE_MAX_SIZE +
        TextReplacerService.CACHE_CLEANUP_BATCH;

      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(keys[i]);
      }

      console.log(`缓存清理：删除了 ${deleteCount} 个条目`);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  public getCacheStats(): CacheStats {
    return {
      cacheSize: this.cache.size,
    };
  }

  /**
   * 清空所有缓存
   */
  public clearAllCache(): void {
    this.cache.clear();
    console.log('所有缓存已清空');
  }

  // ==================== 服务生命周期方法 ====================

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    // 预热缓存或其他初始化操作
    console.log('TextReplacerService 已初始化');
  }

  /**
   * 销毁服务资源
   */
  public dispose(): void {
    this.clearAllCache();
    // 其他清理操作
    console.log('TextReplacerService 资源已清理');
  }
}

// 导出服务实例获取器（简化外部使用）
export const getTextReplacerService = (config?: ReplacementConfig) => {
  return TextReplacerService.getInstance(config);
};

// 保持向后兼容：接口已在上方导出

// 保持向后兼容：导出类的别名
export const TextReplacer = TextReplacerService;

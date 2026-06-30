/**
 * 音标提供者工厂类
 *
 * 使用工厂模式和单例模式管理不同类型的音标提供者实例。
 * 支持多种数据源：传统词典API、AI翻译服务等，提供统一的
 * 创建接口和实例管理功能。
 *
 * 支持的提供者类型：
 * - 'dictionary-api': 使用Dictionary API获取音标和词义
 * - 'ai-translation': 使用AI大模型提供中文翻译服务
 *
 * 特性：
 * - 单例模式：每种类型的提供者只创建一个实例
 * - 延迟初始化：只在需要时创建实例
 * - 配置注入：支持为特定提供者注入配置
 * - 类型安全：编译时检查提供者类型有效性
 *
 * @author AI Assistant
 * @version 2.0.0
 */

import { IPhoneticProvider } from './IPhoneticProvider';
import { DictionaryApiProvider } from './DictionaryApiProvider';
import { AITranslationProvider } from '../translation/AITranslationProvider';
import { ApiConfigItem } from '../../shared/types/api';

export class PhoneticProviderFactory {
  /** 提供者实例缓存，实现单例模式 */
  private static instances = new Map<string, IPhoneticProvider>();

  /**
   * 创建音标提供者实例
   *
   * 根据提供者名称创建相应的实例，支持单例模式缓存。
   * 对于需要配置的提供者（如AI翻译），可以传入相应的配置对象。
   *
   * @param providerName - 提供者名称标识符
   * @param apiConfigItem - AI翻译提供者所需的API配置项（可选）
   * @returns IPhoneticProvider 提供者实例
   * @throws Error 当提供者名称不受支持时抛出错误
   */
  static createProvider(
    providerName: string,
    apiConfigItem?: ApiConfigItem | null,
  ): IPhoneticProvider {
    const normalizedName = providerName.toLowerCase();
    const cacheKey =
      normalizedName === 'ai-translation' && apiConfigItem
        ? `${normalizedName}:${apiConfigItem.id}`
        : normalizedName;

    // 检查是否已存在实例（单例模式）
    // 避免重复创建，提升性能并保持状态一致性
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    let provider: IPhoneticProvider;

    // 根据提供者名称创建相应的实例
    switch (normalizedName) {
      case 'dictionary-api':
        // 传统词典API提供者，提供音标和基础词义
        provider = new DictionaryApiProvider();
        break;

      case 'ai-translation':
        // AI翻译提供者，需要API配置才能工作
        if (!apiConfigItem) {
          throw new Error('AI翻译提供者需要API配置');
        }
        provider = new AITranslationProvider(apiConfigItem);
        break;

      // 可以在这里添加更多提供者
      // case 'other-api':
      //   provider = new OtherApiProvider();
      //   break;

      default:
        throw new Error(`未知的音标提供者: ${providerName}`);
    }

    // 缓存实例以实现单例模式
    this.instances.set(cacheKey, provider);
    return provider;
  }

  /**
   * 获取所有支持的提供者名称
   * @returns string[] 提供者名称数组
   */
  static getSupportedProviders(): string[] {
    return ['dictionary-api', 'ai-translation'];
  }

  /**
   * 检查提供者是否支持
   * @param providerName 提供者名称
   * @returns boolean 是否支持
   */
  static isProviderSupported(providerName: string): boolean {
    return this.getSupportedProviders().includes(providerName.toLowerCase());
  }

  /**
   * 获取默认提供者
   * @returns IPhoneticProvider 默认提供者实例
   */
  static getDefaultProvider(): IPhoneticProvider {
    return this.createProvider('dictionary-api');
  }

  /**
   * 清除所有缓存的提供者实例
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * 获取提供者实例（如果存在）
   * @param providerName 提供者名称
   * @param configId AI翻译提供者的配置ID
   * @returns IPhoneticProvider | undefined 提供者实例或undefined
   */
  static getInstance(
    providerName: string,
    configId?: string,
  ): IPhoneticProvider | undefined {
    const normalizedName = providerName.toLowerCase();
    const cacheKey =
      normalizedName === 'ai-translation' && configId
        ? `${normalizedName}:${configId}`
        : normalizedName;

    return this.instances.get(cacheKey);
  }
}

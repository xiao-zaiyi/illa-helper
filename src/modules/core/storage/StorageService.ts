/**
 * 存储管理服务
 * 负责管理用户配置的存储，支持多API配置管理、事件通知、数据验证
 *
 * 功能特性：
 * - 用户设置的序列化存储和读取
 * - 多API配置管理
 * - 数据验证和自动修复
 * - 事件通知机制
 * - 配置统计信息
 */

import { browser } from 'wxt/browser';
import { UserSettings } from '../../shared/types/storage';
import { ApiConfig, ApiConfigItem } from '../../shared/types/api';
import { DEFAULT_SETTINGS } from '../../shared/constants/defaults';
import {
  StorageServiceConfig,
  StorageOperationResult,
  ConfigurationStats,
  StorageEventType,
  StorageEventData,
  StorageEventListener,
} from './types';

// ==================== 存储管理服务类 ====================

/**
 * 存储管理服务
 * 采用单例模式，提供统一的存储管理功能
 */
export class StorageService {
  private static instance: StorageService;
  private static readonly STORAGE_KEY = 'user_settings';

  // 配置和状态
  private readonly config: StorageServiceConfig;
  private readonly storageKey: string;
  private eventListeners: Map<StorageEventType, StorageEventListener[]> =
    new Map();

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor(config: StorageServiceConfig = {}) {
    this.config = {
      enableAutoBackup: true,
      enableValidation: true,
      maxRetries: 3,
      storageKey: 'user_settings',
      ...config,
    };
    this.storageKey = this.config.storageKey!;
  }

  /**
   * 获取服务实例
   * @param config 可选的服务配置
   * @returns StorageService 实例
   */
  public static getInstance(config?: StorageServiceConfig): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(config);
    }
    return StorageService.instance;
  }

  // ==================== 事件管理 ====================

  /**
   * 添加事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  public addEventListener(
    eventType: StorageEventType,
    listener: StorageEventListener,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param listener 监听器函数
   */
  public removeEventListener(
    eventType: StorageEventType,
    listener: StorageEventListener,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param eventType 事件类型
   * @param data 事件数据
   * @param error 错误信息
   */
  private emitEvent(
    eventType: StorageEventType,
    data?: any,
    error?: string,
  ): void {
    const event: StorageEventData = {
      type: eventType,
      timestamp: Date.now(),
      data,
      error,
    };

    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          console.error('Storage event listener error:', e);
        }
      });
    }
  }

  // ==================== 核心存储功能 ====================

  /**
   * 获取用户设置
   * @returns 用户设置
   */
  public async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await browser.storage.sync.get(StorageService.STORAGE_KEY);
      const serializedData = result[StorageService.STORAGE_KEY];

      if (!serializedData) {
        this.emitEvent(StorageEventType.SETTINGS_LOADED, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      const userSettings: UserSettings = JSON.parse(serializedData);
      const validatedSettings = this.validateAndFixSettings(userSettings);

      if (this.hasConfigurationChanged(userSettings, validatedSettings)) {
        await this.saveUserSettings(validatedSettings);
      }

      this.emitEvent(StorageEventType.SETTINGS_LOADED, validatedSettings);
      return validatedSettings;
    } catch (error) {
      const errorMessage = `获取用户设置失败: ${error}`;
      console.error(errorMessage);
      this.emitEvent(
        StorageEventType.SETTINGS_LOADED,
        DEFAULT_SETTINGS,
        errorMessage,
      );
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 保存用户设置
   * @param settings 要保存的用户设置
   */
  public async saveUserSettings(
    settings: UserSettings,
  ): Promise<StorageOperationResult> {
    try {
      // 验证设置
      if (this.config.enableValidation) {
        settings = this.validateAndFixSettings(settings);
      }

      // 序列化数据
      const serializedData = JSON.stringify(settings);

      await browser.storage.sync.set({
        [this.storageKey]: serializedData,
      });

      this.emitEvent(StorageEventType.SETTINGS_SAVED, settings);
      return { success: true, data: settings };
    } catch (error) {
      const errorMessage = `保存用户设置失败: ${error}`;
      console.error(errorMessage);
      this.emitEvent(StorageEventType.SETTINGS_SAVED, null, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ==================== API配置管理 ====================

  /**
   * 获取当前活跃的API配置
   */
  public async getActiveApiConfig(): Promise<ApiConfig | null> {
    try {
      const settings = await this.getUserSettings();
      const activeConfig = settings.apiConfigs.find(
        (config) => config.id === settings.activeApiConfigId,
      );
      return activeConfig?.config || null;
    } catch (error) {
      console.error('获取活跃API配置失败:', error);
      return null;
    }
  }

  /**
   * 设置活跃的API配置
   */
  public async setActiveApiConfig(
    configId: string,
  ): Promise<StorageOperationResult> {
    try {
      const settings = await this.getUserSettings();
      const configExists = settings.apiConfigs.some(
        (config) => config.id === configId,
      );

      if (!configExists) {
        const errorMessage = `API配置 ${configId} 不存在`;
        console.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      settings.activeApiConfigId = configId;
      const saveResult = await this.saveUserSettings(settings);

      if (saveResult.success) {
        this.emitEvent(StorageEventType.ACTIVE_CONFIG_CHANGED, { configId });
      }

      return saveResult;
    } catch (error) {
      const errorMessage = `设置活跃API配置失败: ${error}`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 添加新的API配置
   */
  public async addApiConfig(
    name: string,
    provider: string,
    config: ApiConfig,
  ): Promise<StorageOperationResult> {
    try {
      const settings = await this.getUserSettings();
      const now = Date.now();
      const newConfig: ApiConfigItem = {
        id: `config-${now}`,
        name,
        provider,
        config,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      settings.apiConfigs.push(newConfig);
      const saveResult = await this.saveUserSettings(settings);

      if (saveResult.success) {
        this.emitEvent(StorageEventType.API_CONFIG_ADDED, newConfig);
        return { success: true, data: newConfig.id };
      }

      return saveResult;
    } catch (error) {
      const errorMessage = `添加API配置失败: ${error}`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 更新API配置
   */
  public async updateApiConfig(
    configId: string,
    name: string,
    provider: string,
    config: ApiConfig,
  ): Promise<StorageOperationResult> {
    try {
      const settings = await this.getUserSettings();
      const configIndex = settings.apiConfigs.findIndex(
        (c) => c.id === configId,
      );

      if (configIndex === -1) {
        const errorMessage = `API配置 ${configId} 不存在`;
        console.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      const updatedConfig = {
        ...settings.apiConfigs[configIndex],
        name,
        provider,
        config,
        updatedAt: Date.now(),
      };

      settings.apiConfigs[configIndex] = updatedConfig;

      const saveResult = await this.saveUserSettings(settings);

      if (saveResult.success) {
        this.emitEvent(StorageEventType.API_CONFIG_UPDATED, updatedConfig);
      }

      return saveResult;
    } catch (error) {
      const errorMessage = `更新API配置失败: ${error}`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 删除API配置
   */
  public async removeApiConfig(
    configId: string,
  ): Promise<StorageOperationResult> {
    try {
      const settings = await this.getUserSettings();

      // 不允许删除默认配置
      const configToDelete = settings.apiConfigs.find((c) => c.id === configId);
      if (configToDelete?.isDefault) {
        const errorMessage = '不能删除默认配置';
        console.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      // 如果删除的是当前活跃配置，切换到第一个配置
      if (settings.activeApiConfigId === configId) {
        const firstConfig = settings.apiConfigs.find((c) => c.id !== configId);
        if (firstConfig) {
          settings.activeApiConfigId = firstConfig.id;
        }
      }

      settings.apiConfigs = settings.apiConfigs.filter(
        (c) => c.id !== configId,
      );

      const saveResult = await this.saveUserSettings(settings);

      if (saveResult.success) {
        this.emitEvent(StorageEventType.API_CONFIG_REMOVED, { configId });
      }

      return saveResult;
    } catch (error) {
      const errorMessage = `删除API配置失败: ${error}`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ==================== 数据管理 ====================

  /**
   * 清除所有数据
   */
  public async clearAllData(): Promise<StorageOperationResult> {
    try {
      await browser.storage.sync.remove(this.storageKey);
      this.emitEvent(StorageEventType.DATA_CLEARED);
      return { success: true };
    } catch (error) {
      const errorMessage = `清除数据失败: ${error}`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取配置统计信息
   */
  public async getConfigStats(): Promise<ConfigurationStats> {
    try {
      const settings = await this.getUserSettings();

      return {
        intelligentModeEnabled:
          settings.multilingualConfig?.intelligentMode || false,
        targetLanguage: settings.multilingualConfig?.targetLanguage || 'en',
        totalKeys: Object.keys(settings).length,
        apiConfigsCount: settings.apiConfigs.length,
      };
    } catch (error) {
      console.error('获取配置统计失败:', error);
      return {
        intelligentModeEnabled: false,
        targetLanguage: 'en',
        totalKeys: 0,
        apiConfigsCount: 0,
      };
    }
  }

  // ==================== 数据验证 ====================

  /**
   * 验证和修复设置
   * @param settings 原始设置
   * @returns 修复后的设置
   */
  private validateAndFixSettings(settings: UserSettings): UserSettings {
    let hasChanges = false;
    const validatedSettings = { ...settings };

    try {
      // 确保必要字段存在
      if (!validatedSettings.apiConfigs) {
        validatedSettings.apiConfigs = DEFAULT_SETTINGS.apiConfigs;
        hasChanges = true;
      }

      if (!validatedSettings.activeApiConfigId) {
        if (validatedSettings.apiConfigs.length > 0) {
          validatedSettings.activeApiConfigId =
            validatedSettings.apiConfigs[0].id;
          hasChanges = true;
        }
      }

      // 验证活跃配置是否存在
      if (validatedSettings.activeApiConfigId) {
        const activeConfigExists = validatedSettings.apiConfigs.some(
          (config) => config.id === validatedSettings.activeApiConfigId,
        );

        if (!activeConfigExists && validatedSettings.apiConfigs.length > 0) {
          validatedSettings.activeApiConfigId =
            validatedSettings.apiConfigs[0].id;
          hasChanges = true;
        }
      }

      // 验证其他必要字段
      if (!validatedSettings.multilingualConfig) {
        validatedSettings.multilingualConfig = DEFAULT_SETTINGS.multilingualConfig;
        hasChanges = true;
      }

      return validatedSettings;
    } catch (error) {
      console.error(`设置验证异常: ${error}`);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 检查配置是否有变化
   * @param original 原始配置
   * @param fixed 修复后的配置
   * @returns 是否有变化
   */
  private hasConfigurationChanged(
    original: UserSettings,
    fixed: UserSettings,
  ): boolean {
    try {
      return JSON.stringify(original) !== JSON.stringify(fixed);
    } catch {
      return true; // 如果比较失败，认为有变化
    }
  }
}

// ==================== 导出 ====================

// 单例实例导出
export const storageService = StorageService.getInstance();


// 默认导出
export default StorageService;

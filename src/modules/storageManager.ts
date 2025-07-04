/**
 * 存储管理模块
 * 负责管理用户配置的存储，支持多API配置管理
 * 使用序列化方式存储数据
 */

import { UserSettings } from './shared/types/storage';
import { ApiConfigItem, ApiConfig } from './shared/types/api';
import { DEFAULT_SETTINGS } from './shared/constants/defaults';

// 存储管理器
export class StorageManager {
  /**
   * 存储键名
   */
  private static readonly STORAGE_KEY = 'user_settings';

  /**
   * 获取用户设置
   * @returns 用户设置
   */
  async getUserSettings(): Promise<UserSettings> {
    try {
      const result = await browser.storage.sync.get(StorageManager.STORAGE_KEY);
      const serializedData = result[StorageManager.STORAGE_KEY];

      if (!serializedData) {
        return DEFAULT_SETTINGS;
      }

      // 反序列化数据
      const userSettings: UserSettings = JSON.parse(serializedData);

      // 验证和修复配置
      const validatedSettings = this.validateAndFixSettings(userSettings);

      // 如果配置被修复，保存更新后的设置
      if (this.hasConfigurationChanged(userSettings, validatedSettings)) {
        await this.saveUserSettings(validatedSettings);
      }

      return validatedSettings;
    } catch (error) {
      console.error('获取用户设置失败:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 保存用户设置
   * @param settings 要保存的用户设置
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      // 序列化数据
      const serializedData = JSON.stringify(settings);

      await browser.storage.sync.set({
        [StorageManager.STORAGE_KEY]: serializedData,
      });
    } catch (error) {
      console.error('保存用户设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前活跃的API配置
   */
  async getActiveApiConfig(): Promise<ApiConfig | null> {
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
  async setActiveApiConfig(configId: string): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();
      const configExists = settings.apiConfigs.some(
        (config) => config.id === configId,
      );

      if (!configExists) {
        console.error(`API配置 ${configId} 不存在`);
        return false;
      }

      settings.activeApiConfigId = configId;
      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('设置活跃API配置失败:', error);
      return false;
    }
  }

  /**
   * 添加新的API配置
   */
  async addApiConfig(
    name: string,
    provider: string,
    config: ApiConfig,
  ): Promise<string> {
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
      await this.saveUserSettings(settings);
      return newConfig.id;
    } catch (error) {
      console.error('添加API配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新API配置
   */
  async updateApiConfig(
    configId: string,
    name: string,
    provider: string,
    config: ApiConfig,
  ): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();
      const configIndex = settings.apiConfigs.findIndex(
        (c) => c.id === configId,
      );

      if (configIndex === -1) {
        console.error(`API配置 ${configId} 不存在`);
        return false;
      }

      settings.apiConfigs[configIndex] = {
        ...settings.apiConfigs[configIndex],
        name,
        provider,
        config,
        updatedAt: Date.now(),
      };

      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('更新API配置失败:', error);
      return false;
    }
  }

  /**
   * 删除API配置
   */
  async removeApiConfig(configId: string): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();

      // 不允许删除默认配置
      const configToDelete = settings.apiConfigs.find((c) => c.id === configId);
      if (configToDelete?.isDefault) {
        console.error('不能删除默认配置');
        return false;
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
      await this.saveUserSettings(settings);
      return true;
    } catch (error) {
      console.error('删除API配置失败:', error);
      return false;
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<void> {
    try {
      await browser.storage.sync.clear();
      await browser.storage.local.clear();
    } catch (error) {
      console.error('清除所有数据失败:', error);
    }
  }

  /**
   * 验证和修复用户设置
   * @param settings 用户设置
   * @returns 验证并修复后的设置
   */
  private validateAndFixSettings(settings: UserSettings): UserSettings {
    const fixedSettings = { ...settings };

    // 验证API配置列表
    if (
      !Array.isArray(fixedSettings.apiConfigs) ||
      fixedSettings.apiConfigs.length === 0
    ) {
      fixedSettings.apiConfigs = [...DEFAULT_SETTINGS.apiConfigs];
      fixedSettings.activeApiConfigId = DEFAULT_SETTINGS.activeApiConfigId;
    }

    // 验证活跃配置ID是否存在
    if (
      !fixedSettings.apiConfigs.some(
        (config) => config.id === fixedSettings.activeApiConfigId,
      )
    ) {
      fixedSettings.activeApiConfigId = fixedSettings.apiConfigs[0].id;
    }

    // 验证多语言配置
    if (!fixedSettings.multilingualConfig) {
      fixedSettings.multilingualConfig = DEFAULT_SETTINGS.multilingualConfig;
    } else {
      if (
        typeof fixedSettings.multilingualConfig.intelligentMode !== 'boolean'
      ) {
        fixedSettings.multilingualConfig.intelligentMode =
          DEFAULT_SETTINGS.multilingualConfig.intelligentMode;
      }
      if (!fixedSettings.multilingualConfig.targetLanguage) {
        fixedSettings.multilingualConfig.targetLanguage =
          DEFAULT_SETTINGS.multilingualConfig.targetLanguage;
      }
    }

    // 验证翻译方向与智能模式的一致性
    if (
      fixedSettings.multilingualConfig.intelligentMode &&
      fixedSettings.translationDirection !== 'intelligent'
    ) {
      fixedSettings.translationDirection = 'intelligent';
    }

    // 验证发音快捷键配置
    if (!fixedSettings.pronunciationHotkey) {
      fixedSettings.pronunciationHotkey = {
        ...DEFAULT_SETTINGS.pronunciationHotkey,
      };
    } else {
      if (typeof fixedSettings.pronunciationHotkey.enabled !== 'boolean') {
        fixedSettings.pronunciationHotkey.enabled = true;
      }
    }

    // 验证悬浮球配置
    if (!fixedSettings.floatingBall) {
      fixedSettings.floatingBall = { ...DEFAULT_SETTINGS.floatingBall };
    } else {
      if (typeof fixedSettings.floatingBall.enabled !== 'boolean') {
        fixedSettings.floatingBall.enabled = false;
      }
      if (
        typeof fixedSettings.floatingBall.position !== 'number' ||
        fixedSettings.floatingBall.position < 0 ||
        fixedSettings.floatingBall.position > 100
      ) {
        fixedSettings.floatingBall.position = 50;
      }
      if (
        typeof fixedSettings.floatingBall.opacity !== 'number' ||
        fixedSettings.floatingBall.opacity < 0.1 ||
        fixedSettings.floatingBall.opacity > 1
      ) {
        fixedSettings.floatingBall.opacity = 0.8;
      }
    }

    // 确保API请求超时时间为数字类型，无需范围验证
    if (typeof fixedSettings.apiRequestTimeout !== 'number') {
      fixedSettings.apiRequestTimeout = DEFAULT_SETTINGS.apiRequestTimeout;
    }

    return fixedSettings;
  }

  /**
   * 检查配置是否发生变化
   * @param original 原始配置
   * @param fixed 修复后的配置
   * @returns 是否发生变化
   */
  private hasConfigurationChanged(
    original: UserSettings,
    fixed: UserSettings,
  ): boolean {
    return JSON.stringify(original) !== JSON.stringify(fixed);
  }

  /**
   * 获取配置统计信息
   * 用于调试和监控
   * @returns 配置统计信息
   */
  async getConfigStats(): Promise<{
    intelligentModeEnabled: boolean;
    targetLanguage: string;
    totalKeys: number;
    apiConfigsCount: number;
  }> {
    try {
      const settings = await this.getUserSettings();
      const allData = await browser.storage.sync.get(null);

      return {
        intelligentModeEnabled:
          settings.multilingualConfig?.intelligentMode || false,
        targetLanguage: settings.multilingualConfig?.targetLanguage || 'none',
        totalKeys: Object.keys(allData).length,
        apiConfigsCount: settings.apiConfigs?.length || 0,
      };
    } catch (error) {
      console.error('获取配置统计信息失败:', error);
      return {
        intelligentModeEnabled: false,
        targetLanguage: 'none',
        totalKeys: 0,
        apiConfigsCount: 0,
      };
    }
  }
}

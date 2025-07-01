import glob from './glob';
import { WebsiteRule, WebsiteManagementSettings, WebsiteStatus } from './types';

// 用于向后兼容的旧黑名单设置接口
interface BlacklistSettings {
  patterns: string[];
}

// 默认设置
const DEFAULT_SETTINGS: WebsiteManagementSettings = { rules: [] };
const STORAGE_KEY = 'website-management-settings';
const LEGACY_BLACKLIST_KEY = 'blacklist-settings';

export class WebsiteManager {
  private settingsCache: WebsiteManagementSettings | null = null;

  /**
   * 获取网站状态
   */
  async getWebsiteStatus(url: string): Promise<WebsiteStatus> {
    const settings = await this.getSettings();

    // 先检查黑名单规则（优先级最高）
    const blacklistRules = settings.rules.filter(
      rule => rule.type === 'blacklist' && rule.enabled
    );

    for (const rule of blacklistRules) {
      if (glob.match(rule.pattern, url)) {
        return 'blacklisted';
      }
    }

    // 再检查白名单规则
    const whitelistRules = settings.rules.filter(
      rule => rule.type === 'whitelist' && rule.enabled
    );

    for (const rule of whitelistRules) {
      if (glob.match(rule.pattern, url)) {
        return 'whitelisted';
      }
    }

    return 'normal';
  }

  /**
   * 检查是否被黑名单禁用（兼容原有接口）
   */
  async isBlacklisted(url: string): Promise<boolean> {
    const status = await this.getWebsiteStatus(url);
    return status === 'blacklisted';
  }

  /**
   * 检查是否在白名单中
   */
  async isWhitelisted(url: string): Promise<boolean> {
    const status = await this.getWebsiteStatus(url);
    return status === 'whitelisted';
  }

  /**
   * 获取所有规则
   */
  async getRules(): Promise<WebsiteRule[]> {
    const settings = await this.getSettings();
    return settings.rules;
  }

  /**
   * 根据类型获取规则
   */
  async getRulesByType(type: 'blacklist' | 'whitelist'): Promise<WebsiteRule[]> {
    const settings = await this.getSettings();
    return settings.rules.filter(rule => rule.type === type);
  }

  /**
   * 添加规则
   */
  async addRule(pattern: string, type: 'blacklist' | 'whitelist', description?: string): Promise<void> {
    if (!pattern) return;

    const settings = await this.getSettings();

    // 检查是否已存在相同的规则
    const existingRule = settings.rules.find(
      rule => rule.pattern === pattern && rule.type === type
    );

    if (existingRule) {
      return; // 规则已存在，不重复添加
    }

    const newRule: WebsiteRule = {
      id: this.generateId(),
      pattern,
      type,
      enabled: true,
      createdAt: new Date(),
      description,
    };

    settings.rules.push(newRule);
    await this.saveSettings(settings);
    this.clearCache(); // 清除缓存确保数据是最新的
  }

  /**
   * 更新规则
   */
  async updateRule(id: string, updates: Partial<WebsiteRule>): Promise<void> {
    const settings = await this.getSettings();
    const ruleIndex = settings.rules.findIndex(rule => rule.id === id);

    if (ruleIndex === -1) {
      throw new Error('规则不存在');
    }

    settings.rules[ruleIndex] = {
      ...settings.rules[ruleIndex],
      ...updates,
    };

    await this.saveSettings(settings);
    this.clearCache(); // 清除缓存确保数据是最新的
  }

  /**
   * 删除规则
   */
  async removeRule(id: string): Promise<void> {
    const settings = await this.getSettings();
    const ruleIndex = settings.rules.findIndex(rule => rule.id === id);

    if (ruleIndex > -1) {
      settings.rules.splice(ruleIndex, 1);
      await this.saveSettings(settings);
      this.clearCache(); // 清除缓存确保数据是最新的
    }
  }

  /**
   * 批量删除规则
   */
  async removeRules(ids: string[]): Promise<void> {
    const settings = await this.getSettings();
    settings.rules = settings.rules.filter(rule => !ids.includes(rule.id));
    await this.saveSettings(settings);
    this.clearCache(); // 清除缓存确保数据是最新的
  }

  /**
   * 启用/禁用规则
   */
  async toggleRule(id: string): Promise<void> {
    const settings = await this.getSettings();
    const rule = settings.rules.find(rule => rule.id === id);

    if (rule) {
      rule.enabled = !rule.enabled;
      await this.saveSettings(settings);
      this.clearCache(); // 清除缓存确保数据是最新的
    }
  }

  /**
   * 获取设置，包含兼容性处理
   */
  private async getSettings(): Promise<WebsiteManagementSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      // 首先尝试获取新的设置
      const result = await browser.storage.sync.get(STORAGE_KEY);
      if (result && result[STORAGE_KEY]) {
        const settings = JSON.parse(result[STORAGE_KEY]);
        // 修复 Date 对象的反序列化
        if (settings.rules) {
          settings.rules = settings.rules.map((rule: any) => ({
            ...rule,
            createdAt: new Date(rule.createdAt)
          }));
        }
        this.settingsCache = settings;
        return settings;
      }

      // 如果没有新设置，尝试迁移旧的黑名单数据
      const legacyResult = await browser.storage.sync.get(LEGACY_BLACKLIST_KEY);
      if (legacyResult && legacyResult[LEGACY_BLACKLIST_KEY]) {
        const legacySettings: BlacklistSettings = JSON.parse(legacyResult[LEGACY_BLACKLIST_KEY]);
        const migratedSettings = await this.migrateLegacyData(legacySettings);
        this.settingsCache = migratedSettings;
        return migratedSettings;
      }

      this.settingsCache = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('获取网站管理设置失败:', error);
      this.settingsCache = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 迁移旧的黑名单数据
   */
  private async migrateLegacyData(legacySettings: BlacklistSettings): Promise<WebsiteManagementSettings> {
    const migratedRules: WebsiteRule[] = legacySettings.patterns.map(pattern => ({
      id: this.generateId(),
      pattern,
      type: 'blacklist' as const,
      enabled: true,
      createdAt: new Date(),
      description: '从黑名单迁移',
    }));

    const newSettings: WebsiteManagementSettings = {
      rules: migratedRules,
    };

    // 保存迁移后的数据
    await this.saveSettings(newSettings);



    return newSettings;
  }

  /**
   * 保存设置
   */
  private async saveSettings(settings: WebsiteManagementSettings): Promise<void> {
    try {
      const serializedSettings = JSON.stringify(settings);
      await browser.storage.sync.set({ [STORAGE_KEY]: serializedSettings });
      this.settingsCache = settings; // 更新缓存
    } catch (error) {
      console.error('保存网站管理设置失败:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.settingsCache = null;
  }
}

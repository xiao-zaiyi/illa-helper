import glob from './glob';
import { WebsiteRule, WebsiteManagementSettings, WebsiteStatus } from './types';

// 默认设置
const DEFAULT_SETTINGS: WebsiteManagementSettings = { rules: [] };
const STORAGE_KEY = 'website-management-settings';

export class WebsiteManager {
  private settingsCache: WebsiteManagementSettings | null = null;
  private cacheTimestamp: number | null = null;

  /**
   * 获取网站状态
   */
  async getWebsiteStatus(url: string): Promise<WebsiteStatus> {
    console.log(`[WebsiteManager] 获取网站状态: ${url}`);

    // 不立即清除缓存，先检查缓存是否有效
    const settings = await this.getSettings();

    // 添加缓存时间戳检查，如果缓存超过5秒则清除
    const now = Date.now();
    if (this.cacheTimestamp && now - this.cacheTimestamp > 5000) {
      console.log('[WebsiteManager] 缓存过期，清除缓存');
      this.clearCache();
    }

    // 先检查黑名单规则（优先级最高）
    const blacklistRules = settings.rules.filter(
      (rule) => rule.type === 'blacklist' && rule.enabled,
    );

    for (const rule of blacklistRules) {
      if (glob.match(rule.pattern, url)) {
        console.log(`[WebsiteManager] 匹配黑名单规则: ${rule.pattern}`);
        return 'blacklisted';
      }
    }

    // 再检查白名单规则
    const whitelistRules = settings.rules.filter(
      (rule) => rule.type === 'whitelist' && rule.enabled,
    );

    for (const rule of whitelistRules) {
      if (glob.match(rule.pattern, url)) {
        console.log(`[WebsiteManager] 匹配白名单规则: ${rule.pattern}`);
        return 'whitelisted';
      }
    }

    console.log('[WebsiteManager] 网站状态正常');
    return 'normal';
  }

  /**
   * 检查是否被黑名单禁用
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
  async getRulesByType(
    type: 'blacklist' | 'whitelist',
  ): Promise<WebsiteRule[]> {
    // 清除缓存确保获取最新规则列表
    this.clearCache();
    const settings = await this.getSettings();
    return settings.rules.filter((rule) => rule.type === type);
  }

  /**
   * 添加规则
   */
  async addRule(
    pattern: string,
    type: 'blacklist' | 'whitelist',
    description?: string,
  ): Promise<void> {
    if (!pattern) return;

    // 强制清除缓存，确保获取最新数据，避免使用过期缓存导致已删除数据被恢复
    this.clearCache();
    const settings = await this.getSettings();

    // 检查是否已存在相同pattern的规则（不论类型）
    const existingRule = settings.rules.find(
      (rule) => rule.pattern === pattern,
    );

    if (existingRule) {
      if (existingRule.type === type) {
        return; // 完全相同的规则已存在，不重复添加
      } else {
        // 同一 pattern 只能保留一种规则类型。
        const ruleIndex = settings.rules.findIndex(
          (rule) => rule.id === existingRule.id,
        );
        if (ruleIndex > -1) {
          settings.rules.splice(ruleIndex, 1);
        }
      }
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
    const ruleIndex = settings.rules.findIndex((rule) => rule.id === id);

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
    const ruleIndex = settings.rules.findIndex((rule) => rule.id === id);

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
    settings.rules = settings.rules.filter((rule) => !ids.includes(rule.id));
    await this.saveSettings(settings);
    this.clearCache(); // 清除缓存确保数据是最新的
  }

  /**
   * 使用当前格式规则替换网站规则列表。
   */
  async replaceRules(rules: WebsiteRule[]): Promise<number> {
    const normalizedSettings = this.normalizeSettings({ rules });
    await this.saveSettings(normalizedSettings);
    this.clearCache();
    return normalizedSettings.rules.length;
  }

  /**
   * 启用/禁用规则
   */
  async toggleRule(id: string): Promise<void> {
    const settings = await this.getSettings();
    const rule = settings.rules.find((rule) => rule.id === id);

    if (rule) {
      rule.enabled = !rule.enabled;
      await this.saveSettings(settings);
      this.clearCache(); // 清除缓存确保数据是最新的
    }
  }

  /**
   * 获取设置
   */
  private async getSettings(): Promise<WebsiteManagementSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const result = await browser.storage.sync.get(STORAGE_KEY);
      if (result && result[STORAGE_KEY]) {
        const settings = this.normalizeSettings(
          JSON.parse(result[STORAGE_KEY]),
        );
        this.settingsCache = settings;
        this.cacheTimestamp = Date.now();
        return settings;
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
   * 保存设置
   */
  private async saveSettings(
    settings: WebsiteManagementSettings,
  ): Promise<void> {
    try {
      const serializedSettings = JSON.stringify(settings);
      await browser.storage.sync.set({ [STORAGE_KEY]: serializedSettings });
      this.settingsCache = settings;
      this.cacheTimestamp = Date.now(); // 更新缓存
    } catch (error) {
      console.error('保存网站管理设置失败:', error);
    }
  }

  private normalizeSettings(rawSettings: unknown): WebsiteManagementSettings {
    if (!rawSettings || typeof rawSettings !== 'object') {
      return DEFAULT_SETTINGS;
    }

    const settings = rawSettings as Partial<WebsiteManagementSettings>;
    const rawRules = Array.isArray(settings.rules) ? settings.rules : [];

    return {
      rules: rawRules
        .map((rule) => this.normalizeRule(rule))
        .filter((rule): rule is WebsiteRule => rule !== null),
    };
  }

  private normalizeRule(rawRule: unknown): WebsiteRule | null {
    if (!rawRule || typeof rawRule !== 'object') {
      return null;
    }

    const rule = rawRule as Partial<WebsiteRule>;
    if (
      !rule.id ||
      !rule.pattern ||
      typeof rule.enabled !== 'boolean' ||
      !rule.createdAt ||
      (rule.type !== 'blacklist' && rule.type !== 'whitelist')
    ) {
      return null;
    }

    const createdAt = new Date(rule.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      id: rule.id,
      pattern: rule.pattern,
      type: rule.type,
      enabled: rule.enabled,
      createdAt,
      description: rule.description,
    };
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
    this.cacheTimestamp = null;
  }
}

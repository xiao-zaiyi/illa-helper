/**
 * 右键菜单管理器
 * 负责创建、更新和处理浏览器右键菜单功能
 */

import { browser } from 'wxt/browser';

import { WebsiteManager } from '../options/website-management/manager';
import {
  extractDomain,
  generateDomainPattern,
  generateExactPattern,
  generateRuleDescription,
  validateUrlForRule
} from '../options/website-management/utils';
import type { ContextMenuActionType, UrlPatternType } from '../types';

export class ContextMenuManager {
  private websiteManager: WebsiteManager;
  private menuItems: string[] = []; // 存储已创建的菜单项ID

  constructor(websiteManager: WebsiteManager) {
    this.websiteManager = websiteManager;
  }

  /**
   * 初始化右键菜单
   */
  async init(): Promise<void> {
    try {
      // 清除可能存在的旧菜单项
      await this.clearMenuItems();

      // 创建基础菜单结构
      await this.createBaseMenuItems();

      // 监听菜单点击事件
      browser.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));

      // 监听标签页更新事件，动态更新菜单
      browser.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      browser.tabs.onActivated.addListener(this.handleTabActivated.bind(this));

    } catch (error) {
      console.error('右键菜单初始化失败:', error);
    }
  }

  /**
   * 清除所有菜单项
   */
  private async clearMenuItems(): Promise<void> {
    try {
      await browser.contextMenus.removeAll();
      this.menuItems = [];
    } catch (error) {
      console.error('清除菜单项失败:', error);
    }
  }

  /**
   * 创建基础菜单项结构
   */
  private async createBaseMenuItems(): Promise<void> {
    try {
      // 主菜单项
      const mainMenuId = 'illa-website-management';
      await browser.contextMenus.create({
        id: mainMenuId,
        title: '浸入式学语言助手',
        contexts: ['page'],
      });
      this.menuItems.push(mainMenuId);

      // 分隔符
      const separatorId = 'illa-separator';
      await browser.contextMenus.create({
        id: separatorId,
        type: 'separator',
        parentId: mainMenuId,
        contexts: ['page'],
      });
      this.menuItems.push(separatorId);

      // 这些菜单项将在标签页更新时动态创建
      // 占位菜单项，稍后会被动态内容替换
      const placeholderId = 'illa-placeholder';
      await browser.contextMenus.create({
        id: placeholderId,
        title: '正在加载...',
        parentId: mainMenuId,
        contexts: ['page'],
        enabled: false,
      });
      this.menuItems.push(placeholderId);

    } catch (error) {
      console.error('创建基础菜单项失败:', error);
    }
  }

  /**
   * 更新动态菜单项
   */
  private async updateMenuItems(tabId: number, url: string): Promise<void> {
    if (!url || !url.startsWith('http')) {
      return; // 忽略非HTTP协议的页面
    }

    try {
      // 验证URL
      const validation = validateUrlForRule(url);
      if (!validation.valid) {
        await this.createErrorMenuItem(validation.error || '无法处理此页面');
        return;
      }

      // 获取当前网站状态
      const websiteStatus = await this.websiteManager.getWebsiteStatus(url);
      const domain = extractDomain(url);

      // 清除动态菜单项（保留基础结构）
      await this.clearDynamicMenuItems();

      // 根据网站状态创建相应的菜单项
      await this.createDynamicMenuItems(url, domain, websiteStatus);

    } catch (error) {
      console.error('更新菜单项失败:', error);
      await this.createErrorMenuItem('菜单更新失败');
    }
  }

  /**
   * 清除动态菜单项（保留基础结构）
   */
  private async clearDynamicMenuItems(): Promise<void> {
    const dynamicMenuIds = this.menuItems.filter(id =>
      id.startsWith('illa-add-') ||
      id.startsWith('illa-remove-') ||
      id.startsWith('illa-error-') ||
      id === 'illa-placeholder'
    );

    for (const menuId of dynamicMenuIds) {
      try {
        await browser.contextMenus.remove(menuId);
        this.menuItems = this.menuItems.filter(id => id !== menuId);
      } catch (error) {
        // 忽略删除失败的错误，菜单项可能已经不存在
      }
    }
  }

  /**
   * 创建动态菜单项
   */
  private async createDynamicMenuItems(
    url: string,
    domain: string,
    websiteStatus: 'blacklisted' | 'whitelisted' | 'normal'
  ): Promise<void> {
    const mainMenuId = 'illa-website-management';

    // 根据当前状态显示相应的操作选项
    if (websiteStatus === 'blacklisted') {
      // 当前在黑名单中，显示移除选项
      await this.createRemoveMenuItem(mainMenuId, 'blacklist', domain);
      await this.createAddMenuItem(mainMenuId, 'whitelist', url, domain);
    } else if (websiteStatus === 'whitelisted') {
      // 当前在白名单中，显示移除选项
      await this.createRemoveMenuItem(mainMenuId, 'whitelist', domain);
      await this.createAddMenuItem(mainMenuId, 'blacklist', url, domain);
    } else {
      // 正常状态，显示添加选项
      await this.createAddMenuItem(mainMenuId, 'blacklist', url, domain);
      await this.createAddMenuItem(mainMenuId, 'whitelist', url, domain);
    }

    // 添加设置页面快捷入口
    await this.createSettingsMenuItem(mainMenuId);
  }

  /**
   * 创建添加菜单项
   */
  private async createAddMenuItem(
    parentId: string,
    type: 'blacklist' | 'whitelist',
    url: string,
    domain: string
  ): Promise<void> {
    const typeText = type === 'blacklist' ? '黑名单' : '白名单';

    // 域名模式菜单项
    const domainMenuId = `illa-add-${type}-domain`;
    await browser.contextMenus.create({
      id: domainMenuId,
      title: `添加 ${domain} 到${typeText}`,
      parentId: parentId,
      contexts: ['page'],
    });
    this.menuItems.push(domainMenuId);

    // 当前页面模式菜单项
    const exactMenuId = `illa-add-${type}-exact`;
    await browser.contextMenus.create({
      id: exactMenuId,
      title: `添加当前页面到${typeText}`,
      parentId: parentId,
      contexts: ['page'],
    });
    this.menuItems.push(exactMenuId);
  }

  /**
   * 创建移除菜单项
   */
  private async createRemoveMenuItem(
    parentId: string,
    type: 'blacklist' | 'whitelist',
    domain: string
  ): Promise<void> {
    const typeText = type === 'blacklist' ? '黑名单' : '白名单';
    const menuId = `illa-remove-${type}`;

    await browser.contextMenus.create({
      id: menuId,
      title: `从${typeText}中移除 ${domain}`,
      parentId: parentId,
      contexts: ['page'],
    });
    this.menuItems.push(menuId);
  }

  /**
   * 创建设置菜单项
   */
  private async createSettingsMenuItem(parentId: string): Promise<void> {
    // 分隔符
    const separatorId = 'illa-settings-separator';
    await browser.contextMenus.create({
      id: separatorId,
      type: 'separator',
      parentId: parentId,
      contexts: ['page'],
    });
    this.menuItems.push(separatorId);

    // 设置菜单项
    const settingsMenuId = 'illa-open-settings';
    await browser.contextMenus.create({
      id: settingsMenuId,
      title: '网站管理设置',
      parentId: parentId,
      contexts: ['page'],
    });
    this.menuItems.push(settingsMenuId);
  }

  /**
   * 创建错误菜单项
   */
  private async createErrorMenuItem(message: string): Promise<void> {
    await this.clearDynamicMenuItems();

    const errorMenuId = 'illa-error-message';
    await browser.contextMenus.create({
      id: errorMenuId,
      title: message,
      parentId: 'illa-website-management',
      contexts: ['page'],
      enabled: false,
    });
    this.menuItems.push(errorMenuId);
  }

  /**
   * 处理菜单点击事件
   */
  private async handleMenuClick(
    info: any,
    tab: any
  ): Promise<void> {
    if (!tab?.url) return;

    try {
      const url = tab.url;
      const domain = extractDomain(url);

      // 解析菜单ID
      if (info.menuItemId === 'illa-open-settings') {
        // 打开设置页面
        const optionsUrl = browser.runtime.getURL('/options.html#website-management');
        await browser.tabs.create({ url: optionsUrl });
        return;
      }

      // 处理添加/移除操作
      if (typeof info.menuItemId === 'string') {
        await this.processMenuAction(info.menuItemId, url, domain);
      }

    } catch (error) {
      console.error('处理菜单点击失败:', error);
      this.showNotification('操作失败', '处理菜单操作时发生错误');
    }
  }

  /**
   * 处理菜单操作
   */
  private async processMenuAction(menuItemId: string, url: string, domain: string): Promise<void> {
    let action: ContextMenuActionType;
    let patternType: UrlPatternType;
    let pattern: string;

    // 解析菜单ID
    if (menuItemId.includes('add-blacklist-domain')) {
      action = 'add-to-blacklist';
      patternType = 'domain';
      pattern = generateDomainPattern(domain);
    } else if (menuItemId.includes('add-blacklist-exact')) {
      action = 'add-to-blacklist';
      patternType = 'exact';
      pattern = generateExactPattern(url);
    } else if (menuItemId.includes('add-whitelist-domain')) {
      action = 'add-to-whitelist';
      patternType = 'domain';
      pattern = generateDomainPattern(domain);
    } else if (menuItemId.includes('add-whitelist-exact')) {
      action = 'add-to-whitelist';
      patternType = 'exact';
      pattern = generateExactPattern(url);
    } else if (menuItemId.includes('remove-blacklist')) {
      action = 'remove-from-blacklist';
      patternType = 'domain';
      pattern = generateDomainPattern(domain);
    } else if (menuItemId.includes('remove-whitelist')) {
      action = 'remove-from-whitelist';
      patternType = 'domain';
      pattern = generateDomainPattern(domain);
    } else {
      return; // 未知的菜单项
    }

    // 执行操作
    await this.executeAction(action, pattern, patternType, url);
  }

  /**
   * 执行网站管理操作
   */
  private async executeAction(
    action: ContextMenuActionType,
    pattern: string,
    patternType: UrlPatternType,
    url: string
  ): Promise<void> {
    try {
      const type = action.includes('blacklist') ? 'blacklist' : 'whitelist';
      const description = generateRuleDescription(pattern, type);

      if (action.startsWith('add-to-')) {
        // 添加规则
        await this.websiteManager.addRule(pattern, type, description);

        const actionText = type === 'blacklist' ? '黑名单' : '白名单';
        const patternText = patternType === 'domain' ? '网站' : '页面';
        this.showNotification(
          '规则添加成功',
          `已将${patternText}添加到${actionText}`
        );
      } else if (action.startsWith('remove-from-')) {
        // 移除规则 - 查找匹配的规则并删除
        const rules = await this.websiteManager.getRulesByType(type);
        const domain = extractDomain(url);
        const domainPattern = generateDomainPattern(domain);

        // 查找匹配的规则：可能是域名模式或者其他匹配当前URL的模式
        const matchingRules = rules.filter(rule => {
          // 直接匹配
          if (rule.pattern === pattern || rule.pattern === domainPattern) {
            return true;
          }
          // 兼容旧格式的模式（如果数据库中还有旧格式）
          const oldDomainPattern = `*.${domain}`;
          if (rule.pattern === oldDomainPattern) {
            return true;
          }
          return false;
        });

        for (const rule of matchingRules) {
          await this.websiteManager.removeRule(rule.id);
        }

        const actionText = type === 'blacklist' ? '黑名单' : '白名单';
        const patternText = matchingRules.length > 0 ? '相关规则' : '匹配规则';
        this.showNotification(
          '规则移除成功',
          `已从${actionText}中移除${patternText}`
        );
      }

      // 操作完成后，刷新菜单
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id && tabs[0]?.url) {
        await this.updateMenuItems(tabs[0].id, tabs[0].url);
      }

    } catch (error) {
      console.error('执行操作失败:', error);
      this.showNotification('操作失败', '执行操作时发生错误');
    }
  }

  /**
   * 显示通知
   */
  private showNotification(title: string, message: string): void {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/48.png'),
      title: title,
      message: message,
    });
  }

  /**
   * 处理标签页更新事件
   */
  private async handleTabUpdate(
    tabId: number,
    changeInfo: any,
    tab: any
  ): Promise<void> {
    // 只在URL变化或加载完成时更新菜单
    if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
      await this.updateMenuItems(tabId, tab.url!);
    }
  }

  /**
   * 处理标签页激活事件
   */
  private async handleTabActivated(activeInfo: any): Promise<void> {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await this.updateMenuItems(activeInfo.tabId, tab.url);
      }
    } catch (error) {
      // 忽略获取标签页信息失败的错误
    }
  }
}

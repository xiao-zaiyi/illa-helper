/**
 * 右键菜单管理器 (V3兼容版本)
 * 负责管理浏览器右键菜单状态更新，不再动态创建删除菜单项
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

  constructor(websiteManager: WebsiteManager) {
    this.websiteManager = websiteManager;
  }

  /**
   * 初始化菜单管理器（V3兼容版本）
   */
  async init(): Promise<void> {
    try {
      // 监听菜单点击事件
      browser.contextMenus.onClicked.addListener(this.handleMenuClick.bind(this));

      // 监听标签页更新事件，动态更新菜单状态
      browser.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      browser.tabs.onActivated.addListener(this.handleTabActivated.bind(this));

      // 初始化当前标签页的菜单状态
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id && tabs[0]?.url) {
        await this.updateMenuState(tabs[0].id, tabs[0].url);
      }

    } catch (error) {
      console.error('菜单管理器初始化失败:', error);
    }
  }

  /**
   * 更新菜单状态（V3兼容版本）
   */
  private async updateMenuState(tabId: number, url: string): Promise<void> {
    if (!url || !url.startsWith('http')) {
      // 对于非HTTP页面，隐藏所有动态菜单项
      await this.hideAllDynamicMenus();
      return;
    }

    try {
      // 验证URL
      const validation = validateUrlForRule(url);
      if (!validation.valid) {
        await this.hideAllDynamicMenus();
        return;
      }

      // 获取当前网站状态
      const websiteStatus = await this.websiteManager.getWebsiteStatus(url);
      const domain = extractDomain(url);

      // 根据网站状态更新菜单可见性
      await this.updateMenuVisibility(url, domain, websiteStatus);

    } catch (error) {
      console.error('更新菜单状态失败:', error);
      await this.hideAllDynamicMenus();
    }
  }

  /**
   * 隐藏所有动态菜单项
   */
  private async hideAllDynamicMenus(): Promise<void> {
    const dynamicMenuIds = [
      'illa-add-blacklist-domain',
      'illa-add-blacklist-exact',
      'illa-remove-blacklist',
      'illa-add-whitelist-domain',
      'illa-add-whitelist-exact',
      'illa-remove-whitelist'
    ];

    for (const menuId of dynamicMenuIds) {
      try {
        await browser.contextMenus.update(menuId, { visible: false });
      } catch (error) {
        // 忽略更新失败的错误
      }
    }
  }

  /**
   * 根据网站状态更新菜单可见性
   */
  private async updateMenuVisibility(
    url: string,
    domain: string,
    websiteStatus: 'blacklisted' | 'whitelisted' | 'normal'
  ): Promise<void> {
    // 先隐藏所有动态菜单项
    await this.hideAllDynamicMenus();

    try {
      // 根据当前状态显示相应的操作选项
      if (websiteStatus === 'blacklisted') {
        // 当前在黑名单中，显示移除选项和添加到白名单选项
        await browser.contextMenus.update('illa-remove-blacklist', {
          visible: true,
          title: `从黑名单中移除 ${domain}`
        });
        await browser.contextMenus.update('illa-add-whitelist-domain', {
          visible: true,
          title: `添加 ${domain} 到白名单`
        });
        await browser.contextMenus.update('illa-add-whitelist-exact', {
          visible: true,
          title: '添加当前页面到白名单'
        });
      } else if (websiteStatus === 'whitelisted') {
        // 当前在白名单中，显示移除选项和添加到黑名单选项
        await browser.contextMenus.update('illa-remove-whitelist', {
          visible: true,
          title: `从白名单中移除 ${domain}`
        });
        await browser.contextMenus.update('illa-add-blacklist-domain', {
          visible: true,
          title: `添加 ${domain} 到黑名单`
        });
        await browser.contextMenus.update('illa-add-blacklist-exact', {
          visible: true,
          title: '添加当前页面到黑名单'
        });
      } else {
        // 正常状态，显示添加选项
        await browser.contextMenus.update('illa-add-blacklist-domain', {
          visible: true,
          title: `添加 ${domain} 到黑名单`
        });
        await browser.contextMenus.update('illa-add-blacklist-exact', {
          visible: true,
          title: '添加当前页面到黑名单'
        });
        await browser.contextMenus.update('illa-add-whitelist-domain', {
          visible: true,
          title: `添加 ${domain} 到白名单`
        });
        await browser.contextMenus.update('illa-add-whitelist-exact', {
          visible: true,
          title: '添加当前页面到白名单'
        });
      }
    } catch (error) {
      console.error('更新菜单可见性失败:', error);
    }
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

      // 操作完成后，刷新菜单状态
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id && tabs[0]?.url) {
        await this.updateMenuState(tabs[0].id, tabs[0].url);
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
      await this.updateMenuState(tabId, tab.url!);
    }
  }

  /**
   * 处理标签页激活事件
   */
  private async handleTabActivated(activeInfo: any): Promise<void> {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await this.updateMenuState(activeInfo.tabId, tab.url);
      }
    } catch (error) {
      // 忽略获取标签页信息失败的错误
    }
  }
}

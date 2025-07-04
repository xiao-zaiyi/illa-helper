/**
 * 初始化服务 - 处理扩展安装和启动时的初始化
 */

import { browser } from 'wxt/browser';
import { StorageService } from '../../core/storage';
import { ContextMenuManager } from '../../contextMenu';
import { WebsiteManager } from '../../options/website-management/manager';
import { DEFAULT_SETTINGS } from '../../shared/constants/defaults';
import { InitializationResult, BACKGROUND_CONSTANTS } from '../types';

export class InitializationService {
  private static instance: InitializationService | null = null;
  private storageService: StorageService;
  private contextMenuManager: ContextMenuManager;
  private websiteManager: WebsiteManager;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.websiteManager = new WebsiteManager();
    this.contextMenuManager = new ContextMenuManager(this.websiteManager);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService();
    }
    return InitializationService.instance;
  }

  /**
   * 处理扩展安装事件
   */
  public async handleInstallation(
    details: chrome.runtime.InstalledDetails,
  ): Promise<InitializationResult> {
    const result: InitializationResult = {
      success: true,
      errors: [],
      warnings: [],
    };

    try {
      if (details.reason === 'install') {
        await this.performFirstTimeSetup(result);
      }

      await this.initializeMenus(result);
      await this.initializeContextMenu(result);
    } catch (error) {
      result.success = false;
      result.errors.push(
        `初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }

    return result;
  }

  /**
   * 首次安装设置
   */
  private async performFirstTimeSetup(
    result: InitializationResult,
  ): Promise<void> {
    try {
      await this.storageService.saveUserSettings(DEFAULT_SETTINGS);
      console.log('默认设置已保存');
    } catch (error) {
      result.errors.push('保存默认设置失败' + error);
      // 回退方案
      try {
        await browser.storage.sync.set(DEFAULT_SETTINGS);
        result.warnings.push('使用了备用存储方式');
      } catch (error) {
        result.errors.push('备用存储方式也失败了' + error);
      }
    }
  }

  /**
   * 初始化右键菜单
   */
  private async initializeMenus(result: InitializationResult): Promise<void> {
    try {
      await this.createContextMenus();
      console.log('右键菜单初始化完成');
    } catch (error) {
      result.errors.push('右键菜单初始化失败' + error);
    }
  }

  /**
   * 初始化菜单管理器
   */
  private async initializeContextMenu(
    result: InitializationResult,
  ): Promise<void> {
    try {
      await this.contextMenuManager.init();
      console.log('菜单管理器初始化完成');
    } catch (error) {
      result.errors.push('菜单管理器初始化失败' + error);
    }
  }

  /**
   * 创建右键菜单结构
   */
  private async createContextMenus(): Promise<void> {
    await browser.contextMenus.removeAll();

    // 主菜单项
    await browser.contextMenus.create({
      id: BACKGROUND_CONSTANTS.MENU_PARENT_ID,
      title: '浸入式学语言助手',
      contexts: ['page'],
    });

    // 分隔符
    await browser.contextMenus.create({
      id: 'illa-separator',
      type: 'separator',
      parentId: BACKGROUND_CONSTANTS.MENU_PARENT_ID,
      contexts: ['page'],
    });

    // 其他菜单项...
    const menuItems = [
      {
        id: 'illa-add-blacklist-domain',
        title: '添加域名到黑名单',
        visible: false,
      },
      {
        id: 'illa-add-blacklist-exact',
        title: '添加当前页面到黑名单',
        visible: false,
      },
      { id: 'illa-remove-blacklist', title: '从黑名单中移除', visible: false },
      {
        id: 'illa-add-whitelist-domain',
        title: '添加域名到白名单',
        visible: false,
      },
      {
        id: 'illa-add-whitelist-exact',
        title: '添加当前页面到白名单',
        visible: false,
      },
      { id: 'illa-remove-whitelist', title: '从白名单中移除', visible: false },
    ];

    for (const item of menuItems) {
      await browser.contextMenus.create({
        id: item.id,
        title: item.title,
        parentId: BACKGROUND_CONSTANTS.MENU_PARENT_ID,
        contexts: ['page'],
        visible: item.visible,
      });
    }

    // 设置分隔符和设置菜单
    await browser.contextMenus.create({
      id: 'illa-settings-separator',
      type: 'separator',
      parentId: BACKGROUND_CONSTANTS.MENU_PARENT_ID,
      contexts: ['page'],
    });

    await browser.contextMenus.create({
      id: 'illa-open-settings',
      title: '网站管理设置',
      parentId: BACKGROUND_CONSTANTS.MENU_PARENT_ID,
      contexts: ['page'],
    });
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    console.log('[InitializationService] 服务已销毁');
    InitializationService.instance = null;
  }
}

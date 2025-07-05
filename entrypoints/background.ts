/**
 * Background Script - 使用现代化服务架构
 */

import { browser } from 'wxt/browser';
import { StorageService } from '@/src/modules/core/storage';
import { NotificationService } from '@/src/modules/background/services/NotificationService';
import { ApiProxyService } from '@/src/modules/background/services/ApiProxyService';
import { CommandService } from '@/src/modules/background/services/CommandService';
import { InitializationService } from '@/src/modules/background/services/InitializationService';
import {
  MESSAGE_TYPES,
  BACKGROUND_CONSTANTS,
} from '@/src/modules/background/types';
import { MessageType } from '@/src/modules/core/messaging/types';

export default defineBackground(() => {
  // 服务实例
  const storageService = StorageService.getInstance();
  const notificationService = NotificationService.getInstance();
  const apiProxyService = ApiProxyService.getInstance();
  const commandService = CommandService.getInstance();
  const initializationService = InitializationService.getInstance();

  // 传统管理器已移除 - 统一到InitializationService中管理

  /**
   * 初始化所有服务
   */
  async function initializeServices(): Promise<void> {
    try {
      // 初始化命令服务
      commandService.initialize();

      console.log('[Background] 所有服务初始化完成');
    } catch (error) {
      console.error('[Background] 服务初始化失败:', error);
    }
  }

  /**
   * 处理扩展安装事件
   */
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log(`[Background] 安装事件: ${details.reason}`);

    try {
      const result = await initializationService.handleInstallation(details);

      if (result.success) {
        console.log('[Background] 安装处理成功');
        if (result.warnings.length > 0) {
          console.warn('[Background] 安装警告:', result.warnings);
        }
      } else {
        console.error('[Background] 安装处理失败:', result.errors);
      }
    } catch (error) {
      console.error('[Background] 安装处理异常:', error);
    }
  });

  /**
   * 处理运行时消息
   */
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`[Background] 收到消息: ${message.type}`);

    switch (message.type) {
      case MESSAGE_TYPES.SHOW_NOTIFICATION:
        handleShowNotification(message);
        return false;

      case MESSAGE_TYPES.OPEN_POPUP:
        handleOpenPopup();
        return false;

      case MESSAGE_TYPES.OPEN_OPTIONS:
        handleOpenOptions();
        return false;

      case MESSAGE_TYPES.VALIDATE_CONFIG:
        handleValidateConfiguration(message, sendResponse);
        return true; // 保持消息通道开放

      case MESSAGE_TYPES.API_REQUEST:
        handleApiRequest(message, sendResponse);
        return true; // 保持消息通道开放

      case MessageType.CONTEXT_MENU_ACTION:
        handleContextMenuAction(message, sendResponse);
        return true; // 保持消息通道开放

      default:
        console.warn(`[Background] 未知消息类型: ${message.type}`);
        return false;
    }
  });

  /**
   * 处理显示通知消息
   */
  async function handleShowNotification(message: any): Promise<void> {
    try {
      await notificationService.showNotification({
        type: 'basic',
        title: message.options.title || '通知',
        message: message.options.message || '',
        iconUrl: message.options.iconUrl,
      });
    } catch (error) {
      console.error('[Background] 显示通知失败:', error);
    }
  }

  /**
   * 处理打开popup消息
   */
  async function handleOpenPopup(): Promise<void> {
    try {
      browser.action.openPopup();
    } catch (error) {
      console.error('[Background] 无法打开popup:', error);
      // 回退到打开options页面
      const optionsUrl = browser.runtime.getURL(
        BACKGROUND_CONSTANTS.OPTIONS_PATH,
      );
      browser.tabs.create({ url: optionsUrl });
    }
  }

  /**
   * 处理打开选项页面消息
   */
  async function handleOpenOptions(): Promise<void> {
    const optionsUrl = browser.runtime.getURL(
      BACKGROUND_CONSTANTS.OPTIONS_PATH,
    );
    browser.tabs.create({ url: optionsUrl });
  }

  /**
   * 处理验证配置消息
   */
  function handleValidateConfiguration(
    message: any,
    sendResponse: (response: boolean) => void,
  ): void {
    (async () => {
      try {
        const settings = await storageService.getUserSettings();

        // 检查多配置系统中的活跃配置
        const activeConfig = settings.apiConfigs?.find(
          (config) => config.id === settings.activeApiConfigId,
        );
        const isConfigValid = !!activeConfig?.config?.apiKey;

        if (isConfigValid) {
          sendResponse(true);
          return;
        }

        // 配置无效时显示通知
        await notificationService.showApiConfigError(message.source);
        sendResponse(false);
      } catch (error) {
        console.error('[Background] 配置验证失败:', error);
        sendResponse(false);
      }
    })();
  }

  /**
   * 处理API请求消息
   */
  function handleApiRequest(
    message: any,
    sendResponse: (response: any) => void,
  ): void {
    (async () => {
      try {
        const response = await apiProxyService.handleApiRequest(message);
        sendResponse(response);
      } catch (error) {
        console.error('[Background] API请求处理失败:', error);
        sendResponse({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '未知错误',
          },
        });
      }
    })();
  }

  /**
   * 处理右键菜单动作消息
   */
  function handleContextMenuAction(
    message: any,
    sendResponse: (response: any) => void,
  ): void {
    (async () => {
      try {
        console.log('[Background] 处理右键菜单动作:', message.data);

        // 通过InitializationService获取ContextMenuManager实例
        // 这里暂时返回成功，因为实际的处理逻辑已经在ContextMenuManager中
        sendResponse({
          success: true,
          message: '右键菜单动作已处理',
        });
      } catch (error) {
        console.error('[Background] 右键菜单动作处理失败:', error);
        sendResponse({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '未知错误',
          },
        });
      }
    })();
  }

  // 初始化服务
  initializeServices();
});

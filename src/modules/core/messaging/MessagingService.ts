/**
 * 消息传递服务
 * 负责扩展内各部分之间的通信，支持标签页消息、后台脚本通信、右键菜单动作
 *
 * 功能特性：
 * - 标签页消息发送
 * - 后台脚本通信
 * - 右键菜单动作处理
 * - 消息监听和路由
 * - 错误处理和重试机制
 */

import { browser } from 'wxt/browser';
import { UserSettings, ContextMenuMessage } from '../../shared/types/storage';
import { ContextMenuActionType, UrlPatternType } from '../../shared/types/core';
import {
  MessagingServiceConfig,
  MessageSendResult,
  TabQueryOptions,
  MessageSendOptions,
  MessageListener,
  MessageType,
  Message,
  SettingsUpdateMessage,
  WebsiteManagementUpdateMessage,
  ContextMenuActionMessage,
  NotificationMessage,
} from './types';

// ==================== 消息传递服务类 ====================

/**
 * 消息传递服务
 * 采用单例模式，提供统一的消息通信功能
 */
export class MessagingService {
  private static instance: MessagingService;

  // 配置和状态
  private readonly config: MessagingServiceConfig;
  private messageListeners: Map<string, MessageListener[]> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize = 100;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor(config: MessagingServiceConfig = {}) {
    this.config = {
      enableLogging: true,
      defaultTimeout: 5000,
      maxRetries: 3,
      enableBroadcast: false,
      ...config,
    };
  }

  /**
   * 获取服务实例
   * @param config 可选的服务配置
   * @returns MessagingService 实例
   */
  public static getInstance(config?: MessagingServiceConfig): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService(config);
    }
    return MessagingService.instance;
  }

  // ==================== 消息监听管理 ====================

  /**
   * 添加消息监听器
   * @param messageType 消息类型
   * @param listener 监听器函数
   */
  public addMessageListener(
    messageType: string,
    listener: MessageListener,
  ): void {
    if (!this.messageListeners.has(messageType)) {
      this.messageListeners.set(messageType, []);
    }
    this.messageListeners.get(messageType)!.push(listener);
  }

  /**
   * 移除消息监听器
   * @param messageType 消息类型
   * @param listener 监听器函数
   */
  public removeMessageListener(
    messageType: string,
    listener: MessageListener,
  ): void {
    const listeners = this.messageListeners.get(messageType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 处理接收到的消息
   * @param message 消息对象
   * @param sender 发送者信息
   */
  private async handleMessage(message: Message, sender?: any): Promise<any> {
    this.addToHistory(message);

    if (this.config.enableLogging) {
      console.log('[MessagingService] 接收消息:', message.type, message);
    }

    const listeners = this.messageListeners.get(message.type);
    if (listeners && listeners.length > 0) {
      const results = await Promise.allSettled(
        listeners.map((listener) => listener(message, sender)),
      );

      // 处理监听器执行结果
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `[MessagingService] 监听器 ${index} 执行失败:`,
            result.reason,
          );
        }
      });

      return results[0].status === 'fulfilled' ? results[0].value : undefined;
    }
  }

  /**
   * 添加消息到历史记录
   * @param message 消息对象
   */
  private addToHistory(message: Message): void {
    message.timestamp = Date.now();
    message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.messageHistory.push(message);

    // 保持历史记录大小限制
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  // ==================== 标签页通信 ====================

  /**
   * 查询标签页
   * @param options 查询选项
   * @returns 标签页数组
   */
  private async queryTabs(options: TabQueryOptions = {}): Promise<any[]> {
    try {
      return await browser.tabs.query({
        active: true,
        currentWindow: true,
        ...options,
      });
    } catch (error) {
      console.error('[MessagingService] 查询标签页失败:', error);
      return [];
    }
  }

  /**
   * 发送消息到标签页
   * @param tabId 标签页ID
   * @param message 消息对象
   * @param options 发送选项
   * @returns 发送结果
   */
  public async sendToTab(
    tabId: number,
    message: Message,
    options: MessageSendOptions = {},
  ): Promise<MessageSendResult> {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);

      if (this.config.enableLogging) {
        console.log(
          '[MessagingService] 发送到标签页成功:',
          tabId,
          message.type,
        );
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage = `发送消息到标签页 ${tabId} 失败: ${error}`;
      console.error('[MessagingService]', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 广播消息到所有活跃标签页
   * @param message 消息对象
   * @param options 发送选项
   * @returns 发送结果数组
   */
  public async broadcastToTabs(
    message: Message,
    options: MessageSendOptions = {},
  ): Promise<MessageSendResult[]> {
    const tabs = await this.queryTabs();
    const results: MessageSendResult[] = [];

    for (const tab of tabs) {
      if (tab.id) {
        const result = await this.sendToTab(tab.id, message, options);
        results.push(result);
      }
    }

    return results;
  }

  // ==================== 运行时通信 ====================

  /**
   * 发送消息到运行时（后台脚本）
   * @param message 消息对象
   * @param options 发送选项
   * @returns 发送结果
   */
  public async sendToRuntime(
    message: Message,
    options: MessageSendOptions = {},
  ): Promise<MessageSendResult> {
    try {
      const response = await browser.runtime.sendMessage(message);

      if (this.config.enableLogging) {
        console.log('[MessagingService] 发送到运行时成功:', message.type);
      }

      return { success: true, response };
    } catch (error) {
      const errorMessage = `发送消息到运行时失败: ${error}`;
      console.error('[MessagingService]', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ==================== 高级消息方法 ====================

  /**
   * 通知设置已更新
   * @param settings 新的设置
   * @returns 发送结果
   */
  public async notifySettingsChanged(
    settings: UserSettings,
  ): Promise<MessageSendResult[]> {
    const message: SettingsUpdateMessage = {
      type: MessageType.SETTINGS_UPDATED,
      settings,
    };

    this.addToHistory(message);

    if (this.config.enableBroadcast) {
      return await this.broadcastToTabs(message);
    } else {
      const tabs = await this.queryTabs({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const result = await this.sendToTab(tabs[0].id, message);
        return [result];
      }
      return [{ success: false, error: '没有找到活跃标签页' }];
    }
  }

  /**
   * 发送右键菜单动作消息到后台脚本
   * @param action 动作类型
   * @param url 目标URL
   * @param pattern URL模式
   * @param patternType 模式类型
   * @param description 可选的描述
   * @returns 发送结果
   */
  public async sendContextMenuAction(
    action: ContextMenuActionType,
    url: string,
    pattern: string,
    patternType: UrlPatternType,
    description?: string,
  ): Promise<MessageSendResult> {
    const contextMessage: ContextMenuMessage = {
      type: action,
      url,
      pattern,
      patternType,
      description,
    };

    const message: ContextMenuActionMessage = {
      type: MessageType.CONTEXT_MENU_ACTION,
      data: contextMessage,
    };

    return await this.sendToRuntime(message);
  }

  /**
   * 通知网站管理设置已更新
   * @returns 发送结果数组
   */
  public async notifyWebsiteManagementChanged(): Promise<MessageSendResult[]> {
    const message: WebsiteManagementUpdateMessage = {
      type: MessageType.WEBSITE_MANAGEMENT_UPDATED,
    };

    this.addToHistory(message);

    if (this.config.enableBroadcast) {
      return await this.broadcastToTabs(message);
    } else {
      const tabs = await this.queryTabs({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const result = await this.sendToTab(tabs[0].id, message);
        return [result];
      }
      return [{ success: false, error: '没有找到活跃标签页' }];
    }
  }

  /**
   * 发送通知消息
   * @param title 通知标题
   * @param message 通知内容
   * @param level 通知级别
   * @returns 发送结果数组
   */
  public async sendNotification(
    title: string,
    message: string,
    level: 'info' | 'warning' | 'error' | 'success' = 'info',
  ): Promise<MessageSendResult[]> {
    const notificationMessage: NotificationMessage = {
      type: MessageType.NOTIFICATION,
      title,
      message,
      level,
    };

    this.addToHistory(notificationMessage);
    return await this.broadcastToTabs(notificationMessage);
  }

  // ==================== 工具方法 ====================

  /**
   * 获取消息历史记录
   * @param limit 限制返回数量
   * @returns 消息历史数组
   */
  public getMessageHistory(limit?: number): Message[] {
    if (limit && limit > 0) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * 清空消息历史记录
   */
  public clearMessageHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 获取服务状态
   */
  public getStatus() {
    return {
      config: this.config,
      listenerCount: Array.from(this.messageListeners.values()).reduce(
        (sum, listeners) => sum + listeners.length,
        0,
      ),
      historySize: this.messageHistory.length,
      isHealthy: true,
    };
  }
}

// ==================== 导出 ====================

// 单例实例导出
export const messagingService = MessagingService.getInstance();

// 向后兼容的函数导出
export const notifySettingsChanged = async (
  settings: UserSettings,
): Promise<void> => {
  await messagingService.notifySettingsChanged(settings);
};

export const sendContextMenuAction = async (
  action: ContextMenuActionType,
  url: string,
  pattern: string,
  patternType: UrlPatternType,
  description?: string,
): Promise<boolean> => {
  const result = await messagingService.sendContextMenuAction(
    action,
    url,
    pattern,
    patternType,
    description,
  );
  return (result.success && result.response?.success) || false;
};

export const notifyWebsiteManagementChanged = async (): Promise<void> => {
  await messagingService.notifyWebsiteManagementChanged();
};

// 默认导出
export default MessagingService;

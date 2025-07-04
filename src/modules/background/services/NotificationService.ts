/**
 * 通知服务 - 处理扩展的所有通知功能
 */

import { browser } from 'wxt/browser';
import {
  NotificationConfig,
  NotificationServiceConfig,
  NotificationError,
  BACKGROUND_CONSTANTS,
} from '../types';

export class NotificationService {
  private static instance: NotificationService | null = null;
  private config: NotificationServiceConfig;

  private constructor() {
    this.config = {
      defaultIconUrl: BACKGROUND_CONSTANTS.WARNING_ICON_PATH,
      defaultTimeout: BACKGROUND_CONSTANTS.NOTIFICATION_TIMEOUT,
      sessionStorageKey: BACKGROUND_CONSTANTS.SESSION_KEY_API_NOTIFICATION,
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 显示基础通知
   */
  public async showNotification(
    notificationConfig: NotificationConfig,
  ): Promise<string> {
    try {
      const notificationId = await browser.notifications.create({
        type: 'basic',
        iconUrl:
          notificationConfig.iconUrl || browser.runtime.getURL('/warning.png'),
        title: notificationConfig.title,
        message: notificationConfig.message,
      });
      return notificationId || '';
    } catch (error) {
      console.error('创建通知失败:', error);
      throw new NotificationError(
        `创建通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { notificationConfig },
      );
    }
  }

  /**
   * 显示API配置错误通知
   */
  public async showApiConfigError(
    source: 'user_action' | 'page_load',
  ): Promise<void> {
    const notificationConfig: NotificationConfig = {
      type: 'basic',
      title: '[浸入式学语言助手] API 配置错误',
      message: 'API 密钥未设置。请点击扩展图标进入设置页面进行配置。',
      iconUrl: browser.runtime.getURL('/warning.png'),
    };

    try {
      if (source === 'user_action') {
        await this.showNotification(notificationConfig);
      } else {
        const hasShown = await this.hasShownSessionNotification();
        if (!hasShown) {
          await this.showNotification(notificationConfig);
          await this.markSessionNotificationShown();
        }
      }
    } catch (error) {
      console.error('显示API配置错误通知失败:', error);
      throw error;
    }
  }

  /**
   * 显示成功通知
   */
  public async showSuccessNotification(
    title: string,
    message: string,
    iconUrl?: string,
  ): Promise<string> {
    return this.showNotification({
      type: 'basic',
      title,
      message,
      iconUrl: iconUrl || browser.runtime.getURL('/icon/48.png'),
    });
  }

  /**
   * 显示错误通知
   */
  public async showErrorNotification(
    title: string,
    message: string,
    error?: Error,
  ): Promise<string> {
    return this.showNotification({
      type: 'basic',
      title,
      message: error ? `${message}: ${error.message}` : message,
      iconUrl: browser.runtime.getURL('/warning.png'),
    });
  }

  /**
   * 显示警告通知
   */
  public async showWarningNotification(
    title: string,
    message: string,
  ): Promise<string> {
    const config: NotificationConfig = {
      type: 'basic',
      title,
      message,
      iconUrl: browser.runtime.getURL('/warning.png'),
      priority: 1,
    };

    return this.showNotification(config);
  }

  /**
   * 显示带进度的通知
   */
  public async showProgressNotification(
    title: string,
    message: string,
    progress: number,
  ): Promise<string> {
    const options = {
      type: 'progress' as chrome.notifications.TemplateType,
      title,
      message,
      iconUrl: browser.runtime.getURL('/icon/48.png'),
      priority: 1,
      progress: Math.max(0, Math.min(100, progress)), // 确保进度在0-100之间
    } as chrome.notifications.NotificationCreateOptions;

    try {
      const notificationId = await browser.notifications.create(options);
      console.log(`进度通知已创建: ${notificationId}, 进度: ${progress}%`);
      return notificationId || '';
    } catch (error) {
      console.error('创建进度通知失败:', error);
      throw new NotificationError(
        `创建进度通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { title, message, progress },
      );
    }
  }

  /**
   * 更新进度通知
   */
  public async updateProgressNotification(
    notificationId: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    try {
      const updateOptions: chrome.notifications.NotificationOptions = {
        progress: Math.max(0, Math.min(100, progress)),
      };

      if (message) {
        updateOptions.message = message;
      }

      await browser.notifications.update(notificationId, updateOptions);
      console.log(`进度通知已更新: ${notificationId}, 进度: ${progress}%`);
    } catch (error) {
      console.error('更新进度通知失败:', error);
      throw new NotificationError(
        `更新进度通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { notificationId, progress, message },
      );
    }
  }

  /**
   * 清除通知
   */
  public async clearNotification(notificationId: string): Promise<void> {
    try {
      await browser.notifications.clear(notificationId);
      console.log(`通知已清除: ${notificationId}`);
    } catch (error) {
      console.error('清除通知失败:', error);
      throw new NotificationError(
        `清除通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { notificationId },
      );
    }
  }

  /**
   * 清除所有通知
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      const notifications = await browser.notifications.getAll();
      const clearPromises = Object.keys(notifications).map((id) =>
        this.clearNotification(id),
      );
      await Promise.all(clearPromises);
      console.log('所有通知已清除');
    } catch (error) {
      console.error('清除所有通知失败:', error);
      throw new NotificationError(
        `清除所有通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 检查会话通知是否已显示
   */
  private async hasShownSessionNotification(): Promise<boolean> {
    try {
      const result = await browser.storage.session.get(
        this.config.sessionStorageKey,
      );
      return !!result[this.config.sessionStorageKey];
    } catch (error) {
      console.error('检查会话通知状态失败:', error);
      return false;
    }
  }

  /**
   * 标记会话通知已显示
   */
  private async markSessionNotificationShown(): Promise<void> {
    try {
      await browser.storage.session.set({
        [this.config.sessionStorageKey]: true,
      });
    } catch (error) {
      console.error('标记会话通知状态失败:', error);
    }
  }

  /**
   * 重置会话通知状态
   */
  public async resetSessionNotificationStatus(): Promise<void> {
    try {
      await browser.storage.session.remove(this.config.sessionStorageKey);
    } catch (error) {
      console.error('重置会话通知状态失败:', error);
    }
  }

  /**
   * 设置通知点击监听器
   */
  public setNotificationClickListener(
    callback: (notificationId: string) => void,
  ): void {
    browser.notifications.onClicked.addListener(callback);
  }

  /**
   * 设置通知按钮点击监听器
   */
  public setNotificationButtonClickListener(
    callback: (notificationId: string, buttonIndex: number) => void,
  ): void {
    if (browser.notifications.onButtonClicked) {
      browser.notifications.onButtonClicked.addListener(callback);
    }
  }

  /**
   * 设置通知关闭监听器
   */
  public setNotificationCloseListener(
    callback: (notificationId: string, byUser: boolean) => void,
  ): void {
    browser.notifications.onClosed.addListener(callback);
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): NotificationServiceConfig {
    return { ...this.config };
  }

  /**
   * 验证通知权限
   */
  public async checkNotificationPermission(): Promise<boolean> {
    try {
      // 扩展默认有通知权限，但检查一下确保可用
      return browser.notifications !== undefined;
    } catch (error) {
      console.error('检查通知权限失败:', error);
      return false;
    }
  }

  /**
   * 销毁服务（清理资源）
   */
  public destroy(): void {
    // 清理可能的监听器（如果有的话）
    console.log('通知服务已销毁');
    NotificationService.instance = null;
  }
}

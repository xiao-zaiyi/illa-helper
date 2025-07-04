/**
 * Messaging Module
 * Handles communication between different parts of the extension.
 */

import { UserSettings, ContextMenuMessage } from './shared/types/storage';
import { ContextMenuActionType, UrlPatternType } from './shared/types/core';
import { browser } from 'wxt/browser';

/**
 * Notifies the active tab that the settings have been updated.
 * @param settings The new settings to be sent.
 */
export async function notifySettingsChanged(
  settings: UserSettings,
): Promise<void> {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'settings_updated',
        settings: settings,
      });
    }
  } catch (error) {
    console.error('Failed to send settings_updated message:', error);
  }
}

/**
 * 发送右键菜单操作消息到background脚本
 * @param action 操作类型
 * @param url 目标URL
 * @param pattern URL模式
 * @param patternType 模式类型
 * @param description 可选的描述
 */
export async function sendContextMenuAction(
  action: ContextMenuActionType,
  url: string,
  pattern: string,
  patternType: UrlPatternType,
  description?: string,
): Promise<boolean> {
  try {
    const message: ContextMenuMessage = {
      type: action,
      url,
      pattern,
      patternType,
      description,
    };

    const response = await browser.runtime.sendMessage({
      type: 'context-menu-action',
      data: message,
    });

    return response?.success || false;
  } catch (error) {
    console.error('Failed to send context menu action:', error);
    return false;
  }
}

/**
 * 通知网站管理设置已更新
 */
export async function notifyWebsiteManagementChanged(): Promise<void> {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'website_management_updated',
      });
    }
  } catch (error) {
    console.error('Failed to send website_management_updated message:', error);
  }
}

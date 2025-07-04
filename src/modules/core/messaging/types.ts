/**
 * 消息服务相关类型定义
 * 包含消息传递、通知、通信协议等相关类型
 */

import { UserSettings, ContextMenuMessage } from '../../shared/types/storage';
import { ContextMenuActionType, UrlPatternType } from '../../shared/types/core';

// ==================== 消息类型定义 ====================

/**
 * 消息类型枚举
 */
export enum MessageType {
  SETTINGS_UPDATED = 'settings_updated',
  WEBSITE_MANAGEMENT_UPDATED = 'website_management_updated',
  CONTEXT_MENU_ACTION = 'context-menu-action',
  NOTIFICATION = 'notification',
  ERROR = 'error',
}

/**
 * 基础消息接口
 */
export interface BaseMessage {
  type: MessageType | string;
  timestamp?: number;
  id?: string;
}

/**
 * 设置更新消息
 */
export interface SettingsUpdateMessage extends BaseMessage {
  type: MessageType.SETTINGS_UPDATED;
  settings: UserSettings;
}

/**
 * 网站管理更新消息
 */
export interface WebsiteManagementUpdateMessage extends BaseMessage {
  type: MessageType.WEBSITE_MANAGEMENT_UPDATED;
}

/**
 * 右键菜单动作消息
 */
export interface ContextMenuActionMessage extends BaseMessage {
  type: MessageType.CONTEXT_MENU_ACTION;
  data: ContextMenuMessage;
}

/**
 * 通知消息
 */
export interface NotificationMessage extends BaseMessage {
  type: MessageType.NOTIFICATION;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  error: string;
  details?: any;
}

/**
 * 联合消息类型
 */
export type Message =
  | SettingsUpdateMessage
  | WebsiteManagementUpdateMessage
  | ContextMenuActionMessage
  | NotificationMessage
  | ErrorMessage;

// ==================== 通信相关类型 ====================

/**
 * 消息发送结果
 */
export interface MessageSendResult {
  success: boolean;
  error?: string;
  response?: any;
}

/**
 * 标签页查询选项
 */
export interface TabQueryOptions {
  active?: boolean;
  currentWindow?: boolean;
  url?: string[];
  index?: number;
}

/**
 * 消息发送选项
 */
export interface MessageSendOptions {
  targetTab?: number;
  targetRuntime?: string;
  timeout?: number;
  retries?: number;
}

/**
 * 消息监听器
 */
export type MessageListener<T = any> = (
  message: T,
  sender?: any,
) => Promise<any> | any;

/**
 * 消息服务配置
 */
export interface MessagingServiceConfig {
  enableLogging?: boolean;
  defaultTimeout?: number;
  maxRetries?: number;
  enableBroadcast?: boolean;
}



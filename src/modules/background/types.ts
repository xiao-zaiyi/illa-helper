/**
 * Background 服务相关类型定义
 */

import { UserSettings } from '../shared/types/storage';

// ================================
// 消息类型定义
// ================================

export interface ShowNotificationMessage {
  type: 'show-notification';
  options: chrome.notifications.NotificationOptions;
}

export interface OpenPopupMessage {
  type: 'open-popup';
}

export interface OpenOptionsMessage {
  type: 'open-options';
}

export interface ValidateConfigurationMessage {
  type: 'validate-configuration';
  source: 'user_action' | 'page_load';
}

export interface ApiRequestMessage {
  type: 'api-request';
  data: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout?: number;
  };
}

export interface TranslatePageMessage {
  type: 'translate-page-command';
}

export interface SettingsUpdatedMessage {
  type: 'settings_updated';
  settings: UserSettings;
}

export interface ApiConfigUpdatedMessage {
  type: 'api_config_updated';
  settings: UserSettings;
}

export interface ManualTranslateMessage {
  type: 'MANUAL_TRANSLATE';
}

export type BackgroundMessage =
  | ShowNotificationMessage
  | OpenPopupMessage
  | OpenOptionsMessage
  | ValidateConfigurationMessage
  | ApiRequestMessage
  | TranslatePageMessage
  | SettingsUpdatedMessage
  | ApiConfigUpdatedMessage
  | ManualTranslateMessage;

// ================================
// API 响应类型定义
// ================================

export interface ApiSuccessResponse {
  success: true;
  data: any;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    status?: number;
    statusText?: string;
  };
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// ================================
// 通知相关类型
// ================================

export interface NotificationConfig {
  type: 'basic' | 'image' | 'list' | 'progress';
  title: string;
  message: string;
  iconUrl?: string;
  imageUrl?: string;
  priority?: number;
}

export interface ApiConfigNotificationOptions {
  source: 'user_action' | 'page_load';
  title: string;
  message: string;
  iconUrl: string;
}

// ================================
// 命令相关类型
// ================================

export type ExtensionCommand = 'translate-page';

export interface CommandHandlerResult {
  success: boolean;
  error?: string;
}

// ================================
// 初始化相关类型
// ================================

export interface InitializationConfig {
  shouldCreateMenus: boolean;
  shouldInitializeStorage: boolean;
  shouldInitializeContextMenu: boolean;
}

export interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

// ================================
// 右键菜单相关类型
// ================================

export interface ContextMenuItemConfig {
  id: string;
  title: string;
  type?: 'normal' | 'checkbox' | 'radio' | 'separator';
  parentId?: string;
  contexts: chrome.contextMenus.ContextType[];
  visible?: boolean;
  enabled?: boolean;
}

export interface ContextMenuStructure {
  items: ContextMenuItemConfig[];
}

// ================================
// 配置验证相关类型
// ================================

export interface ConfigValidationResult {
  isValid: boolean;
  activeConfig?: {
    id: string;
    provider: string;
    hasApiKey: boolean;
  };
  errors: string[];
}

// ================================
// 服务配置类型
// ================================

export interface NotificationServiceConfig {
  defaultIconUrl: string;
  defaultTimeout: number;
  sessionStorageKey: string;
}

export interface ApiProxyServiceConfig {
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface CommandServiceConfig {
  enabledCommands: ExtensionCommand[];
  requiresValidation: boolean;
}

export interface BackgroundServiceConfig {
  notification: NotificationServiceConfig;
  apiProxy: ApiProxyServiceConfig;
  command: CommandServiceConfig;
  initialization: InitializationConfig;
}

// ================================
// 错误类型定义
// ================================

export class BackgroundServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any,
  ) {
    super(message);
    this.name = 'BackgroundServiceError';
  }
}

export class ApiProxyError extends BackgroundServiceError {
  constructor(message: string, context?: any) {
    super(message, 'API_PROXY_ERROR', context);
    this.name = 'ApiProxyError';
  }
}

export class NotificationError extends BackgroundServiceError {
  constructor(message: string, context?: any) {
    super(message, 'NOTIFICATION_ERROR', context);
    this.name = 'NotificationError';
  }
}

export class ConfigurationError extends BackgroundServiceError {
  constructor(message: string, context?: any) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

// ================================
// 常量定义
// ================================

export const BACKGROUND_CONSTANTS = {
  NOTIFICATION_TIMEOUT: 5000,
  API_REQUEST_TIMEOUT: 30000,
  SESSION_KEY_API_NOTIFICATION: 'apiKeyNotificationShown',
  MENU_PARENT_ID: 'illa-website-management',
  WARNING_ICON_PATH: '/warning.png',
  OPTIONS_PATH: '/options.html',
  POPUP_PATH: '/popup.html',
} as const;

export const MESSAGE_TYPES = {
  SHOW_NOTIFICATION: 'show-notification',
  OPEN_POPUP: 'open-popup',
  OPEN_OPTIONS: 'open-options',
  VALIDATE_CONFIG: 'validate-configuration',
  API_REQUEST: 'api-request',
  TRANSLATE_PAGE: 'translate-page-command',
  SETTINGS_UPDATED: 'settings_updated',
  API_CONFIG_UPDATED: 'api_config_updated',
  MANUAL_TRANSLATE: 'MANUAL_TRANSLATE',
} as const;

export const EXTENSION_COMMANDS = {
  TRANSLATE_PAGE: 'translate-page',
} as const;

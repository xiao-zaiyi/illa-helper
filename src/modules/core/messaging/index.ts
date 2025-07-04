/**
 * 消息服务统一入口
 * 导出消息传递相关的所有功能
 */

// 服务类导出
export {
  default as MessagingService,
  messagingService,
  notifySettingsChanged,
  sendContextMenuAction,
  notifyWebsiteManagementChanged,
} from './MessagingService';

// 类型定义导出
export type {
  MessagingServiceConfig,
  MessageSendResult,
  TabQueryOptions,
  MessageSendOptions,
  MessageListener,
  Message,
  BaseMessage,
  SettingsUpdateMessage,
  WebsiteManagementUpdateMessage,
  ContextMenuActionMessage,
  NotificationMessage,
  ErrorMessage,
  UserSettings,
  ContextMenuMessage,
  ContextMenuActionType,
  UrlPatternType,
} from './types';

export { MessageType } from './types';

// 默认导出
export { messagingService as default } from './MessagingService';

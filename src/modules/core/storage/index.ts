/**
 * 存储服务统一入口
 * 导出存储管理相关的所有功能
 */

// 服务类导出
export {
  default as StorageService,
  storageService,
  StorageManager,
} from './StorageService';

// 类型定义导出
export type {
  StorageOperationResult,
  ConfigurationStats,
  ValidationResult,
  StorageServiceConfig,
  StorageEventData,
  StorageEventListener,
  UserSettings,
  ApiConfig,
  ApiConfigItem,
} from './types';

export { StorageEventType } from './types';

// 默认导出
export { storageService as default } from './StorageService';

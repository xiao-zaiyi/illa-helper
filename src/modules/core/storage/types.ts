/**
 * 存储服务相关类型定义
 * 包含存储管理、配置统计、数据验证等相关类型
 */

import { UserSettings } from '../../shared/types/storage';
import { ApiConfig, ApiConfigItem } from '../../shared/types/api';

// ==================== 存储操作类型 ====================

/**
 * 存储操作结果
 */
export interface StorageOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * 配置统计信息
 */
export interface ConfigurationStats {
  intelligentModeEnabled: boolean;
  targetLanguage: string;
  totalKeys: number;
  apiConfigsCount: number;
}

/**
 * 存储服务配置
 */
export interface StorageServiceConfig {
  enableAutoBackup?: boolean;
  enableValidation?: boolean;
  maxRetries?: number;
  storageKey?: string;
}

/**
 * 数据验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  hasChanges: boolean;
  validatedData: UserSettings;
  errors: string[];
}

/**
 * 存储事件类型
 */
export enum StorageEventType {
  SETTINGS_LOADED = 'settings_loaded',
  SETTINGS_SAVED = 'settings_saved',
  API_CONFIG_ADDED = 'api_config_added',
  API_CONFIG_UPDATED = 'api_config_updated',
  API_CONFIG_REMOVED = 'api_config_removed',
  ACTIVE_CONFIG_CHANGED = 'active_config_changed',
  DATA_CLEARED = 'data_cleared',
}

/**
 * 存储事件数据
 */
export interface StorageEventData {
  type: StorageEventType;
  timestamp: number;
  data?: any;
  error?: string;
}

/**
 * 存储服务事件监听器
 */
export type StorageEventListener = (event: StorageEventData) => void;

// ==================== 导出汇总 ====================

export type { UserSettings, ApiConfig, ApiConfigItem };

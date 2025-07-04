/**
 * 速率限制服务相关类型定义
 * 包含速率限制器、管理器、配置等相关类型
 */

// ==================== 速率限制配置 ====================

/**
 * 速率限制器配置
 */
export interface RateLimiterConfig {
  requestsPerSecond: number;
  enabled: boolean;
  windowMs?: number;
  bufferMs?: number;
}

/**
 * 速率限制器状态
 */
export interface RateLimiterStatus {
  enabled: boolean;
  requestsPerSecond: number;
  currentRequests: number;
  remainingRequests: number;
  nextResetTime?: number;
}

/**
 * 批量执行配置
 */
export interface BatchExecutionConfig {
  maxConcurrency?: number;
  delayBetweenBatches?: number;
  enableProgressTracking?: boolean;
}

/**
 * 批量执行结果
 */
export interface BatchExecutionResult<T> {
  results: T[];
  totalExecuted: number;
  totalFailed: number;
  executionTime: number;
  errors: Error[];
}

/**
 * 批量执行进度
 */
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

// ==================== 请求函数类型 ====================

/**
 * 请求函数类型
 */
export type RequestFunction<T = any> = () => Promise<T>;

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: BatchProgress) => void;

// ==================== 服务配置 ====================

/**
 * 速率限制服务配置
 */
export interface RateLimiterServiceConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  defaultWindowMs?: number;
  defaultBufferMs?: number;
  maxLimiters?: number;
}

/**
 * 速率限制器事件类型
 */
export enum RateLimiterEventType {
  REQUEST_ALLOWED = 'request_allowed',
  REQUEST_THROTTLED = 'request_throttled',
  BATCH_STARTED = 'batch_started',
  BATCH_COMPLETED = 'batch_completed',
  BATCH_PROGRESS = 'batch_progress',
  LIMITER_CREATED = 'limiter_created',
  LIMITER_UPDATED = 'limiter_updated',
  LIMITER_REMOVED = 'limiter_removed',
}

/**
 * 速率限制器事件数据
 */
export interface RateLimiterEventData {
  type: RateLimiterEventType;
  timestamp: number;
  endpoint?: string;
  data?: any;
  error?: string;
}

/**
 * 事件监听器类型
 */
export type RateLimiterEventListener = (event: RateLimiterEventData) => void;

// ==================== 统计和指标 ====================

/**
 * 速率限制统计信息
 */
export interface RateLimiterStats {
  totalRequests: number;
  allowedRequests: number;
  throttledRequests: number;
  averageWaitTime: number;
  peakRequestsPerSecond: number;
  activeEndpoints: number;
}

/**
 * 端点统计信息
 */
export interface EndpointStats {
  endpoint: string;
  totalRequests: number;
  allowedRequests: number;
  throttledRequests: number;
  averageWaitTime: number;
  lastRequestTime: number;
  config: RateLimiterConfig;
}

// ==================== 工厂和管理器类型 ====================

/**
 * 速率限制器工厂选项
 */
export interface LimiterFactoryOptions {
  defaultConfig?: Partial<RateLimiterConfig>;
  enableCaching?: boolean;
  maxCacheSize?: number;
}

/**
 * 管理器状态
 */
export interface ManagerStatus {
  totalLimiters: number;
  activeLimiters: number;
  globalStats: RateLimiterStats;
  endpointStats: EndpointStats[];
  isHealthy: boolean;
}

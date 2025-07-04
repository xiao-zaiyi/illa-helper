/**
 * 速率限制服务统一入口
 * 导出速率限制相关的所有功能
 */

// 服务类导出
export {
  default as RateLimiterService,
  rateLimiterService,
  rateLimitManager,
  SimpleRateLimiter,
  debugRateLimiters,
} from './RateLimiterService';

// 类型定义导出
export type {
  RateLimiterConfig,
  RateLimiterStatus,
  BatchExecutionConfig,
  BatchExecutionResult,
  BatchProgress,
  RequestFunction,
  ProgressCallback,
  RateLimiterServiceConfig,
  RateLimiterEventData,
  RateLimiterEventListener,
  RateLimiterStats,
  EndpointStats,
  ManagerStatus,
} from './types';

export { RateLimiterEventType } from './types';

// 默认导出
export { rateLimiterService as default } from './RateLimiterService';

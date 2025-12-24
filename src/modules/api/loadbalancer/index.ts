/**
 * 负载均衡模块
 *
 * 提供API Key资源池管理和负载均衡功能：
 * - ServiceDispatcher: 服务调度器，实现轮询策略和配置池管理
 * - FailoverExecutor: 故障转移执行器，实现自动重试和配置切换
 */

// 服务调度器
export { ServiceDispatcher, serviceDispatcher } from './ServiceDispatcher';

// 故障转移执行器
export {
  FailoverExecutor,
  failoverExecutor,
  type FailoverResult,
  type FailoverAttemptDetail,
  type FailoverExecutorOptions,
  RetryableError,
} from './FailoverExecutor';

/**
 * 故障转移执行器
 *
 * 负责执行带有自动故障转移功能的API调用。
 * 当请求失败时自动切换到下一个可用配置，支持可重试错误的识别。
 */

import { ApiConfigItem } from '../../shared/types/api';
import { ServiceDispatcher } from './ServiceDispatcher';

/**
 * 故障转移结果接口
 */
export interface FailoverResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 成功时的结果数据 */
  data?: T;
  /** 失败时的错误信息 */
  error?: string;
  /** 实际使用的配置ID */
  usedConfigId?: string;
  /** 实际使用的配置名称 */
  usedConfigName?: string;
  /** 尝试次数 */
  attempts: number;
  /** 每次尝试的详细信息 */
  attemptDetails: FailoverAttemptDetail[];
}

/**
 * 单次尝试的详细信息
 */
export interface FailoverAttemptDetail {
  /** 配置ID */
  configId: string;
  /** 配置名称 */
  configName: string;
  /** 服务商 */
  provider: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** HTTP状态码 */
  statusCode?: number;
  /** 耗时（毫秒） */
  duration: number;
}

/**
 * 可重试错误类
 */
export class RetryableError extends Error {
  public statusCode?: number;
  public isRetryable: boolean;

  constructor(
    message: string,
    statusCode?: number,
    isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'RetryableError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * 故障转移执行器选项
 */
export interface FailoverExecutorOptions {
  /** 冷却时间（毫秒） */
  cooldownDuration?: number;
  /** 可重试的HTTP状态码 */
  retryableStatusCodes?: number[];
  /** 是否输出详细日志 */
  verbose?: boolean;
}

/**
 * 故障转移执行器类
 * 采用单例模式，提供带自动故障转移的任务执行功能
 */
export class FailoverExecutor {
  private static instance: FailoverExecutor | null = null;

  private dispatcher: ServiceDispatcher;

  // 默认可重试的HTTP状态码
  private readonly defaultRetryableStatusCodes = [429, 500, 502, 503, 504];

  private constructor() {
    this.dispatcher = ServiceDispatcher.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): FailoverExecutor {
    if (!FailoverExecutor.instance) {
      FailoverExecutor.instance = new FailoverExecutor();
    }
    return FailoverExecutor.instance;
  }

  /**
   * 判断错误是否可重试
   * @param error 错误对象
   * @param statusCodes 自定义可重试状态码列表
   */
  isRetryableError(error: any, statusCodes?: number[]): boolean {
    const retryableCodes = statusCodes || this.defaultRetryableStatusCodes;

    // 检查HTTP状态码
    const statusCode = error.statusCode || error.status || error.code;
    if (statusCode && retryableCodes.includes(statusCode)) {
      return true;
    }

    // 检查错误消息关键词
    const message = (error.message || '').toLowerCase();
    const retryableKeywords = [
      'rate limit',
      'too many requests',
      'quota exceeded',
      'timeout',
      'timed out',
      'network error',
      'connection refused',
      'econnreset',
      'econnrefused',
      'socket hang up',
      'temporarily unavailable',
      'failed to fetch', // 新增: 常见的 fetch 网络错误
      'network error', // 新增: 通用网络错误
      'networkerror', // 新增: 变体
      'cors', // 新增: 跨域相关
      'access-control-allow-origin', // 新增: CORS 相关
      '429',
      '500',
      '502',
      '503',
      '504',
      '403', // 新增: 某些 API 封禁也应尝试切换其他 Key
    ];

    for (const keyword of retryableKeywords) {
      if (message.includes(keyword)) {
        return true;
      }
    }

    // 检查是否为 RetryableError 实例
    if (error instanceof RetryableError) {
      return error.isRetryable;
    }

    return false;
  }

  /**
   * 从错误中提取HTTP状态码
   */
  private extractStatusCode(error: any): number | undefined {
    return error.statusCode || error.status || error.code || undefined;
  }

  /**
   * 执行带故障转移的任务
   * @param task 执行任务的函数，接收配置作为参数
   * @param configs 可用的配置列表
   * @param options 执行选项
   * @returns 故障转移结果
   */
  async executeWithFailover<T>(
    task: (config: ApiConfigItem) => Promise<T>,
    configs: ApiConfigItem[],
    options: FailoverExecutorOptions = {},
  ): Promise<FailoverResult<T>> {
    const {
      cooldownDuration = 60000,
      retryableStatusCodes = this.defaultRetryableStatusCodes,
      verbose = true,
    } = options;

    // 构建故障转移队列
    const attemptQueue = this.dispatcher.buildFailoverQueue(configs);
    const attemptDetails: FailoverAttemptDetail[] = [];

    if (attemptQueue.length === 0) {
      return {
        success: false,
        error: '无可用的API配置（所有配置已禁用或处于冷却期）',
        attempts: 0,
        attemptDetails: [],
      };
    }

    let lastError: any = null;

    for (let i = 0; i < attemptQueue.length; i++) {
      const config = attemptQueue[i];
      const startTime = Date.now();

      try {
        if (verbose) {
          console.log(
            `[FailoverExecutor] 尝试 #${i + 1}/${attemptQueue.length}: ` +
              `配置 "${config.name}" (${config.provider})`,
          );
        }

        // 执行任务
        const result = await task(config);

        // 成功
        const duration = Date.now() - startTime;

        this.dispatcher.markConfigSuccess(config.id);

        attemptDetails.push({
          configId: config.id,
          configName: config.name,
          provider: config.provider,
          success: true,
          duration,
        });

        if (verbose) {
          console.log(
            `[FailoverExecutor] 成功: 配置 "${config.name}" 在 ${duration}ms 内完成`,
          );
        }

        return {
          success: true,
          data: result,
          usedConfigId: config.id,
          usedConfigName: config.name,
          attempts: attemptDetails.length,
          attemptDetails,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        const statusCode = this.extractStatusCode(error);
        lastError = error;

        attemptDetails.push({
          configId: config.id,
          configName: config.name,
          provider: config.provider,
          success: false,
          error: error.message || String(error),
          statusCode,
          duration,
        });

        if (verbose) {
          console.warn(
            `[FailoverExecutor] 失败: 配置 "${config.name}" (${duration}ms)`,
            `错误: ${error.message || error}`,
            statusCode ? `状态码: ${statusCode}` : '',
          );
        }

        // 标记配置错误并进入冷却期
        this.dispatcher.markConfigError(
          config.id,
          {
            code: statusCode || 0,
            message: error.message || String(error),
          },
          cooldownDuration,
        );

        // 判断是否可重试
        const canRetry = this.isRetryableError(error, retryableStatusCodes);

        if (!canRetry) {
          if (verbose) {
            console.warn('[FailoverExecutor] 不可重试错误，停止尝试');
          }
          break;
        }

        // 还有其他配置可以尝试
        if (i < attemptQueue.length - 1) {
          if (verbose) {
            console.log('[FailoverExecutor] 切换到下一个配置...');
          }
        }
      }
    }

    // 所有配置都失败了
    return {
      success: false,
      error: lastError?.message || '所有API配置均调用失败',
      attempts: attemptDetails.length,
      attemptDetails,
    };
  }

  /**
   * 简化版执行方法 - 不显示详细日志
   */
  async executeQuiet<T>(
    task: (config: ApiConfigItem) => Promise<T>,
    configs: ApiConfigItem[],
  ): Promise<FailoverResult<T>> {
    return this.executeWithFailover(task, configs, { verbose: false });
  }
}

// 导出单例实例
export const failoverExecutor = FailoverExecutor.getInstance();

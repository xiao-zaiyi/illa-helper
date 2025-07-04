/**
 * 速率限制服务
 * 负责API请求的速率控制，防止过快的请求导致服务限制
 */

import { RateLimiterConfig, RateLimiterStatus, RequestFunction } from './types';

/**
 * 简单速率限制器
 */
class SimpleRateLimiter {
  private requestTimes: number[] = [];
  private config: RateLimiterConfig;
  private executionQueue: Promise<any> = Promise.resolve();

  constructor(config: RateLimiterConfig) {
    this.config = {
      windowMs: 1000,
      bufferMs: 10,
      ...config,
    };
  }

  async checkAndWait(): Promise<void> {
    const chainedPromise = this.executionQueue.then(async () => {
      if (!this.config.enabled || this.config.requestsPerSecond <= 0) {
        return;
      }

      const now = Date.now();
      const windowMs = this.config.windowMs!;

      // 清理过期的请求记录
      while (
        this.requestTimes.length > 0 &&
        now - this.requestTimes[0] >= windowMs
      ) {
        this.requestTimes.shift();
      }

      // 如果当前窗口内请求数已达上限，等待
      if (this.requestTimes.length >= this.config.requestsPerSecond) {
        const oldestRequest = this.requestTimes[0];
        const waitTime =
          windowMs - (now - oldestRequest) + this.config.bufferMs!;

        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        // 等待后再次清理
        const newNow = Date.now();
        while (
          this.requestTimes.length > 0 &&
          newNow - this.requestTimes[0] >= windowMs
        ) {
          this.requestTimes.shift();
        }
      }

      // 记录本次请求时间
      this.requestTimes.push(Date.now());
    });

    this.executionQueue = chainedPromise;
    return chainedPromise;
  }

  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async executeBatch<T>(requestFunctions: RequestFunction<T>[]): Promise<T[]> {
    if (!this.config.enabled || requestFunctions.length === 0) {
      return Promise.all(requestFunctions.map((fn) => fn()));
    }

    const results: T[] = [];
    for (const requestFn of requestFunctions) {
      await this.checkAndWait();
      const result = await requestFn();
      results.push(result);
    }
    return results;
  }

  getStatus(): RateLimiterStatus {
    const now = Date.now();
    const windowMs = this.config.windowMs!;
    const recentRequests = this.requestTimes.filter(
      (time) => now - time < windowMs,
    );

    return {
      enabled: this.config.enabled,
      requestsPerSecond: this.config.requestsPerSecond,
      currentRequests: recentRequests.length,
      remainingRequests: Math.max(
        0,
        this.config.requestsPerSecond - recentRequests.length,
      ),
    };
  }
}

/**
 * 速率限制服务
 */
export class RateLimiterService {
  private static instance: RateLimiterService;
  private limiters = new Map<string, SimpleRateLimiter>();

  private constructor() {}

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  public getLimiter(
    endpoint: string,
    requestsPerSecond: number = 0,
    enabled: boolean = true,
  ): SimpleRateLimiter {
    if (!this.limiters.has(endpoint)) {
      const config: RateLimiterConfig = {
        requestsPerSecond: Math.max(0, requestsPerSecond),
        enabled: enabled && requestsPerSecond > 0,
      };
      this.limiters.set(endpoint, new SimpleRateLimiter(config));
    } else {
      const limiter = this.limiters.get(endpoint)!;
      limiter.updateConfig({
        requestsPerSecond: Math.max(0, requestsPerSecond),
        enabled: enabled && requestsPerSecond > 0,
      });
    }
    return this.limiters.get(endpoint)!;
  }

  public clear(): void {
    this.limiters.clear();
  }
}

// 导出
export const rateLimiterService = RateLimiterService.getInstance();

export const rateLimitManager = {
  getLimiter: (
    endpoint: string,
    requestsPerSecond: number = 0,
    enabled: boolean = true,
  ) => {
    return rateLimiterService.getLimiter(endpoint, requestsPerSecond, enabled);
  },
  clear: () => {
    rateLimiterService.clear();
  },
};

export { SimpleRateLimiter };

export function debugRateLimiters(): void {
  console.log('[速率限制调试] 速率限制服务已加载');
}

export default RateLimiterService;

/**
 * 服务调度器
 *
 * 负责管理API配置池和实现负载均衡调度。
 * 支持轮询(Round-Robin)策略，并提供配置状态追踪功能。
 */

import { ApiConfigItem } from '../../shared/types/api';
import { StorageService } from '../../core/storage';

/**
 * 服务调度器类
 * 采用单例模式，管理API配置池的负载均衡调度
 */
export class ServiceDispatcher {
  private static instance: ServiceDispatcher | null = null;

  // 轮询索引（全局轮询状态）
  private currentIndex: number = 0;

  // 存储服务引用
  private storageService: StorageService;

  // 运行时状态缓存（避免频繁读写存储）
  private runtimeStatusCache: Map<
    string,
    {
      lastUsed?: number;
      successCount: number;
      failureCount: number;
      lastError?: { code: number; message: string; timestamp: number };
      cooldownUntil?: number;
    }
  > = new Map();

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ServiceDispatcher {
    if (!ServiceDispatcher.instance) {
      ServiceDispatcher.instance = new ServiceDispatcher();
    }
    return ServiceDispatcher.instance;
  }

  /**
   * 获取所有启用的配置
   * @param providerId 可选，按服务商ID过滤
   * @returns 启用的配置列表
   */
  async getEnabledConfigs(providerId?: string): Promise<ApiConfigItem[]> {
    const settings = await this.storageService.getUserSettings();

    // 过滤已启用的配置
    let configs = settings.apiConfigs.filter((c) => c.enabled !== false);

    // 按服务商过滤
    if (providerId) {
      configs = configs.filter((c) => c.provider === providerId);
    }

    // 过滤冷却中的配置
    const now = Date.now();
    configs = configs.filter((c) => {
      const cachedStatus = this.runtimeStatusCache.get(c.id);
      const cooldownUntil = cachedStatus?.cooldownUntil;

      if (cooldownUntil && now < cooldownUntil) {
        return false;
      }

      return true;
    });

    return configs;
  }

  /**
   * 使用轮询策略获取下一个配置
   * @param configs 可用的配置列表
   * @returns 下一个配置，如果列表为空则返回null
   */
  getNextConfig(configs: ApiConfigItem[]): ApiConfigItem | null {
    if (configs.length === 0) {
      return null;
    }

    const config = configs[this.currentIndex % configs.length];
    this.currentIndex++;

    // 防止索引溢出
    if (this.currentIndex >= Number.MAX_SAFE_INTEGER) {
      this.currentIndex = 0;
    }

    return config;
  }

  /**
   * 构建故障转移队列
   * 将轮询选中的配置放在队列头部，其他配置作为备份
   * @param configs 可用的配置列表
   * @returns 故障转移队列
   */
  buildFailoverQueue(configs: ApiConfigItem[]): ApiConfigItem[] {
    if (configs.length === 0) {
      return [];
    }

    const preferred = this.getNextConfig(configs);
    if (!preferred) {
      return [];
    }

    // 按优先级排序其他配置（如果有优先级字段）
    const others = configs
      .filter((c) => c.id !== preferred.id)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    return [preferred, ...others];
  }

  /**
   * 标记配置调用失败，进入冷却期
   * @param configId 配置ID
   * @param error 错误信息
   * @param cooldownDuration 冷却时间（毫秒），默认60秒
   */
  markConfigError(
    configId: string,
    error: { code: number; message: string },
    cooldownDuration: number = 60000,
  ): void {
    const existing = this.runtimeStatusCache.get(configId) || {
      successCount: 0,
      failureCount: 0,
    };

    this.runtimeStatusCache.set(configId, {
      ...existing,
      failureCount: existing.failureCount + 1,
      lastError: {
        code: error.code,
        message: error.message,
        timestamp: Date.now(),
      },
      cooldownUntil: Date.now() + cooldownDuration,
    });
  }

  /**
   * 标记配置调用成功
   * @param configId 配置ID
   */
  markConfigSuccess(configId: string): void {
    const existing = this.runtimeStatusCache.get(configId) || {
      successCount: 0,
      failureCount: 0,
    };

    this.runtimeStatusCache.set(configId, {
      ...existing,
      lastUsed: Date.now(),
      successCount: existing.successCount + 1,
      cooldownUntil: undefined, // 成功后清除冷却
    });
  }

  /**
   * 重置轮询索引
   */
  resetIndex(): void {
    this.currentIndex = 0;
  }

  /**
   * 清除运行时状态缓存
   */
  clearRuntimeStatusCache(): void {
    this.runtimeStatusCache.clear();
  }

  /**
   * 获取配置的运行时统计信息
   * @param configId 配置ID
   */
  getConfigStats(configId: string): {
    successCount: number;
    failureCount: number;
    lastUsed?: number;
    isInCooldown: boolean;
  } | null {
    const status = this.runtimeStatusCache.get(configId);
    if (!status) {
      return null;
    }

    return {
      successCount: status.successCount,
      failureCount: status.failureCount,
      lastUsed: status.lastUsed,
      isInCooldown: !!(
        status.cooldownUntil && Date.now() < status.cooldownUntil
      ),
    };
  }

  /**
   * 获取当前轮询索引（用于调试）
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}

// 导出单例实例
export const serviceDispatcher = ServiceDispatcher.getInstance();

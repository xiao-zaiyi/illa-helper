/**
 * 懒加载服务 - 管理基于视口的懒加载翻译功能
 *
 * 核心功能：
 * 1. 管理 Intersection Observer 实例
 * 2. 协调视口检测和翻译触发
 * 3. 处理动态内容的观察者更新
 * 4. 提供性能优化和错误处理
 */

import type { LazyLoadingConfig } from '../../shared/types/core';
import type { ContentSegment } from '../../processing/ProcessingStateManager';
import {
  SegmentObserver,
  type SegmentObserverCallback,
} from '../utils/SegmentObserver';

/**
 * 懒加载回调函数类型
 */
export type LazyLoadingCallback = (segments: ContentSegment[]) => Promise<void>;

/**
 * 懒加载服务状态
 */
interface LazyLoadingState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否已启用 */
  enabled: boolean;
  /** 待处理的段落队列 */
  processingQueue: Set<string>;
  /** 已处理的段落记录 */
  processedSegments: Set<string>;
  /** 段落缓存 */
  segmentCache: Map<string, ContentSegment>;
}

/**
 * 懒加载服务
 */
export class LazyLoadingService {
  private config: LazyLoadingConfig;
  private observer: SegmentObserver | null = null;
  private processingCallback: LazyLoadingCallback | null = null;
  private state: LazyLoadingState;
  private processingTimer: number | null = null;
  private isDestroyed = false;

  constructor(config: LazyLoadingConfig) {
    this.config = { ...config };
    this.state = {
      initialized: false,
      enabled: false,
      processingQueue: new Set(),
      processedSegments: new Set(),
      segmentCache: new Map(),
    };
  }

  /**
   * 初始化懒加载服务
   */
  initialize(): void {
    if (this.state.initialized) return;

    this.state.initialized = true;
    this.state.enabled = this.config.enabled;

    if (this.config.enabled) {
      this.createObserver();
    }
  }

  /**
   * 创建观察器
   */
  private createObserver(): void {
    if (this.observer) {
      this.observer.destroy();
    }

    const observerCallback: SegmentObserverCallback = (
      visibleSegments,
      invisibleSegments,
    ) => {
      this.handleVisibilityChange(visibleSegments);
    };

    const observerOptions = {
      preloadDistance: this.config.preloadDistance,
    };

    this.observer = new SegmentObserver(observerCallback, observerOptions);
  }

  /**
   * 处理段落可见性变化
   */
  private handleVisibilityChange(visibleSegments: ContentSegment[]): void {
    if (!this.state.enabled || this.isDestroyed) return;

    // 处理进入视口的段落
    if (visibleSegments.length > 0) {
      this.scheduleProcessing(visibleSegments);
    }
  }

  /**
   * 调度处理 - 防止并发问题
   */
  private scheduleProcessing(segments: ContentSegment[]): void {
    // 过滤已处理的段落
    const unprocessedSegments = segments.filter(
      (segment) => !this.state.processedSegments.has(segment.fingerprint),
    );

    if (unprocessedSegments.length === 0) return;

    // 添加到处理队列和缓存
    unprocessedSegments.forEach((segment) => {
      this.state.processingQueue.add(segment.fingerprint);
      this.state.segmentCache.set(segment.fingerprint, segment);
    });

    // 如果已有定时器在运行，不清除它，让它继续处理
    if (this.processingTimer) {
      return;
    }

    // 延迟处理，避免频繁触发
    this.processingTimer = window.setTimeout(() => {
      this.processAllQueuedSegments();
    }, 100);
  }

  /**
   * 处理队列中的所有段落 - 解决并发跳过问题
   */
  private async processAllQueuedSegments(): Promise<void> {
    if (!this.processingCallback || this.isDestroyed) return;

    const allQueuedFingerprints = Array.from(this.state.processingQueue);
    if (allQueuedFingerprints.length === 0) {
      this.processingTimer = null;
      return;
    }

    const segmentsToProcess: ContentSegment[] = [];
    allQueuedFingerprints.forEach((fingerprint) => {
      const segment = this.state.segmentCache.get(fingerprint);
      if (segment) {
        segmentsToProcess.push(segment);
      }
    });

    if (segmentsToProcess.length === 0) {
      this.processingTimer = null;
      return;
    }

    try {
      // 使用 RequestIdleCallback 优化性能（如果支持）
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(async () => {
          await this.processingCallback!(segmentsToProcess);
        });
      } else {
        await this.processingCallback(segmentsToProcess);
      }

      // 标记为已处理并从缓存中移除
      segmentsToProcess.forEach((segment) => {
        this.state.processedSegments.add(segment.fingerprint);
        this.state.processingQueue.delete(segment.fingerprint);
        this.state.segmentCache.delete(segment.fingerprint);
      });
    } catch (error) {
      // 即使失败也要清理队列，避免重复处理
      segmentsToProcess.forEach((segment) => {
        this.state.processingQueue.delete(segment.fingerprint);
        this.state.segmentCache.delete(segment.fingerprint);
      });
    } finally {
      this.processingTimer = null;
    }
  }

  /**
   * 开始观察段落
   */
  observeSegments(segments: ContentSegment[]): void {
    if (
      !this.state.initialized ||
      !this.state.enabled ||
      !this.observer ||
      this.isDestroyed
    ) {
      return;
    }
    this.observer.observeMultiple(segments);
  }

  /**
   * 停止观察段落
   */
  unobserveSegments(segments: ContentSegment[]): void {
    if (!this.observer || this.isDestroyed) return;
    this.observer.unobserveMultiple(segments);
  }

  /**
   * 设置处理回调
   */
  setProcessingCallback(callback: LazyLoadingCallback): void {
    this.processingCallback = callback;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: LazyLoadingConfig): void {
    if (this.isDestroyed) return;

    const oldEnabled = this.config.enabled;
    this.config = { ...newConfig };

    // 如果启用状态发生变化
    if (oldEnabled !== newConfig.enabled) {
      this.state.enabled = newConfig.enabled;
      if (!newConfig.enabled) {
        this.stopAllObservation();
      }
    }

    // 如果观察器配置发生变化，重新创建观察器
    if (this.state.initialized && this.observer) {
      this.createObserver();
    }
  }

  /**
   * 停止所有观察
   */
  private stopAllObservation(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.state.processingQueue.clear();
    this.state.segmentCache.clear();
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  }

  // 基础状态查询方法
  isEnabled(): boolean {
    return this.state.initialized && this.state.enabled;
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }

  getConfig(): Readonly<LazyLoadingConfig> {
    return { ...this.config };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.stopAllObservation();
    if (this.observer) {
      this.observer.destroy();
      this.observer = null;
    }
  }
}

/**
 * 智能段落观察器 - 用于懒加载
 */

import { ContentSegment } from '../../processing/ProcessingStateManager';

/**
 * 观察器回调函数
 */
export type SegmentObserverCallback = (
  visibleSegments: ContentSegment[],
  invisibleSegments: ContentSegment[],
) => void;

/**
 * 观察器配置选项
 */
export interface SegmentObserverOptions {
  /** 预加载距离百分比 */
  preloadDistance?: number;
}

/**
 * 智能段落观察器
 * 基于 IntersectionObserver 实现懒加载功能
 */
export class SegmentObserver {
  private observer: IntersectionObserver | null = null;
  private segmentMap = new Map<Element, ContentSegment>();
  private callback: SegmentObserverCallback;
  private options: SegmentObserverOptions;
  private isDestroyed = false;

  constructor(
    callback: SegmentObserverCallback,
    options: SegmentObserverOptions = {},
  ) {
    this.callback = callback;
    this.options = options;
    this.initializeObserver();
  }

  /**
   * 初始化观察器
   */
  private initializeObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    try {
      const preloadDistance = this.options.preloadDistance || 0.5;
      const marginPercent = Math.round(preloadDistance * 100);

      const observerOptions: IntersectionObserverInit = {
        rootMargin: `${marginPercent}% 0px ${marginPercent}% 0px`,
        threshold: 0.1,
        root: null,
      };

      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        observerOptions,
      );
    } catch (error) {
      console.error('[SegmentObserver] 创建观察器失败:', error);
    }
  }

  /**
   * 处理交集变化
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    if (this.isDestroyed || !this.observer) return;

    const visibleSegments: ContentSegment[] = [];
    const invisibleSegments: ContentSegment[] = [];

    entries.forEach((entry) => {
      const segment = this.segmentMap.get(entry.target);
      if (!segment) return;

      if (entry.isIntersecting) {
        visibleSegments.push(segment);
      } else {
        invisibleSegments.push(segment);
      }
    });

    if (visibleSegments.length > 0 || invisibleSegments.length > 0) {
      try {
        this.callback(visibleSegments, invisibleSegments);
      } catch (error) {
        console.error('[SegmentObserver] 回调执行失败:', error);
      }
    }
  }

  /**
   * 观察段落
   */
  observe(segment: ContentSegment): void {
    if (this.isDestroyed || !this.observer) return;

    const targetElement = segment.element;
    if (!targetElement || !(targetElement instanceof Element)) {
      return;
    }

    try {
      this.segmentMap.set(targetElement, segment);
      this.observer.observe(targetElement);
    } catch (error) {
      console.error('[SegmentObserver] 观察段落失败:', error);
    }
  }

  /**
   * 停止观察段落
   */
  unobserve(segment: ContentSegment): void {
    if (this.isDestroyed || !this.observer) return;

    const targetElement = segment.element;
    if (!targetElement || !(targetElement instanceof Element)) return;

    try {
      this.observer.unobserve(targetElement);
      this.segmentMap.delete(targetElement);
    } catch (error) {
      console.error('[SegmentObserver] 停止观察失败:', error);
    }
  }

  /**
   * 批量观察段落
   */
  observeMultiple(segments: ContentSegment[]): void {
    segments.forEach((segment) => this.observe(segment));
  }

  /**
   * 批量停止观察段落
   */
  unobserveMultiple(segments: ContentSegment[]): void {
    segments.forEach((segment) => this.unobserve(segment));
  }

  /**
   * 更新观察器配置
   */
  updateOptions(newOptions: SegmentObserverOptions): void {
    if (this.isDestroyed) return;

    this.options = { ...this.options, ...newOptions };
    this.disconnect();
    this.initializeObserver();

    const segments = Array.from(this.segmentMap.values());
    this.segmentMap.clear();
    segments.forEach((segment) => this.observe(segment));
  }

  /**
   * 断开所有观察
   */
  disconnect(): void {
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (error) {
        console.error('[SegmentObserver] 断开观察器失败:', error);
      }
    }
    this.segmentMap.clear();
  }

  /**
   * 销毁观察器
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.disconnect();
    this.observer = null;
  }

  // 状态查询方法
  getObservedCount(): number {
    return this.segmentMap.size;
  }

  isObserving(segment: ContentSegment): boolean {
    return this.segmentMap.has(segment.element);
  }

  getObservedSegments(): ContentSegment[] {
    return Array.from(this.segmentMap.values());
  }

  static isSupported(): boolean {
    return typeof IntersectionObserver !== 'undefined';
  }
}

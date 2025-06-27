/**
 * 全局处理状态管理器
 * 负责统一管理所有文本处理状态，防止重复处理，确保系统的一致性
 */

export interface ProcessedContentInfo {
  /** 内容指纹 */
  fingerprint: string;
  /** 处理时间戳 */
  timestamp: number;
  /** DOM路径 */
  domPath: string;
  /** 处理结果摘要 */
  processingResult: {
    replacementCount: number;
    success: boolean;
  };
}

export interface ContentSegment {
  /** 段落唯一标识 */
  id: string;
  /** 文本内容 */
  textContent: string;
  /** 对应的DOM元素 */
  element: Element;
  /** 所有相关的DOM元素（用于合并段落） */
  elements: Element[];
  /** 文本节点列表 */
  textNodes: Text[];
  /** 内容指纹 */
  fingerprint: string;
  /** DOM上下文路径 */
  domPath: string;
}

/**
 * 全局处理状态管理器
 *
 * 核心职责：
 * 1. 跟踪所有已处理的内容，防止重复处理
 * 2. 管理正在处理的内容，避免并发冲突
 * 3. 提供内容指纹生成和验证机制
 * 4. 实现处理状态的生命周期管理
 */
export class ProcessingStateManager {
  /** 已处理内容映射表 */
  private processedContent = new Map<string, ProcessedContentInfo>();

  /** 正在处理中的内容集合 */
  private activeProcessing = new Set<string>();

  /** 处理状态清理定时器 */
  private cleanupTimer: number | null = null;

  /** 清理间隔（2小时） */
  private readonly CLEANUP_INTERVAL = 2 * 60 * 60 * 1000;

  /** 内容有效期（4小时） */
  private readonly CONTENT_TTL = 4 * 60 * 60 * 1000;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 生成内容指纹
   * 基于文本内容和DOM上下文生成唯一标识
   * 对动态内容增加时间戳因子避免冲突
   */
  generateContentFingerprint(textContent: string, domPath: string): string {
    const normalizedText = textContent.trim().replace(/\s+/g, ' ');

    // 规范化DOM路径，移除不稳定的nth-child选择器末尾部分
    const normalizedDomPath = domPath
      .replace(/:nth-child\(\d+\)/g, '') // 移除nth-child选择器
      .replace(/\s+>\s+/g, ' > ') // 规范化空格
      .replace(/\.+/g, '.') // 合并连续的点
      .replace(/\s+/g, ' ')
      .trim();

    // 对于较短的内容或动态加载的内容，添加时间戳避免冲突
    const isDynamic = normalizedText.length < 100;
    const timeComponent = isDynamic ? Math.floor(Date.now() / 30000) : 0; // 30秒时间窗口

    // 使用文本长度和内容摘要作为主要标识
    const textSignature =
      normalizedText.length > 50
        ? normalizedText.substring(0, 25) +
          normalizedText.substring(normalizedText.length - 25)
        : normalizedText;

    const combinedString = `${textSignature}|${normalizedDomPath}|${normalizedText.length}|${timeComponent}`;

    // 使用简单但有效的哈希算法
    let hash = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * 生成DOM路径
   * 为元素生成唯一的DOM路径标识
   */
  generateDomPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      // 添加ID（优先使用ID，因为更稳定）
      if (current.id && !current.id.startsWith('wxt-')) {
        selector += '#' + current.id;
        path.unshift(selector);
        break; // ID是唯一的，可以停止向上查找
      }

      // 添加类名（如果有且不是处理相关的类）
      const classList = Array.from(current.classList)
        .filter((cls) => !cls.startsWith('wxt-'))
        .slice(0, 2); // 限制类名数量

      if (classList.length > 0) {
        selector += '.' + classList.join('.');
      }

      // 只在必要时添加位置信息（当有多个相同选择器的兄弟元素）
      const siblings = current.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const sameTypeElements = Array.from(siblings).filter(
          (sibling) => sibling.tagName === current!.tagName,
        );
        if (sameTypeElements.length > 1) {
          const index = sameTypeElements.indexOf(current);
          if (index > 0) {
            selector += `:nth-of-type(${index + 1})`;
          }
        }
      }

      path.unshift(selector);
      current = current.parentElement;

      // 限制路径深度，避免过长的路径
      if (path.length >= 5) {
        break;
      }
    }

    return path.join(' > ');
  }

  /**
   * 检查内容是否已被处理
   */
  isContentProcessed(fingerprint: string): boolean {
    const info = this.processedContent.get(fingerprint);
    if (!info) return false;

    // 检查是否过期
    const now = Date.now();
    if (now - info.timestamp > this.CONTENT_TTL) {
      this.processedContent.delete(fingerprint);
      return false;
    }

    return true;
  }

  /**
   * 检查内容是否正在处理中
   */
  isContentProcessing(fingerprint: string): boolean {
    return this.activeProcessing.has(fingerprint);
  }

  /**
   * 标记内容开始处理
   */
  markProcessingStart(fingerprint: string): boolean {
    if (
      this.isContentProcessed(fingerprint) ||
      this.isContentProcessing(fingerprint)
    ) {
      return false; // 已处理或正在处理中
    }

    this.activeProcessing.add(fingerprint);
    return true;
  }

  /**
   * 标记内容处理完成
   */
  markProcessingComplete(
    fingerprint: string,
    domPath: string,
    replacementCount: number,
    success: boolean = true,
  ): void {
    // 移除处理中标记
    this.activeProcessing.delete(fingerprint);

    // 添加到已处理列表
    this.processedContent.set(fingerprint, {
      fingerprint,
      timestamp: Date.now(),
      domPath,
      processingResult: {
        replacementCount,
        success,
      },
    });
  }

  /**
   * 标记内容处理失败
   */
  markProcessingFailed(fingerprint: string, domPath: string): void {
    this.markProcessingComplete(fingerprint, domPath, 0, false);
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats(): {
    processedCount: number;
    activeCount: number;
    successRate: number;
    totalReplacements: number;
  } {
    const processed = Array.from(this.processedContent.values());
    const successful = processed.filter(
      (info) => info.processingResult.success,
    );
    const totalReplacements = processed.reduce(
      (sum, info) => sum + info.processingResult.replacementCount,
      0,
    );

    return {
      processedCount: processed.length,
      activeCount: this.activeProcessing.size,
      successRate:
        processed.length > 0 ? successful.length / processed.length : 0,
      totalReplacements,
    };
  }

  /**
   * 清理过期的处理状态
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [fingerprint, info] of this.processedContent.entries()) {
      if (now - info.timestamp > this.CONTENT_TTL) {
        expired.push(fingerprint);
      }
    }

    expired.forEach((fingerprint) => {
      this.processedContent.delete(fingerprint);
    });

    // 静默清理过期状态
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 手动触发清理
   */
  forceCleanup(): void {
    this.cleanup();
  }

  /**
   * 重置所有状态（用于测试或紧急情况）
   */
  reset(): void {
    this.processedContent.clear();
    this.activeProcessing.clear();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.reset();
  }
}

// 全局单例实例
export const globalProcessingState = new ProcessingStateManager();

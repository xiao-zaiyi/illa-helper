/**
 * 处理协调器
 * 负责协调所有文本处理请求，确保原子性处理和无重复处理
 */

import {
  ContentSegment,
  globalProcessingState,
} from './ProcessingStateManager';
import {
  OriginalWordDisplayMode,
  TranslationPosition,
} from '../shared/types/core';

/**
 * 处理结果接口
 */
export interface ProcessingResult {
  /** 是否成功 */
  success: boolean;
  /** 替换数量 */
  replacementCount: number;
  /** 处理的段落数量 */
  segmentCount: number;
  /** 跳过的段落数量（已处理或正在处理） */
  skippedCount: number;
  /** 错误信息 */
  error?: string;
  /** 处理耗时（毫秒） */
  duration: number;
}

/**
 * 段落处理结果
 */
interface SegmentProcessingResult {
  segment: ContentSegment;
  success: boolean;
  replacementCount: number;
  error?: string;
}

/**
 * 处理协调器
 *
 * 核心职责：
 * 1. 协调所有处理请求，确保无重复处理
 * 2. 实现原子性处理，避免并发冲突
 * 3. 提供统一的错误处理和回滚机制
 * 4. 监控处理性能和状态
 */
export class ProcessingCoordinator {
  /** 处理队列，防止并发冲突 */
  private processingQueue: Promise<any> = Promise.resolve();

  /** 发音服务 */
  private pronunciationService: any;

  /** 统计信息 */
  private stats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
    averageProcessingTime: 0,
  };

  constructor(pronunciationService?: any) {
    this.pronunciationService = pronunciationService;
  }

  /**
   * 处理内容段落列表
   * 主要入口方法，确保所有段落按顺序处理
   */
  async processSegments(
    segments: ContentSegment[],
    textReplacer: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    // 将处理请求加入队列，确保串行处理
    return (this.processingQueue = this.processingQueue.then(async () => {
      return this.doProcessSegments(
        segments,
        textReplacer,
        originalWordDisplayMode,
        translationPosition,
        showParentheses,
        startTime,
      );
    }));
  }

  /**
   * 实际的段落处理逻辑
   */
  private async doProcessSegments(
    segments: ContentSegment[],
    textReplacer: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
    startTime: number,
  ): Promise<ProcessingResult> {
    let processedCount = 0;
    let skippedCount = 0;
    let totalReplacements = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 过滤已处理和正在处理的段落
    const segmentsToProcess = segments.filter((segment) => {
      const isProcessed = globalProcessingState.isContentProcessed(
        segment.fingerprint,
      );
      const isProcessing = globalProcessingState.isContentProcessing(
        segment.fingerprint,
      );

      if (isProcessed || isProcessing) {
        skippedCount++;
        return false;
      }

      return true;
    });

    // 批量标记开始处理
    const successfullyMarked = segmentsToProcess.filter((segment) =>
      globalProcessingState.markProcessingStart(segment.fingerprint),
    );

    try {
      // 并行处理段落（但要控制并发数）
      const batchSize = 8; // 控制并发数，避免过载
      const results: SegmentProcessingResult[] = [];

      for (let i = 0; i < successfullyMarked.length; i += batchSize) {
        const batch = successfullyMarked.slice(i, i + batchSize);
        const batchPromises = batch.map((segment) =>
          this.processSingleSegment(
            segment,
            textReplacer,
            originalWordDisplayMode,
            translationPosition,
            showParentheses,
          ),
        );
        const batchResults = await Promise.allSettled(batchPromises);

        // 处理批次结果
        batchResults.forEach((result, index) => {
          const segment = batch[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const error = result.reason;
            results.push({
              segment,
              success: false,
              replacementCount: 0,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }

      // 统计结果
      results.forEach((result) => {
        if (result.success) {
          processedCount++;
          totalReplacements += result.replacementCount;

          // 标记处理完成
          globalProcessingState.markProcessingComplete(
            result.segment.fingerprint,
            result.segment.domPath,
            result.replacementCount,
            true,
          );
        } else {
          errorCount++;
          errors.push(result.error || '未知错误');

          // 标记处理失败
          globalProcessingState.markProcessingFailed(
            result.segment.fingerprint,
            result.segment.domPath,
          );
        }
      });
    } catch (globalError) {
      // 清理所有标记
      successfullyMarked.forEach((segment) => {
        globalProcessingState.markProcessingFailed(
          segment.fingerprint,
          segment.domPath,
        );
      });

      const duration = Date.now() - startTime;
      return {
        success: false,
        replacementCount: 0,
        segmentCount: 0,
        skippedCount,
        error:
          globalError instanceof Error
            ? globalError.message
            : String(globalError),
        duration,
      };
    }

    const duration = Date.now() - startTime;

    // 更新统计信息
    this.updateStats(processedCount, skippedCount, errorCount, duration);

    return {
      success: errorCount === 0,
      replacementCount: totalReplacements,
      segmentCount: processedCount,
      skippedCount,
      error: errors.length > 0 ? errors[0] : undefined,
      duration,
    };
  }

  /**
   * 处理单个段落
   */
  private async processSingleSegment(
    segment: ContentSegment,
    textReplacer: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): Promise<SegmentProcessingResult> {
    try {
      // 为所有相关元素添加处理中的视觉反馈
      segment.elements.forEach((element) => {
        this.addProcessingFeedback(element);
      });

      // 调用文本替换器进行处理
      const result = await textReplacer.replaceText(segment.textContent);

      if (result && result.replacements && result.replacements.length > 0) {
        // 应用替换到DOM
        this.applyReplacements(
          segment,
          result.replacements,
          textReplacer.styleManager,
          originalWordDisplayMode,
          translationPosition,
          showParentheses,
        );

        // 立即为该段落的翻译内容添加发音功能
        if (this.pronunciationService) {
          setTimeout(() => {
            this.addPronunciationToSegment(segment);
          }, 0);
        }

        // 标记文本节点为已处理
        this.markTextNodesProcessed(segment.textNodes);

        return {
          segment,
          success: true,
          replacementCount: result.replacements.length,
        };
      } else {
        // 没有替换但处理成功
        this.markTextNodesProcessed(segment.textNodes);

        return {
          segment,
          success: true,
          replacementCount: 0,
        };
      }
    } catch (error) {
      return {
        segment,
        success: false,
        replacementCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // 为所有相关元素移除处理中的视觉反馈
      segment.elements.forEach((element) => {
        this.removeProcessingFeedback(element);
      });
    }
  }

  /**
   * 应用替换到DOM
   */
  private applyReplacements(
    segment: ContentSegment,
    replacements: any[],
    styleManager: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): void {
    // 重新构建文本内容以确保一致性
    const reconstructedText = segment.textNodes
      .map((node) => node.textContent || '')
      .join('');

    // 预验证：检查所有替换项的位置是否准确
    const validReplacements = replacements.filter((replacement) => {
      if (!replacement.position) {
        return false;
      }

      // 验证位置与实际文本内容的匹配（使用重构的文本）
      const { start, end } = replacement.position;
      const expectedText = replacement.original;
      const actualText = reconstructedText.substring(start, end);

      if (expectedText !== actualText) {
        // 尝试重新定位
        const correctIndex = reconstructedText.indexOf(expectedText);
        if (correctIndex !== -1) {
          replacement.position = {
            start: correctIndex,
            end: correctIndex + expectedText.length,
          };
          return true;
        }
        return false;
      }
      return true;
    });

    // 对验证通过的替换项按位置倒序处理（避免位置偏移影响）
    const sortedReplacements = validReplacements.sort(
      (a, b) => b.position.start - a.position.start,
    );

    for (const replacement of sortedReplacements) {
      const range = this.findRangeInTextNodes(
        segment.textNodes,
        replacement.position.start,
        replacement.position.end,
      );

      if (range) {
        this.applyReplacementToRange(
          range,
          replacement,
          styleManager,
          originalWordDisplayMode,
          translationPosition,
          showParentheses,
        );
      }
    }
  }

  /**
   * 在文本节点中查找范围
   */
  private findRangeInTextNodes(
    textNodes: Text[],
    start: number,
    end: number,
  ): Range | null {
    let charCount = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;

    // 构建完整文本内容用于验证
    const fullText = textNodes.map((node) => node.textContent || '').join('');

    // 验证位置边界
    if (start < 0 || end > fullText.length || start >= end) {
      return null;
    }

    for (const node of textNodes) {
      const nodeLength = node.textContent?.length || 0;

      if (startNode === null && charCount + nodeLength >= start) {
        startNode = node;
        startOffset = start - charCount;
      }

      if (endNode === null && charCount + nodeLength >= end) {
        endNode = node;
        endOffset = end - charCount;
      }

      if (startNode && endNode) break;
      charCount += nodeLength;
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      // 验证范围内容与预期是否匹配
      const extractedText = range.toString();
      const expectedText = fullText.substring(start, end);

      if (extractedText !== expectedText) {
        return null;
      }

      return range;
    }

    return null;
  }

  /**
   * 应用单个替换到范围
   */
  private applyReplacementToRange(
    range: Range,
    replacement: any,
    styleManager: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): void {
    try {
      const originalWordWrapper = document.createElement('span');
      originalWordWrapper.className = 'wxt-original-word';
      originalWordWrapper.textContent = range.toString();

      const translationSpan = document.createElement('span');
      translationSpan.className = `wxt-translation-term ${styleManager.getCurrentStyleClass()}`;

      // 根据新设置决定是否添加括号
      if (showParentheses) {
        translationSpan.textContent = ` (${replacement.translation}) `;
      } else {
        translationSpan.textContent = ` ${replacement.translation} `;
      }

      // 应用显示模式
      switch (originalWordDisplayMode) {
        case OriginalWordDisplayMode.HIDDEN:
          originalWordWrapper.style.display = 'none';
          break;
        case OriginalWordDisplayMode.LEARNING:
          originalWordWrapper.classList.add('wxt-original-word--learning');
          break;
      }

      // 插入替换元素
      range.surroundContents(originalWordWrapper);
      if (translationPosition === TranslationPosition.BEFORE) {
        originalWordWrapper.before(translationSpan);
      } else {
        originalWordWrapper.after(translationSpan);
      }

      // 添加视觉效果
      this.addGlowEffect(translationSpan);

      // 标记为已处理
      originalWordWrapper.setAttribute('data-wxt-word-processed', 'true');
    } catch (_) {
      // 静默处理错误
    }
  }

  /**
   * 标记文本节点为已处理
   */
  private markTextNodesProcessed(textNodes: Text[]): void {
    const timestamp = Date.now().toString();
    textNodes.forEach((node) => {
      if (node.parentElement) {
        node.parentElement.setAttribute('data-wxt-text-processed', 'true');
        node.parentElement.setAttribute('data-wxt-processed-time', timestamp);
      }
    });
  }

  /**
   * 添加处理中的视觉反馈
   */
  private addProcessingFeedback(element: Element): void {
    element.classList.add('wxt-processing');
  }

  /**
   * 移除处理中的视觉反馈
   */
  private removeProcessingFeedback(element: Element): void {
    element.classList.remove('wxt-processing');
  }

  /**
   * 添加发光效果
   */
  private addGlowEffect(element: Element): void {
    element.classList.add('wxt-glow');
    setTimeout(() => {
      element.classList.remove('wxt-glow');
    }, 800);
  }

  /**
   * 更新统计信息
   */
  private updateStats(
    processed: number,
    skipped: number,
    errors: number,
    duration: number,
  ): void {
    this.stats.totalProcessed += processed;
    this.stats.totalSkipped += skipped;
    this.stats.totalErrors += errors;

    // 更新平均处理时间
    const totalOperations = this.stats.totalProcessed + this.stats.totalErrors;
    if (totalOperations > 0) {
      this.stats.averageProcessingTime =
        (this.stats.averageProcessingTime *
          (totalOperations - processed - errors) +
          duration) /
        totalOperations;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      totalSkipped: 0,
      totalErrors: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * 等待所有处理完成
   */
  async waitForCompletion(): Promise<void> {
    await this.processingQueue;
  }

  /**
   * 为单个段落的翻译内容添加发音功能
   * @param segment 内容段落
   */
  private async addPronunciationToSegment(
    segment: ContentSegment,
  ): Promise<void> {
    if (!this.pronunciationService) return;

    try {
      // 在所有相关元素中查找翻译元素
      const allTranslationElements: Element[] = [];

      for (const element of segment.elements) {
        const translationElements = element.querySelectorAll
          ? element.querySelectorAll(
              '.wxt-translation-term:not([data-pronunciation-added])',
            )
          : [];
        allTranslationElements.push(...Array.from(translationElements));
      }

      for (const element of allTranslationElements) {
        const translationText = element.textContent;
        if (translationText) {
          // 提取纯英文内容（去除括号）
          const cleanText = translationText.replace(/[()]/g, '').trim();

          // 检查是否为英文文本（支持常见标点符号和数字）
          if (
            /^[a-zA-Z0-9\s\-',.!?;:()%]+$/.test(cleanText) &&
            cleanText.length > 0
          ) {
            await this.pronunciationService.addPronunciationToElement(
              element as HTMLElement,
              cleanText,
            );

            // 标记已添加发音功能
            element.setAttribute('data-pronunciation-added', 'true');
          }
        }
      }
    } catch (_) {
      // 静默处理错误
    }
  }
}

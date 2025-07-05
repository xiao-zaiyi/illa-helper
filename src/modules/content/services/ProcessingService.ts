import { UserSettings } from '@/src/modules/shared/types';
import { TextProcessorService } from '@/src/modules/core/translation/TextProcessorService';
import { TextReplacerService } from '@/src/modules/core/translation/TextReplacerService';
import { LazyLoadingService } from './LazyLoadingService';
import { IProcessingService, ProcessingParams } from '../types';
import { ContentSegment } from '../../processing/ProcessingStateManager';
import { ProcessingCoordinator } from '../../processing/ProcessingCoordinator';

/**
 * 页面处理服务 - 负责页面翻译处理逻辑
 */
export class ProcessingService implements IProcessingService {
  private textProcessor: TextProcessorService;
  private textReplacer: TextReplacerService;
  private lazyLoadingService?: LazyLoadingService;
  private processingParams!: ProcessingParams;

  constructor(
    textProcessor: TextProcessorService,
    textReplacer: TextReplacerService,
    settings: UserSettings,
    lazyLoadingService?: LazyLoadingService,
  ) {
    this.textProcessor = textProcessor;
    this.textReplacer = textReplacer;
    this.lazyLoadingService = lazyLoadingService;
    this.updateProcessingParams(settings);

    // 设置懒加载回调
    if (this.lazyLoadingService) {
      this.lazyLoadingService.setProcessingCallback(
        this.processSegmentsLazy.bind(this),
      );
    }
  }

  /**
   * 处理页面内容
   */
  async processPage(): Promise<void> {
    try {
      if (this.lazyLoadingService?.isEnabled()) {
        await this.processPageWithLazyLoading();
      } else {
        await this.processPageImmediate();
      }
    } catch (error) {
      console.error('[ProcessingService] 页面处理失败:', error);
    }
  }

  /**
   * 立即处理整个页面
   */
  private async processPageImmediate(): Promise<void> {
    await this.textProcessor.processRoot(
      document.body,
      this.textReplacer,
      this.processingParams.originalWordDisplayMode,
      this.processingParams.maxLength,
      this.processingParams.translationPosition,
      this.processingParams.showParentheses,
    );
  }

  /**
   * 懒加载模式处理页面
   */
  private async processPageWithLazyLoading(): Promise<void> {
    const segments = await this.getPageSegments();
    if (segments.length === 0) return;

    this.lazyLoadingService!.setProcessingCallback(
      this.processSegmentsLazy.bind(this),
    );
    this.lazyLoadingService!.observeSegments(segments);
  }

  /**
   * 获取页面段落
   */
  private async getPageSegments(): Promise<ContentSegment[]> {
    try {
      const { ContentSegmenter } = await import(
        '../../processing/ContentSegmenter'
      );
      const contentSegmenter = new ContentSegmenter({
        maxSegmentLength: this.processingParams.maxLength || 400,
        minSegmentLength: 20,
        enableSmartBoundary: true,
        mergeSmallSegments: true,
      });

      return contentSegmenter.segmentContent(document.body);
    } catch (error) {
      console.error('[ProcessingService] 获取页面段落失败:', error);
      return [];
    }
  }

  /**
   * 懒加载段落处理
   */
  async processSegmentsLazy(segments: ContentSegment[]): Promise<void> {
    try {
      await this.processBatchSegments(segments);
    } catch (error) {
      console.error('[ProcessingService] 懒加载段落处理失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理段落
   */
  private async processBatchSegments(
    segments: ContentSegment[],
  ): Promise<void> {
    try {
      // 获取发音服务实例以支持懒加载模式下的发音功能
      const pronunciationService = this.textProcessor.getPronunciationService();
      const coordinator = new ProcessingCoordinator(pronunciationService);

      await coordinator.processSegments(
        segments,
        this.textReplacer,
        this.processingParams.originalWordDisplayMode,
        this.processingParams.translationPosition,
        this.processingParams.showParentheses,
        true, // 懒加载模式
      );
    } catch (error) {
      console.error('[ProcessingService] 批量处理段落失败:', error);
      // 降级到单个处理
      for (const segment of segments) {
        await this.processSegment(segment);
      }
    }
  }

  /**
   * 处理单个段落
   */
  private async processSegment(segment: ContentSegment): Promise<void> {
    try {
      await this.textProcessor.processRoot(
        segment.element,
        this.textReplacer,
        this.processingParams.originalWordDisplayMode,
        this.processingParams.maxLength,
        this.processingParams.translationPosition,
        this.processingParams.showParentheses,
      );
    } catch (error) {
      console.error('[ProcessingService] 处理段落失败:', error, segment);
    }
  }

  /**
   * 处理指定节点
   */
  async processNode(node: Node): Promise<void> {
    try {
      await this.textProcessor.processRoot(
        node,
        this.textReplacer,
        this.processingParams.originalWordDisplayMode,
        this.processingParams.maxLength,
        this.processingParams.translationPosition,
        this.processingParams.showParentheses,
      );
    } catch (error) {
      console.error('[ProcessingService] 节点处理失败:', error);
    }
  }

  /**
   * 更新设置
   */
  updateSettings(settings: UserSettings): void {
    this.updateProcessingParams(settings);

    const activeConfig = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );
    if (activeConfig) {
      this.textProcessor.updateApiConfig(activeConfig.config);
    }

    if (this.lazyLoadingService) {
      this.lazyLoadingService.updateConfig(settings.lazyLoading);
    }
  }

  private updateProcessingParams(settings: UserSettings): void {
    this.processingParams = {
      originalWordDisplayMode: settings.originalWordDisplayMode,
      maxLength: settings.maxLength,
      translationPosition: settings.translationPosition,
      showParentheses: settings.showParentheses,
    };
  }

  // 状态查询方法
  getProcessingParams(): ProcessingParams {
    return { ...this.processingParams };
  }

  getLazyLoadingService(): LazyLoadingService | undefined {
    return this.lazyLoadingService;
  }

  isLazyLoadingEnabled(): boolean {
    return this.lazyLoadingService?.isEnabled() || false;
  }

  destroy(): void {
    if (this.lazyLoadingService) {
      this.lazyLoadingService.destroy();
    }
  }
}

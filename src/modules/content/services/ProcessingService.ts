import { UserSettings } from '@/src/modules/shared/types';
import { TextProcessorService } from '@/src/modules/core/translation/TextProcessorService';
import { TextReplacerService } from '@/src/modules/core/translation/TextReplacerService';
import { IProcessingService, ProcessingParams } from '../types';

/**
 * 页面处理服务 - 负责页面翻译处理逻辑
 */
export class ProcessingService implements IProcessingService {
  private textProcessor: TextProcessorService;
  private textReplacer: TextReplacerService;
  private processingParams!: ProcessingParams;

  constructor(
    textProcessor: TextProcessorService,
    textReplacer: TextReplacerService,
    settings: UserSettings,
  ) {
    this.textProcessor = textProcessor;
    this.textReplacer = textReplacer;
    this.updateProcessingParams(settings);
  }

  /**
   * 处理整个页面或其动态加载的部分
   */
  async processPage(): Promise<void> {
    try {
      await this.textProcessor.processRoot(
        document.body,
        this.textReplacer,
        this.processingParams.originalWordDisplayMode,
        this.processingParams.maxLength,
        this.processingParams.translationPosition,
        this.processingParams.showParentheses,
      );
    } catch (error) {
      console.error('[ProcessingService] 页面处理失败:', error);
      throw error;
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
      // 静默处理单个节点的错误，避免影响整体处理流程
    }
  }

  /**
   * 更新设置
   */
  updateSettings(settings: UserSettings): void {
    this.updateProcessingParams(settings);

    // 更新API配置
    const activeConfig = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );
    if (activeConfig) {
      this.textProcessor.updateApiConfig(activeConfig.config);
    }
  }

  /**
   * 获取当前处理参数
   */
  getProcessingParams(): ProcessingParams {
    return { ...this.processingParams };
  }

  /**
   * 更新处理参数
   */
  private updateProcessingParams(settings: UserSettings): void {
    this.processingParams = {
      originalWordDisplayMode: settings.originalWordDisplayMode,
      maxLength: settings.maxLength,
      translationPosition: settings.translationPosition,
      showParentheses: settings.showParentheses,
    };
  }
}

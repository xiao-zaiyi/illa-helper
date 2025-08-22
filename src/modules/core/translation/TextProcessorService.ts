/**
 * 文本处理服务
 * 负责遍历DOM，提取文本节点，并进行处理
 */

import {
  OriginalWordDisplayMode,
  TranslationPosition,
} from '../../shared/types/core';
import { ApiConfig } from '../../shared/types/api';
import { PronunciationService } from '../../pronunciation/services/PronunciationService';
import { DEFAULT_PRONUNCIATION_CONFIG } from '../../pronunciation/config';
import { ContentSegmenter } from '../../processing/ContentSegmenter';
import { ProcessingCoordinator } from '../../processing/ProcessingCoordinator';
import { globalProcessingState } from '../../processing/ProcessingStateManager';

// 内容分段配置
export interface SegmentConfig {
  maxSegmentLength: number;
  minSegmentLength: number;
  enableSmartBoundary: boolean;
  mergeSmallSegments: boolean;
}

// 处理统计信息
export interface ProcessingStats {
  coordinator: any; // 协调器统计
  global: any; // 全局统计
}

// 文本处理服务配置
export interface TextProcessorConfig {
  enablePronunciationTooltip?: boolean;
  apiConfig?: ApiConfig;
  segmentConfig?: Partial<SegmentConfig>;
}

/**
 * 文本处理服务类
 * 采用单例模式，提供统一的DOM文本处理功能
 */
export class TextProcessorService {
  // 单例实例
  private static instance: TextProcessorService | null = null;

  // 服务组件
  private pronunciationService!: PronunciationService;
  private contentSegmenter!: ContentSegmenter;
  private processingCoordinator!: ProcessingCoordinator;
  private config: TextProcessorConfig;

  /**
   * 私有构造函数，确保单例模式
   */
  private constructor(config: TextProcessorConfig = {}) {
    this.config = {
      enablePronunciationTooltip: true,
      ...config,
    };

    this.initializeServices();
    this.injectGlowStyle();
  }

  /**
   * 获取服务实例（单例模式）
   */
  public static getInstance(
    config?: TextProcessorConfig,
  ): TextProcessorService {
    if (!TextProcessorService.instance) {
      TextProcessorService.instance = new TextProcessorService(config);
    }
    return TextProcessorService.instance;
  }

  /**
   * 重置服务实例（主要用于测试）
   */
  public static resetInstance(): void {
    TextProcessorService.instance = null;
  }

  /**
   * 初始化服务组件
   */
  private initializeServices(): void {
    // 创建发音服务配置
    const pronunciationConfig = {
      ...DEFAULT_PRONUNCIATION_CONFIG,
      uiConfig: {
        ...DEFAULT_PRONUNCIATION_CONFIG.uiConfig,
        tooltipEnabled: this.config.enablePronunciationTooltip ?? true,
      },
    };

    // 初始化各个服务组件
    this.pronunciationService = new PronunciationService(
      pronunciationConfig,
      this.config.apiConfig,
    );
    this.contentSegmenter = new ContentSegmenter();
    this.processingCoordinator = new ProcessingCoordinator(
      this.pronunciationService,
    );
  }

  /**
   * 注入样式
   * 为文本处理添加必要的CSS样式
   */
  private injectGlowStyle(): void {
    if ((window as any).wxtGlowStyleInjected) return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes wxt-glow-animation {
        from {
          background-color: rgba(106, 136, 224, 0.3);
          box-shadow: 0 0 8px rgba(106, 136, 224, 0.5);
        }
        to {
          background-color: transparent;
          box-shadow: 0 0 0 transparent;
        }
      }
      .wxt-glow {
        animation: wxt-glow-animation 0.8s ease-out;
        border-radius: 3px;
      }
      .wxt-original-word--learning {
        filter: blur(5px);
        cursor: pointer;
        transition: filter 0.2s ease-in-out;
      }

      .wxt-original-word--learning:hover {
        filter: blur(0) !important;
      }

      /* 增强a标签内学习模式的悬停支持 */
      a .wxt-original-word--learning:hover,
      a:hover .wxt-original-word--learning {
        filter: blur(0) !important;
      }

      /* 音标错误提示样式 */
      .wxt-phonetic-error {
        font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
        font-size: 13px;
        color: #ff9999;
        font-style: italic;
        font-weight: 500;
        background: linear-gradient(135deg, rgba(255, 153, 153, 0.1) 0%, rgba(255, 153, 153, 0.05) 100%);
        padding: 4px 8px;
        border-radius: 6px;
        display: inline-block;
        border: 1px solid rgba(255, 153, 153, 0.3);
        letter-spacing: 0.02em;
        opacity: 0.8;
      }

      /* 嵌套单词悬浮框标题行布局 */
      .wxt-word-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .wxt-word-title-row .wxt-word-main {
        flex: 1;
      }

      .wxt-word-title-row .wxt-accent-buttons {
        flex-shrink: 0;
      }
      @keyframes wxt-processing-animation {
        0% {
          background-color: rgba(106, 136, 224, 0.1);
        }
        50% {
          background-color: rgba(106, 136, 224, 0.3);
        }
        100% {
          background-color: rgba(106, 136, 224, 0.1);
        }
      }
      .wxt-processing {
        animation: wxt-processing-animation 2s infinite ease-in-out;
        border-radius: 3px;
        transition: background-color 0.3s ease-out;
        pointer-events: none !important;
      }
      
      /* 确保链接元素在处理状态下仍然可以点击 */
      a.wxt-processing,
      a.wxt-processing *,
      .wxt-processing a,
      .wxt-processing a * {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      
      /* 确保按钮元素在处理状态下仍然可以点击 */
      button.wxt-processing,
      button.wxt-processing *,
      .wxt-processing button,
      .wxt-processing button * {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      
      /* 确保可点击元素在处理状态下仍然可以点击 */
      [onclick].wxt-processing,
      [onclick].wxt-processing *,
      .wxt-processing [onclick],
      .wxt-processing [onclick] * {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
    `;

    document.head.appendChild(style);
    (window as any).wxtGlowStyleInjected = true;
  }

  // =================================================================
  // 核心处理流程 (Core Processing Flow)
  // =================================================================

  /**
   * 处理根节点
   * 主要的文本处理入口，支持智能分段和统一处理
   * @param root 根节点
   * @param textReplacer 文本替换器
   * @param originalWordDisplayMode 原词显示模式
   * @param maxLength 最大处理长度
   * @param translationPosition 翻译位置
   * @param showParentheses 是否显示括号
   */
  public async processRoot(
    root: Node,
    textReplacer: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    maxLength: number = 400,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): Promise<void> {
    try {
      // 更新内容分段器配置
      this.updateSegmentConfig({
        maxSegmentLength: maxLength,
        minSegmentLength: 20,
        enableSmartBoundary: true,
        mergeSmallSegments: true,
      });

      // 使用智能分段器将根节点分割为内容段落
      const segments = this.contentSegmenter.segmentContent(root);
      if (segments.length === 0) {
        return;
      }

      // 使用处理协调器进行统一处理
      await this.processingCoordinator.processSegments(
        segments,
        textReplacer,
        originalWordDisplayMode,
        translationPosition,
        showParentheses,
        false, // isLazyLoading
      );
    } catch (error) {
      console.warn('文本处理过程中发生错误:', error);
      // 静默处理错误，确保不影响页面正常运行
    }
  }

  // =================================================================
  // 配置管理 (Configuration Management)
  // =================================================================

  /**
   * 更新服务配置
   * @param config 新的配置（部分更新）
   */
  public updateConfig(config: Partial<TextProcessorConfig>): void {
    this.config = { ...this.config, ...config };

    // 如果API配置变更，需要更新发音服务
    if (config.apiConfig) {
      this.updateApiConfig(config.apiConfig);
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): TextProcessorConfig {
    return { ...this.config };
  }

  /**
   * 更新分段配置
   * @param segmentConfig 分段配置
   */
  public updateSegmentConfig(segmentConfig: Partial<SegmentConfig>): void {
    this.contentSegmenter.updateConfig(segmentConfig);
  }

  /**
   * 更新API配置
   * 支持运行时API配置更新，配置变更会立即生效
   * @param apiConfig API配置
   */
  public updateApiConfig(apiConfig: ApiConfig): void {
    try {
      if (this.pronunciationService) {
        this.pronunciationService.updateApiConfig(apiConfig);
      }

      // 更新内部配置
      this.config.apiConfig = apiConfig;
    } catch (error) {
      console.warn('更新API配置时发生错误:', error);
    }
  }

  // =================================================================
  // 统计和监控 (Statistics & Monitoring)
  // =================================================================

  /**
   * 获取处理统计信息
   * @returns 处理统计数据
   */
  public getProcessingStats(): ProcessingStats {
    return {
      coordinator: this.processingCoordinator.getStats(),
      global: globalProcessingState.getProcessingStats(),
    };
  }

  /**
   * 重置处理统计信息
   */
  public resetStats(): void {
    this.processingCoordinator.resetStats();
    globalProcessingState.reset();
  }

  // =================================================================
  // 服务生命周期管理 (Service Lifecycle)
  // =================================================================

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    // 可以在这里添加异步初始化逻辑
    console.log('TextProcessorService 已初始化');
  }

  /**
   * 销毁服务资源
   */
  public dispose(): void {
    this.resetStats();
    // 清理其他资源
    console.log('TextProcessorService 资源已清理');
  }

  // =================================================================
  // 便利方法 (Utility Methods)
  // =================================================================

  /**
   * 检查服务是否就绪
   */
  public isReady(): boolean {
    return !!(
      this.pronunciationService &&
      this.contentSegmenter &&
      this.processingCoordinator
    );
  }

  /**
   * 获取服务状态
   */
  public getStatus(): {
    isReady: boolean;
    stats: ProcessingStats;
    config: TextProcessorConfig;
  } {
    return {
      isReady: this.isReady(),
      stats: this.getProcessingStats(),
      config: this.getConfig(),
    };
  }

  /**
   * 获取发音服务实例
   * @returns 发音服务实例
   */
  public getPronunciationService(): PronunciationService | undefined {
    return this.pronunciationService;
  }
}

// 导出服务实例获取器（简化外部使用）
export const getTextProcessorService = (config?: TextProcessorConfig) => {
  return TextProcessorService.getInstance(config);
};

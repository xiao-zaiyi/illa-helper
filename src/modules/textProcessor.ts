import {
  OriginalWordDisplayMode,
  ApiConfig,
  TranslationPosition,
} from './types';
import { PronunciationService } from './pronunciation/services/PronunciationService';
import { DEFAULT_PRONUNCIATION_CONFIG } from './pronunciation/config';
import { ContentSegmenter } from './processing/ContentSegmenter';
import { ProcessingCoordinator } from './processing/ProcessingCoordinator';
import { globalProcessingState } from './processing/ProcessingStateManager';

/**
 * 文本处理模块
 * 负责遍历DOM，提取文本节点，并进行处理
 */

// 文本节点处理器
export class TextProcessor {
  private pronunciationService: PronunciationService;
  private contentSegmenter: ContentSegmenter;
  private processingCoordinator: ProcessingCoordinator;

  constructor(
    enablePronunciationTooltip: boolean = true,
    apiConfig?: ApiConfig,
  ) {
    // 创建发音服务配置
    const pronunciationConfig = {
      ...DEFAULT_PRONUNCIATION_CONFIG,
      uiConfig: {
        ...DEFAULT_PRONUNCIATION_CONFIG.uiConfig,
        tooltipEnabled: enablePronunciationTooltip,
      },
    };

    this.pronunciationService = new PronunciationService(
      pronunciationConfig,
      apiConfig,
    );
    this.contentSegmenter = new ContentSegmenter();
    this.processingCoordinator = new ProcessingCoordinator(
      this.pronunciationService,
    );
    this.injectGlowStyle();
  }

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
      }
    `;
    document.head.appendChild(style);
    (window as any).wxtGlowStyleInjected = true;
  }

  // =================================================================
  // Section 1: 新的核心处理流程 (New Core Processing Flow)
  // =================================================================
  public async processRoot(
    root: Node,
    textReplacer: any,
    originalWordDisplayMode: OriginalWordDisplayMode,
    maxLength: number = 400,
    translationPosition: TranslationPosition,
    showParentheses: boolean,
  ): Promise<void> {
    try {
      // 第一步：更新内容分段器配置
      this.contentSegmenter.updateConfig({
        maxSegmentLength: maxLength,
        minSegmentLength: 20,
        enableSmartBoundary: true,
        mergeSmallSegments: true,
      });

      // 第二步：使用智能分段器将根节点分割为内容段落
      const segments = this.contentSegmenter.segmentContent(root);
      if (segments.length === 0) {
        return;
      }

      // 第三步：使用处理协调器进行统一处理
      // 发音功能现在会在每个段落处理完成后立即添加
      await this.processingCoordinator.processSegments(
        segments,
        textReplacer,
        originalWordDisplayMode,
        translationPosition,
        showParentheses,
      );
    } catch (_) {
      // 静默处理错误
    }
  }

  // =================================================================
  // Section 2: 配置管理和统计 (Configuration & Statistics)
  // =================================================================

  /**
   * 更新API配置
   * 支持运行时API配置更新，配置变更会立即生效
   */
  updateApiConfig(apiConfig: ApiConfig): void {
    try {
      if (this.pronunciationService) {
        this.pronunciationService.updateApiConfig(apiConfig);
      }
    } catch (_) {
      // 静默处理错误
    }
  }

  /**
   * 获取处理统计信息
   */
  getProcessingStats() {
    return {
      coordinator: this.processingCoordinator.getStats(),
      global: globalProcessingState.getProcessingStats(),
    };
  }

  /**
   * 重置处理统计信息
   */
  resetStats(): void {
    this.processingCoordinator.resetStats();
    globalProcessingState.reset();
  }

  /**
   * 重置所有处理状态和缓存
   */
  resetAll(): void {
    console.log('[TextProcessor] 重置所有处理状态和缓存');
    this.processingCoordinator.resetStats();
    globalProcessingState.reset();
  }

  /**
   * 还原页面到原始状态
   * 移除所有翻译内容，恢复到原始文本
   */
  restoreOriginalState(root: Node = document.body, textReplacer?: any): void {
    try {
      console.log('[TextProcessor] 开始还原页面到原始状态');
      
      // 确保 root 是 Element 类型
      const rootElement = root as Element;
      
      // 查找所有翻译相关的元素
      const translationElements = rootElement.querySelectorAll('.wxt-translation-term');
      const originalWordElements = rootElement.querySelectorAll('.wxt-original-word');
      
      console.log('[TextProcessor] 找到翻译元素:', translationElements.length, '个');
      console.log('[TextProcessor] 找到原始词元素:', originalWordElements.length, '个');
      
      // 移除翻译元素
      translationElements.forEach((element: Element) => {
        element.remove();
      });
      
      // 还原原始词元素
      originalWordElements.forEach((element: Element) => {
        const originalText = element.textContent || '';
        const parent = element.parentNode;
        
        if (parent) {
          // 创建文本节点替换原始词元素
          const textNode = document.createTextNode(originalText);
          parent.replaceChild(textNode, element);
        }
      });
      
      // 清除所有处理标记
      const processedElements = rootElement.querySelectorAll('[data-wxt-word-processed], [data-wxt-text-processed], [data-wxt-processed-time], [data-pronunciation-added]');
      console.log('[TextProcessor] 找到处理标记元素:', processedElements.length, '个');
      
      processedElements.forEach((element: Element) => {
        element.removeAttribute('data-wxt-word-processed');
        element.removeAttribute('data-wxt-text-processed');
        element.removeAttribute('data-wxt-processed-time');
        element.removeAttribute('data-pronunciation-added');
      });
      
      // 移除处理中的视觉反馈
      const processingElements = rootElement.querySelectorAll('.wxt-processing');
      processingElements.forEach((element: Element) => {
        element.classList.remove('wxt-processing');
      });
      
      // 清理所有缓存和处理状态
      if (textReplacer && typeof textReplacer.clearAllCache === 'function') {
        textReplacer.clearAllCache();
        console.log('[TextProcessor] 已清理文本替换器缓存');
      }
      globalProcessingState.reset();
      
      console.log('[TextProcessor] 页面还原完成');
    } catch (error) {
      console.error('[TextProcessor] 还原页面失败:', error);
    }
  }
}

import {
  OriginalWordDisplayMode,
  ApiConfig,
  TranslationPosition,
} from './types';
import { PronunciationService } from './pronunciation/services/PronunciationService';
import { DEFAULT_PRONUNCIATION_CONFIG } from './pronunciation/config';
import { ContentSegmenter } from './processing/ContentSegmenter';
import { ProcessingCoordinator } from './processing/ProcessingCoordinator';
import { ContentSegment, globalProcessingState } from './processing/ProcessingStateManager';
import { TextReplacer } from './textReplacer';

/**
 * 文本处理模块
 * 负责遍历DOM，提取文本节点，并进行处理
 */

// 文本节点处理器
export class TextProcessor {
  private pronunciationService: PronunciationService;
  private contentSegmenter: ContentSegmenter;
  private processingCoordinator: ProcessingCoordinator;
  // 新增一个队列用来实现防抖
  private processingQueue = new Set<Node>();
  private debounceTimer: number | null = null;
  private capturedContext: {
    textReplacer: TextReplacer;
    originalWordDisplayMode: OriginalWordDisplayMode;
    translationPosition: TranslationPosition;
    showParentheses: boolean;
  } | null = null;


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
      // 确保传入的是元素节点
      if (!(root instanceof Element)) {
        return;
      }
      // 将节点添加到队列
      this.processingQueue.add(root);

      // 如果这是新一批处理的第一个节点，捕获处理所需的上下文
      if (!this.debounceTimer) {
        this.capturedContext = {
          textReplacer,
          originalWordDisplayMode,
          translationPosition,
          showParentheses,
        };
      }

      // 清除之前的计时器（防抖核心）
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // 设置新的计时器，延迟后处理整个队列
      this.debounceTimer = window.setTimeout(() => {
        this._processQueue();
      }, 400); // 350ms 是一个比较合适的延迟，用于收集屏幕上同时出现的段落

      // // 第一步：更新内容分段器配置
      // this.contentSegmenter.updateConfig({
      //   maxSegmentLength: maxLength,
      //   minSegmentLength: 20,
      //   enableSmartBoundary: true,
      //   mergeSmallSegments: true,
      // });

      // // 第二步：使用智能分段器将根节点分割为内容段落
      // const segments = this.contentSegmenter.segmentContent(root);
      // if (segments.length === 0) {
      //   return;
      // }

      // // 第三步：使用处理协调器进行统一处理
      // // 发音功能现在会在每个段落处理完成后立即添加
      // await this.processingCoordinator.processSegments(
      //   segments,
      //   textReplacer,
      //   originalWordDisplayMode,
      //   translationPosition,
      //   showParentheses,
      // );
    } catch (_) {
      // 静默处理错误
    }
  }

  /**
   * (新) 私有方法，在延迟结束后处理整个队列
   */
  private async _processQueue(): Promise<void> {
    // 如果队列为空或没有捕获到上下文，则不执行
    if (this.processingQueue.size === 0 || !this.capturedContext) {
      return;
    }

    // 1. 从 Set 转换为数组，并根据文档位置排序，确保处理顺序从上到下
    const nodesToProcess = Array.from(this.processingQueue).sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

    console.log("本次处理批次",nodesToProcess.length)
    
    // 2. 清空队列和计时器，为下一批次做准备
    this.processingQueue.clear();
    this.debounceTimer = null;
    
    // 3. 从捕获的上下文中解构出所需参数
    const {
      textReplacer,
      originalWordDisplayMode,
      translationPosition,
      showParentheses,
    } = this.capturedContext;

    // 4. 对批次中的每个节点，提取其内容段落
    let allSegments: ContentSegment[] = [];
    for (const node of nodesToProcess) {
      if (node instanceof Element) {
        // 让 ContentSegmenter 从每个小节点中提取段落
        // 注意：我们调用的是 extractSegmentsFromContainer，而不是 segmentContent
        const segments = this.contentSegmenter.extractSegmentsFromContainer(node);
        allSegments.push(...segments);
      }
    }

    // 5. 合并从所有节点中收集来的小段落，恢复合并功能！
    const finalSegments = this.contentSegmenter.mergeSmallSegments(allSegments);

    if (finalSegments.length === 0) {
      this.capturedContext = null; // 别忘了清理上下文
      return;
    }
    
    // 6. 将最终合并好的段落交给协调器处理
    await this.processingCoordinator.processSegments(
      finalSegments,
      textReplacer,
      originalWordDisplayMode,
      translationPosition,
      showParentheses,
    );

    // 7. 清理捕获的上下文
    this.capturedContext = null;
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
}

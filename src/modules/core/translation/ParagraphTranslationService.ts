/**
 * 段落翻译服务
 *
 * 设计原则：
 * 1. 使用 DomWalker 统一遍历 DOM，基于计算样式识别段落
 * 2. 直接翻译找到的段落元素
 * 3. 与单词翻译模式共用同一套 DOM 获取逻辑
 */

import { StorageService } from '../storage';
import { StyleManager } from '../../styles/core/StyleManager';
import { ParagraphTranslationApi } from './ParagraphTranslationApi';
import { PARAGRAPH_TRANSLATION } from '../../shared/constants';
import type { LazyLoadingService } from '../../content/services/LazyLoadingService';
import type { ContentSegment } from '../../processing/ProcessingStateManager';
import { globalProcessingState } from '../../processing/ProcessingStateManager';
import {
  walkAndCollectParagraphs,
  collectTextNodes,
} from '../../processing/DomWalker';
import { languageService } from './LanguageService';
import { selectParagraphTranslationElements } from './ParagraphTranslationSelection';
import { renderParagraphTranslation } from './ParagraphTranslationRenderer';

/**
 * 段落翻译服务类
 */
export class ParagraphTranslationService {
  private static instance: ParagraphTranslationService | null = null;
  private storageService: StorageService;
  private styleManager: StyleManager;
  private paragraphApi: ParagraphTranslationApi;
  private lazyLoadingService?: LazyLoadingService; // 懒加载服务

  // 翻译状态管理
  private isStarting: boolean = false;
  private translatedElements = new WeakSet<HTMLElement>();
  private translatingElements = new WeakSet<HTMLElement>(); // 正在翻译的元素
  private targetLanguage?: string;

  // 并发配置
  private readonly BATCH_SIZE = 5; // 每批处理5个元素
  private readonly BATCH_DELAY = 200; // 批次间延迟200ms

  // 加载指示器样式
  private readonly LOADING_CLASS = 'illa-paragraph-loading';
  private readonly LOADING_ICON = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-dasharray="11 11" stroke-dashoffset="0">
        <animateTransform attributeName="transform" type="rotate" values="0 8 8;360 8 8" dur="1s" repeatCount="indefinite"/>
      </circle>
    </svg>
  `;

  private constructor(lazyLoadingService?: LazyLoadingService) {
    this.storageService = StorageService.getInstance();
    this.styleManager = new StyleManager();
    this.paragraphApi = ParagraphTranslationApi.getInstance();
    this.lazyLoadingService = lazyLoadingService;

    // 动态设置翻译风格
    this.storageService.getUserSettings().then((settings) => {
      if (settings && settings.translationStyle) {
        this.styleManager.setTranslationStyle(settings.translationStyle);
      }
    });
  }

  /**
   * 获取服务实例（单例模式）
   */
  public static getInstance(
    lazyLoadingService?: LazyLoadingService,
  ): ParagraphTranslationService {
    if (!ParagraphTranslationService.instance) {
      ParagraphTranslationService.instance = new ParagraphTranslationService(
        lazyLoadingService,
      );
    } else if (
      lazyLoadingService &&
      !ParagraphTranslationService.instance.lazyLoadingService
    ) {
      // 如果实例已存在但没有懒加载服务，则更新
      ParagraphTranslationService.instance.lazyLoadingService =
        lazyLoadingService;
    }
    return ParagraphTranslationService.instance;
  }

  /**
   * 启动段落翻译
   */
  public async start(): Promise<number> {
    console.log('[段落翻译] 开始启动翻译服务...');

    if (this.isStarting) {
      console.warn('[段落翻译] 翻译服务已在运行');
      return 0;
    }

    this.isStarting = true;

    try {
      // 每次手动触发都重新读取当前页面和设置。SPA 切路由不会重建 content script。
      const settings = await this.storageService.getUserSettings();
      const pageLanguage = await languageService.detectPageLanguage();
      this.targetLanguage = languageService.resolveTargetLanguage(
        settings.multilingualConfig,
        pageLanguage,
      );

      const isLazyLoadingEnabled =
        settings?.lazyLoading?.enabled && this.lazyLoadingService?.isEnabled();

      if (isLazyLoadingEnabled) {
        // 懒加载模式只负责注册当前 DOM；可见元素由 LazyLoadingService 后续触发。
        console.log('[段落翻译] 使用懒加载模式');
        return this.startLazyLoading();
      }

      console.log('[段落翻译] 使用全量翻译模式');
      return this.startFullTranslation();
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * 停止段落翻译
   */
  public stop(): void {
    this.isStarting = false;
    this.translatedElements = new WeakSet();
    this.translatingElements = new WeakSet(); // 重置
    this.targetLanguage = undefined;
    this.clearAllLoadingIndicators(); // 清除

    // 停止懒加载观察
    if (this.lazyLoadingService) {
      this.lazyLoadingService.unobserveSegments([]);
    }

    console.log('[段落翻译] 翻译服务已停止');
  }

  /**
   * 清除所有翻译
   */
  public clearAllTranslations(): void {
    document
      .querySelectorAll(`.${PARAGRAPH_TRANSLATION.WRAPPER_CLASS}`)
      .forEach((el) => el.remove());
    this.translatedElements = new WeakSet();
    this.translatingElements = new WeakSet(); // 重置
    this.targetLanguage = undefined;
    this.clearAllLoadingIndicators(); // 清除

    // 停止懒加载观察
    if (this.lazyLoadingService) {
      this.lazyLoadingService.unobserveSegments([]);
    }

    console.log('[段落翻译] 已清除所有翻译');
  }

  /**
   * 查找段落元素 - 基于 DomWalker 统一遍历
   */
  private findParagraphElements(): HTMLElement[] {
    const paragraphs = walkAndCollectParagraphs(document.body);
    const paragraphElements = selectParagraphTranslationElements(paragraphs);

    // 过滤掉已翻译、正在翻译、文本过短的元素
    const elements = paragraphElements.filter((element) => {
      if (this.translatedElements.has(element)) return false;
      if (this.translatingElements.has(element)) return false;

      const text = element.textContent?.trim();
      if (!text || text.length < 3) return false;
      if (text.length > 3000) return false;

      // 跳过纯数字或简单符号
      if (/^[\d\s.,!?\-+=()[\]{}]*$/.test(text)) return false;

      return true;
    });

    console.log('[段落翻译] 找到段落元素数量:', elements.length);
    return elements;
  }

  /**
   * 翻译元素列表
   */
  private async translateElements(elements: HTMLElement[]): Promise<number> {
    if (elements.length === 0) {
      return 0;
    }

    console.log('[段落翻译] 开始并发翻译，元素数量:', elements.length);

    // 分批处理，避免API限流
    const batchSize = this.BATCH_SIZE; // 每批处理5个元素
    let successCount = 0;

    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      console.log(
        `[段落翻译] 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(elements.length / batchSize)}，元素数量: ${batch.length}`,
      );

      // 并发处理当前批次
      const batchPromises = batch.map(async (element) => {
        try {
          const success = await this.translateElement(element);
          return success ? 1 : 0;
        } catch (error) {
          console.error('[段落翻译] 翻译元素失败:', error);
          return 0;
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      const batchSuccessCount = batchResults.reduce(
        (sum: number, result: number) => sum + result,
        0,
      );
      successCount += batchSuccessCount;

      // 批次间稍微延迟，避免API限流
      if (i + batchSize < elements.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    console.log('[段落翻译] 并发翻译完成，成功数量:', successCount);
    return successCount;
  }

  /**
   * 翻译单个元素
   */
  private async translateElement(element: HTMLElement): Promise<boolean> {
    if (
      this.translatedElements.has(element) ||
      this.translatingElements.has(element)
    ) {
      return false;
    }

    const textContent = element.textContent?.trim();
    if (!textContent || textContent.length < 5) {
      return false;
    }

    // 标记为正在翻译
    this.translatingElements.add(element);
    this.showLoadingIndicator(element);

    try {
      console.log(
        '[段落翻译] 翻译元素:',
        element.tagName,
        textContent.substring(0, 50),
      );

      const translatedText = await this.paragraphApi.translateParagraph(
        textContent,
        this.targetLanguage,
      );

      if (translatedText && translatedText.trim()) {
        // 先移除加载指示器，再显示翻译结果
        this.removeLoadingIndicator(element);
        this.translatingElements.delete(element);

        this.showTranslation(element, translatedText);
        this.translatedElements.add(element);
        console.log('[段落翻译] 翻译成功:', element.tagName);
        return true;
      } else {
        // 移除加载指示器
        this.removeLoadingIndicator(element);
        this.translatingElements.delete(element);

        console.log('[段落翻译] 翻译结果为空，跳过:', element.tagName);
        return false;
      }
    } catch (error) {
      // 移除加载指示器
      this.removeLoadingIndicator(element);
      this.translatingElements.delete(element);

      console.error('[段落翻译] 翻译失败:', error, '元素:', element.tagName);
      return false;
    }
  }

  /**
   * 显示翻译结果
   */
  private showTranslation(element: HTMLElement, translatedText: string): void {
    // 同一段可能被重复触发，写入前先移除旧结果，保证 DOM 幂等。
    this.removeAdjacentTranslation(element);
    element
      .querySelectorAll(`.${PARAGRAPH_TRANSLATION.WRAPPER_CLASS}`)
      .forEach((el) => el.remove());

    const styleClass = this.styleManager.getCurrentStyleClass();
    renderParagraphTranslation(element, translatedText, styleClass);
  }

  private removeAdjacentTranslation(element: HTMLElement): void {
    const nextSibling = element.nextSibling;
    if (nextSibling?.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const nextElement = nextSibling as HTMLElement;
    if (nextElement.classList.contains(PARAGRAPH_TRANSLATION.WRAPPER_CLASS)) {
      nextElement.remove();
    }
  }

  /**
   * 显示加载指示器
   */
  private showLoadingIndicator(element: HTMLElement): void {
    this.removeLoadingIndicator(element);

    // 确保全局样式只添加一次
    if (!document.getElementById('illa-paragraph-loading-style')) {
      const style = document.createElement('style');
      style.id = 'illa-paragraph-loading-style';
      style.textContent = `
        .illa-paragraph-loading svg {
          animation: illa-spin 1s linear infinite;
        }
        @keyframes illa-spin {
          100% { transform: rotate(360deg); }
        }
        /* 确保加载指示器不阻断任何元素的点击事件 */
        .illa-paragraph-loading {
          pointer-events: none !important;
          user-select: none;
        }
        /* 特殊处理链接元素的加载指示器 */
        a + .illa-paragraph-loading {
          position: relative;
          z-index: 1;
          margin-left: 2px;
        }
      `;
      document.head.appendChild(style);
    }

    const loadingSpan = document.createElement('span');
    loadingSpan.classList.add(this.LOADING_CLASS);
    loadingSpan.innerHTML = this.LOADING_ICON;

    // 统一的加载指示器样式，由CSS控制pointer-events
    loadingSpan.style.cssText = `
      display: inline-block;
      margin-left: 8px;
      vertical-align: middle;
      opacity: 0.8;
    `;

    // 特殊处理链接元素：减少间距
    if (element.tagName.toLowerCase() === 'a') {
      loadingSpan.style.marginLeft = '4px';
    }

    element.parentNode?.insertBefore(loadingSpan, element.nextSibling);
  }

  /**
   * 移除加载指示器
   */
  private removeLoadingIndicator(element: HTMLElement): void {
    // 查找并移除该元素后面的加载指示器
    const nextSibling = element.nextSibling;
    if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE) {
      const nextElement = nextSibling as HTMLElement;
      if (nextElement.classList.contains(this.LOADING_CLASS)) {
        nextElement.remove();
      }
    }
  }

  /**
   * 清除所有加载指示器
   */
  private clearAllLoadingIndicators(): void {
    document
      .querySelectorAll(`.${this.LOADING_CLASS}`)
      .forEach((el) => el.remove());
  }

  /**
   * 启动全量翻译
   */
  private async startFullTranslation(): Promise<number> {
    // 查找所有段落元素
    const paragraphElements = this.findParagraphElements();
    console.log(
      '[段落翻译] 全量翻译模式：找到段落元素数量:',
      paragraphElements.length,
    );

    // 翻译段落元素
    const result = await this.translateElements(paragraphElements);
    console.log('[段落翻译] 翻译完成，结果:', result);
    return result;
  }

  /**
   * 启动懒加载翻译
   */
  private async startLazyLoading(): Promise<number> {
    if (!this.lazyLoadingService) {
      console.warn('[段落翻译] 懒加载服务未初始化，回退到全量翻译');
      return this.startFullTranslation();
    }

    // 查找所有段落元素并转换为 ContentSegment
    const paragraphElements = this.findParagraphElements();
    const segments = this.convertToContentSegments(paragraphElements);

    console.log(
      '[段落翻译] 懒加载模式：找到段落元素数量:',
      paragraphElements.length,
    );

    // 设置懒加载回调
    this.lazyLoadingService.setProcessingCallback(
      async (visibleSegments: ContentSegment[]) => {
        const elementsToTranslate = visibleSegments.map(
          (segment) => segment.element as HTMLElement,
        );
        await this.translateElements(elementsToTranslate);
      },
    );

    // 开始观察段落
    this.lazyLoadingService.observeSegments(segments);

    return segments.length;
  }

  /**
   * 将段落元素转换为 ContentSegment
   */
  private convertToContentSegments(elements: HTMLElement[]): ContentSegment[] {
    return elements.map((element, index) => {
      const textContent = element.textContent?.trim() || '';
      const domPath = globalProcessingState.generateDomPath(element);
      const fingerprint = globalProcessingState.generateContentFingerprint(
        textContent,
        domPath,
      );

      const textNodes: Text[] = collectTextNodes(element);

      return {
        id: `${element.tagName.toLowerCase()}-${fingerprint}-${index}`,
        textContent,
        element,
        elements: [element],
        textNodes,
        fingerprint,
        domPath,
      };
    });
  }

  /**
   * 获取统计信息
   */
  public getStats(): { total: number; translated: number } {
    const total = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, div, blockquote, section, article, li, td, th',
    ).length;
    const translated = document.querySelectorAll(
      `.${PARAGRAPH_TRANSLATION.WRAPPER_CLASS}`,
    ).length;
    return { total, translated };
  }
}

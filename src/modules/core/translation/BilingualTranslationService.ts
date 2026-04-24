/**
 * 双语对照翻译服务
 *
 * 设计原则：
 * 1. 保留原文，同时显示译文，形成对照展示
 * 2. 与段落翻译模式共用同一套 DOM 获取逻辑
 * 3. 支持懒加载模式
 */

import { StorageService } from '../storage';
import { StyleManager } from '../../styles/core/StyleManager';
import { ParagraphTranslationApi } from './ParagraphTranslationApi';
import { BILINGUAL_TRANSLATION } from '../../shared/constants';
import type { LazyLoadingService } from '../../content/services/LazyLoadingService';
import type { ContentSegment } from '../../processing/ProcessingStateManager';
import { globalProcessingState } from '../../processing/ProcessingStateManager';
import {
  walkAndCollectParagraphs,
  collectTextNodes,
} from '../../processing/DomWalker';

/**
 * 双语对照翻译服务类
 */
export class BilingualTranslationService {
  private static instance: BilingualTranslationService | null = null;
  private storageService: StorageService;
  private styleManager: StyleManager;
  private paragraphApi: ParagraphTranslationApi;
  private lazyLoadingService?: LazyLoadingService;

  // 翻译状态管理
  private isActive: boolean = false;
  private translatedElements = new WeakSet<HTMLElement>();
  private translatingElements = new WeakSet<HTMLElement>();

  // 并发配置
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 200;

  // 加载指示器样式
  private readonly LOADING_CLASS = 'illa-bilingual-loading';
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
  ): BilingualTranslationService {
    if (!BilingualTranslationService.instance) {
      BilingualTranslationService.instance = new BilingualTranslationService(
        lazyLoadingService,
      );
    } else if (
      lazyLoadingService &&
      !BilingualTranslationService.instance.lazyLoadingService
    ) {
      BilingualTranslationService.instance.lazyLoadingService =
        lazyLoadingService;
    }
    return BilingualTranslationService.instance;
  }

  /**
   * 启动双语对照翻译
   */
  public async start(): Promise<number> {
    console.log('[双语对照翻译] 开始启动翻译服务...');

    if (this.isActive) {
      console.warn('[双语对照翻译] 翻译服务已在运行');
      return 0;
    }

    this.isActive = true;

    const settings = await this.storageService.getUserSettings();
    const isLazyLoadingEnabled =
      settings?.lazyLoading?.enabled && this.lazyLoadingService?.isEnabled();

    if (isLazyLoadingEnabled) {
      console.log('[双语对照翻译] 使用懒加载模式');
      return this.startLazyLoading();
    } else {
      console.log('[双语对照翻译] 使用全量翻译模式');
      return this.startFullTranslation();
    }
  }

  /**
   * 停止双语对照翻译
   */
  public stop(): void {
    this.isActive = false;
    this.translatedElements = new WeakSet();
    this.translatingElements = new WeakSet();
    this.clearAllLoadingIndicators();

    if (this.lazyLoadingService) {
      this.lazyLoadingService.unobserveSegments([]);
    }

    console.log('[双语对照翻译] 翻译服务已停止');
  }

  /**
   * 清除所有翻译
   */
  public clearAllTranslations(): void {
    document
      .querySelectorAll(`.${BILINGUAL_TRANSLATION.WRAPPER_CLASS}`)
      .forEach((el) => el.remove());
    this.translatedElements = new WeakSet();
    this.translatingElements = new WeakSet();
    this.clearAllLoadingIndicators();

    if (this.lazyLoadingService) {
      this.lazyLoadingService.unobserveSegments([]);
    }

    console.log('[双语对照翻译] 已清除所有翻译');
  }

  /**
   * 查找段落元素 - 基于 DomWalker 统一遍历
   */
  private findParagraphElements(): HTMLElement[] {
    const paragraphs = walkAndCollectParagraphs(document.body);

    const elements = paragraphs
      .map((p) => p.element)
      .filter((element) => {
        if (this.translatedElements.has(element)) return false;
        if (this.translatingElements.has(element)) return false;

        const text = element.textContent?.trim();
        if (!text || text.length < 3) return false;
        if (text.length > 3000) return false;

        if (/^[\d\s.,!?\-+=()[\]{}]*$/.test(text)) return false;

        return true;
      });

    console.log('[双语对照翻译] 找到段落元素数量:', elements.length);
    return elements;
  }

  /**
   * 翻译元素列表
   */
  private async translateElements(elements: HTMLElement[]): Promise<number> {
    if (elements.length === 0) {
      return 0;
    }

    console.log('[双语对照翻译] 开始并发翻译，元素数量:', elements.length);

    const batchSize = this.BATCH_SIZE;
    let successCount = 0;

    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      console.log(
        `[双语对照翻译] 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(elements.length / batchSize)}，元素数量: ${batch.length}`,
      );

      const batchPromises = batch.map(async (element) => {
        try {
          const success = await this.translateElement(element);
          return success ? 1 : 0;
        } catch (error) {
          console.error('[双语对照翻译] 翻译元素失败:', error);
          return 0;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchSuccessCount = batchResults.reduce(
        (sum: number, result: number) => sum + result,
        0,
      );
      successCount += batchSuccessCount;

      if (i + batchSize < elements.length) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    console.log('[双语对照翻译] 并发翻译完成，成功数量:', successCount);
    return successCount;
  }

  /**
   * 翻译单个元素
   */
  private async translateElement(element: HTMLElement): Promise<boolean> {
    if (this.translatedElements.has(element)) {
      return false;
    }

    const textContent = element.textContent?.trim();
    if (!textContent || textContent.length < 5) {
      return false;
    }

    this.translatingElements.add(element);
    this.showLoadingIndicator(element);

    try {
      console.log(
        '[双语对照翻译] 翻译元素:',
        element.tagName,
        textContent.substring(0, 50),
      );

      const translatedText =
        await this.paragraphApi.translateParagraph(textContent);

      if (translatedText && translatedText.trim()) {
        this.removeLoadingIndicator(element);
        this.translatingElements.delete(element);

        this.showBilingualTranslation(element, textContent, translatedText);
        this.translatedElements.add(element);
        console.log('[双语对照翻译] 翻译成功:', element.tagName);
        return true;
      } else {
        this.removeLoadingIndicator(element);
        this.translatingElements.delete(element);

        console.log('[双语对照翻译] 翻译结果为空，跳过:', element.tagName);
        return false;
      }
    } catch (error) {
      this.removeLoadingIndicator(element);
      this.translatingElements.delete(element);

      console.error(
        '[双语对照翻译] 翻译失败:',
        error,
        '元素:',
        element.tagName,
      );
      return false;
    }
  }

  /**
   * 显示双语对照翻译结果
   * 保留原文，并在原文下方/旁边显示译文
   */
  private showBilingualTranslation(
    element: HTMLElement,
    originalText: string,
    translatedText: string,
  ): void {
    element
      .querySelectorAll(`.${BILINGUAL_TRANSLATION.WRAPPER_CLASS}`)
      .forEach((el) => el.remove());

    const tagName = element.tagName.toLowerCase();
    const styleClass = this.styleManager.getCurrentStyleClass();

    let translationElement: HTMLElement;

    if (['table', 'td', 'th', 'li'].includes(tagName)) {
      const span = document.createElement('span');
      span.classList.add(
        BILINGUAL_TRANSLATION.WRAPPER_CLASS,
        BILINGUAL_TRANSLATION.TRANSLATION_CLASS,
        styleClass,
      );
      span.style.cssText = 'margin-left: 8px; display: inline-block;';
      span.textContent = ` (${translatedText})`;
      element.appendChild(span);
    } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      translationElement = document.createElement(tagName);
      translationElement.classList.add(
        BILINGUAL_TRANSLATION.WRAPPER_CLASS,
        BILINGUAL_TRANSLATION.TRANSLATION_CLASS,
        styleClass,
      );
      translationElement.textContent = translatedText;

      const computedStyle = window.getComputedStyle(element);
      translationElement.style.cssText = `
        margin-top: ${computedStyle.marginTop};
        margin-bottom: ${computedStyle.marginBottom};
        font-size: ${computedStyle.fontSize};
        font-weight: normal;
        line-height: ${computedStyle.lineHeight};
        opacity: 0.8;
      `;

      element.parentNode?.insertBefore(translationElement, element.nextSibling);
    } else if (
      ['p', 'div', 'blockquote', 'section', 'article'].includes(tagName)
    ) {
      translationElement = document.createElement(tagName);
      translationElement.classList.add(
        BILINGUAL_TRANSLATION.WRAPPER_CLASS,
        BILINGUAL_TRANSLATION.TRANSLATION_CLASS,
        styleClass,
      );
      translationElement.textContent = translatedText;

      const computedStyle = window.getComputedStyle(element);
      translationElement.style.cssText = `
        margin-top: ${computedStyle.marginTop};
        margin-bottom: ${computedStyle.marginBottom};
        padding: ${computedStyle.padding};
        opacity: 0.8;
        font-style: italic;
      `;

      element.parentNode?.insertBefore(translationElement, element.nextSibling);
    } else {
      const div = document.createElement('div');
      div.classList.add(
        BILINGUAL_TRANSLATION.WRAPPER_CLASS,
        BILINGUAL_TRANSLATION.TRANSLATION_CLASS,
        styleClass,
      );
      div.textContent = translatedText;
      div.style.cssText =
        'margin-top: 0.5em; margin-bottom: 0.5em; opacity: 0.8; font-style: italic;';
      element.parentNode?.insertBefore(div, element.nextSibling);
    }

    element.setAttribute(BILINGUAL_TRANSLATION.MARKER_ATTR, 'true');
  }

  /**
   * 显示加载指示器
   */
  private showLoadingIndicator(element: HTMLElement): void {
    this.removeLoadingIndicator(element);

    if (!document.getElementById('illa-bilingual-loading-style')) {
      const style = document.createElement('style');
      style.id = 'illa-bilingual-loading-style';
      style.textContent = `
        .illa-bilingual-loading svg {
          animation: illa-bilingual-spin 1s linear infinite;
        }
        @keyframes illa-bilingual-spin {
          100% { transform: rotate(360deg); }
        }
        .illa-bilingual-loading {
          pointer-events: none !important;
          user-select: none;
        }
      `;
      document.head.appendChild(style);
    }

    const loadingSpan = document.createElement('span');
    loadingSpan.classList.add(this.LOADING_CLASS);
    loadingSpan.innerHTML = this.LOADING_ICON;

    loadingSpan.style.cssText = `
      display: inline-block;
      margin-left: 8px;
      vertical-align: middle;
      opacity: 0.8;
    `;

    if (element.tagName.toLowerCase() === 'a') {
      loadingSpan.style.marginLeft = '4px';
    }

    element.parentNode?.insertBefore(loadingSpan, element.nextSibling);
  }

  /**
   * 移除加载指示器
   */
  private removeLoadingIndicator(element: HTMLElement): void {
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
    const paragraphElements = this.findParagraphElements();
    console.log(
      '[双语对照翻译] 全量翻译模式：找到段落元素数量:',
      paragraphElements.length,
    );

    const result = await this.translateElements(paragraphElements);
    console.log('[双语对照翻译] 翻译完成，结果:', result);
    return result;
  }

  /**
   * 启动懒加载翻译
   */
  private async startLazyLoading(): Promise<number> {
    if (!this.lazyLoadingService) {
      console.warn('[双语对照翻译] 懒加载服务未初始化，回退到全量翻译');
      return this.startFullTranslation();
    }

    const paragraphElements = this.findParagraphElements();
    const segments = this.convertToContentSegments(paragraphElements);

    console.log(
      '[双语对照翻译] 懒加载模式：找到段落元素数量:',
      paragraphElements.length,
    );

    this.lazyLoadingService.setProcessingCallback(
      async (visibleSegments: ContentSegment[]) => {
        const elementsToTranslate = visibleSegments.map(
          (segment) => segment.element as HTMLElement,
        );
        await this.translateElements(elementsToTranslate);
      },
    );

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
      `.${BILINGUAL_TRANSLATION.WRAPPER_CLASS}`,
    ).length;
    return { total, translated };
  }
}

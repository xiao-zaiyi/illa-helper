/**
 * 发音悬浮框交互控制器。
 *
 * 这个模块拥有 tooltip 的 DOM 生命周期、鼠标事件、热键状态和异步内容更新。
 * PronunciationService 只需要把元素注册进来，不应该知道 tooltip 怎么显示和隐藏。
 */

import { IPhoneticProvider } from '../phonetic';
import { AITranslationProvider } from '../translation';
import {
  CSS_CLASSES,
  PronunciationConfig,
  TIMER_CONSTANTS,
  UI_CONSTANTS,
} from '../config';
import { PhoneticInfo, PronunciationElementData } from '../types';
import { DOMUtils, PositionUtils, TimerManager } from '../utils';
import { StorageService } from '../../core/storage';
import { TooltipRenderer } from './TooltipRenderer';

type ElementWithPronunciationHandlers = HTMLElement & {
  __wxtHandlers?: {
    mouseEnterHandler: () => Promise<void>;
    mouseLeaveHandler: () => void;
  };
};

export interface TooltipInteractionControllerOptions {
  getConfig: () => PronunciationConfig;
  phoneticProvider: IPhoneticProvider;
  translationProvider: AITranslationProvider;
  renderer: TooltipRenderer;
  storageService: StorageService;
  speakText: (text: string) => Promise<unknown>;
  speakTextWithAccent: (text: string, lang: string) => Promise<unknown>;
}

export class TooltipInteractionController {
  private readonly elementDataMap = new Map<
    HTMLElement,
    PronunciationElementData
  >();
  private readonly timerManager = new TimerManager();

  private currentWordTooltip: HTMLElement | null = null;
  private currentMainElement: HTMLElement | null = null;
  private isCtrlPressed = false;
  private currentlyHoveredData: PronunciationElementData | null = null;

  constructor(private readonly options: TooltipInteractionControllerOptions) {
    document.addEventListener('keydown', this.handleDocumentKeyDown);
    document.addEventListener('keyup', this.handleDocumentKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  async register(
    element: HTMLElement,
    word: string,
    _isPhrase?: boolean,
  ): Promise<boolean> {
    try {
      if (!element || !word || this.elementDataMap.has(element)) {
        return false;
      }

      DOMUtils.addUniqueId(element);

      const elementData: PronunciationElementData = {
        word: word.toLowerCase().trim(),
        element,
      };

      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        elementData.originalText = originalText;
      }

      this.elementDataMap.set(element, elementData);
      element.classList.add(CSS_CLASSES.PRONUNCIATION_ENABLED);

      if (this.options.getConfig().uiConfig.inlineDisplay) {
        await this.preloadPhonetic(elementData);
      }

      this.attachElementEventListeners(element, elementData);
      return true;
    } catch (error) {
      console.error('添加发音功能失败:', error);
      return false;
    }
  }

  unregister(element: HTMLElement): void {
    const elementData = this.elementDataMap.get(element);
    if (!elementData) return;

    this.removeElementEventListeners(element);

    const elementKey = DOMUtils.getElementKey(element);
    this.timerManager.clear(`hide-${elementKey}`);
    this.timerManager.clear(`show-${elementKey}`);

    elementData.tooltip?.remove();
    elementData.tooltip = undefined;

    if (this.currentMainElement === element) {
      this.currentMainElement = null;
    }

    element.classList.remove(
      CSS_CLASSES.PRONUNCIATION_ENABLED,
      CSS_CLASSES.PRONUNCIATION_LOADING,
    );

    this.elementDataMap.delete(element);
  }

  destroy(): void {
    this.timerManager.clearAll();
    this.currentWordTooltip?.remove();
    this.currentWordTooltip = null;
    this.currentMainElement = null;
    DOMUtils.cleanupElements('.wxt-pronunciation-tooltip, .wxt-word-tooltip');

    for (const element of Array.from(this.elementDataMap.keys())) {
      this.unregister(element);
    }
    this.elementDataMap.clear();

    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    document.removeEventListener('keyup', this.handleDocumentKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }

  private async preloadPhonetic(
    elementData: PronunciationElementData,
  ): Promise<void> {
    if (elementData.phonetic) return;

    try {
      elementData.element.classList.add(CSS_CLASSES.PRONUNCIATION_LOADING);

      const result = await this.options.phoneticProvider.getPhonetic(
        elementData.word,
      );
      if (result.success && result.data) {
        elementData.phonetic = result.data;
        this.displayInlinePhonetic(elementData);
      }
    } catch (error) {
      console.error('预加载音标失败:', error);
    } finally {
      elementData.element.classList.remove(CSS_CLASSES.PRONUNCIATION_LOADING);
    }
  }

  private displayInlinePhonetic(elementData: PronunciationElementData): void {
    if (
      !elementData.phonetic ||
      !this.options.getConfig().uiConfig.showPhonetic
    ) {
      return;
    }

    const phoneticText = elementData.phonetic.phonetics[0]?.text;
    if (!phoneticText) return;

    elementData.element.appendChild(
      DOMUtils.createPhoneticInlineElement(phoneticText),
    );
  }

  private attachElementEventListeners(
    element: HTMLElement,
    elementData: PronunciationElementData,
  ): void {
    const mouseEnterHandler = async () => {
      elementData.isMouseOver = true;
      this.currentlyHoveredData = elementData;

      if (!(await this.checkHotkey())) {
        return;
      }
      await this.handleMouseEnter(elementData);
    };

    const mouseLeaveHandler = () => {
      elementData.isMouseOver = false;
      if (this.currentlyHoveredData?.element === element) {
        this.currentlyHoveredData = null;
      }
      this.handleMouseLeave(elementData);
    };

    element.addEventListener('mouseenter', mouseEnterHandler);
    element.addEventListener('mouseleave', mouseLeaveHandler);

    (element as ElementWithPronunciationHandlers).__wxtHandlers = {
      mouseEnterHandler,
      mouseLeaveHandler,
    };
  }

  private removeElementEventListeners(element: HTMLElement): void {
    const target = element as ElementWithPronunciationHandlers;
    const handlers = target.__wxtHandlers;
    if (!handlers) return;

    element.removeEventListener('mouseenter', handlers.mouseEnterHandler);
    element.removeEventListener('mouseleave', handlers.mouseLeaveHandler);
    delete target.__wxtHandlers;
  }

  private async checkHotkey(): Promise<boolean> {
    try {
      const userSettings = await this.options.storageService.getUserSettings();
      const hotkey = userSettings.pronunciationHotkey;

      if (!hotkey || !hotkey.enabled) {
        return true;
      }

      return this.isCtrlPressed;
    } catch (error) {
      console.error('获取快捷键配置失败:', error);
      return true;
    }
  }

  private async handleMouseEnter(
    elementData: PronunciationElementData,
  ): Promise<void> {
    if (!this.options.getConfig().uiConfig.tooltipEnabled) return;

    const elementKey = DOMUtils.getElementKey(elementData.element);
    this.timerManager.clear(`hide-${elementKey}`);
    this.timerManager.clear(`show-${elementKey}`);

    this.timerManager.set(
      `show-${elementKey}`,
      () => {
        void this.showMainTooltipWithAsyncContent(elementData);
      },
      TIMER_CONSTANTS.SHOW_DELAY,
    );
  }

  private async showMainTooltipWithAsyncContent(
    elementData: PronunciationElementData,
  ): Promise<void> {
    const words = DOMUtils.extractWords(elementData.word);
    const isPhrase = words.length > 1;

    if (isPhrase) {
      this.showTooltip(elementData);
      return;
    }

    const needPhonetic = !elementData.phonetic;
    const needMeaning = !elementData.phonetic?.aiTranslation;

    if (!elementData.phonetic) {
      elementData.phonetic = this.createEmptyPhoneticInfo(elementData.word);
    }

    this.showTooltip(elementData);

    if (needPhonetic) {
      void this.loadPhoneticForMainTooltip(elementData);
    }

    if (needMeaning) {
      void this.loadMeaningForMainTooltip(elementData);
    }
  }

  private handleMouseLeave(elementData: PronunciationElementData): void {
    const elementKey = DOMUtils.getElementKey(elementData.element);
    this.timerManager.clear(`show-${elementKey}`);

    this.timerManager.set(
      `hide-${elementKey}`,
      () => {
        if (!this.currentWordTooltip) {
          this.hideTooltip(elementData);
        }
      },
      TIMER_CONSTANTS.HIDE_DELAY,
    );
  }

  private showTooltip(elementData: PronunciationElementData): void {
    this.cleanupOtherTooltips(elementData.element);
    this.hideWordTooltip();

    const words = DOMUtils.extractWords(elementData.word);
    if (words.length <= 1 && !elementData.phonetic) {
      elementData.phonetic = this.createEmptyPhoneticInfo(elementData.word);
    }

    elementData.tooltip?.remove();

    const tooltip = this.createTooltip(elementData);
    elementData.tooltip = tooltip;
    document.body.appendChild(tooltip);

    PositionUtils.positionTooltip(elementData.element, tooltip);

    this.currentMainElement = elementData.element;
  }

  private hideTooltip(elementData: PronunciationElementData): void {
    elementData.tooltip?.remove();
    elementData.tooltip = undefined;

    if (this.currentMainElement === elementData.element) {
      this.currentMainElement = null;
    }
  }

  private cleanupOtherTooltips(currentElement: HTMLElement): void {
    for (const [element, elementData] of this.elementDataMap.entries()) {
      if (element !== currentElement && elementData.tooltip) {
        const elementKey = DOMUtils.getElementKey(element);
        this.timerManager.clear(`hide-${elementKey}`);
        this.timerManager.clear(`show-${elementKey}`);

        elementData.tooltip.remove();
        elementData.tooltip = undefined;
      }
    }

    this.timerManager.clear('word-show');
    this.timerManager.clear('word-hide');
    this.currentMainElement = null;

    DOMUtils.cleanupElements('.wxt-pronunciation-tooltip, .wxt-word-tooltip');
  }

  private forceCleanupWordTooltips(): void {
    this.timerManager.clear('word-show');
    this.timerManager.clear('word-hide');

    this.currentWordTooltip?.remove();
    this.currentWordTooltip = null;

    DOMUtils.cleanupElements('.wxt-word-tooltip');
  }

  private createTooltip(elementData: PronunciationElementData): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'wxt-pronunciation-tooltip';
    tooltip.appendChild(
      this.options.renderer.createMainTooltipElement(elementData),
    );

    this.attachTooltipEventListeners(tooltip, elementData);

    const words = DOMUtils.extractWords(elementData.word);
    if (words.length > 1) {
      this.setupWordInteractions(tooltip, words);
    }

    return tooltip;
  }

  private attachTooltipEventListeners(
    tooltip: HTMLElement,
    elementData: PronunciationElementData,
  ): void {
    const elementKey = DOMUtils.getElementKey(elementData.element);

    tooltip.addEventListener('mouseenter', () => {
      this.timerManager.clear(`hide-${elementKey}`);
    });

    tooltip.addEventListener('mouseleave', () => {
      this.timerManager.set(
        `hide-${elementKey}`,
        () => {
          if (!this.currentWordTooltip) {
            this.hideTooltip(elementData);
          }
        },
        TIMER_CONSTANTS.HIDE_DELAY,
      );
    });

    const audioBtn = tooltip.querySelector('.wxt-audio-btn');
    audioBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.options.speakText(elementData.word);
    });
  }

  private setupWordInteractions(tooltip: HTMLElement, words: string[]): void {
    const wordElements = tooltip.querySelectorAll('.wxt-interactive-word');

    wordElements.forEach((wordElement) => {
      const word = wordElement.getAttribute('data-word');
      if (!word) return;

      wordElement.addEventListener('mouseenter', () => {
        this.timerManager.clear('word-hide');
        this.timerManager.clear('word-show');
        this.hideWordTooltip();

        this.timerManager.set(
          'word-show',
          () => {
            void this.showWordTooltip(wordElement as HTMLElement, word);
          },
          TIMER_CONSTANTS.WORD_SHOW_DELAY,
        );
      });

      wordElement.addEventListener('mouseleave', () => {
        this.timerManager.clear('word-show');

        this.timerManager.set(
          'word-hide',
          () => {
            this.hideWordTooltip();
          },
          TIMER_CONSTANTS.HIDE_DELAY,
        );
      });
    });
  }

  private async showWordTooltip(
    wordElement: HTMLElement,
    word: string,
  ): Promise<void> {
    try {
      this.forceCleanupWordTooltips();
      this.cancelAllMainTooltipHideTimers();

      const wordTooltip = document.createElement('div');
      wordTooltip.className = 'wxt-word-tooltip';
      wordTooltip.appendChild(
        this.options.renderer.createNestedWordTooltipElement(word),
      );

      this.attachNestedWordTooltipEvents(wordTooltip, word);

      document.body.appendChild(wordTooltip);
      PositionUtils.positionTooltip(
        wordElement,
        wordTooltip,
        UI_CONSTANTS.WORD_TOOLTIP_Z_INDEX,
        'bottom',
      );

      this.currentWordTooltip = wordTooltip;

      requestAnimationFrame(() => {
        wordTooltip.style.visibility = 'visible';
        wordTooltip.style.opacity = '1';
      });

      void this.loadPhoneticForWordTooltip(wordTooltip, word);
      void this.loadMeaningForWordTooltip(wordTooltip, word);
    } catch (error) {
      console.error('显示单词悬浮框失败:', error);
    }
  }

  private attachNestedWordTooltipEvents(
    wordTooltip: HTMLElement,
    word: string,
  ): void {
    const audioBtns = wordTooltip.querySelectorAll('.wxt-accent-audio-btn');
    audioBtns.forEach((audioBtn) => {
      audioBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const accent = audioBtn.getAttribute('data-accent');
        if (accent === 'uk') {
          void this.options.speakTextWithAccent(word, 'en-GB');
        } else if (accent === 'us') {
          void this.options.speakTextWithAccent(word, 'en-US');
        } else {
          void this.options.speakText(word);
        }
      });
    });

    wordTooltip.addEventListener('mouseenter', (event) => {
      event.stopPropagation();
      this.timerManager.clear('word-hide');
      this.cancelAllMainTooltipHideTimers();
    });

    wordTooltip.addEventListener('mouseleave', (event) => {
      event.stopPropagation();
      this.timerManager.set(
        'word-hide',
        () => {
          this.hideWordTooltip();
        },
        TIMER_CONSTANTS.HIDE_DELAY,
      );
    });
  }

  private async loadPhoneticForMainTooltip(
    elementData: PronunciationElementData,
  ): Promise<void> {
    try {
      const currentTranslation = elementData.phonetic?.aiTranslation;
      const phonetic = await this.getPhoneticInfo(elementData.word);
      if (currentTranslation && !phonetic.aiTranslation) {
        phonetic.aiTranslation = currentTranslation;
      }
      elementData.phonetic = phonetic;
    } catch (error) {
      console.error('获取音标失败:', error);
      const currentTranslation = elementData.phonetic?.aiTranslation;
      elementData.phonetic = this.createPhoneticError(
        elementData.word,
        '音标获取异常',
      );
      if (currentTranslation) {
        elementData.phonetic.aiTranslation = currentTranslation;
      }
    }

    if (elementData.tooltip) {
      this.options.renderer.updateTooltipWithPhonetic(
        elementData.tooltip,
        elementData.phonetic,
      );
    }
  }

  private async loadMeaningForMainTooltip(
    elementData: PronunciationElementData,
  ): Promise<void> {
    try {
      const meaningResult = await this.options.translationProvider.getMeaning(
        elementData.word,
      );
      if (!meaningResult.success || !meaningResult.data) {
        return;
      }

      elementData.phonetic ??= this.createEmptyPhoneticInfo(elementData.word);
      elementData.phonetic.aiTranslation = meaningResult.data;

      if (elementData.tooltip) {
        this.options.renderer.updateTooltipWithMeaning(
          elementData.tooltip,
          meaningResult.data.explain,
        );
      }
    } catch (error) {
      console.error('获取AI翻译失败:', error);
    }
  }

  private async loadPhoneticForWordTooltip(
    wordTooltip: HTMLElement,
    word: string,
  ): Promise<void> {
    let phonetic: PhoneticInfo;
    try {
      phonetic = await this.getPhoneticInfo(word);
    } catch (error) {
      console.error('获取单词悬浮框音标失败:', error);
      phonetic = this.createPhoneticError(word, '音标获取异常');
    }

    if (this.currentWordTooltip === wordTooltip) {
      this.options.renderer.updateTooltipWithPhonetic(wordTooltip, phonetic);
    }
  }

  private async loadMeaningForWordTooltip(
    wordTooltip: HTMLElement,
    word: string,
  ): Promise<void> {
    try {
      const meaningResult =
        await this.options.translationProvider.getMeaning(word);
      if (
        meaningResult.success &&
        meaningResult.data &&
        this.currentWordTooltip === wordTooltip
      ) {
        this.options.renderer.updateTooltipWithMeaning(
          wordTooltip,
          meaningResult.data.explain,
        );
      }
    } catch (error) {
      console.error('获取单词悬浮框词义失败:', error);
    }
  }

  private async getPhoneticInfo(word: string): Promise<PhoneticInfo> {
    const result = await this.options.phoneticProvider.getPhonetic(word);
    if (result.success && result.data) {
      return result.data;
    }

    return this.createPhoneticError(word, result.error || '音标获取失败');
  }

  private createEmptyPhoneticInfo(word: string): PhoneticInfo {
    return {
      word,
      phonetics: [],
    };
  }

  private createPhoneticError(word: string, message: string): PhoneticInfo {
    return {
      word,
      phonetics: [],
      error: {
        hasPhoneticError: true,
        phoneticErrorMessage: message,
      },
    };
  }

  private cancelAllMainTooltipHideTimers(): void {
    for (const [element] of this.elementDataMap.entries()) {
      this.timerManager.clear(`hide-${DOMUtils.getElementKey(element)}`);
    }
  }

  private restartMainTooltipHideTimer(): void {
    if (!this.currentMainElement) return;

    const elementData = this.elementDataMap.get(this.currentMainElement);
    if (!elementData) return;

    const elementKey = DOMUtils.getElementKey(this.currentMainElement);
    this.timerManager.set(
      `hide-${elementKey}`,
      () => {
        if (!this.currentWordTooltip) {
          this.hideTooltip(elementData);
        }
      },
      TIMER_CONSTANTS.HIDE_DELAY,
    );
  }

  private hideWordTooltip(): void {
    if (!this.currentWordTooltip) return;

    this.currentWordTooltip.remove();
    this.currentWordTooltip = null;
    this.restartMainTooltipHideTimer();
  }

  private readonly handleDocumentKeyDown = async (
    event: KeyboardEvent,
  ): Promise<void> => {
    if (event.key !== 'Control' || this.isCtrlPressed) {
      return;
    }

    this.isCtrlPressed = true;

    const userSettings = await this.options.storageService.getUserSettings();
    const hotkey = userSettings.pronunciationHotkey;
    if (!hotkey || !hotkey.enabled) {
      return;
    }

    if (this.currentlyHoveredData) {
      event.preventDefault();
      await this.handleMouseEnter(this.currentlyHoveredData);
    }
  };

  private readonly handleDocumentKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Control') {
      this.isCtrlPressed = false;
    }
  };

  private readonly handleWindowBlur = (): void => {
    this.isCtrlPressed = false;
  };
}

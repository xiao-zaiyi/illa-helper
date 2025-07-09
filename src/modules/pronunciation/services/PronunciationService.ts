/**
 * 发音服务主类
 * 协调音标获取和朗读功能，作为对外的统一接口
 */

import { IPhoneticProvider, PhoneticProviderFactory } from '../phonetic';
import { ITTSProvider, TTSProviderFactory } from '../tts';
import { AITranslationProvider } from '../translation';
import { TooltipRenderer } from '../ui/TooltipRenderer';
import { PhoneticResult, TTSResult, PronunciationElementData } from '../types';
import {
  PronunciationConfig,
  DEFAULT_PRONUNCIATION_CONFIG,
  TIMER_CONSTANTS,
  CSS_CLASSES,
  UI_CONSTANTS,
} from '../config';
import { ApiConfig } from '../../shared/types/api';
import { DEFAULT_API_CONFIG } from '../../shared/constants/defaults';
import { StorageService } from '../../core/storage';
import { OriginalWordDisplayMode } from '../../shared/types/core';
import { safeSetInnerHTML } from '@/src/utils';

/**
 * 定时器管理器 - 统一管理所有定时器
 */
class TimerManager {
  private timers = new Map<string, number>();

  set(key: string, callback: () => void, delay: number): void {
    this.clear(key);
    const timerId = window.setTimeout(() => {
      callback();
      this.timers.delete(key);
    }, delay);
    this.timers.set(key, timerId);
  }

  clear(key: string): void {
    const timerId = this.timers.get(key);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(key);
    }
  }

  clearAll(): void {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }
}

/**
 * 通用定位工具类
 */
class PositionUtils {
  static positionTooltip(
    element: HTMLElement,
    tooltip: HTMLElement,
    zIndex: number = UI_CONSTANTS.TOOLTIP_Z_INDEX,
    position: 'top' | 'bottom' | 'auto' = 'auto',
  ): void {
    // 先设置基本样式，让tooltip可以被测量
    tooltip.style.cssText = `
      position: fixed;
      visibility: hidden;
      z-index: ${zIndex};
    `;

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    // 计算水平位置（居中对齐）
    let left = rect.left + (rect.width - tooltipRect.width) / 2;
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // 计算垂直位置
    let top: number;
    let arrowClass: string;

    if (position === 'bottom') {
      // 强制显示在下方
      top = rect.bottom + 12;
      arrowClass = 'wxt-tooltip-arrow wxt-tooltip-arrow-top';
    } else if (position === 'top') {
      // 强制显示在上方
      top = rect.top - tooltipRect.height - 12;
      arrowClass = 'wxt-tooltip-arrow';
    } else {
      // 自动选择（优先显示在上方）
      top = rect.top - tooltipRect.height - 12;
      arrowClass = 'wxt-tooltip-arrow';

      // 如果上方空间不足，显示在下方
      if (top < padding) {
        top = rect.bottom + 12;
        arrowClass = 'wxt-tooltip-arrow wxt-tooltip-arrow-top';
      }
    }

    // 垂直边界检查
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    // 更新箭头样式
    const arrow = tooltip.querySelector('.wxt-tooltip-arrow');
    if (arrow) {
      arrow.className = arrowClass;
    }

    // 应用最终位置
    tooltip.style.cssText = `
      position: fixed;
      left: ${left}px;
      top: ${top}px;
      z-index: ${zIndex};
      visibility: visible;
    `;
  }
}

/**
 * 发音服务核心类
 *
 * 该类是整个发音系统的核心协调器，负责管理音标获取、词义翻译、
 * 语音合成和用户界面的完整生命周期。集成了多个提供者（音标、TTS、翻译）
 * 和UI组件，为用户提供完整的单词学习体验。
 *
 * 主要职责：
 * - 管理元素的发音功能注册和注销
 * - 协调音标获取和AI翻译的异步加载
 * - 控制悬浮框的显示逻辑和定时管理
 * - 提供语音合成服务（主要和备用TTS）
 * - 管理缓存和性能优化
 *
 * @author AI Assistant
 * @version 2.0.0
 */
export class PronunciationService {
  /** 发音服务配置 */
  private config: PronunciationConfig;

  /** 音标提供者实例 */
  private phoneticProvider: IPhoneticProvider;

  /** 主要TTS提供者 */
  private ttsProvider: ITTSProvider;

  /** 备用TTS提供者 */
  private fallbackTTSProvider: ITTSProvider;

  /** AI翻译提供者实例 */
  private aiTranslationProvider: AITranslationProvider;

  /** 悬浮框渲染器 */
  private tooltipRenderer: TooltipRenderer;

  /** 元素数据映射表，存储每个注册元素的相关数据 */
  private elementDataMap = new Map<HTMLElement, PronunciationElementData>();

  /** 定时器管理器，统一管理所有延迟操作 */
  private timerManager = new TimerManager();

  /** 当前显示的单词悬浮框引用 */
  private currentWordTooltip: HTMLElement | null = null;

  /** 当前显示的主悬浮框引用 */
  private currentMainTooltip: HTMLElement | null = null;

  /** 当前主悬浮框对应的元素 */
  private currentMainElement: HTMLElement | null = null;

  /** StorageService实例，用于获取用户设置 */
  private storageService: StorageService;

  /** 跟踪Ctrl键是否被按下 */
  private isCtrlPressed = false;

  /** 当前鼠标悬停的元素数据 */
  private currentlyHoveredData: PronunciationElementData | null = null;

  constructor(config?: Partial<PronunciationConfig>, apiConfig?: ApiConfig) {
    this.config = { ...DEFAULT_PRONUNCIATION_CONFIG, ...config };
    this.phoneticProvider = PhoneticProviderFactory.createProvider(
      this.config.provider,
    );
    this.ttsProvider = TTSProviderFactory.createProvider(
      this.config.ttsConfig.provider,
      this.config.ttsConfig,
    );
    // 创建AI翻译提供者，优先使用传入的API配置，否则使用默认配置
    const effectiveApiConfig = apiConfig || DEFAULT_API_CONFIG;
    this.aiTranslationProvider = new AITranslationProvider(effectiveApiConfig);
    // 创建TooltipRenderer实例，传入UI配置和默认的原文显示模式
    // 注意：实际的原文显示模式会在运行时从StorageService获取
    this.tooltipRenderer = new TooltipRenderer(this.config.uiConfig, OriginalWordDisplayMode.HIDDEN);
    this.storageService = StorageService.getInstance();

    // 始终创建Web Speech作为备用TTS提供者
    this.fallbackTTSProvider = TTSProviderFactory.createProvider('web-speech', {
      lang: this.config.ttsConfig.lang,
      rate: this.config.ttsConfig.rate,
      pitch: this.config.ttsConfig.pitch,
      volume: this.config.ttsConfig.volume,
    });

    // 绑定方法上下文
    this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);
    this.handleDocumentKeyUp = this.handleDocumentKeyUp.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);

    // 设置全局事件监听器
    document.addEventListener('keydown', this.handleDocumentKeyDown);
    document.addEventListener('keyup', this.handleDocumentKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);

    // 初始化时获取原文显示模式
    this.updateOriginalWordDisplayMode();
  }

  /**
   * 为翻译元素添加发音功能
   */
  async addPronunciationToElement(
    element: HTMLElement,
    word: string,
    isPhrase?: boolean,
  ): Promise<boolean> {
    try {
      if (!element || !word || this.elementDataMap.has(element)) {
        return false;
      }
      // 为元素添加唯一标识
      if (!element.getAttribute('data-wxt-id')) {
        element.setAttribute(
          'data-wxt-id',
          `wxt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        );
      }

      // 创建元素数据
      const elementData: PronunciationElementData = {
        word: word.toLowerCase().trim(),
        element,
      };

      // 读取原文信息（如果存在）
      const originalText = element.getAttribute('data-original-text');
      if (originalText) {
        elementData.originalText = originalText;
      }

      // 存储元素数据
      this.elementDataMap.set(element, elementData);

      // 添加CSS类名
      element.classList.add(CSS_CLASSES.PRONUNCIATION_ENABLED);

      // 如果启用了内联显示，预加载音标
      if (this.config.uiConfig.inlineDisplay) {
        await this.preloadPhonetic(elementData);
      }

      // 添加事件监听器
      this.attachEventListeners(element, elementData);

      return true;
    } catch (error) {
      console.error('添加发音功能失败:', error);
      return false;
    }
  }

  /**
   * 移除元素的发音功能
   */
  removePronunciationFromElement(element: HTMLElement): void {
    const elementData = this.elementDataMap.get(element);
    if (!elementData) return;

    // 移除事件监听器
    this.removeEventListeners(element);

    // 清理相关定时器
    const elementKey = this.getElementKey(element);
    this.timerManager.clear(`hide-${elementKey}`);
    this.timerManager.clear(`show-${elementKey}`);

    // 移除工具提示
    if (elementData.tooltip) {
      elementData.tooltip.remove();
    }

    // 如果移除的是当前主悬浮框，清除引用
    if (this.currentMainElement === element) {
      this.currentMainTooltip = null;
      this.currentMainElement = null;
    }

    // 移除CSS类名
    element.classList.remove(
      CSS_CLASSES.PRONUNCIATION_ENABLED,
      CSS_CLASSES.PRONUNCIATION_LOADING,
    );

    // 清理数据
    this.elementDataMap.delete(element);
  }

  /**
   * 获取单词的音标信息
   */
  async getPhonetic(word: string): Promise<PhoneticResult> {
    return this.phoneticProvider.getPhonetic(word);
  }

  /**
   * 朗读文本
   * 支持回退策略：主TTS提供者失败时自动回退到Web Speech API
   */
  async speakText(text: string): Promise<TTSResult> {
    try {
      // 停止当前播放
      this.stopSpeaking();

      // 首先尝试主TTS提供者
      const primaryResult = await this.ttsProvider.speak(text);

      if (primaryResult.success) {
        return primaryResult;
      }

      // 主提供者失败，尝试回退到备用提供者
      console.warn(
        `主TTS提供者(${this.ttsProvider.name})失败，回退到备用提供者`,
        primaryResult.error,
      );

      // 检查备用提供者是否可用
      if (!this.fallbackTTSProvider.isAvailable()) {
        return {
          success: false,
          error: `主TTS提供者失败且备用提供者不可用: ${primaryResult.error}`,
        };
      }

      // 使用备用提供者
      const fallbackResult = await this.fallbackTTSProvider.speak(text);

      if (fallbackResult.success) {
        console.info(
          `TTS回退成功，使用备用提供者(${this.fallbackTTSProvider.name})`,
        );
        return {
          success: true,
          // 可以选择是否告知用户使用了备用方案
        };
      } else {
        return {
          success: false,
          error: `主TTS和备用TTS都失败: 主=${primaryResult.error}, 备用=${fallbackResult.error}`,
        };
      }
    } catch (error) {
      // 处理意外错误
      console.error('TTS朗读过程中发生意外错误:', error);

      // 尝试备用提供者
      try {
        if (this.fallbackTTSProvider.isAvailable()) {
          const fallbackResult = await this.fallbackTTSProvider.speak(text);
          if (fallbackResult.success) {
            console.info('TTS异常回退成功');
            return { success: true };
          }
        }
      } catch (fallbackError) {
        console.error('备用TTS也发生异常:', fallbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '朗读功能暂时不可用',
      };
    }
  }

  /**
   * 停止朗读
   * 同时停止主TTS提供者和备用TTS提供者
   */
  stopSpeaking(): void {
    try {
      this.ttsProvider.stop();
    } catch (error) {
      console.error('停止主TTS提供者时出错:', error);
    }

    try {
      this.fallbackTTSProvider.stop();
    } catch (error) {
      console.error('停止备用TTS提供者时出错:', error);
    }
  }

  /**
   * 使用指定口音朗读文本
   */
  async speakTextWithAccent(text: string, lang: string): Promise<TTSResult> {
    try {
      console.log(`[DEBUG] 使用口音朗读: text="${text}", lang="${lang}"`);

      // 强制停止所有正在播放的音频
      this.stopSpeaking();

      // 将语言代码转换为有道TTS支持的口音参数
      const accentMap: { [key: string]: 'us' | 'uk' } = {
        'en-US': 'us',
        'en-GB': 'uk',
      };

      const accent = accentMap[lang];
      // 首先尝试主TTS提供者（有道TTS支持口音）
      if (accent && this.ttsProvider.name === 'youdao') {
        const youdaoConfig = {
          accent: accent,
          rate: this.config.ttsConfig.rate,
          pitch: this.config.ttsConfig.pitch,
          volume: this.config.ttsConfig.volume,
        };

        const primaryResult = await this.ttsProvider.speak(text, youdaoConfig);

        if (primaryResult.success) {
          return primaryResult;
        }

        console.warn(
          `有道TTS口音朗读失败: ${primaryResult.error}，尝试Web Speech`,
        );
      }

      // 回退到Web Speech API
      const webSpeechConfig = {
        lang: lang,
        rate: this.config.ttsConfig.rate,
        pitch: this.config.ttsConfig.pitch,
        volume: this.config.ttsConfig.volume,
      };

      const fallbackResult = await this.fallbackTTSProvider.speak(
        text,
        webSpeechConfig,
      );

      if (fallbackResult.success) {
        return fallbackResult;
      }

      // 如果所有方法都失败，使用默认发音
      console.warn(`所有口音朗读方法都失败，使用默认发音`);
      return await this.speakText(text);
    } catch (error) {
      console.error('口音朗读失败:', error);
      // 失败时回退到默认发音
      return await this.speakText(text);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PronunciationConfig>): void {
    this.config = { ...this.config, ...config };

    // 更新音标提供者
    if (config.provider && config.provider !== this.phoneticProvider.name) {
      this.phoneticProvider = PhoneticProviderFactory.createProvider(
        config.provider,
      );
    }

    // 更新TTS提供者
    if (config.ttsConfig) {
      if (
        config.ttsConfig.provider &&
        config.ttsConfig.provider !== this.ttsProvider.name
      ) {
        this.ttsProvider = TTSProviderFactory.createProvider(
          config.ttsConfig.provider,
          config.ttsConfig,
        );
      } else {
        this.ttsProvider.updateConfig(config.ttsConfig);
      }

      // 同时更新备用TTS提供者的相关配置（保持Web Speech配置同步）
      this.fallbackTTSProvider.updateConfig({
        lang: config.ttsConfig.lang,
        rate: config.ttsConfig.rate,
        pitch: config.ttsConfig.pitch,
        volume: config.ttsConfig.volume,
      });
    }

    // 更新UI配置时，同时获取并更新原文显示模式
    if (config.uiConfig) {
      this.tooltipRenderer.updateConfig(config.uiConfig);
      // 异步更新原文显示模式
      this.updateOriginalWordDisplayMode();
    }
  }

  /**
   * 更新原文显示模式
   * 从存储服务获取当前设置并更新TooltipRenderer
   */
  private async updateOriginalWordDisplayMode(): Promise<void> {
    try {
      const userSettings = await this.storageService.getUserSettings();
      const mode = userSettings.originalWordDisplayMode || OriginalWordDisplayMode.VISIBLE;
      this.tooltipRenderer.updateOriginalWordDisplayMode(mode);
    } catch (error) {
      console.error('更新原文显示模式失败:', error);
      // 发生错误时使用默认值
      this.tooltipRenderer.updateOriginalWordDisplayMode(OriginalWordDisplayMode.VISIBLE);
    }
  }

  /**
   * 更新API配置
   * 支持运行时API配置更新，配置变更会立即生效
   */
  async updateApiConfig(apiConfig?: ApiConfig): Promise<void> {
    try {
      // 如果提供了参数，直接使用；否则从存储获取
      const configToUse =
        apiConfig || (await this.storageService.getActiveApiConfig());
      if (configToUse) {
        this.aiTranslationProvider.updateApiConfig(configToUse);
        console.log('API配置已更新');
      } else {
        console.warn('未找到活跃的API配置');
      }
    } catch (error) {
      console.error('更新API配置失败:', error);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): PronunciationConfig {
    return { ...this.config };
  }

  /**
   * 获取TTS提供者状态信息
   */
  getTTSProviderStatus(): {
    primary: { name: string; available: boolean; speaking: boolean };
    fallback: { name: string; available: boolean; speaking: boolean };
  } {
    return {
      primary: {
        name: this.ttsProvider.name,
        available: this.ttsProvider.isAvailable(),
        speaking: this.ttsProvider.isSpeaking(),
      },
      fallback: {
        name: this.fallbackTTSProvider.name,
        available: this.fallbackTTSProvider.isAvailable(),
        speaking: this.fallbackTTSProvider.isSpeaking(),
      },
    };
  }

  /**
   * 获取元素的唯一键
   */
  private getElementKey(element: HTMLElement): string {
    return element.getAttribute('data-wxt-id') || 'unknown';
  }

  /**
   * 预加载音标信息
   */
  private async preloadPhonetic(
    elementData: PronunciationElementData,
  ): Promise<void> {
    if (elementData.phonetic) return;

    try {
      elementData.element.classList.add('wxt-pronunciation-loading');

      const result = await this.phoneticProvider.getPhonetic(elementData.word);
      if (result.success && result.data) {
        elementData.phonetic = result.data;
        this.displayInlinePhonetic(elementData);
      }
    } catch (error) {
      console.error('预加载音标失败:', error);
    } finally {
      elementData.element.classList.remove('wxt-pronunciation-loading');
    }
  }

  /**
   * 显示内联音标
   */
  private displayInlinePhonetic(elementData: PronunciationElementData): void {
    if (!elementData.phonetic || !this.config.uiConfig.showPhonetic) return;

    const phoneticText = elementData.phonetic.phonetics[0]?.text;
    if (!phoneticText) return;

    // 创建音标元素
    const phoneticSpan = document.createElement('span');
    phoneticSpan.className = 'wxt-phonetic-inline';
    phoneticSpan.textContent = ` ${phoneticText}`;
    phoneticSpan.style.cssText = `
      font-size: 0.85em;
      color: #666;
      margin-left: 2px;
      font-style: italic;
    `;

    elementData.element.appendChild(phoneticSpan);
  }

  /**
   * 添加事件监听器
   */
  private attachEventListeners(
    element: HTMLElement,
    elementData: PronunciationElementData,
  ): void {
    const mouseEnterHandler = async () => {
      elementData.isMouseOver = true;
      this.currentlyHoveredData = elementData;

      // 检查快捷键要求
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

    // 存储处理器引用以便后续移除
    (element as any).__wxtHandlers = {
      mouseEnterHandler,
      mouseLeaveHandler,
    };
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(element: HTMLElement): void {
    const handlers = (element as any).__wxtHandlers;
    if (handlers) {
      element.removeEventListener('mouseenter', handlers.mouseEnterHandler);
      element.removeEventListener('mouseleave', handlers.mouseLeaveHandler);
      delete (element as any).__wxtHandlers;
    }
  }

  /**
   * 检查快捷键是否满足要求
   */
  private async checkHotkey(): Promise<boolean> {
    try {
      // 使用直接导入的StorageService
      const userSettings = await this.storageService.getUserSettings();
      const hotkey = userSettings.pronunciationHotkey;

      // 如果没有配置或未启用快捷键，直接允许
      if (!hotkey || !hotkey.enabled) {
        return true;
      }

      // 检查内部维护的Ctrl键状态
      return this.isCtrlPressed;
    } catch (error) {
      console.error('获取快捷键配置失败:', error);
      // 出错时默认允许
      return true;
    }
  }

  /**
   * 处理鼠标进入事件的核心逻辑
   *
   * 该方法是发音系统响应用户交互的核心入口，实现了非阻塞式异步加载策略：
   * 1. 对于短语：直接显示交互式单词列表
   * 2. 对于单词：立即显示包含加载状态的悬浮框，然后并行获取音标和翻译
   * 3. 实现了立即响应的用户体验，消除感知延迟
   * 4. 支持优雅降级：即使音标获取失败，仍可显示翻译内容
   *
   * 新的异步加载策略说明：
   * - 立即显示悬浮框框架，包含加载状态指示
   * - 音标和翻译并行异步获取，不阻塞界面显示
   * - 数据返回后动态更新已显示的悬浮框对应区域
   *
   * @param elementData - 元素数据对象，包含单词、DOM元素等信息
   */
  private async handleMouseEnter(
    elementData: PronunciationElementData,
  ): Promise<void> {
    if (!this.config.uiConfig.tooltipEnabled) return;

    const elementKey = this.getElementKey(elementData.element);

    // 取消之前的定时器
    this.timerManager.clear(`hide-${elementKey}`);
    this.timerManager.clear(`show-${elementKey}`);

    // 设置延迟显示定时器
    this.timerManager.set(
      `show-${elementKey}`,
      async () => {
        // 检查是否为短语
        const words = this.extractWords(elementData.word);
        const isPhrase = words.length > 1;

        // 如果是短语，直接显示悬浮框，不需要获取音标
        if (isPhrase) {
          this.showTooltip(elementData);
          return;
        }

        // 单词情况：立即显示悬浮框，然后异步加载数据
        // 检查是否需要获取音标数据
        const needPhonetic = !elementData.phonetic;
        // 检查是否需要获取AI翻译
        const needMeaning = !elementData.phonetic?.aiTranslation;

        // 如果没有任何数据，创建基础结构以支持加载状态显示
        if (!elementData.phonetic) {
          elementData.phonetic = {
            word: elementData.word,
            phonetics: [],
          };
        }

        // 立即显示悬浮框（包含加载状态）
        this.showTooltip(elementData);

        // 并行异步获取音标和翻译数据
        const promises: Promise<void>[] = [];

        // 异步获取音标数据
        if (needPhonetic) {
          const phoneticPromise = this.phoneticProvider
            .getPhonetic(elementData.word)
            .then((phoneticResult) => {
              if (phoneticResult.success && phoneticResult.data) {
                // 更新音标数据
                if (elementData.phonetic) {
                  elementData.phonetic.phonetics =
                    phoneticResult.data.phonetics;
                  elementData.phonetic.meanings = phoneticResult.data.meanings;
                } else {
                  elementData.phonetic = phoneticResult.data;
                }
              } else {
                // 音标获取失败时，设置错误信息
                if (elementData.phonetic) {
                  elementData.phonetic.error = {
                    hasPhoneticError: true,
                    phoneticErrorMessage:
                      phoneticResult.error || '音标获取失败',
                  };
                }
              }

              // 动态更新已显示的悬浮框中的音标内容
              if (elementData.tooltip) {
                this.tooltipRenderer.updateTooltipWithPhonetic(
                  elementData.tooltip,
                  elementData.phonetic,
                );
              }
            })
            .catch((error) => {
              console.error('获取音标失败:', error);
              // 异常情况设置错误状态
              if (elementData.phonetic) {
                elementData.phonetic.error = {
                  hasPhoneticError: true,
                  phoneticErrorMessage: '音标获取异常',
                };
              }

              // 更新悬浮框显示错误状态
              if (elementData.tooltip) {
                this.tooltipRenderer.updateTooltipWithPhonetic(
                  elementData.tooltip,
                  elementData.phonetic,
                );
              }
            });

          promises.push(phoneticPromise);
        }

        // 异步获取AI翻译数据
        if (needMeaning) {
          const meaningPromise = this.aiTranslationProvider
            .getMeaning(elementData.word)
            .then((meaningResult) => {
              if (meaningResult.success && meaningResult.data) {
                // 将AI翻译数据集成到音标信息结构中
                if (!elementData.phonetic) {
                  // 如果没有音标数据，创建基础结构
                  elementData.phonetic = {
                    word: elementData.word,
                    phonetics: [],
                    aiTranslation: meaningResult.data,
                  };
                } else {
                  // 如果已有音标数据，添加翻译信息
                  elementData.phonetic.aiTranslation = meaningResult.data;
                }

                // 动态更新已显示的悬浮框中的词义内容
                if (elementData.tooltip) {
                  this.tooltipRenderer.updateTooltipWithMeaning(
                    elementData.tooltip,
                    meaningResult.data.explain,
                  );
                }
              }
            })
            .catch((error) => {
              console.error('获取AI翻译失败:', error);
              // 翻译失败不影响音标功能，实现优雅降级
            });

          promises.push(meaningPromise);
        }

        // 不等待异步操作完成，让它们在后台运行
        // 这确保了界面的即时响应性
      },
      TIMER_CONSTANTS.SHOW_DELAY,
    ); // 显示延迟
  }

  /**
   * 处理鼠标离开事件
   */
  private handleMouseLeave(elementData: PronunciationElementData): void {
    const elementKey = this.getElementKey(elementData.element);

    // 取消显示定时器（如果还在等待显示）
    this.timerManager.clear(`show-${elementKey}`);

    // 延迟隐藏工具提示，给用户时间移动到tooltip上
    this.timerManager.set(
      `hide-${elementKey}`,
      () => {
        // 只有在没有单词悬浮框显示时才隐藏主悬浮框
        if (!this.currentWordTooltip) {
          this.hideTooltip(elementData);
        }
      },
      TIMER_CONSTANTS.HIDE_DELAY,
    ); // 隐藏延迟
  }

  /**
   * 显示工具提示
   */
  private showTooltip(elementData: PronunciationElementData): void {
    // 只清理其他元素的悬浮框，保留当前元素的定时器
    this.cleanupOtherTooltips(elementData.element);

    // 同时隐藏单词悬浮框
    this.hideWordTooltip();

    // 检查是否为短语
    const words = this.extractWords(elementData.word);
    const isPhrase = words.length > 1;

    // 对于短语直接显示，对于单词检查是否有音标或词义数据
    if (!isPhrase && !elementData.phonetic) {
      // 如果没有音标数据，创建一个基础的音标结构以支持词义显示
      elementData.phonetic = {
        word: elementData.word,
        phonetics: [],
      };
    }

    // 如果已存在工具提示，先移除
    if (elementData.tooltip) {
      elementData.tooltip.remove();
    }

    // 创建工具提示
    const tooltip = this.createTooltip(elementData);
    elementData.tooltip = tooltip;
    document.body.appendChild(tooltip);

    // 定位工具提示
    PositionUtils.positionTooltip(elementData.element, tooltip);

    // 设置为当前主悬浮框
    this.currentMainTooltip = tooltip;
    this.currentMainElement = elementData.element;
  }

  /**
   * 隐藏工具提示
   */
  private hideTooltip(elementData: PronunciationElementData): void {
    if (elementData.tooltip) {
      elementData.tooltip.remove();
      elementData.tooltip = undefined;
    }

    // 如果隐藏的是当前主悬浮框，清除引用
    if (this.currentMainElement === elementData.element) {
      this.currentMainTooltip = null;
      this.currentMainElement = null;
    }
  }

  /**
   * 清理其他元素的悬浮框，保留指定元素的定时器
   */
  private cleanupOtherTooltips(currentElement: HTMLElement): void {
    // 遍历所有元素，移除其他元素的悬浮框
    for (const [element, elementData] of this.elementDataMap.entries()) {
      if (element !== currentElement && elementData.tooltip) {
        // 清理其他元素的定时器
        const elementKey = this.getElementKey(element);
        this.timerManager.clear(`hide-${elementKey}`);
        this.timerManager.clear(`show-${elementKey}`);

        // 移除悬浮框
        elementData.tooltip.remove();
        elementData.tooltip = undefined;
      }
    }

    // 清理单词悬浮框相关定时器
    this.timerManager.clear('word-show');
    this.timerManager.clear('word-hide');

    // 更新当前主悬浮框引用
    this.currentMainTooltip = null;
    this.currentMainElement = null;

    // 强制清理页面上所有悬浮框元素（包括可能的遗留元素）
    const allTooltips = document.querySelectorAll(
      '.wxt-pronunciation-tooltip, .wxt-word-tooltip',
    );
    allTooltips.forEach((tooltip) => {
      try {
        tooltip.remove();
      } catch (_) {
        console.info(_);
      }
    });
  }

  /**
   * 强制清理所有单词悬浮框
   */
  private forceCleanupWordTooltips(): void {
    // 清理单词相关定时器
    this.timerManager.clear('word-show');
    this.timerManager.clear('word-hide');

    // 移除当前单词悬浮框
    if (this.currentWordTooltip) {
      this.currentWordTooltip.remove();
      this.currentWordTooltip = null;
    }

    // 清理页面上所有可能遗留的单词悬浮框元素
    const existingWordTooltips = document.querySelectorAll('.wxt-word-tooltip');
    existingWordTooltips.forEach((tooltip) => tooltip.remove());
  }

  /**
   * 创建工具提示
   */
  private createTooltip(elementData: PronunciationElementData): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'wxt-pronunciation-tooltip';

    // 使用TooltipRenderer生成HTML内容
    safeSetInnerHTML(
      tooltip,
      this.tooltipRenderer.createMainTooltipHTML(elementData),
    );

    // 添加主悬浮框事件处理
    this.attachTooltipEventListeners(tooltip, elementData);

    // 检查是否为短语（包含多个单词）
    const words = this.extractWords(elementData.word);
    const isPhrase = words.length > 1;

    // 如果是短语，添加单词交互功能
    if (isPhrase) {
      this.setupWordInteractions(tooltip, words);
    }

    return tooltip;
  }

  /**
   * 为tooltip添加事件监听器
   */
  private attachTooltipEventListeners(
    tooltip: HTMLElement,
    elementData: PronunciationElementData,
  ): void {
    const elementKey = this.getElementKey(elementData.element);

    tooltip.addEventListener('mouseenter', () => {
      // 鼠标进入悬浮框时，取消隐藏定时器
      this.timerManager.clear(`hide-${elementKey}`);
    });

    tooltip.addEventListener('mouseleave', () => {
      // 鼠标离开悬浮框时，延迟隐藏主悬浮框
      this.timerManager.set(
        `hide-${elementKey}`,
        () => {
          // 只有在没有单词悬浮框显示时才隐藏主悬浮框
          if (!this.currentWordTooltip) {
            this.hideTooltip(elementData);
          }
        },
        TIMER_CONSTANTS.HIDE_DELAY,
      );
    });

    // 添加朗读功能
    const audioBtn = tooltip.querySelector('.wxt-audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speakText(elementData.word);
      });
    }
  }

  /**
   * 提取单词
   */
  private extractWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0 && /^[a-zA-Z\-']+$/.test(word))
      .map((word) => word.replace(/^[^\w\-']+|[^\w\-']+$/g, ''))
      .filter((word) => word.length > 0);
  }

  /**
   * 为短语悬浮框中的单词设置交互
   */
  private setupWordInteractions(tooltip: HTMLElement, words: string[]): void {
    const wordElements = tooltip.querySelectorAll('.wxt-interactive-word');

    wordElements.forEach((wordElement) => {
      const word = wordElement.getAttribute('data-word');
      if (!word) return;

      wordElement.addEventListener('mouseenter', async () => {
        // 取消任何待执行的定时器
        this.timerManager.clear('word-hide');
        this.timerManager.clear('word-show');

        // 隐藏之前的单词悬浮框（确保唯一性）
        this.hideWordTooltip();

        // 设置延迟显示定时器
        this.timerManager.set(
          'word-show',
          async () => {
            await this.showWordTooltip(wordElement as HTMLElement, word);
          },
          TIMER_CONSTANTS.WORD_SHOW_DELAY,
        ); // 单词悬浮框显示延迟
      });

      wordElement.addEventListener('mouseleave', () => {
        // 取消显示定时器（如果还在等待显示）
        this.timerManager.clear('word-show');

        // 设置延迟隐藏定时器
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

  /**
   * 显示单词悬浮框（二级悬浮框）
   *
   * 应用与主悬浮框相同的立即显示+异步更新策略，
   * 消除等待API响应的延迟，提供即时的用户反馈。
   */
  private async showWordTooltip(
    wordElement: HTMLElement,
    word: string,
  ): Promise<void> {
    try {
      // 强制清理所有单词悬浮框
      this.forceCleanupWordTooltips();

      // 取消所有主悬浮框的隐藏定时器，防止主悬浮框在单词悬浮框显示时消失
      this.cancelAllMainTooltipHideTimers();

      // 立即创建并显示单词悬浮框（包含加载状态）
      const wordTooltip = document.createElement('div');
      wordTooltip.className = 'wxt-word-tooltip';

      // 使用TooltipRenderer生成嵌套单词悬浮框HTML（显示加载状态）
      safeSetInnerHTML(
        wordTooltip,
        this.tooltipRenderer.createNestedWordTooltipHTML(word),
      );

      // 添加朗读功能
      const audioBtns = wordTooltip.querySelectorAll('.wxt-accent-audio-btn');

      audioBtns.forEach((audioBtn, index) => {
        audioBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const accent = audioBtn.getAttribute('data-accent');

          // 根据口音设置不同的语言代码
          if (accent === 'uk') {
            // 英式发音
            this.speakTextWithAccent(word, 'en-GB');
          } else if (accent === 'us') {
            // 美式发音
            this.speakTextWithAccent(word, 'en-US');
          } else {
            // 默认发音
            this.speakText(word);
          }
        });
      });

      // 鼠标事件处理
      wordTooltip.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
        // 鼠标进入单词悬浮框时，取消单词悬浮框隐藏定时器
        this.timerManager.clear('word-hide');
        // 同时取消主悬浮框的隐藏定时器
        this.cancelAllMainTooltipHideTimers();
      });

      wordTooltip.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
        // 鼠标离开单词悬浮框时，延迟隐藏
        this.timerManager.set(
          'word-hide',
          () => {
            this.hideWordTooltip();
          },
          TIMER_CONSTANTS.HIDE_DELAY,
        );
      });

      // 定位和显示
      document.body.appendChild(wordTooltip);
      PositionUtils.positionTooltip(
        wordElement,
        wordTooltip,
        UI_CONSTANTS.WORD_TOOLTIP_Z_INDEX,
        'bottom',
      );

      // 设置为当前悬浮框，确保唯一性
      this.currentWordTooltip = wordTooltip;

      // 添加显示动画
      requestAnimationFrame(() => {
        wordTooltip.style.visibility = 'visible';
        wordTooltip.style.opacity = '1';
      });

      // 并行异步获取音标和翻译数据
      const promises: Promise<void>[] = [];

      // 异步获取音标数据
      const phoneticPromise = this.phoneticProvider
        .getPhonetic(word)
        .then((result) => {
          let phonetic;
          if (result.success && result.data) {
            // 音标获取成功
            phonetic = result.data;
          } else {
            // 音标获取失败，创建包含错误信息的基础结构
            phonetic = {
              word: word,
              phonetics: [],
              error: {
                hasPhoneticError: true,
                phoneticErrorMessage: result.error || '音标获取失败',
              },
            };
          }

          // 动态更新已显示的悬浮框中的音标内容
          if (this.currentWordTooltip === wordTooltip) {
            this.tooltipRenderer.updateTooltipWithPhonetic(
              wordTooltip,
              phonetic,
            );
          }
        })
        .catch((error) => {
          console.error('获取单词悬浮框音标失败:', error);
          // 异常情况设置错误状态
          const phonetic = {
            word: word,
            phonetics: [],
            error: {
              hasPhoneticError: true,
              phoneticErrorMessage: '音标获取异常',
            },
          };

          // 更新悬浮框显示错误状态
          if (this.currentWordTooltip === wordTooltip) {
            this.tooltipRenderer.updateTooltipWithPhonetic(
              wordTooltip,
              phonetic,
            );
          }
        });

      promises.push(phoneticPromise);

      // 异步获取翻译数据
      const meaningPromise = this.aiTranslationProvider
        .getMeaning(word)
        .then((meaningResult) => {
          if (meaningResult.success && meaningResult.data) {
            // 检查悬浮框是否仍然是当前显示的悬浮框
            if (this.currentWordTooltip === wordTooltip) {
              this.tooltipRenderer.updateTooltipWithMeaning(
                wordTooltip,
                meaningResult.data.explain,
              );
            }
          }
        })
        .catch((error) => {
          console.error('获取单词悬浮框词义失败:', error);
        });

      promises.push(meaningPromise);

      // 不等待异步操作完成，让它们在后台运行
      // 这确保了界面的即时响应性
    } catch (error) {
      console.error('显示单词悬浮框失败:', error);
    }
  }

  /**
   * 取消所有主悬浮框的隐藏定时器
   */
  private cancelAllMainTooltipHideTimers(): void {
    for (const [element] of this.elementDataMap.entries()) {
      const elementKey = this.getElementKey(element);
      this.timerManager.clear(`hide-${elementKey}`);
    }
  }

  /**
   * 重启当前主悬浮框的隐藏定时器
   */
  private restartMainTooltipHideTimer(): void {
    if (this.currentMainElement) {
      const elementData = this.elementDataMap.get(this.currentMainElement);
      if (elementData) {
        const elementKey = this.getElementKey(this.currentMainElement);
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
    }
  }

  /**
   * 隐藏单词悬浮框
   */
  private hideWordTooltip(): void {
    // 移除当前单词悬浮框
    if (this.currentWordTooltip) {
      this.currentWordTooltip.remove();
      this.currentWordTooltip = null;

      // 单词悬浮框隐藏后，重启主悬浮框的隐藏定时器
      this.restartMainTooltipHideTimer();
    }
  }

  /**
   * 全局键盘按下事件处理器
   */
  private async handleDocumentKeyDown(event: KeyboardEvent): Promise<void> {
    // 仅当Ctrl键被按下且之前未被按下时触发
    if (event.key === 'Control' && !this.isCtrlPressed) {
      this.isCtrlPressed = true;

      // 检查热键是否启用
      const userSettings = await this.storageService.getUserSettings();
      const hotkey = userSettings.pronunciationHotkey;
      if (!hotkey || !hotkey.enabled) {
        return;
      }

      // 如果鼠标正悬停在某个元素上，触发显示
      if (this.currentlyHoveredData) {
        event.preventDefault();
        await this.handleMouseEnter(this.currentlyHoveredData);
      }
    }
  }

  /**
   * 全局键盘松开事件处理器
   */
  private handleDocumentKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Control') {
      this.isCtrlPressed = false;
    }
  }

  /**
   * 窗口失焦事件处理器
   */
  private handleWindowBlur(): void {
    this.isCtrlPressed = false;
  }

  /**
   * 清理所有资源
   */
  destroy(): void {
    // 清理所有定时器
    this.timerManager.clearAll();

    // 隐藏当前单词悬浮框
    this.hideWordTooltip();

    // 清理主悬浮框引用
    this.currentMainTooltip = null;
    this.currentMainElement = null;

    // 移除所有元素的发音功能
    for (const element of this.elementDataMap.keys()) {
      this.removePronunciationFromElement(element);
    }

    // 停止朗读
    this.stopSpeaking();

    // 清理数据
    this.elementDataMap.clear();

    // 移除全局事件监听器
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    document.removeEventListener('keyup', this.handleDocumentKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }
}

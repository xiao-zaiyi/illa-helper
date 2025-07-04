/**
 * 悬浮框渲染器类
 *
 * 负责创建、渲染和管理所有类型的悬浮框UI组件，包括单词音标悬浮框、
 * 短语单词列表悬浮框等。提供完整的HTML生成、样式应用、位置计算
 * 和动态更新功能。
 *
 * 主要功能：
 * - 生成标准化的悬浮框HTML结构
 * - 集成SVG图标和样式系统
 * - 支持音标、词义、翻译的动态显示
 * - 实现响应式位置计算和边界检测
 * - 提供异步内容更新机制
 *
 * 悬浮框类型：
 * - 主悬浮框：显示单词音标和AI翻译
 * - 短语悬浮框：显示可交互的单词列表
 * - 嵌套悬浮框：短语中单个单词的详细信息
 *
 * @author AI Assistant
 * @version 2.0.0
 */

import { PronunciationElementData } from '../types';
import { PronunciationUIConfig, SVG_ICONS } from '../config';
import { DOMUtils } from '../utils';

export class TooltipRenderer {
  /** UI配置对象，控制悬浮框的显示选项和主题 */
  private uiConfig: PronunciationUIConfig;

  /**
   * 构造函数
   *
   * @param uiConfig - UI配置对象，包含显示选项、主题设置等
   */
  constructor(uiConfig: PronunciationUIConfig) {
    this.uiConfig = uiConfig;
  }

  /**
   * 创建主悬浮框HTML内容
   *
   * 根据输入内容的类型（单词或短语）动态生成相应的悬浮框HTML。
   * 为单词生成包含音标和翻译的悬浮框，为短语生成可交互的单词列表。
   *
   * @param elementData - 元素数据对象，包含单词/短语和相关音标信息
   * @returns HTML字符串，包含完整的悬浮框结构
   */
  createMainTooltipHTML(elementData: PronunciationElementData): string {
    const words = DOMUtils.extractWords(elementData.word);
    const isPhrase = words.length > 1;

    if (isPhrase) {
      return this.createPhraseTooltipHTML(elementData.word, words);
    } else {
      return this.createWordTooltipHTML(elementData);
    }
  }

  /**
   * 创建短语悬浮框HTML
   * @param phrase 短语文本
   * @param words 单词数组
   */
  private createPhraseTooltipHTML(phrase: string, words: string[]): string {
    const interactiveWordList = DOMUtils.createInteractiveWordList(words);

    return `
      <div class="wxt-tooltip-card">
        <div class="wxt-tooltip-header">
          <div class="wxt-word-info">
            <div class="wxt-phrase-text">${phrase}</div>
          </div>
          ${
            this.uiConfig.showPlayButton
              ? `
            <button class="wxt-audio-btn" title="朗读">
              ${SVG_ICONS.SPEAKER}
            </button>
          `
              : ''
          }
        </div>
        <div class="wxt-tooltip-body">
          <div class="wxt-phrase-words">${interactiveWordList}</div>
        </div>
        <div class="wxt-tooltip-arrow"></div>
      </div>
    `;
  }

  /**
   * 创建单词悬浮框HTML
   * @param elementData 元素数据
   */
  private createWordTooltipHTML(elementData: PronunciationElementData): string {
    const phonetic = elementData.phonetic;
    const phoneticText = phonetic?.phonetics[0]?.text || '';
    const aiTranslation = phonetic?.aiTranslation;
    const hasPhoneticError = phonetic?.error?.hasPhoneticError;
    const phoneticErrorMessage = phonetic?.error?.phoneticErrorMessage;

    // 音标显示逻辑：正常音标 > 错误提示 > 加载状态
    let phoneticDisplay = '';
    if (phoneticText) {
      phoneticDisplay = `<div class="wxt-phonetic-row"><div class="wxt-phonetic-text">${phoneticText}</div></div>`;
    } else if (hasPhoneticError) {
      phoneticDisplay = `<div class="wxt-phonetic-row"><div class="wxt-phonetic-error">${phoneticErrorMessage}</div></div>`;
    } else {
      // 显示音标加载状态
      phoneticDisplay = `<div class="wxt-phonetic-row"><div class="wxt-phonetic-loading">获取音标中...</div></div>`;
    }

    return `
      <div class="wxt-tooltip-card">
        <div class="wxt-tooltip-header">
          <div class="wxt-word-info">
            <div class="wxt-word-main">${elementData.word}</div>
            ${phoneticDisplay}
            <div class="wxt-meaning-container">
              ${
                aiTranslation
                  ? `<div class="wxt-meaning-text">${aiTranslation.explain}</div>`
                  : `<div class="wxt-meaning-loading">获取词义中...</div>`
              }
            </div>
          </div>
          ${
            this.uiConfig.showPlayButton
              ? `
            <button class="wxt-audio-btn" title="朗读单词">
              ${SVG_ICONS.SPEAKER}
            </button>
          `
              : ''
          }
        </div>
        <div class="wxt-tooltip-arrow"></div>
      </div>
    `;
  }

  /**
   * 创建嵌套单词悬浮框HTML（用于短语中的单词）
   * @param word 单词
   * @param phoneticText 音标文本
   * @param hasError 是否有音标错误
   * @param errorMessage 错误信息
   */
  createNestedWordTooltipHTML(
    word: string,
    phoneticText?: string,
    hasError?: boolean,
    errorMessage?: string,
  ): string {
    // 音标显示逻辑：正常音标 > 错误提示 > 加载状态
    let phoneticDisplay = '';
    if (phoneticText) {
      phoneticDisplay = `<div class="wxt-phonetic-text">${phoneticText}</div>`;
    } else if (hasError) {
      phoneticDisplay = `<div class="wxt-phonetic-error">${errorMessage || '音标获取失败'}</div>`;
    } else {
      // 显示音标加载状态
      phoneticDisplay = `<div class="wxt-phonetic-loading">获取音标中...</div>`;
    }

    return `
      <div class="wxt-word-tooltip-card">
        <div class="wxt-word-tooltip-header">
          <div class="wxt-word-info">
            <div class="wxt-word-title-row">
              <div class="wxt-word-main">${word}</div>
              <div class="wxt-accent-buttons">
                <div class="wxt-accent-group">
                  <span class="wxt-accent-label">英</span>
                  <button class="wxt-accent-audio-btn" data-accent="uk" title="英式发音">
                    ${SVG_ICONS.SPEAKER_SMALL}
                  </button>
                </div>
                <div class="wxt-accent-group">
                  <span class="wxt-accent-label">美</span>
                  <button class="wxt-accent-audio-btn" data-accent="us" title="美式发音">
                    ${SVG_ICONS.SPEAKER_SMALL}
                  </button>
                </div>
              </div>
            </div>
            <div class="wxt-phonetic-row">${phoneticDisplay}</div>
            <div class="wxt-meaning-container">
              <div class="wxt-meaning-loading">获取词义中...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 动态更新悬浮框的词义内容
   *
   * 异步更新已显示的悬浮框中的AI翻译内容，实现无缝的用户体验。
   * 移除加载提示，显示实际的翻译结果，支持内容的动态刷新。
   *
   * @param tooltip - 悬浮框DOM元素
   * @param meaning - AI翻译的词义字符串
   */
  updateTooltipWithMeaning(tooltip: HTMLElement, meaning: string): void {
    const meaningContainer = tooltip.querySelector('.wxt-meaning-container');
    if (!meaningContainer) return;

    // 隐藏加载提示
    const loadingElement = meaningContainer.querySelector(
      '.wxt-meaning-loading',
    );
    if (loadingElement) {
      loadingElement.remove();
    }

    // 显示或更新词义内容
    let meaningElement = meaningContainer.querySelector(
      '.wxt-meaning-text',
    ) as HTMLElement;
    if (!meaningElement) {
      meaningElement = document.createElement('div');
      meaningElement.className = 'wxt-meaning-text';
      meaningContainer.appendChild(meaningElement);
    }

    meaningElement.textContent = meaning;
    meaningElement.style.display = 'block';
  }

  /**
   * 动态更新悬浮框的音标内容
   *
   * 异步更新已显示的悬浮框中的音标内容，实现无缝的用户体验。
   * 移除加载提示，显示实际的音标结果，支持错误状态的处理。
   *
   * @param tooltip - 悬浮框DOM元素
   * @param phoneticInfo - 音标信息对象，包含音标数据或错误信息
   */
  updateTooltipWithPhonetic(tooltip: HTMLElement, phoneticInfo: any): void {
    const phoneticRow = tooltip.querySelector('.wxt-phonetic-row');
    if (!phoneticRow) return;

    // 移除加载提示
    const loadingElement = phoneticRow.querySelector('.wxt-phonetic-loading');
    if (loadingElement) {
      loadingElement.remove();
    }

    // 处理音标数据或错误状态
    let phoneticElement: HTMLElement;

    if (phoneticInfo.error?.hasPhoneticError) {
      // 显示错误状态
      phoneticElement = document.createElement('div');
      phoneticElement.className = 'wxt-phonetic-error';
      phoneticElement.textContent =
        phoneticInfo.error.phoneticErrorMessage || '音标获取失败';
    } else if (phoneticInfo.phonetics && phoneticInfo.phonetics.length > 0) {
      // 显示音标文本
      const phoneticText = phoneticInfo.phonetics[0]?.text || '';
      if (phoneticText) {
        phoneticElement = document.createElement('div');
        phoneticElement.className = 'wxt-phonetic-text';
        phoneticElement.textContent = phoneticText;
      } else {
        // 没有音标文本，显示默认错误信息
        phoneticElement = document.createElement('div');
        phoneticElement.className = 'wxt-phonetic-error';
        phoneticElement.textContent = '暂无音标信息';
      }
    } else {
      // 没有音标数据，显示默认错误信息
      phoneticElement = document.createElement('div');
      phoneticElement.className = 'wxt-phonetic-error';
      phoneticElement.textContent = '暂无音标信息';
    }

    phoneticRow.appendChild(phoneticElement);
  }

  /**
   * 更新UI配置
   * @param uiConfig 新的UI配置
   */
  updateConfig(uiConfig: PronunciationUIConfig): void {
    this.uiConfig = uiConfig;
  }
}

/**
 * 发音悬浮框渲染器。
 *
 * 这个模块只负责创建 DOM 结构和更新已有 DOM。页面文本、AI 返回和远程错误
 * 都必须通过 textContent 写入，避免把不可信内容拼进 HTML。
 */

import { PronunciationElementData } from '../types';
import { PronunciationUIConfig } from '../config';
import { DOMUtils } from '../utils';
import { OriginalWordDisplayMode } from '../../shared/types/core';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SPEAKER_PATH =
  'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';

export class TooltipRenderer {
  private uiConfig: PronunciationUIConfig;
  private originalWordDisplayMode: OriginalWordDisplayMode;

  constructor(
    uiConfig: PronunciationUIConfig,
    originalWordDisplayMode: OriginalWordDisplayMode,
  ) {
    this.uiConfig = uiConfig;
    this.originalWordDisplayMode = originalWordDisplayMode;
  }

  createMainTooltipElement(elementData: PronunciationElementData): HTMLElement {
    const words = DOMUtils.extractWords(elementData.word);
    return words.length > 1
      ? this.createPhraseTooltipElement(elementData, words)
      : this.createWordTooltipElement(elementData);
  }

  private createPhraseTooltipElement(
    elementData: PronunciationElementData,
    words: string[],
  ): HTMLElement {
    const card = this.createElement('div', 'wxt-tooltip-card');
    const header = this.createElement(
      'div',
      'wxt-tooltip-header wxt-phrase-tooltip-header',
    );
    const infoCard = this.createElement('div', 'wxt-phrase-info-card');

    infoCard.appendChild(
      this.createElement('div', 'wxt-phrase-title', elementData.word),
    );

    if (this.shouldShowOriginalText() && elementData.originalText) {
      infoCard.appendChild(
        this.createOriginalTextElement(
          elementData.originalText,
          'wxt-phrase-original',
          '原文：',
        ),
      );
    }

    header.appendChild(infoCard);

    if (this.uiConfig.showPlayButton) {
      header.appendChild(
        this.createAudioButton(
          'wxt-audio-btn wxt-phrase-audio-btn',
          '朗读短语',
          16,
        ),
      );
    }

    const body = this.createElement(
      'div',
      'wxt-tooltip-body wxt-phrase-tooltip-body',
    );
    const wordsContainer = this.createElement('div', 'wxt-phrase-words');
    for (const word of words) {
      const wordElement = this.createElement(
        'span',
        'wxt-interactive-word',
        word,
      );
      wordElement.setAttribute('data-word', word);
      wordsContainer.appendChild(wordElement);
      wordsContainer.appendChild(document.createTextNode(' '));
    }
    wordsContainer.lastChild?.remove();
    body.appendChild(wordsContainer);

    card.append(header, body, this.createElement('div', 'wxt-tooltip-arrow'));
    return card;
  }

  private createWordTooltipElement(
    elementData: PronunciationElementData,
  ): HTMLElement {
    const card = this.createElement('div', 'wxt-tooltip-card');
    const header = this.createElement('div', 'wxt-tooltip-header');
    const wordInfo = this.createElement('div', 'wxt-word-info');
    const phonetic = elementData.phonetic;

    wordInfo.appendChild(
      this.createElement('div', 'wxt-word-main', elementData.word),
    );

    if (this.shouldShowOriginalText() && elementData.originalText) {
      wordInfo.appendChild(
        this.createOriginalTextElement(elementData.originalText),
      );
    }

    wordInfo.appendChild(
      this.createPhoneticRow(
        phonetic?.phonetics[0]?.text,
        phonetic?.error?.hasPhoneticError,
        phonetic?.error?.phoneticErrorMessage,
      ),
    );
    wordInfo.appendChild(
      this.createMeaningContainer(phonetic?.aiTranslation?.explain),
    );
    header.appendChild(wordInfo);

    if (this.uiConfig.showPlayButton) {
      header.appendChild(
        this.createAudioButton('wxt-audio-btn', '朗读单词', 16),
      );
    }

    card.append(header, this.createElement('div', 'wxt-tooltip-arrow'));
    return card;
  }

  createNestedWordTooltipElement(
    word: string,
    phoneticText?: string,
    hasError?: boolean,
    errorMessage?: string,
  ): HTMLElement {
    const card = this.createElement('div', 'wxt-word-tooltip-card');
    const header = this.createElement('div', 'wxt-word-tooltip-header');
    const wordInfo = this.createElement('div', 'wxt-word-info');
    const titleRow = this.createElement('div', 'wxt-word-title-row');

    titleRow.appendChild(this.createElement('div', 'wxt-word-main', word));

    const accentButtons = this.createElement('div', 'wxt-accent-buttons');
    accentButtons.appendChild(this.createAccentGroup('英', 'uk', '英式发音'));
    accentButtons.appendChild(this.createAccentGroup('美', 'us', '美式发音'));
    titleRow.appendChild(accentButtons);

    wordInfo.appendChild(titleRow);
    wordInfo.appendChild(
      this.createPhoneticRow(phoneticText, hasError, errorMessage),
    );
    wordInfo.appendChild(this.createMeaningContainer());
    header.appendChild(wordInfo);
    card.appendChild(header);

    return card;
  }

  updateTooltipWithMeaning(tooltip: HTMLElement, meaning: string): void {
    const meaningContainer = tooltip.querySelector('.wxt-meaning-container');
    if (!meaningContainer) return;

    const loadingElement = meaningContainer.querySelector(
      '.wxt-meaning-loading',
    );
    loadingElement?.remove();

    let meaningElement = meaningContainer.querySelector(
      '.wxt-meaning-text',
    ) as HTMLElement | null;
    if (!meaningElement) {
      meaningElement = document.createElement('div');
      meaningElement.className = 'wxt-meaning-text';
      meaningContainer.appendChild(meaningElement);
    }

    meaningElement.textContent = meaning;
    meaningElement.style.display = 'block';
  }

  updateTooltipWithPhonetic(tooltip: HTMLElement, phoneticInfo: any): void {
    const phoneticRow = tooltip.querySelector('.wxt-phonetic-row');
    if (!phoneticRow) return;

    phoneticRow.textContent = '';
    phoneticRow.appendChild(
      this.createPhoneticStatusElement(
        phoneticInfo?.phonetics?.[0]?.text,
        phoneticInfo?.error?.hasPhoneticError,
        phoneticInfo?.error?.phoneticErrorMessage,
      ),
    );
  }

  updateConfig(uiConfig: PronunciationUIConfig): void {
    this.uiConfig = uiConfig;
  }

  updateOriginalWordDisplayMode(mode: OriginalWordDisplayMode): void {
    this.originalWordDisplayMode = mode;
  }

  private createPhoneticRow(
    phoneticText?: string,
    hasError?: boolean,
    errorMessage?: string,
  ): HTMLElement {
    const row = this.createElement('div', 'wxt-phonetic-row');
    row.appendChild(
      this.createPhoneticStatusElement(phoneticText, hasError, errorMessage),
    );
    return row;
  }

  private createPhoneticStatusElement(
    phoneticText?: string,
    hasError?: boolean,
    errorMessage?: string,
  ): HTMLElement {
    if (phoneticText) {
      return this.createElement('div', 'wxt-phonetic-text', phoneticText);
    }

    if (hasError) {
      return this.createElement(
        'div',
        'wxt-phonetic-error',
        errorMessage || '音标获取失败',
      );
    }

    return this.createElement('div', 'wxt-phonetic-loading', '获取音标中...');
  }

  private createMeaningContainer(meaning?: string): HTMLElement {
    const container = this.createElement('div', 'wxt-meaning-container');
    container.appendChild(
      meaning
        ? this.createElement('div', 'wxt-meaning-text', meaning)
        : this.createElement('div', 'wxt-meaning-loading', '获取词义中...'),
    );
    return container;
  }

  private createOriginalTextElement(
    originalText: string,
    className = 'wxt-original-text',
    label = '原文: ',
  ): HTMLElement {
    return this.createElement('div', className, `${label}${originalText}`);
  }

  private createAccentGroup(
    label: string,
    accent: 'uk' | 'us',
    title: string,
  ): HTMLElement {
    const group = this.createElement('div', 'wxt-accent-group');
    group.appendChild(this.createElement('span', 'wxt-accent-label', label));

    const button = this.createAudioButton('wxt-accent-audio-btn', title, 12);
    button.setAttribute('data-accent', accent);
    group.appendChild(button);

    return group;
  }

  private createAudioButton(
    className: string,
    title: string,
    iconSize: number,
  ): HTMLButtonElement {
    const button = this.createElement('button', className);
    button.type = 'button';
    button.title = title;
    button.appendChild(this.createSpeakerIcon(iconSize));

    return button;
  }

  private createSpeakerIcon(size: number): SVGSVGElement {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', SPEAKER_PATH);
    svg.appendChild(path);

    return svg;
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  private shouldShowOriginalText(): boolean {
    return this.originalWordDisplayMode === OriginalWordDisplayMode.HIDDEN;
  }
}

/**
 * 样式管理器
 * 负责管理翻译文本的样式和CSS注入
 */

import { TranslationStyle } from '../../shared/types/core';
import { ALL_STYLES } from '../index';

export class StyleManager {
  private currentStyle: TranslationStyle;
  private customCSS: string = '';
  private customStyleElement: HTMLStyleElement | null = null;
  private mainStyleElement: HTMLStyleElement | null = null;

  constructor() {
    this.currentStyle = TranslationStyle.DEFAULT;
    // 初始化样式
    this.initializeStyles();
  }

  /**
   * 设置翻译样式
   * @param style 样式类型
   */
  setTranslationStyle(style: TranslationStyle): void {
    this.currentStyle = style;
  }

  /**
   * 设置自定义CSS
   * @param css 自定义CSS样式
   */
  setCustomCSS(css: string): void {
    this.customCSS = css;
    this.updateCustomStyle();
  }

  /**
   * 获取当前样式类名
   * @returns 样式类名
   */
  getCurrentStyleClass(): string {
    if (this.currentStyle === TranslationStyle.LEARNING) {
      return 'wxt-translation-term--learning';
    }
    if (this.currentStyle === TranslationStyle.CUSTOM) {
      return 'wxt-style-custom';
    }
    return `wxt-style-${this.currentStyle}`;
  }

  /**
   * 更新自定义样式
   */
  private updateCustomStyle(): void {
    if (!this.customStyleElement) {
      this.customStyleElement = document.createElement('style');
      this.customStyleElement.id = 'wxt-custom-translation-style';
      document.head.appendChild(this.customStyleElement);
    }

    // 安全地包装用户CSS，确保只应用到翻译元素
    const safeCSS = this.customCSS?.trim()
      ? `.wxt-style-custom { ${this.customCSS} }`
      : '.wxt-style-custom { /* 请在设置中添加自定义CSS */ }';

    this.customStyleElement.textContent = safeCSS;
  }

  /**
   * 初始化样式
   * 在页面中注入CSS样式
   */
  private initializeStyles(): void {
    // 避免重复注入
    if (this.mainStyleElement) {
      return;
    }

    this.mainStyleElement = document.createElement('style');
    this.mainStyleElement.id = 'wxt-main-styles';
    this.mainStyleElement.textContent = ALL_STYLES;
    document.head.appendChild(this.mainStyleElement);
  }

  /**
   * 清理样式元素
   * 用于组件卸载时清理DOM
   */
  cleanup(): void {
    if (this.mainStyleElement && this.mainStyleElement.parentNode) {
      this.mainStyleElement.parentNode.removeChild(this.mainStyleElement);
      this.mainStyleElement = null;
    }

    if (this.customStyleElement && this.customStyleElement.parentNode) {
      this.customStyleElement.parentNode.removeChild(this.customStyleElement);
      this.customStyleElement = null;
    }
  }

  /**
   * 重新初始化样式
   * 用于样式更新或重置
   */
  reinitialize(): void {
    this.cleanup();
    this.initializeStyles();
    if (this.customCSS) {
      this.updateCustomStyle();
    }
  }
}

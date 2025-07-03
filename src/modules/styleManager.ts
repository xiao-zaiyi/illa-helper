/**
 * 样式管理模块
 * 负责管理翻译文本的样式
 */

// 翻译文本样式

import { TranslationStyle } from './types';
// 样式管理器
export class StyleManager {
  private currentStyle: TranslationStyle;
  private customCSS: string = '';
  private customStyleElement: HTMLStyleElement | null = null;

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
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      :root {
        --wxt-primary-color: #6a88e0;
        --wxt-accent-color: #ffafcc;
        --wxt-label-color: #546e7a;
      }

      /* 基础样式 */
      .wxt-word-container {
        display: inline;
        position: relative;
      }

      .wxt-chinese {
        display: inline;
      }

      .wxt-original-word {
        background: linear-gradient(to right, var(--wxt-primary-color) 0%, var(--wxt-primary-color) 50%, transparent 50%, transparent 100%) repeat-x left bottom;
        background-size: 8px 2px;
        padding-bottom: 2px;
      }

      .wxt-english {
        display: inline;
        margin-left: 4px;
        font-size: 0.9em;
        vertical-align: baseline;
      }

      /* 默认样式 */
      .wxt-style-default {
        color: var(--wxt-primary-color);
        font-weight: 500;
      }

      /* 微妙样式 */
      .wxt-style-subtle {
        color: var(--wxt-label-color);
        opacity: 0.9;
      }

      /* 粗体样式 */
      .wxt-style-bold {
        color: var(--wxt-primary-color);
        font-weight: bold;
      }

      /* 斜体样式 */
      .wxt-style-italic {
        color: var(--wxt-primary-color);
        font-style: italic;
      }

      /* 下划线样式 */
      .wxt-style-underlined {
        color: var(--wxt-primary-color);
        text-decoration: none;
        padding-bottom: 1px;
        border-bottom: 2px solid var(--wxt-accent-color);
      }

      /* 高亮样式 */
      .wxt-style-highlighted {
        color: #212529;
        background-color: #ffeb3b;
        padding: 0 2px;
        border-radius: 2px;
      }

      /* 点画线样式 */
      .wxt-style-dotted {
        background: linear-gradient(to right, #57bcb8 0%, #59c1bf 50%, transparent 50%, transparent 100%) repeat-x left bottom;
        background-size: 8px 2px;
        padding-bottom: 2px;
      }

      .wxt-style-dotted:hover {
        border-color: var(--wxt-primary-color);
      }



      /* 学习模式样式 */
      .wxt-translation-term--learning {
        filter: blur(5px);
        cursor: pointer;
        color: var(--wxt-primary-color);
        transition: filter 0.2s ease-in-out;
      }

      .wxt-translation-term--learning:hover {
        filter: blur(0);
      }

      /* 学习模式原文样式 - 全面增强悬停支持 */
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

      /* 发音功能样式 */
      .wxt-pronunciation-enabled {
        position: relative;
        transition: all 0.2s ease;
      }

      .wxt-pronunciation-enabled:hover {
        background-color: rgba(106, 136, 224, 0.1);
        border-radius: 3px;
      }

            /* 短语翻译双层交互样式 */
      .wxt-has-word-overlay {
        position: relative !important;
      }

      .wxt-word-hover-area {
        position: absolute;
        pointer-events: auto;
        z-index: 1;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-radius: 2px;
      }

      .wxt-word-hover-area:hover {
        background-color: rgba(106, 136, 224, 0.1) !important;
      }

      .wxt-word-hover-area.wxt-pronunciation-enabled:hover {
        background-color: rgba(106, 136, 224, 0.15) !important;
      }

      .wxt-pronunciation-loading {
        opacity: 0.7;
        position: relative;
      }

      .wxt-pronunciation-loading::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        margin: auto;
        border: 2px solid transparent;
        border-top-color: #6a88e0;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        top: -2px;
        right: -16px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* 深色词典风格工具提示卡片 */
      .wxt-pronunciation-tooltip {
        position: fixed;
        z-index: 10000;
        pointer-events: auto;
        animation: wxt-tooltip-appear 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.25)) drop-shadow(0 10px 10px rgba(0, 0, 0, 0.06));
      }

      @keyframes wxt-tooltip-appear {
        from {
          opacity: 0;
          transform: translateY(-12px) scale(0.94);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .wxt-tooltip-card {
        background: linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%);
        border: 1px solid #48484a;
        border-radius: 16px;
        box-shadow:
          0 20px 40px -12px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        padding: 0;
        min-width: 260px;
        max-width: 340px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(20px);
      }

      .wxt-tooltip-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      }

      .wxt-tooltip-header {
        background: linear-gradient(135deg, rgba(58, 58, 60, 0.8) 0%, rgba(42, 42, 44, 0.9) 100%);
        padding: 20px 20px 16px 20px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        position: relative;
      }

      .wxt-tooltip-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 16px;
        right: 16px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
      }

    .wxt-tooltip-body{
      font-size: 14px;
    }


      .wxt-phrase-words{
        padding: 4px 2px;
        font-size: 14px;
      }



      .wxt-word-info {
        flex: 1;
        min-width: 0;
      }

      .wxt-word-main {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 0;
        word-break: break-word;
        letter-spacing: -0.02em;
        line-height: 1.2;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .wxt-phonetic-row {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .wxt-phonetic-text {
        font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
        font-size: 15px;
        color: #64ffda;
        font-style: normal;
        font-weight: 600;
        background: linear-gradient(135deg, rgba(100, 255, 218, 0.15) 0%, rgba(52, 211, 153, 0.15) 100%);
        padding: 6px 12px;
        border-radius: 8px;
        display: inline-block;
        border: 1px solid rgba(100, 255, 218, 0.3);
        letter-spacing: 0.03em;
        box-shadow: 0 2px 8px rgba(100, 255, 218, 0.15);
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



      .wxt-audio-btn {
        background: linear-gradient(135deg, #64ffda 0%, #1de9b6 100%);
        border: none;
        border-radius: 12px;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #000000;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        box-shadow:
          0 4px 12px rgba(100, 255, 218, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        position: relative;
        overflow: hidden;
      }

      .wxt-audio-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .wxt-audio-btn:hover {
        transform: translateY(-2px) scale(1.08);
        box-shadow:
          0 8px 20px rgba(100, 255, 218, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .wxt-audio-btn:hover::before {
        opacity: 1;
      }

      .wxt-audio-btn:active {
        transform: translateY(-1px) scale(1.02);
        box-shadow:
          0 4px 12px rgba(100, 255, 218, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .wxt-audio-btn svg {
        width: 16px;
        height: 16px;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
      }

      /* 工具提示箭头 */
      .wxt-tooltip-arrow {
        position: absolute;
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        width: 14px;
        height: 14px;
        background: #2a2a2c;
        border: 1px solid #48484a;
        border-top: none;
        border-left: none;
      }

      .wxt-tooltip-arrow-top {
        bottom: auto;
        top: -7px;
        transform: translateX(-50%) rotate(-135deg);
        border: 1px solid #48484a;
        border-bottom: none;
        border-right: none;
      }

      /* 短语相关样式 */
      .wxt-phrase-text {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        margin: 2px 0 0 0;
        line-height: 1.3;
        opacity: 0.95;
      }

      .wxt-word-list {
        line-height: 1.8;
        padding: 4px 0;
        font-size: 12px;
      }

      .wxt-interactive-word {
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-block;
        margin: 2px 3px;
        color: #e5e5e7;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-weight: 500;
      }

      .wxt-interactive-word:hover {
        background: rgba(52, 211, 153, 0.15);
        color: #34d399;
        transform: translateY(-1px);
        border-color: rgba(52, 211, 153, 0.3);
        box-shadow: 0 2px 8px rgba(52, 211, 153, 0.2);
      }

      /* 单词悬浮框样式(更小更简洁) */
      .wxt-word-tooltip {
        position: fixed;
        z-index: 10001;
        visibility: hidden;
        opacity: 0;
        transition: all 0.2s ease;
        pointer-events: auto;
        animation: wxt-word-tooltip-appear 0.15s ease-out;
      }

      .wxt-word-tooltip[data-show="true"] {
        visibility: visible;
        opacity: 1;
      }

      @keyframes wxt-word-tooltip-appear {
        from {
          opacity: 0;
          transform: translateY(-4px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .wxt-word-tooltip-card {
        background: linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%);
        border: 1px solid #48484a;
        border-radius: 12px;
        padding: 14px 16px;
        color: white;
        font-size: 13px;
        box-shadow:
          0 12px 30px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        max-width: 220px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(15px);
      }

      .wxt-word-tooltip-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      }

      .wxt-word-tooltip-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .wxt-word-tooltip-header .wxt-word-info {
        flex: 1;
        min-width: 0;
      }

      .wxt-word-tooltip-header .wxt-word-main {
        font-weight: 700;
        font-size: 16px;
        color: #ffffff;
        letter-spacing: -0.02em;
        margin-bottom: 0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .wxt-word-tooltip-header .wxt-phonetic-row {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

            .wxt-phonetic-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .wxt-word-tooltip-header .wxt-phonetic-text {
        font-size: 14px;
        color: #64ffda;
        font-style: normal;
        font-weight: 600;
        background: linear-gradient(135deg, rgba(100, 255, 218, 0.12) 0%, rgba(52, 211, 153, 0.12) 100%);
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid rgba(100, 255, 218, 0.25);
        font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
        letter-spacing: 0.02em;
        box-shadow: 0 1px 3px rgba(100, 255, 218, 0.1);
        text-align: center;
        margin-bottom: 4px;
      }

      .wxt-accent-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .wxt-accent-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .wxt-accent-label {
        font-size: 12px;
        font-weight: 600;
        color: #a0a0a0;
        min-width: 16px;
        text-align: center;
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }

      .wxt-accent-audio-btn {
        background: linear-gradient(135deg, #64ffda 0%, #1de9b6 100%);
        border: none;
        border-radius: 6px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #000000;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        box-shadow:
          0 2px 6px rgba(100, 255, 218, 0.25),
          0 0 0 1px rgba(255, 255, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }

      .wxt-accent-audio-btn:hover {
        transform: translateY(-1px) scale(1.1);
        box-shadow:
          0 3px 8px rgba(100, 255, 218, 0.35),
          0 0 0 1px rgba(255, 255, 255, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .wxt-accent-audio-btn:active {
        transform: translateY(0) scale(1.05);
        box-shadow:
          0 1px 4px rgba(100, 255, 218, 0.2),
          0 0 0 1px rgba(255, 255, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }

      /* 词义容器样式 */
      .wxt-meaning-container {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        min-height: 24px;
        display: flex;
        align-items: center;
      }

      .wxt-meaning-text {
        font-size: 12px;
        color: #e5e5e7;
        line-height: 1.4;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin: 0;
        font-style: italic;
        opacity: 0.95;
        flex: 1;
      }

      .wxt-meaning-loading {
        font-size: 13px;
        color: #a0a0a0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-style: italic;
        flex: 1;
      }

      .wxt-meaning-loading::after {
        content: '';
        width: 12px;
        height: 12px;
        border: 2px solid transparent;
        border-top-color: #64ffda;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }

      .wxt-phonetic-loading {
        font-size: 12px;
        color: #a0a0a0;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-style: italic;
        margin-bottom: 4px;
        text-align: center;
      }

      .wxt-phonetic-loading::after {
        content: '';
        width: 10px;
        height: 10px;
        border: 2px solid transparent;
        border-top-color: #64ffda;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }

      /* 词义容器在单词悬浮框中的样式 */
      .wxt-word-tooltip .wxt-meaning-container {
        margin-top: 6px;
        padding-top: 6px;
        min-height: 20px;
      }

      .wxt-word-tooltip .wxt-meaning-text {
        font-size: 12px;
        padding: 6px 10px;
      }

      .wxt-word-tooltip .wxt-meaning-loading {
        font-size: 11px;
        padding: 4px 8px;
      }

      .wxt-word-tooltip .wxt-meaning-loading::after {
        width: 10px;
        height: 10px;
      }

      /* 响应式适配 */
      @media (max-width: 480px) {
        .wxt-tooltip-card {
          min-width: 220px;
          max-width: 300px;
        }

        .wxt-tooltip-header {
          padding: 16px 16px 12px 16px;
        }

        .wxt-word-main {
          font-size: 20px;
        }

        .wxt-phonetic-text {
          font-size: 14px;
        }

        .wxt-audio-btn {
          width: 38px;
          height: 38px;
        }
      }
    `;

    document.head.appendChild(styleElement);
  }
}

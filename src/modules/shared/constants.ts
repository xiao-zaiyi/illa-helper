/**
 * 共享常量定义
 * 用于统一管理跨模块使用的常量
 */

// ============================================================
// DOM Walker 规则 - 统一的 DOM 遍历规则
// ============================================================

/**
 * 完全跳过的标签 - 不遍历、不翻译
 * 这些元素及其子树会被完全忽略
 */
export const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'META',
  'LINK',
  'NOSCRIPT',
  'TITLE',
  'HEAD',
  'HR',
  'BUTTON',
  'INPUT',
  'LABEL',
  'FORM',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'IMG',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'MATH',
  'PRE',
  'CODE',
  'KBD',
  'NAV',
]);

/**
 * 不深入遍历但保留文本的标签
 * 父元素翻译时会包含这些元素的文本内容
 */
export const ATOMIC_INLINE_TAGS = new Set(['TIME', 'ABBR']);

/**
 * 强制视为块级的标签 - 无论 CSS display 如何
 */
export const FORCE_BLOCK_TAGS = new Set([
  'BODY',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'NAV',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'DL',
  'DT',
  'DD',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TD',
  'TH',
  'FIGURE',
  'FIGCAPTION',
  'DETAILS',
  'SUMMARY',
  'FORM',
  'FIELDSET',
  'ADDRESS',
  'HGROUP',
]);

/**
 * DOM 标记属性名
 */
export const DOM_LABELS = {
  WALKED: 'data-illa-walked',
  PARAGRAPH: 'data-illa-paragraph',
  BLOCK: 'data-illa-block',
  INLINE: 'data-illa-inline',
} as const;

// 段落翻译相关常量
export const PARAGRAPH_TRANSLATION = {
  // CSS类名
  WRAPPER_CLASS: 'illa-paragraph-translation',
};

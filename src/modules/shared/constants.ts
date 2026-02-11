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
  'INPUT',
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
]);

/**
 * 不深入遍历但保留文本的标签
 * 父元素翻译时会包含这些元素的文本内容
 */
export const ATOMIC_INLINE_TAGS = new Set(['CODE', 'TIME', 'ABBR', 'KBD']);

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

// ============================================================
// 向后兼容 - 旧常量保留
// ============================================================

/** @deprecated 使用 SKIP_TAGS 替代 */
export const IGNORE_TAGS = SKIP_TAGS;

// CSS选择器格式的忽略元素
export const IGNORE_SELECTORS = [
  'script',
  'style',
  'meta',
  'link',
  'noscript',
  'title',
  'input',
  'textarea',
  'select',
  'img',
  'svg',
  'canvas',
  'video',
  'audio',
  'iframe',
  'pre',
  'math',

  // 属性选择器
  '[aria-hidden="true"]',

  // 翻译工具相关的类和属性
  '.wxt-translation-term',
  '.wxt-original-word',
  '.wxt-pronunciation-tooltip',
  '[data-wxt-text-processed]',
  '[data-wxt-word-processed]',
  '.illa-paragraph-translation',
  `[${DOM_LABELS.WALKED}]`,
].join(', ');

/** @deprecated 使用 FORCE_BLOCK_TAGS 替代 */
export const BLOCK_TAGS = FORCE_BLOCK_TAGS;

// 段落翻译相关常量
export const PARAGRAPH_TRANSLATION = {
  // 可翻译的元素标签
  TRANSLATABLE_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6', // 标题
    'p', // 段落
    'div', // div容器
    'span', // span元素
    'li', // 列表项
    'blockquote', // 引用
    'td',
    'th', // 表格单元格
    'figcaption', // 图片说明
    'summary', // 摘要
    'button', // 按钮
    'a', // 链接
    'label', // 标签
  ],

  // 需要跳过的类名关键词
  SKIP_CLASS_KEYWORDS: [
    'nav',
    'navbar',
    'navigation',
    'menu',
    'header',
    'footer',
    'sidebar',
    'toolbar',
    'controls',
    'buttons',
    'tabs',
    'pagination',
    'breadcrumb',
    'modal',
    'dialog',
    'popup',
    'overlay',
    'loading',
    'spinner',
    'advertisement',
    'ads',
    'banner',
    'promo',
    'social',
    'share',
    'form',
    'input',
    'search',
    'filter',
    'sort',
    'dropdown',
    'container',
    'wrapper',
    'layout',
    'grid',
    'row',
    'col',
    'flex',
    'absolute',
    'fixed',
    'relative',
    'sticky',
    'icon',
    'fas',
    'far',
    'fab',
    'material-icons',
    'glyphicon',
    'arrow',
    'caret',
  ],

  // 最小文本长度要求
  MIN_TEXT_LENGTH: {
    default: 5,
    div: 15,
    span: 10,
    button: 3,
    a: 3,
    label: 5,
  },

  // CSS类名
  WRAPPER_CLASS: 'illa-paragraph-translation',
  CONTENT_CLASS: 'illa-paragraph-content',
  MARKER_ATTR: 'data-illa-translated',
};

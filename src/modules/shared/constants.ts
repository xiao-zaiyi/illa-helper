/**
 * 共享常量定义
 * 用于统一管理跨模块使用的常量
 */

// 需要忽略的HTML标签（大写）
export const IGNORE_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'META',
  'LINK',
  'IFRAME',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'CODE',
  'NAV',
  'FOOTER',
  'PRE',
  'IMG',
  'IMAGE',
  'TIME',
  'NOSCRIPT',
  'HEADER',
  'BANNER',
  'COPYRIGHT',
  'TITLE',
  'BUTTON',
  'FORM',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
]);

// CSS选择器格式的忽略元素（小写）
export const IGNORE_SELECTORS = [
  //把IGNORE_TAGS加入
  ...IGNORE_TAGS,
  // 基础HTML元素
  'script',
  'style',
  'meta',
  'link',
  'noscript',
  'title',
  'input',
  'textarea',
  'select',
  'button',
  'form',
  'img',
  'svg',
  'canvas',
  'video',
  'audio',
  'iframe',

  // 属性选择器
  '[contenteditable="false"]',
  '[aria-hidden="true"]',

  // 翻译工具相关的类和属性
  '.wxt-translation-term',
  '.wxt-original-word',
  '.wxt-pronunciation-tooltip',
  '[data-wxt-text-processed]',
  '[data-wxt-word-processed]',

  // 代码高亮相关
  '.code',
  '.highlight',
  '.hljs',
].join(', ');

// 块级元素标签
export const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'NAV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'LI',
  'TD',
  'TH',
  'FIGCAPTION',
  'DETAILS',
  'SUMMARY',
  'ADDRESS',
  'HGROUP',
]);

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

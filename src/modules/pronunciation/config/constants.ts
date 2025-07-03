/**
 * 发音模块常量定义
 */

// 缓存相关常量
export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 86400, // 24小时（秒）
  MAX_CACHE_SIZE: 1000, // 最大缓存条目数
} as const;

// UI相关常量
export const UI_CONSTANTS = {
  TOOLTIP_Z_INDEX: 10000,
  WORD_TOOLTIP_Z_INDEX: 10001,
  TOOLTIP_PADDING: 12,
  TOOLTIP_ARROW_SIZE: 8,
} as const;

// 定时器相关常量
export const TIMER_CONSTANTS = {
  SHOW_DELAY: 300, // 显示延迟（毫秒）
  HIDE_DELAY: 600, // 隐藏延迟（毫秒）
  WORD_SHOW_DELAY: 100, // 单词悬浮框显示延迟（毫秒）
  YOUDAO_TIMEOUT: 10000, // 有道TTS超时时间（毫秒）
} as const;

// CSS类名常量
export const CSS_CLASSES = {
  PRONUNCIATION_ENABLED: 'wxt-pronunciation-enabled',
  PRONUNCIATION_LOADING: 'wxt-pronunciation-loading',
  PHONETIC_INLINE: 'wxt-phonetic-inline',
  PRONUNCIATION_TOOLTIP: 'wxt-pronunciation-tooltip',
  WORD_TOOLTIP: 'wxt-word-tooltip',
  INTERACTIVE_WORD: 'wxt-interactive-word',
  MEANING_CONTAINER: 'wxt-meaning-container', // 新增：词义容器
  MEANING_TEXT: 'wxt-meaning-text', // 新增：词义文本
  MEANING_LOADING: 'wxt-meaning-loading', // 新增：词义加载状态
  PHONETIC_LOADING: 'wxt-phonetic-loading', // 新增：音标加载状态
} as const;

// SVG图标常量
export const SVG_ICONS = {
  SPEAKER: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  SPEAKER_SMALL: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
} as const;

// 提供者相关常量
export const PROVIDER_CONSTANTS = {
  DEFAULT_PHONETIC_PROVIDER: 'dictionary-api',
  DEFAULT_TTS_PROVIDER: 'youdao',
  FALLBACK_TTS_PROVIDER: 'web-speech',
} as const;

// API相关常量
export const API_CONSTANTS = {
  YOUDAO_TTS_BASE_URL: 'https://dict.youdao.com/dictvoice',
  DICTIONARY_API_BASE_URL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
  AI_TRANSLATION_CACHE_TTL: 86400000, // AI翻译缓存24小时
} as const;

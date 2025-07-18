/**
 * 默认配置常量
 * 包含项目中使用的所有默认设置和配置
 */

import type {
  ApiConfig,
  ApiConfigItem,
  MultilingualConfig,
} from '../types/api';
import type { FloatingBallConfig, TooltipHotkey } from '../types/ui';
import type { UserSettings } from '../types/storage';
import type { LazyLoadingConfig } from '../types/core';
import {
  UserLevel,
  TranslationStyle,
  TriggerMode,
  OriginalWordDisplayMode,
  TranslationPosition,
} from '../types/core';

// 默认API配置
export const DEFAULT_API_CONFIG: ApiConfig = {
  apiKey: import.meta.env.VITE_WXT_DEFAULT_API_KEY || '',
  apiEndpoint:
    import.meta.env.VITE_WXT_DEFAULT_API_ENDPOINT ||
    'https://api.openai.com/v1/chat/completions',
  model: import.meta.env.VITE_WXT_DEFAULT_MODEL || 'gpt-4o-mini',
  temperature: parseFloat(import.meta.env.VITE_WXT_DEFAULT_TEMPERATURE) || 0,
  enable_thinking: false,
  includeThinkingParam: false,
  customParams: '',
  phraseEnabled: true,
  requestsPerSecond: 0, // 默认无限制，0表示不限制
  useBackgroundProxy: false, // 默认不使用background代理，保持向后兼容
};

// 默认多语言配置 - 极简化版本
export const DEFAULT_MULTILINGUAL_CONFIG: MultilingualConfig = {
  nativeLanguage: 'zh', // 默认中文为母语
  targetLanguage: 'en', // 默认英语为目标语言
};

// 默认发音快捷键配置
export const DEFAULT_PRONUNCIATION_HOTKEY: TooltipHotkey = {
  enabled: true,
  modifierKeys: [],
  description: '快捷键',
};

// 默认悬浮球配置
export const DEFAULT_FLOATING_BALL_CONFIG: FloatingBallConfig = {
  enabled: true,
  position: 50, // 中间位置
  opacity: 0.8, // 80% 透明度
};

// 默认懒加载配置 - 简化版本
export const DEFAULT_LAZY_LOADING_CONFIG: LazyLoadingConfig = {
  enabled: true, //  懒加载开关
  preloadDistance: 0.5, // 固定提前半屏预加载
};

// 创建默认API配置项的函数
function createDefaultApiConfigItem(): ApiConfigItem {
  return {
    id: 'default-config',
    name: 'defaultConfig',
    provider: 'openai',
    config: DEFAULT_API_CONFIG,
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 默认用户设置
export const DEFAULT_SETTINGS: UserSettings = {
  userLevel: UserLevel.B1,
  replacementRate: 0.3,
  isEnabled: true,
  useGptApi: true,
  apiConfigs: [createDefaultApiConfigItem()],
  activeApiConfigId: 'default-config',
  translationStyle: TranslationStyle.DEFAULT,
  triggerMode: TriggerMode.MANUAL,
  maxLength: 400,
  originalWordDisplayMode: OriginalWordDisplayMode.VISIBLE,
  enablePronunciationTooltip: true,
  multilingualConfig: DEFAULT_MULTILINGUAL_CONFIG,
  pronunciationHotkey: DEFAULT_PRONUNCIATION_HOTKEY,
  floatingBall: DEFAULT_FLOATING_BALL_CONFIG,
  translationPosition: TranslationPosition.AFTER,
  showParentheses: true,
  apiRequestTimeout: 0, // 无限制超时
  customTranslationCSS: '',
  lazyLoading: DEFAULT_LAZY_LOADING_CONFIG,
};

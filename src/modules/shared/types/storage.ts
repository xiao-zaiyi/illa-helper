/**
 * 存储配置相关类型定义
 * 包含用户设置、右键菜单、消息传递等相关接口
 */

import type {
  UserLevel,
  TranslationStyle,
  TriggerMode,
  OriginalWordDisplayMode,
  TranslationPosition,
  ContextMenuActionType,
  UrlPatternType,
  LazyLoadingConfig,
} from './core';
import type { ApiConfigItem, MultilingualConfig } from './api';
import type { TooltipHotkey, FloatingBallConfig } from './ui';

// 用户设置主接口
export interface UserSettings {
  userLevel: UserLevel;
  replacementRate: number;
  isEnabled: boolean;
  useGptApi: boolean;
  // 修改：支持多API配置
  apiConfigs: ApiConfigItem[];
  activeApiConfigId: string;
  translationStyle: TranslationStyle;
  triggerMode: TriggerMode;
  maxLength?: number;
  translationDirection: string;
  originalWordDisplayMode: OriginalWordDisplayMode;
  enablePronunciationTooltip: boolean;
  // 新增：多语言智能翻译设置
  multilingualConfig: MultilingualConfig;
  // 新增：发音弹出框快捷键设置
  pronunciationHotkey: TooltipHotkey;
  // 新增：悬浮球设置
  floatingBall: FloatingBallConfig;
  // 新增：翻译位置设置
  translationPosition: TranslationPosition;
  // 新增：是否显示括号
  showParentheses: boolean;
  // 新增：API请求超时时间配置
  apiRequestTimeout: number; // 以毫秒为单位
  // 新增：自定义翻译样式CSS
  customTranslationCSS: string;
  // 新增：懒加载配置
  lazyLoading: LazyLoadingConfig;
}

// 右键菜单消息接口
export interface ContextMenuMessage {
  type: ContextMenuActionType;
  url: string;
  pattern: string;
  patternType: UrlPatternType;
  description?: string;
}

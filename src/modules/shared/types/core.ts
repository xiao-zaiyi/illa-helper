/**
 * 核心基础类型定义
 * 包含项目中使用的基础枚举和核心类型
 */

// 用户英语水平枚举
export enum UserLevel {
  BEGINNER = 1,
  ELEMENTARY = 2,
  INTERMEDIATE = 3,
  ADVANCED = 4,
  PROFICIENT = 5,
}

/**
 * UserLevel 选项配置，包含值和中文标签
 */
export const USER_LEVEL_OPTIONS = [
  { value: UserLevel.BEGINNER, label: '初级' },
  { value: UserLevel.ELEMENTARY, label: '基础' },
  { value: UserLevel.INTERMEDIATE, label: '中级' },
  { value: UserLevel.ADVANCED, label: '高级' },
  { value: UserLevel.PROFICIENT, label: '精通' },
];

// 翻译样式枚举
export enum TranslationStyle {
  DEFAULT = 'default',
  SUBTLE = 'subtle',
  BOLD = 'bold',
  ITALIC = 'italic',
  UNDERLINED = 'underlined',
  HIGHLIGHTED = 'highlighted',
  DOTTED = 'dotted',
  LEARNING = 'learning',
  CUSTOM = 'custom',
}

// 触发模式枚举
export enum TriggerMode {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

// 原文显示模式枚举
export enum OriginalWordDisplayMode {
  VISIBLE,
  LEARNING,
  HIDDEN,
}

// 翻译位置枚举
export enum TranslationPosition {
  BEFORE = 'before',
  AFTER = 'after',
}

// 翻译服务提供商枚举
export enum TranslationProvider {
  OpenAI = 'OpenAI',
  DeepSeek = 'DeepSeek',
  SiliconFlow = 'SiliconFlow',
  GoogleGemini = 'GoogleGemini',
  ProxyGemini = 'ProxyGemini',
}

// 右键菜单操作类型
export type ContextMenuActionType =
  | 'add-to-blacklist'
  | 'add-to-whitelist'
  | 'remove-from-blacklist'
  | 'remove-from-whitelist';

// URL模式类型
export type UrlPatternType = 'domain' | 'exact';

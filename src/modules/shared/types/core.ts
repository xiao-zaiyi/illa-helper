/**
 * 核心基础类型定义
 * 包含项目中使用的基础枚举和核心类型
 */

// 用户语言水平枚举 - CEFR标准
export enum UserLevel {
  A1 = 1, // 入门级
  A2 = 2, // 初级
  B1 = 3, // 中级
  B2 = 4, // 中高级
  C1 = 5, // 高级
  C2 = 6, // 精通级
}

/**
 * UserLevel 选项配置，包含CEFR标准和具体指导
 */
export const USER_LEVEL_OPTIONS = [
  {
    value: UserLevel.A1,
    label: 'A1',
  },
  {
    value: UserLevel.A2,
    label: 'A2',
  },
  {
    value: UserLevel.B1,
    label: 'B1',
  },
  {
    value: UserLevel.B2,
    label: 'B2',
  },
  {
    value: UserLevel.C1,
    label: 'C1',
  },
  {
    value: UserLevel.C2,
    label: 'C2',
  },
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

// 翻译模式枚举
export enum TranslationMode {
  WORD = 'word', // 单词/短语翻译模式（当前）
  PARAGRAPH = 'paragraph', // 段落翻译模式（新增）
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

// 懒加载配置接口 - 简化版本
export interface LazyLoadingConfig {
  /** 是否启用懒加载 */
  enabled: boolean;
  /** 预加载距离（视口百分比，0.5表示提前半屏） */
  preloadDistance: number;
}

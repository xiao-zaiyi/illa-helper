/**
 * 翻译服务核心类型定义
 * 包含文本替换、处理、提示词管理和语言管理相关的类型
 */

import {
  ReplacementConfig,
  FullTextAnalysisResponse,
  ApiConfig,
  LanguageOption,
  MultilingualConfig,
} from '../../shared/types/api';
import { UserSettings } from '../../shared/types/storage';
import {
  UserLevel,
  OriginalWordDisplayMode,
  TranslationPosition,
  TranslationStyle,
} from '../../shared/types/core';

// ==================== 文本替换服务类型 ====================

/**
 * 替换结果接口
 */
export interface ReplacementResult {
  original: string; // 原始文本
  replaced: string; // 替换后的文本
  replacedWords: Array<{
    chinese: string;
    english: string;
    position: {
      start: number;
      end: number;
    };
    isNew: boolean; // 是否是生词
  }>;
}

/**
 * 缓存键接口
 */
export interface CacheKey {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  userLevel: number;
  replacementRate: number;
  translationDirection: string;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  cacheSize: number;
}

// ==================== 文本处理服务类型 ====================

/**
 * 内容分段配置
 */
export interface SegmentConfig {
  maxSegmentLength: number;
  minSegmentLength: number;
  enableSmartBoundary: boolean;
  mergeSmallSegments: boolean;
}

/**
 * 处理统计信息
 */
export interface ProcessingStats {
  coordinator: any; // 协调器统计
  global: any; // 全局统计
}

// ==================== 提示词服务类型 ====================

/**
 * 提示词配置接口
 */
export interface PromptConfig {
  translationDirection: string;
  targetLanguage: string;
  userLevel: UserLevel;
  replacementRate: number;
  intelligentMode?: boolean;
  provider?: 'gemini' | string;
}

/**
 * 提示词生成选项
 */
export interface PromptOptions {
  isTraditional?: boolean;
  includeExamples?: boolean;
  customInstructions?: string;
}

// ==================== 语言服务类型 ====================

/**
 * 语言信息接口
 */
export interface Language {
  code: string; // e.g., 'en', 'zh', 'ja'
  name: string; // e.g., 'English', 'Chinese', 'Japanese'
  nativeName: string; // e.g., 'English', '中文', '日本語'
  isPopular?: boolean; // 标记常用语言
}

/**
 * 翻译方向选项
 */
export interface TranslationDirectionOption {
  value: string;
  label: string;
}

/**
 * 语言名称对
 */
export interface LanguageNames {
  source: string;
  target: string;
}

// ==================== 服务基类类型 ====================

/**
 * 服务基类配置
 */
export interface ServiceConfig {
  enableLogging?: boolean;
  cacheEnabled?: boolean;
  maxRetries?: number;
}

/**
 * 服务初始化选项
 */
export interface ServiceInitOptions {
  apiConfig?: ApiConfig;
  userSettings?: UserSettings;
  customConfig?: Record<string, any>;
}

// ==================== 翻译流程类型 ====================

/**
 * 翻译处理上下文
 */
export interface TranslationContext {
  text: string;
  settings: UserSettings;
  config: ReplacementConfig;
  originalWordDisplayMode: OriginalWordDisplayMode;
  translationPosition: TranslationPosition;
  showParentheses: boolean;
  maxLength?: number;
}

/**
 * 翻译处理结果
 */
export interface TranslationProcessResult {
  success: boolean;
  result?: FullTextAnalysisResponse;
  error?: string;
  fromCache?: boolean;
}

// ==================== 导出汇总 ====================

export type {
  UserSettings,
  ReplacementConfig,
  FullTextAnalysisResponse,
  ApiConfig,
  LanguageOption,
  MultilingualConfig,
  UserLevel,
  OriginalWordDisplayMode,
  TranslationPosition,
  TranslationStyle,
};

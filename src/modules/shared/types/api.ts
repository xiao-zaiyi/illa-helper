/**
 * API相关类型定义
 * 包含API配置、翻译请求响应等相关接口
 */

// 翻译替换结果接口
export interface Replacement {
  original: string;
  translation: string;
  position: {
    start: number;
    end: number;
  };
  isNew: boolean;
  explanation?: string;
  // 发音相关字段
  hasPhonetic?: boolean;
  phoneticData?: any; // 将在pronunciation模块中定义具体类型
  // 新增：语言检测信息
  detectedSourceLanguage?: string;
  targetLanguage?: string;
}

// 全文分析响应接口
export interface FullTextAnalysisResponse {
  original: string;
  processed: string;
  replacements: Replacement[];
}

// API配置接口
export interface ApiConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  enable_thinking?: boolean;
  includeThinkingParam?: boolean;
  customParams?: string;
  phraseEnabled?: boolean;
  requestsPerSecond?: number; // 每秒最大请求数
  useBackgroundProxy?: boolean; // 是否通过background script发送请求以绕过CORS
}

// API配置项接口，包含配置的元数据
export interface ApiConfigItem {
  id: string;
  name: string;
  provider: string; // 服务提供商：openai、deepseek、silicon-flow等
  config: ApiConfig;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

// 替换配置接口
export interface ReplacementConfig {
  userLevel: import('./core').UserLevel;
  replacementRate: number;
  useGptApi: boolean;
  apiConfig: ApiConfig;
  inlineTranslation: boolean;
  translationStyle: import('./core').TranslationStyle;
}

// 多语言翻译配置接口 - 极简化版本
export interface MultilingualConfig {
  nativeLanguage: string; // 母语 (用户固定设置)
  targetLanguage: string; // 目标语言 (用户学习目标)
}

// 语言选项接口
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isPopular?: boolean;
}

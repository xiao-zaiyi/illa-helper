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

// API配置项运行时状态（用于负载均衡故障追踪）
export interface ApiConfigRuntimeStatus {
  lastUsed?: number; // 最后使用时间戳
  successCount?: number; // 成功调用次数
  failureCount?: number; // 失败调用次数
  lastError?: {
    code: number; // HTTP状态码
    message: string; // 错误信息
    timestamp: number; // 发生时间
  };
  cooldownUntil?: number; // 冷却截止时间（临时禁用）
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

  // ===== 负载均衡相关字段 =====
  enabled: boolean; // 是否启用（默认 true）
  weight?: number; // 权重（0-100，默认100，用于加权轮询）
  priority?: number; // 优先级（越小越优先，默认0）

  // 运行时状态（用于故障追踪，不持久化到用户设置）
  runtimeStatus?: ApiConfigRuntimeStatus;
}

// 负载均衡策略类型
export type LoadBalancerStrategy =
  | 'round-robin'
  | 'weighted'
  | 'priority'
  | 'random';

// 负载均衡配置接口
export interface LoadBalancerConfig {
  strategy: LoadBalancerStrategy; // 调度策略
  cooldownDuration: number; // 失败后冷却时间（毫秒）
  maxRetries: number; // 最大重试次数
  retryableStatusCodes: number[]; // 可重试的HTTP状态码
}

// 默认负载均衡配置
export const DEFAULT_LOAD_BALANCER_CONFIG: LoadBalancerConfig = {
  strategy: 'round-robin',
  cooldownDuration: 60000, // 1分钟
  maxRetries: 3,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

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

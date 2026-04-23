/**
 * 生词本相关类型定义
 * 包含生词条目、查询选项、导出格式等相关类型
 */

/**
 * 生词条目接口
 * 记录每个被翻译过的单词的完整信息
 */
export interface VocabularyEntry {
  /** 唯一标识符 */
  id: string;
  /** 单词文本（小写标准化） */
  word: string;
  /** 原始单词（保留大小写） */
  originalWord: string;
  /** 翻译结果 */
  translation: string;
  /** 翻译来源（如: ai-translation, dictionary等） */
  source: string;
  /** 翻译调用次数 */
  frequency: number;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 首次翻译时间戳 */
  firstTranslatedAt: number;
  /** 最近翻译时间戳 */
  lastTranslatedAt: number;
  /** 音标（可选） */
  phonetic?: string;
  /** 词性（可选） */
  partOfSpeech?: string;
  /** 例句（可选） */
  example?: string;
  /** 备注（可选） */
  note?: string;
  /** 标签数组（可选） */
  tags?: string[];
}

/**
 * 生词本查询选项
 */
export interface VocabularyQueryOptions {
  /** 搜索关键词 */
  search?: string;
  /** 是否只显示收藏的单词 */
  favoritesOnly?: boolean;
  /** 排序方式 */
  sortBy?: 'frequency' | 'firstTranslatedAt' | 'lastTranslatedAt' | 'word';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页偏移 */
  offset?: number;
  /** 分页大小 */
  limit?: number;
  /** 按日期范围过滤 - 开始时间 */
  dateFrom?: number;
  /** 按日期范围过滤 - 结束时间 */
  dateTo?: number;
  /** 最小翻译次数 */
  minFrequency?: number;
}

/**
 * 生词本查询结果
 */
export interface VocabularyQueryResult {
  /** 生词条目数组 */
  entries: VocabularyEntry[];
  /** 总数 */
  total: number;
  /** 当前分页偏移 */
  offset: number;
  /** 分页大小 */
  limit: number;
}

/**
 * 生词本统计信息
 */
export interface VocabularyStats {
  /** 总单词数 */
  totalWords: number;
  /** 收藏单词数 */
  favoriteWords: number;
  /** 总翻译次数 */
  totalTranslations: number;
  /** 今日翻译次数 */
  todayTranslations: number;
  /** 本周翻译次数 */
  weekTranslations: number;
  /** 最早翻译时间 */
  firstTranslationDate: number | null;
  /** 最近翻译时间 */
  lastTranslationDate: number | null;
}

/**
 * 生词本服务配置
 */
export interface VocabularyServiceConfig {
  /** 存储键名 */
  storageKey?: string;
  /** 是否启用自动记录 */
  autoRecord?: boolean;
  /** 最大存储条目数 */
  maxEntries?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 生词本操作结果
 */
export interface VocabularyOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
  /** 相关数据 */
  data?: any;
}

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  TXT = 'txt',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 是否包含音标 */
  includePhonetic?: boolean;
  /** 是否包含翻译次数 */
  includeFrequency?: boolean;
  /** 是否包含时间戳 */
  includeTimestamps?: boolean;
  /** 是否只导出生词 */
  favoritesOnly?: boolean;
  /** 日期范围过滤 */
  dateFrom?: number;
  dateTo?: number;
}

/**
 * 生词本事件类型
 */
export enum VocabularyEventType {
  WORD_ADDED = 'word_added',
  WORD_UPDATED = 'word_updated',
  WORD_REMOVED = 'word_removed',
  FAVORITE_ADDED = 'favorite_added',
  FAVORITE_REMOVED = 'favorite_removed',
  DATA_CLEARED = 'data_cleared',
  DATA_IMPORTED = 'data_imported',
}

/**
 * 生词本事件数据
 */
export interface VocabularyEventData {
  type: VocabularyEventType;
  timestamp: number;
  word?: string;
  entry?: VocabularyEntry;
  count?: number;
}

/**
 * 生词本事件监听器
 */
export type VocabularyEventListener = (event: VocabularyEventData) => void;

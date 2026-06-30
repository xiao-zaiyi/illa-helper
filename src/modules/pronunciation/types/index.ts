/**
 * 类型定义统一导出
 */

// 导出所有类型
export * from './phonetic.types';
export * from './tts.types';
export * from './ui.types';

// 便捷导入 - 音标相关
export type {
  PhoneticInfo,
  PhoneticEntry,
  MeaningEntry,
  DefinitionEntry,
  PhoneticResult,
  CacheEntry,
} from './phonetic.types';

// 便捷导入 - TTS相关
export type {
  TTSResult,
  TTSProviderType,
  TTSProviderStatus,
} from './tts.types';

// 便捷导入 - UI相关
export type {
  PronunciationElementData,
  TooltipType,
  TooltipState,
  InteractionEventType,
  InteractionEventHandler,
} from './ui.types';

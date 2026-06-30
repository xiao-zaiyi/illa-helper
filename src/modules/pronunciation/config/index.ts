/**
 * 发音模块配置统一导出
 */

// 导出配置相关
export * from './pronunciation.config';
export * from './constants';

// 便捷导入
export {
  DEFAULT_PRONUNCIATION_CONFIG,
  DEFAULT_TTS_CONFIG,
  DEFAULT_UI_CONFIG,
} from './pronunciation.config';

export {
  UI_CONSTANTS,
  TIMER_CONSTANTS,
  CSS_CLASSES,
  API_CONSTANTS,
} from './constants';

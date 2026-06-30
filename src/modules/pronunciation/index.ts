/**
 * Pronunciation 模块主入口
 * 提供统一的API接口
 */

// 核心服务
export { PronunciationService } from './services/PronunciationService';

// 配置
export * from './config';

// 类型定义
export * from './types';

// 提供者 (按功能模块导出)
export * from './phonetic';
export * from './tts';
export * from './translation';

// 工具类
export * from './utils';

// UI组件
export * from './ui';

// 默认导出主服务
export { PronunciationService as default } from './services/PronunciationService';

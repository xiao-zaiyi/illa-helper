import {
  UserSettings,
  OriginalWordDisplayMode,
  TranslationPosition,
  ReplacementConfig,
} from '@/src/modules/shared/types';
import { StyleManager } from '@/src/modules/styles';
import { TextProcessorService } from '@/src/modules/core/translation/TextProcessorService';
import { TextReplacerService } from '@/src/modules/core/translation/TextReplacerService';
import { ParagraphTranslationService } from '@/src/modules/core/translation/ParagraphTranslationService';
import { FloatingBallManager } from '@/src/modules/floatingBall';
import { LazyLoadingService } from './services/LazyLoadingService';

/**
 * Content Script 主服务接口
 */
export interface IContentManager {
  init(): Promise<void>;
  destroy(): void;
}

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  getUserSettings(): Promise<UserSettings>;
  createReplacementConfig(settings: UserSettings): ReplacementConfig;
  updateConfiguration(
    settings: UserSettings,
    styleManager: StyleManager,
    textReplacer: TextReplacerService,
  ): void;
}

/**
 * 处理服务接口
 */
export interface IProcessingService {
  processPage(): Promise<void>;
  updateSettings(settings: UserSettings): void;
}

/**
 * 监听器服务接口
 */
export interface IListenerService {
  setupMessageListeners(): void;
  setupDomObserver(): void;
  destroy(): void;
}

/**
 * 服务容器类型
 */
export interface ServiceContainer {
  styleManager: StyleManager;
  textProcessor: TextProcessorService;
  textReplacer: TextReplacerService;
  floatingBallManager: FloatingBallManager;
  lazyLoadingService?: LazyLoadingService;
  paragraphTranslationService: ParagraphTranslationService;
}

/**
 * 处理参数类型
 */
export interface ProcessingParams {
  originalWordDisplayMode: OriginalWordDisplayMode;
  maxLength: number | undefined;
  translationPosition: TranslationPosition;
  showParentheses: boolean;
}

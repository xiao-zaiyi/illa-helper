import { browser } from 'wxt/browser';
import { UserSettings, TriggerMode } from '@/src/modules/shared/types';
import { StyleManager } from '@/src/modules/styles';
import { TextProcessorService } from '@/src/modules/core/translation/TextProcessorService';
import { TextReplacerService } from '@/src/modules/core/translation/TextReplacerService';
import { FloatingBallManager } from '@/src/modules/floatingBall';
import { WebsiteManager } from '@/src/modules/options/website-management/manager';

import { ConfigurationService } from './services/ConfigurationService';
import { ProcessingService } from './services/ProcessingService';
import { ListenerService } from './services/ListenerService';
import { detectPageLanguage } from './utils/domUtils';
import { IContentManager, ServiceContainer } from './types';
import { LazyLoadingService } from './services/LazyLoadingService';
import { ContentSegment } from '../processing/ProcessingStateManager';

/**
 * 翻译显示状态管理器
 *
 * 功能：
 * - 通过全局CSS类控制页面翻译内容的显示/隐藏
 * - 支持快捷键和悬浮球的状态切换
 * - 自动同步悬浮球的视觉状态
 *
 * 设计理念：
 * - 使用CSS类控制，避免逐个元素操作，提高性能
 * - 新添加的翻译内容自动继承当前显示状态
 * - 状态变化时实时更新悬浮球视觉反馈
 */
export class TranslationStateManager {
  /** 翻译内容是否可见 */
  private isTranslationVisible = true;

  /** 页面处理服务引用 */
  private processingService?: ProcessingService;

  /** 悬浮球管理器引用 */
  private floatingBallManager?: any;

  /** 控制翻译内容隐藏的CSS类名 */
  private readonly HIDDEN_CLASS = 'wxt-translation-hidden';

  /** 翻译内容选择器 */
  private readonly TRANSLATION_SELECTOR = '.wxt-translation-term';

  constructor(
    processingService?: ProcessingService,
    floatingBallManager?: any,
  ) {
    this.processingService = processingService;
    this.floatingBallManager = floatingBallManager;
  }

  /**
   * 切换翻译显示状态
   *
   * 逻辑：
   * 1. 如果页面无翻译内容，先执行翻译
   * 2. 如果有翻译内容，直接切换显示状态
   * 3. 更新悬浮球视觉状态
   */
  async toggleTranslationState(): Promise<void> {
    const hasTranslatedContent = this.hasTranslatedContent();

    if (!hasTranslatedContent) {
      // 页面无翻译内容，执行翻译
      await this.executeTranslation();
    } else {
      // 页面有翻译内容，切换显示状态
      this.toggleVisibilityState();
    }

    // 同步悬浮球状态
    this.syncFloatingBallState();
  }

  /**
   * 执行页面翻译
   * @private
   */
  private async executeTranslation(): Promise<void> {
    if (this.processingService) {
      await this.processingService.processPage();
    }
    this.isTranslationVisible = true;
    document.body.classList.remove(this.HIDDEN_CLASS);
  }

  /**
   * 切换可见性状态
   * @private
   */
  private toggleVisibilityState(): void {
    this.isTranslationVisible = !this.isTranslationVisible;

    if (this.isTranslationVisible) {
      document.body.classList.remove(this.HIDDEN_CLASS);
    } else {
      document.body.classList.add(this.HIDDEN_CLASS);
    }
  }

  /**
   * 同步悬浮球状态
   * @private
   */
  private syncFloatingBallState(): void {
    if (this.floatingBallManager?.updateTranslationStateIndicator) {
      this.floatingBallManager.updateTranslationStateIndicator();
    }
  }

  /**
   * 检查页面是否有翻译内容
   * @private
   */
  private hasTranslatedContent(): boolean {
    return document.querySelector(this.TRANSLATION_SELECTOR) !== null;
  }

  /**
   * 获取当前显示状态
   */
  getTranslationVisibility(): boolean {
    return this.isTranslationVisible;
  }

  /**
   * 更新处理服务引用
   */
  updateProcessingService(processingService: ProcessingService): void {
    this.processingService = processingService;
  }

  /**
   * 更新悬浮球管理器引用
   */
  updateFloatingBallManager(floatingBallManager: any): void {
    this.floatingBallManager = floatingBallManager;
  }
}

/**
 * Content Script 主管理服务
 * 负责协调所有子服务，管理生命周期
 */
export class ContentManager implements IContentManager {
  private configurationService: ConfigurationService;
  private processingService?: ProcessingService;
  private listenerService?: ListenerService;
  private services?: ServiceContainer;
  private settings?: UserSettings;
  private translationStateManager?: TranslationStateManager;

  constructor() {
    this.configurationService = new ConfigurationService();
  }

  /**
   * 初始化Content Script
   */
  async init(): Promise<void> {
    try {
      // 检查网站规则
      const websiteStatus = await this.checkWebsiteStatus();
      if (websiteStatus === 'blacklisted') {
        console.log('[ContentManager] 网站在黑名单中，跳过初始化');
        return;
      }

      // 验证配置
      await this.validateConfiguration();

      // 获取用户设置
      this.settings = await this.configurationService.getUserSettings();
      if (!this.settings.isEnabled) {
        console.log('[ContentManager] 扩展已禁用，跳过初始化');
        return;
      }

      // 处理语言检测
      await this.handleLanguageDetection();

      // 初始化所有服务
      await this.initializeServices();

      // 应用初始配置
      this.applyInitialConfiguration();

      // 初始化悬浮球
      await this.initializeFloatingBall();

      // 设置监听器
      this.setupListeners();

      // 根据触发模式执行初始处理
      await this.handleInitialProcessing(websiteStatus);

      console.log('[ContentManager] 初始化完成');
    } catch (error) {
      console.error('[ContentManager] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 销毁服务，清理资源
   */
  destroy(): void {
    try {
      this.listenerService?.destroy();
      this.services?.lazyLoadingService?.destroy();
      console.log('[ContentManager] 服务已销毁');
    } catch (error) {
      console.error('[ContentManager] 销毁服务时出错:', error);
    }
  }

  /**
   * 更新设置
   */
  updateSettings(newSettings: UserSettings): void {
    this.settings = newSettings;

    // 更新ProcessingService设置
    this.processingService?.updateSettings(newSettings);

    // 更新配置服务
    if (this.services) {
      this.configurationService.updateConfiguration(
        newSettings,
        this.services.styleManager,
        this.services.textReplacer,
      );
    }
  }

  /**
   * 检查网站状态
   */
  private async checkWebsiteStatus(): Promise<string> {
    const websiteManager = new WebsiteManager();
    return await websiteManager.getWebsiteStatus(window.location.href);
  }

  /**
   * 验证配置
   */
  private async validateConfiguration(): Promise<void> {
    await browser.runtime.sendMessage({
      type: 'validate-configuration',
      source: 'page_load',
    });
  }

  /**
   * 处理语言检测
   */
  private async handleLanguageDetection(): Promise<void> {
    if (this.settings && this.settings.translationDirection === 'auto') {
      this.settings.translationDirection = await detectPageLanguage();
    }
  }

  /**
   * 初始化所有核心服务
   */
  private async initializeServices(): Promise<void> {
    if (!this.settings) {
      throw new Error('Settings not loaded');
    }

    // 创建服务实例
    const styleManager = new StyleManager();

    const activeConfig = this.configurationService.getActiveApiConfig(
      this.settings,
    );
    const textProcessor = TextProcessorService.getInstance({
      enablePronunciationTooltip: this.settings.enablePronunciationTooltip,
      apiConfig: activeConfig?.config,
    });

    const textReplacer = TextReplacerService.getInstance(
      this.configurationService.createReplacementConfig(this.settings),
    );

    const floatingBallManager = new FloatingBallManager(
      this.settings.floatingBall,
    );

    // 创建懒加载服务
    const lazyLoadingService = this.initializeLazyLoading(this.settings);

    // 保存服务容器
    this.services = {
      styleManager,
      textProcessor,
      textReplacer,
      floatingBallManager,
      lazyLoadingService,
    };

    // 创建业务服务
    this.processingService = new ProcessingService(
      textProcessor,
      textReplacer,
      this.settings!,
      lazyLoadingService,
    );

    // 创建翻译状态管理器
    this.translationStateManager = new TranslationStateManager(
      this.processingService,
      this.services.floatingBallManager,
    );

    this.listenerService = new ListenerService(
      this.settings,
      this.processingService,
      this.configurationService,
      styleManager,
      textReplacer,
      floatingBallManager,
      this.translationStateManager,
    );
  }

  /**
   * 应用初始配置
   */
  private applyInitialConfiguration(): void {
    if (!this.settings || !this.services) return;

    this.configurationService.updateConfiguration(
      this.settings,
      this.services.styleManager,
      this.services.textReplacer,
    );
  }

  /**
   * 初始化悬浮球
   */
  private async initializeFloatingBall(): Promise<void> {
    if (!this.services?.floatingBallManager || !this.translationStateManager)
      return;

    await this.services.floatingBallManager.init(async () => {
      // 悬浮球点击状态切换回调
      const isConfigValid = await browser.runtime.sendMessage({
        type: 'validate-configuration',
        source: 'user_action',
      });

      if (isConfigValid && this.translationStateManager) {
        await this.translationStateManager.toggleTranslationState();
      }
    });
  }

  /**
   * 设置监听器
   */
  private setupListeners(): void {
    this.listenerService?.setupMessageListeners();
    this.listenerService?.setupDomObserver();
  }

  /**
   * 处理初始页面处理
   */
  private async handleInitialProcessing(websiteStatus: string): Promise<void> {
    if (!this.settings || !this.processingService) return;

    // 根据触发模式或白名单执行操作
    if (
      websiteStatus === 'whitelisted' ||
      this.settings.triggerMode === TriggerMode.AUTOMATIC
    ) {
      try {
        await this.processingService.processPage();
      } catch (error) {
        console.error('[ContentManager] 初始页面处理失败:', error);
      }
    }
  }

  /**
   * 初始化懒加载服务
   */
  private initializeLazyLoading(
    settings: UserSettings,
  ): LazyLoadingService | undefined {
    if (!settings.lazyLoading || !settings.lazyLoading.enabled) {
      return undefined;
    }

    const lazyLoadingService = new LazyLoadingService(settings.lazyLoading);
    lazyLoadingService.initialize();

    // 设置处理回调
    lazyLoadingService.setProcessingCallback(
      async (segments: ContentSegment[]) => {
        if (this.processingService) {
          await this.processingService.processSegmentsLazy(segments);
        }
      },
    );

    return lazyLoadingService;
  }
}

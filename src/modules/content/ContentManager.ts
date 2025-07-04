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
      console.log('[ContentManager] 服务已销毁');
    } catch (error) {
      console.error('[ContentManager] 销毁服务时出错:', error);
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

    const activeConfig = this.configurationService.getActiveApiConfig(this.settings);
    const textProcessor = TextProcessorService.getInstance({
      enablePronunciationTooltip: this.settings.enablePronunciationTooltip,
      apiConfig: activeConfig?.config,
    });

    const textReplacer = TextReplacerService.getInstance(
      this.configurationService.createReplacementConfig(this.settings),
    );

    const floatingBallManager = new FloatingBallManager(this.settings.floatingBall);

    // 保存服务容器
    this.services = {
      styleManager,
      textProcessor,
      textReplacer,
      floatingBallManager,
    };

    // 创建业务服务
    this.processingService = new ProcessingService(
      textProcessor,
      textReplacer,
      this.settings,
    );

    this.listenerService = new ListenerService(
      this.settings,
      this.processingService,
      this.configurationService,
      styleManager,
      textReplacer,
      floatingBallManager,
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
    if (!this.services?.floatingBallManager || !this.processingService) return;

    await this.services.floatingBallManager.init(async () => {
      // 悬浮球点击翻译回调
      const isConfigValid = await browser.runtime.sendMessage({
        type: 'validate-configuration',
        source: 'user_action',
      });

      if (isConfigValid && this.processingService) {
        await this.processingService.processPage();
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
}

import { TextProcessor } from '@/src/modules/textProcessor';
import { StyleManager } from '@/src/modules/styleManager';
import {
  UserSettings,
  TriggerMode,
  ReplacementConfig,
  OriginalWordDisplayMode,
  TranslationPosition,
} from '@/src/modules/types';
import { StorageManager } from '@/src/modules/storageManager';
import { TextReplacer } from '@/src/modules/textReplacer';
import { FloatingBallManager } from '@/src/modules/floatingBall';
import { BlacklistManager } from '@/src/modules/options/blacklist/manager';
export default defineContentScript({
  // 匹配所有网站
  matches: ['<all_urls>'],

  // 主函数
  async main() {
    const storageManager = new StorageManager();
    const settings = await storageManager.getUserSettings();

    // 黑名单检查
    const blacklistManager = new BlacklistManager();
    if (await blacklistManager.isBlacklisted(window.location.href)) {
      return;
    }

    browser.runtime.sendMessage({
      type: 'validate-configuration',
      source: 'page_load',
    });

    if (!settings.isEnabled) {
      return;
    }

    // --- 语言检测 ---
    if (settings.translationDirection === 'auto') {
      settings.translationDirection = await detectPageLanguage();
    }

    // --- 初始化模块 ---
    const styleManager = new StyleManager();
    // 获取当前活跃的API配置
    const activeConfig = settings.apiConfigs.find(
      (config) => config.id === settings.activeApiConfigId,
    );
    const textProcessor = new TextProcessor(
      settings.enablePronunciationTooltip,
      activeConfig?.config,
    );
    const textReplacer = new TextReplacer(createReplacementConfig(settings));
    const floatingBallManager = new FloatingBallManager(settings.floatingBall);

    // --- 应用初始配置 ---
    updateConfiguration(settings, styleManager, textReplacer);

    // --- 初始化悬浮球 ---
    floatingBallManager.init(async () => {
      // 悬浮球点击翻译回调
      // 验证API配置
      const isConfigValid = await browser.runtime.sendMessage({
        type: 'validate-configuration',
        source: 'user_action',
      });

      if (isConfigValid) {
        await processPage(
          textProcessor,
          textReplacer,
          settings.originalWordDisplayMode,
          settings.maxLength,
          settings.translationPosition,
          settings.showParentheses,
        );
      }
    });

    // --- 根据触发模式执行操作 ---
    if (settings.triggerMode === TriggerMode.AUTOMATIC) {
      await processPage(
        textProcessor,
        textReplacer,
        settings.originalWordDisplayMode,
        settings.maxLength,
        settings.translationPosition,
        settings.showParentheses,
      );
    }

    // --- 监听消息和DOM变化 ---
    setupListeners(
      settings,
      styleManager,
      textProcessor,
      textReplacer,
      floatingBallManager,
    );
  },
});

function createReplacementConfig(settings: UserSettings): ReplacementConfig {
  // 获取当前活跃的API配置
  const activeConfig = settings.apiConfigs.find(
    (config) => config.id === settings.activeApiConfigId,
  );

  return {
    userLevel: settings.userLevel,
    replacementRate: settings.replacementRate,
    useGptApi: settings.useGptApi,
    apiConfig: activeConfig?.config || {
      apiKey: '',
      apiEndpoint: '',
      model: '',
      temperature: 0,
      enable_thinking: false,
      phraseEnabled: true,
    },
    inlineTranslation: true,
    translationStyle: settings.translationStyle,
    translationDirection: settings.translationDirection,
  };
}

/**
 * 根据最新设置更新所有相关模块的配置
 */
function updateConfiguration(
  settings: UserSettings,
  styleManager: StyleManager,
  textReplacer: TextReplacer,
) {
  styleManager.setTranslationStyle(settings.translationStyle);
  textReplacer.setConfig(createReplacementConfig(settings));
}

/**
 * 处理整个页面或其动态加载的部分
 */
async function processPage(
  textProcessor: TextProcessor,
  textReplacer: TextReplacer,
  originalWordDisplayMode: OriginalWordDisplayMode,
  maxLength: number | undefined,
  translationPosition: TranslationPosition,
  showParentheses: boolean,
) {
  await textProcessor.processRoot(
    document.body,
    textReplacer,
    originalWordDisplayMode,
    maxLength,
    translationPosition,
    showParentheses,
  );
}

/**
 * 设置所有监听器，包括消息和DOM变化
 */
function setupListeners(
  settings: UserSettings,
  styleManager: StyleManager,
  textProcessor: TextProcessor,
  textReplacer: TextReplacer,
  floatingBallManager: FloatingBallManager,
) {
  // 监听来自 popup 的消息
  browser.runtime.onMessage.addListener(async (message) => {
    if (
      message.type === 'settings_updated' ||
      message.type === 'api_config_updated'
    ) {
      // 设置已更新
      const newSettings: UserSettings = message.settings;

      // 检查是否需要刷新页面的关键设置
      const needsPageReload =
        settings.triggerMode !== newSettings.triggerMode ||
        settings.isEnabled !== newSettings.isEnabled ||
        settings.enablePronunciationTooltip !==
          newSettings.enablePronunciationTooltip ||
        settings.translationDirection !== newSettings.translationDirection ||
        settings.userLevel !== newSettings.userLevel ||
        settings.useGptApi !== newSettings.useGptApi;

      if (needsPageReload) {
        window.location.reload();
        return;
      }

      // 更新本地设置对象
      Object.assign(settings, newSettings);

      // 应用新配置
      updateConfiguration(settings, styleManager, textReplacer);

      // 更新API配置
      const newActiveConfig = newSettings.apiConfigs.find(
        (config) => config.id === newSettings.activeApiConfigId,
      );
      if (newActiveConfig) {
        textProcessor.updateApiConfig(newActiveConfig.config);
      }

      // 更新悬浮球配置
      floatingBallManager.updateConfig(settings.floatingBall);
    } else if (message.type === 'clear_cache') {
      // 清除翻译缓存
      textReplacer.clearAllCache();
      console.log('翻译缓存已清除');
    } else if (message.type === 'MANUAL_TRANSLATE') {
      // 收到手动翻译请求
      if (settings.triggerMode === TriggerMode.MANUAL) {
        const isConfigValid = await browser.runtime.sendMessage({
          type: 'validate-configuration',
          source: 'user_action',
        });
        if (isConfigValid) {
          await processPage(
            textProcessor,
            textReplacer,
            settings.originalWordDisplayMode,
            settings.maxLength,
            settings.translationPosition,
            settings.showParentheses,
          );
        }
      }
    }
  });

  // 仅在自动模式下观察DOM变化
  if (settings.triggerMode === TriggerMode.AUTOMATIC) {
    setupDomObserver(
      textProcessor,
      textReplacer,
      settings.originalWordDisplayMode,
      settings.maxLength,
      settings.translationPosition,
      settings.showParentheses,
    );
  }
}

/**
 * 设置 DOM 观察器以处理动态内容
 * 使用健壮的观察器管理器，处理页面切换和异常恢复
 */
function setupDomObserver(
  textProcessor: TextProcessor,
  textReplacer: TextReplacer,
  originalWordDisplayMode: OriginalWordDisplayMode,
  maxLength: number | undefined,
  translationPosition: TranslationPosition,
  showParentheses: boolean,
) {
  // 使用健壮的观察器管理器
  const observerManager = new RobustObserverManager(
    textProcessor,
    textReplacer,
    originalWordDisplayMode,
    maxLength,
    translationPosition,
    showParentheses,
  );

  observerManager.startObserving();

  // 开发环境下暴露调试方法
  if (typeof window !== 'undefined') {
    (window as any).__illa_helper_debug = observerManager;
  }

  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    observerManager.stopObserving();
  });
}

/**
 * 检查节点是否是处理结果节点（翻译、发音等功能元素）
 */
function isProcessingResultNode(node: Node): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    // 检查是否是翻译或发音相关的元素
    const processingClasses = [
      'wxt-translation-term',
      'wxt-original-word',
      'wxt-pronunciation-tooltip',
      'wxt-phonetic-text',
      'wxt-tts-button',
      'wxt-processing',
    ];

    for (const className of processingClasses) {
      if (element.classList.contains(className)) {
        return true;
      }
    }

    // 检查是否包含处理标记属性
    if (
      element.hasAttribute('data-wxt-word-processed') ||
      element.hasAttribute('data-pronunciation-added')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 检查一个节点是否是节点集合中任何其他节点的后代
 */
function isDescendant(node: Node, nodeSet: Set<Node>): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (nodeSet.has(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 使用 browser.i18n.detectLanguage API 自动检测页面主要语言
 */
async function detectPageLanguage(): Promise<string> {
  try {
    const textSample = document.body.innerText.substring(0, 1000);
    if (!textSample.trim()) return 'zh-to-en';

    const result = await browser.i18n.detectLanguage(textSample);

    if (result?.languages?.[0]?.language === 'en') {
      return 'en-to-zh';
    }
    return 'zh-to-en';
  } catch (_) {
    return 'zh-to-en'; // 出错时默认
  }
}

/**
 * 健壮的DOM观察器管理器
 * 解决页面切换和长时间暂停等问题
 */
class RobustObserverManager {
  private observer: MutationObserver | null = null;
  private isObserving = false;
  private lastUrl = location.href;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private pageChangeTimer: number | null = null;
  private urlCheckInterval: number | null = null;
  private navigationCheckInterval: number | null = null;
  private titleObserver: MutationObserver | null = null;
  private processedPagesCache = new Set<string>(); // 缓存已处理的页面URL
  private isPageLoading = false; // 页面加载状态
  private heavyLoadDetected = false; // 重负载检测

  constructor(
    private textProcessor: TextProcessor,
    private textReplacer: TextReplacer,
    private originalWordDisplayMode: OriginalWordDisplayMode,
    private maxLength: number | undefined,
    private translationPosition: TranslationPosition,
    private showParentheses: boolean,
  ) {
    // 监听页面切换（包括SPA路由变化）
    this.setupPageChangeDetection();
    this.setupAdvancedPageChangeDetection();
  }

  startObserving() {
    if (this.isObserving) {
      return;
    }

    this.createObserver();
    this.isObserving = true;
    this.reconnectAttempts = 0;
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // 清理定时器
    if (this.pageChangeTimer) {
      clearTimeout(this.pageChangeTimer);
      this.pageChangeTimer = null;
    }

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    if (this.navigationCheckInterval) {
      clearInterval(this.navigationCheckInterval);
      this.navigationCheckInterval = null;
    }

    // 清理title观察器
    if (this.titleObserver) {
      this.titleObserver.disconnect();
      this.titleObserver = null;
    }

    this.isObserving = false;
  }

  private createObserver() {
    let debounceTimer: number;
    const nodesToProcess = new Set<Node>();
    const observerConfig = {
      childList: true,
      subtree: true,
      characterData: true,
      // 添加性能优化配置
      attributeOldValue: false,
      characterDataOldValue: false,
    };

    this.observer = new MutationObserver((mutations) => {
      let hasValidChanges = false;
      let addedNodesCount = 0;

      // 检测重负载操作
      if (this.detectHeavyLoad()) {
        console.log('检测到重负载操作，暂停翻译处理');
        this.heavyLoadDetected = true;
        // 清空待处理节点，避免在重负载时处理
        nodesToProcess.clear();
        return;
      } else if (this.heavyLoadDetected) {
        console.log('重负载操作结束，恢复翻译处理');
        this.heavyLoadDetected = false;
      }

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            addedNodesCount++;

            // 如果单次添加的节点太多，可能是框架重渲染，延长防抖时间
            if (addedNodesCount > 50) {
              return; // 跳过过多的节点
            }

            if (isProcessingResultNode(node)) {
              return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const textContent = element.textContent?.trim();

              // 提高文本长度阈值，减少小片段的处理
              if (textContent && textContent.length > 30) {
                nodesToProcess.add(node);
                hasValidChanges = true;
              }
            }
          });
        } else if (
          mutation.type === 'characterData' &&
          mutation.target.parentElement
        ) {
          const parentElement = mutation.target.parentElement;
          if (!isProcessingResultNode(parentElement)) {
            const textContent = parentElement.textContent?.trim();
            // 只处理有意义长度的文本变化
            if (textContent && textContent.length > 20) {
              nodesToProcess.add(parentElement);
              hasValidChanges = true;
            }
          }
        }
      });

      if (!hasValidChanges) {
        return;
      }

      clearTimeout(debounceTimer);

      // 根据变化数量动态调整防抖时间
      const debounceTime = addedNodesCount > 20 ? 500 : 200; // 大量变化时延长防抖时间

      debounceTimer = window.setTimeout(async () => {
        await this.processNodes(nodesToProcess);
      }, debounceTime);
    });

    if (document.body && document.body.isConnected) {
      this.observer.observe(document.body, observerConfig);
    }
  }

  private async processNodes(nodesToProcess: Set<Node>) {
    if (nodesToProcess.size === 0) return;

    // 检查是否发生页面切换
    if (this.hasPageChanged()) {
      console.log('检测到页面切换，重新初始化观察器');
      this.handlePageChange();
      return;
    }

    const topLevelNodes = new Set<Node>();
    nodesToProcess.forEach((node) => {
      if (document.body.contains(node) && !isDescendant(node, nodesToProcess)) {
        topLevelNodes.add(node);
      }
    });

    // 如果节点数量过多，限制处理数量
    if (topLevelNodes.size > 10) {
      console.log(
        `节点数量过多 (${topLevelNodes.size})，限制处理数量以提高性能`,
      );
      const limitedNodes = Array.from(topLevelNodes).slice(0, 10);
      topLevelNodes.clear();
      limitedNodes.forEach((node) => topLevelNodes.add(node));
    }

    // 临时暂停观察器
    const wasObserving = this.isObserving;
    if (this.observer) {
      this.observer.disconnect();
    }

    const pauseStartTime = Date.now();

    try {
      // 使用更小的批次并添加更频繁的中断检查
      const nodesArray = Array.from(topLevelNodes);
      const batchSize = 2; // 更小的批次大小

      for (let i = 0; i < nodesArray.length; i += batchSize) {
        const batch = nodesArray.slice(i, i + batchSize);

        // 检查是否应该中断处理
        const currentTime = Date.now();
        if (currentTime - pauseStartTime > 3000) {
          // 3秒超时
          console.warn('处理超时，中断剩余节点处理');
          break;
        }

        // 检查页面是否发生变化
        if (this.hasPageChanged()) {
          console.log('处理过程中检测到页面变化，中断处理');
          break;
        }

        for (const node of batch) {
          // 再次检查节点有效性
          if (!document.body.contains(node)) {
            continue;
          }

          try {
            await this.textProcessor.processRoot(
              node,
              this.textReplacer,
              this.originalWordDisplayMode,
              this.maxLength,
              this.translationPosition,
              this.showParentheses,
            );
          } catch (error) {
            console.warn('处理单个节点时发生错误:', error, node);
            // 继续处理其他节点
          }
        }

        // 在批次之间让出控制权
        if (i + batchSize < nodesArray.length) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }
    } catch (error) {
      console.warn('DOM处理过程中发生错误:', error);
    } finally {
      nodesToProcess.clear();

      // 恢复观察器
      if (wasObserving) {
        this.restoreObserver(pauseStartTime);
      }
    }
  }

  private restoreObserver(pauseStartTime: number) {
    const pauseDuration = Date.now() - pauseStartTime;

    // 降低警告阈值，更早发现性能问题
    if (pauseDuration > 2000) {
      console.warn(`DOM观察器暂停时间过长: ${pauseDuration}ms`);

      // 如果暂停时间超过5秒，考虑这是一个重负载操作
      if (pauseDuration > 5000) {
        console.warn('检测到重负载操作，延长观察器恢复时间');
        // 延长恢复时间，让页面稳定
        setTimeout(() => {
          this.tryRestoreObserver();
        }, 1000);
        return;
      }
    }

    this.tryRestoreObserver();
  }

  private tryRestoreObserver() {
    // 检查DOM结构是否仍然有效
    if (document.body && document.body.isConnected) {
      try {
        this.createObserver();
        this.reconnectAttempts = 0; // 重置重连尝试次数
      } catch (error) {
        console.error('恢复DOM观察器失败:', error);
        this.handleObserverFailure();
      }
    } else {
      console.warn('页面DOM结构已改变，尝试重新初始化');
      this.handleObserverFailure();
    }
  }

  private handleObserverFailure() {
    this.reconnectAttempts++;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(
        `尝试重新连接观察器 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      // 延迟重试
      setTimeout(() => {
        if (document.body && document.body.isConnected) {
          this.startObserving();
        }
      }, 1000 * this.reconnectAttempts);
    } else {
      console.error('DOM观察器重连失败次数超过限制，停止自动重连');
      this.isObserving = false;
    }
  }

  private setupPageChangeDetection() {
    // 监听URL变化（SPA路由）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.schedulePageChangeHandler();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.schedulePageChangeHandler();
    };

    window.addEventListener('popstate', () => {
      this.schedulePageChangeHandler();
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.hasPageChanged()) {
        this.handlePageChange();
      }
    });

    // 定期检查URL变化（作为备用机制）
    this.urlCheckInterval = window.setInterval(() => {
      if (this.hasPageChanged()) {
        console.log(
          '定期检查检测到页面变化:',
          this.lastUrl,
          '->',
          location.href,
        );
        this.handlePageChange();
      }
    }, 1000);

    // 监听hashchange事件
    window.addEventListener('hashchange', () => {
      this.schedulePageChangeHandler();
    });

    // 设置高级页面变化检测
    this.setupAdvancedPageChangeDetection();
  }

  private hasPageChanged(): boolean {
    const currentUrl = location.href;
    const hasChanged = this.lastUrl !== currentUrl;

    // 额外检查：确保不是仅仅是hash变化或查询参数变化
    if (hasChanged) {
      const lastUrlObj = new URL(this.lastUrl);
      const currentUrlObj = new URL(currentUrl);

      // 如果路径发生了变化，认为是真正的页面变化
      const pathChanged = lastUrlObj.pathname !== currentUrlObj.pathname;

      if (pathChanged) {
        console.log(
          '检测到路径变化:',
          lastUrlObj.pathname,
          '->',
          currentUrlObj.pathname,
        );
        return true;
      }

      // 如果只是hash或查询参数变化，也可能需要重新处理
      const hashChanged = lastUrlObj.hash !== currentUrlObj.hash;
      const searchChanged = lastUrlObj.search !== currentUrlObj.search;

      if (hashChanged || searchChanged) {
        console.log('检测到hash或查询参数变化');
        return true;
      }
    }

    return hasChanged;
  }

  private handlePageChange() {
    this.lastUrl = location.href;
    this.reconnectAttempts = 0;

    console.log('处理页面变化，新URL:', location.href);

    // 重新初始化观察器
    this.stopObserving();

    // 延迟处理新页面内容，等待DOM稳定
    setTimeout(async () => {
      if (document.body && document.body.isConnected) {
        // 重新开始观察
        this.startObserving();

        // 智能处理新页面内容 - 只处理未翻译的部分
        try {
          await this.processNewPageContent();
          console.log('页面变化后的翻译处理完成');
        } catch (error) {
          console.warn('页面变化后处理新内容时发生错误:', error);
        }
      }
    }, 300); // 稍微延长等待时间，确保DOM完全稳定
  }

  private schedulePageChangeHandler() {
    // 取消之前的定时器
    if (this.pageChangeTimer) {
      clearTimeout(this.pageChangeTimer);
    }

    // 延迟执行页面变化处理，等待DOM更新完成
    this.pageChangeTimer = window.setTimeout(() => {
      if (this.hasPageChanged()) {
        console.log('检测到页面变化:', this.lastUrl, '->', location.href);
        this.handlePageChange();
      }
    }, 100);
  }

  private setupAdvancedPageChangeDetection() {
    // 监听document.title变化
    this.titleObserver = new MutationObserver(() => {
      if (this.hasPageChanged()) {
        console.log('通过title变化检测到页面变化');
        this.schedulePageChangeHandler();
      }
    });

    if (document.head) {
      this.titleObserver.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // 监听focus/blur事件，某些SPA在这些事件中更新内容
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (this.hasPageChanged()) {
          console.log('通过focus事件检测到页面变化');
          this.handlePageChange();
        }
      }, 100);
    });

    // 监听网络请求完成（可能表示新内容加载）
    let lastNavigationTime = performance.now();
    const checkForNavigationChanges = () => {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const latestNavigation = navigationEntries[
          navigationEntries.length - 1
        ] as PerformanceNavigationTiming;
        if (latestNavigation.loadEventEnd > lastNavigationTime) {
          lastNavigationTime = latestNavigation.loadEventEnd;
          if (this.hasPageChanged()) {
            console.log('通过navigation事件检测到页面变化');
            this.schedulePageChangeHandler();
          }
        }
      }
    };

    // 定期检查navigation变化
    this.navigationCheckInterval = window.setInterval(
      checkForNavigationChanges,
      2000,
    );
  }

  /**
   * 智能处理新页面内容 - 只处理未翻译的部分
   * 避免重复处理已翻译的内容，提高性能和缓存效率
   */
  private async processNewPageContent() {
    const currentUrl = location.href;

    // 检查是否已经处理过当前页面
    if (this.isPageProcessed(currentUrl)) {
      console.log('页面变化：当前页面已处理过，跳过');
      return;
    }

    // 查找未处理的文本节点
    const unprocessedNodes = this.findUnprocessedNodes(document.body);

    if (unprocessedNodes.length === 0) {
      console.log('页面变化：未发现需要处理的新内容');
      this.markPageAsProcessed(currentUrl);
      return;
    }

    console.log(`页面变化：发现 ${unprocessedNodes.length} 个未处理的节点`);

    // 批量处理未处理的节点，使用较小的批次以保持响应性
    const batchSize = 3; // 减少批次大小以提高响应性
    for (let i = 0; i < unprocessedNodes.length; i += batchSize) {
      const batch = unprocessedNodes.slice(i, i + batchSize);

      // 处理当前批次
      await Promise.all(
        batch.map(async (node) => {
          try {
            if (document.body.contains(node)) {
              await this.textProcessor.processRoot(
                node,
                this.textReplacer,
                this.originalWordDisplayMode,
                this.maxLength,
                this.translationPosition,
                this.showParentheses,
              );
            }
          } catch (error) {
            console.warn('处理节点时发生错误:', error, node);
          }
        }),
      );

      // 在批次之间添加短暂延迟，避免阻塞UI
      if (i + batchSize < unprocessedNodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 5)); // 减少延迟时间
      }
    }

    // 标记当前页面为已处理
    this.markPageAsProcessed(currentUrl);
  }

  /**
   * 查找页面中未处理的节点
   * 只返回包含文本且未被处理过的节点
   */
  private findUnprocessedNodes(container: Node): Node[] {
    const unprocessedNodes: Node[] = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element;

          // 跳过已处理的节点
          if (isProcessingResultNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          // 跳过已标记为处理过的节点
          if (
            element.hasAttribute('data-wxt-processed') ||
            element.hasAttribute('data-wxt-word-processed')
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          // 跳过脚本、样式等不需要翻译的元素
          const tagName = element.tagName.toLowerCase();
          if (
            [
              'script',
              'style',
              'noscript',
              'svg',
              'path',
              'meta',
              'link',
              'title',
            ].includes(tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          // 跳过输入元素
          if (['input', 'textarea', 'select', 'button'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // 检查是否包含有意义的文本内容
          const textContent = element.textContent?.trim();
          if (!textContent || textContent.length < 5) {
            // 提高最小长度要求
            return NodeFilter.FILTER_REJECT;
          }

          // 检查是否包含需要翻译的文本（更严格的检查）
          const hasTranslatableText = /[a-zA-Z\u4e00-\u9fff]{3,}/.test(
            textContent,
          );
          if (!hasTranslatableText) {
            return NodeFilter.FILTER_REJECT;
          }

          // 跳过可能是导航、菜单等重复内容的节点
          const className = element.className;
          if (typeof className === 'string') {
            const skipClasses = [
              'nav',
              'menu',
              'sidebar',
              'header',
              'footer',
              'breadcrumb',
            ];
            if (
              skipClasses.some((cls) => className.toLowerCase().includes(cls))
            ) {
              return NodeFilter.FILTER_REJECT;
            }
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    let node;
    while ((node = walker.nextNode())) {
      // 确保这是一个叶子节点或者包含主要文本内容的节点
      const element = node as Element;
      const childElements = Array.from(element.children);

      // 如果有子元素，检查是否大部分文本在当前级别
      if (childElements.length > 0) {
        const directText = this.getDirectTextContent(element);
        if (directText.trim().length < 20) {
          // 提高直接文本的最小长度要求
          continue; // 跳过主要文本在子元素中的节点
        }
      }

      unprocessedNodes.push(node);
    }

    // 限制返回的节点数量，避免一次处理过多内容
    return unprocessedNodes.slice(0, 20);
  }

  /**
   * 获取元素的直接文本内容（不包括子元素的文本）
   */
  private getDirectTextContent(element: Element): string {
    let directText = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        directText += child.textContent || '';
      }
    }
    return directText;
  }

  /**
   * 检查当前页面是否已经被处理过
   */
  private isPageProcessed(url: string): boolean {
    return this.processedPagesCache.has(url);
  }

  /**
   * 标记页面为已处理
   */
  private markPageAsProcessed(url: string): void {
    this.processedPagesCache.add(url);

    // 限制缓存大小，避免内存泄漏
    if (this.processedPagesCache.size > 50) {
      const firstEntry = this.processedPagesCache.values().next().value;
      if (firstEntry) {
        this.processedPagesCache.delete(firstEntry);
      }
    }
  }

  /**
   * 清理页面缓存（用于调试或重置）
   */
  public clearPageCache(): void {
    this.processedPagesCache.clear();
    console.log('页面处理缓存已清理');
  }

  // 调试方法：手动检查页面变化
  public debugCheckPageChange() {
    console.log('当前URL:', this.lastUrl);
    console.log('实际URL:', location.href);
    console.log('是否发生变化:', this.hasPageChanged());
    console.log('页面缓存大小:', this.processedPagesCache.size);
    console.log('已缓存的页面:', Array.from(this.processedPagesCache));

    if (this.hasPageChanged()) {
      console.log('手动触发页面变化处理');
      this.handlePageChange();
    }
  }

  /**
   * 检测是否正在进行重负载操作（如框架重渲染）
   */
  private detectHeavyLoad(): boolean {
    // 检查Ember.js是否正在渲染
    if (this.isEmberRendering()) {
      return true;
    }

    // 检查Performance API中的任务数量
    if ('performance' in window && 'getEntriesByType' in performance) {
      const measures = performance.getEntriesByType('measure');
      const marks = performance.getEntriesByType('mark');

      // 如果有大量的性能标记，可能正在进行重渲染
      if (measures.length > 50 || marks.length > 50) {
        return true;
      }
    }

    // 检查DOM变化频率
    const now = Date.now();
    if (!this.lastMutationTime) {
      this.lastMutationTime = now;
      return false;
    }

    const timeSinceLastMutation = now - this.lastMutationTime;
    this.lastMutationTime = now;

    // 如果DOM变化过于频繁（小于50ms），可能是框架重渲染
    if (timeSinceLastMutation < 50) {
      this.rapidMutationCount = (this.rapidMutationCount || 0) + 1;

      // 连续快速变化超过10次，认为是重负载
      if (this.rapidMutationCount > 10) {
        this.rapidMutationCount = 0;
        return true;
      }
    } else {
      this.rapidMutationCount = 0;
    }

    return false;
  }

  private lastMutationTime: number | undefined;
  private rapidMutationCount = 0;

  /**
   * 检测是否为Ember.js应用并正在渲染
   */
  private isEmberRendering(): boolean {
    // 检查全局Ember对象
    const ember = (window as any).Ember || (window as any).require?.('ember');
    if (ember) {
      // 检查是否有活跃的渲染任务
      const runLoop = ember.run || ember.RunLoop;
      if (runLoop?.hasScheduledTimers?.() || runLoop?.currentRunLoop) {
        return true;
      }
    }

    // 检查DOM中是否有Ember特征
    const emberElements = document.querySelectorAll(
      '[data-ember-action], .ember-view',
    );
    if (emberElements.length > 0) {
      // 检查最近是否有元素被添加（可能是渲染中）
      const recentElements = Array.from(emberElements).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      // 如果有大量活跃的Ember元素，可能正在渲染
      return recentElements.length > 20;
    }

    return false;
  }
}

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

// 定义一个类型，用于描述我们的视口处理器
type ViewportProcessor = {
  observe: (element: Element) => void;
  processAll: (root: Node) => Promise<void>;
};

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
        await processAction();
      }
    });
    // --- 3. 创建核心的视口处理器 (全新架构的核心) ---
    const viewportProcessor = createViewportProcessor(
      textProcessor,
      textReplacer,
      settings,
    );

    // --- 5. 根据触发模式执行操作 (逻辑已重构) ---
    const processAction = () => viewportProcessor.processAll(document.body);

    // --- 根据触发模式执行操作 ---
    if (settings.triggerMode === TriggerMode.AUTOMATIC) {
      // 自动模式下，立即开始观察整个页面的内容
      await processAction();
    }


    // --- 6. 设置监听器 (逻辑已重构) ---
    setupAllListeners(
      settings,
      styleManager,
      textProcessor,
      textReplacer,
      floatingBallManager,
      viewportProcessor, // 将处理器实例传递下去
      processAction, // 将处理函数传递下去
    );
  },
});

/**
 * (全新) 创建核心的视口处理器
 * 它封装了 IntersectionObserver，并负责在元素可见时处理它们
 */
function createViewportProcessor(
  textProcessor: TextProcessor,
  textReplacer: TextReplacer,
  settings: UserSettings,
): ViewportProcessor {
  const processedNodes = new WeakSet<Element>();

  const observer = new IntersectionObserver(
    async (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          obs.unobserve(element); // 确保只处理一次

          if (processedNodes.has(element)) continue;

          // 增加CSS可见性检查
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            continue;
          }

          processedNodes.add(element);

          try {
            // 对这个具体、细小的可见元素执行处理
            await textProcessor.processRoot(
              element,
              textReplacer,
              settings.originalWordDisplayMode,
              settings.maxLength,
              settings.translationPosition,
              settings.showParentheses,
            );
          } catch (_) { /* 静默处理错误 */ }
        }
      }
    },
    { rootMargin: '250px 0px 250px 0px', threshold: 0 },
  );

  // 使用 TreeWalker 精准地查找所有包含实际文本的最小元素
  const findContentNodes = (root: Node): Set<Element> => {
    const contentWrappers = new Set<Element>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue?.trim() && node.parentElement) {
        if (!isProcessingResultNode(node.parentElement)) {
          contentWrappers.add(node.parentElement);
        }
      }
    }
    return contentWrappers;
  };

  return {
    observe: (element: Element) => {
      if (!processedNodes.has(element)) {
        observer.observe(element);
      }
    },
    processAll: async (root: Node) => {
      const contentNodes = findContentNodes(root);
      contentNodes.forEach(node => {
        if (!processedNodes.has(node)) {
          observer.observe(node);
        }
      });
    },
  };
}

/**
 * (重构) 所有监听器
 * 合并了消息监听和DOM变化监听
 */
function setupAllListeners(
  settings: UserSettings,
  styleManager: StyleManager,
  textProcessor: TextProcessor,
  textReplacer: TextReplacer,
  floatingBallManager: FloatingBallManager,
  viewportProcessor: ViewportProcessor, // 接收处理器实例
  processAction: () => Promise<void>, // 接收手动处理函数
) {
  // --- 消息监听 (逻辑基本不变, 仅手动翻译时调用的函数有变) ---
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'settings_updated' || message.type === 'api_config_updated') {
      const newSettings: UserSettings = message.settings;
      const needsPageReload =
        settings.triggerMode !== newSettings.triggerMode ||
        settings.isEnabled !== newSettings.isEnabled ||
        /* ... 其他检查 ... */
        settings.useGptApi !== newSettings.useGptApi;

      if (needsPageReload) {
        window.location.reload();
        return;
      }

      Object.assign(settings, newSettings);
      updateConfiguration(settings, styleManager, textReplacer);
      const newActiveConfig = newSettings.apiConfigs.find(config => config.id === newSettings.activeApiConfigId);
      if (newActiveConfig) {
        textProcessor.updateApiConfig(newActiveConfig.config);
      }
      floatingBallManager.updateConfig(settings.floatingBall);
    } else if (message.type === 'MANUAL_TRANSLATE') {
      if (settings.triggerMode === TriggerMode.MANUAL) {
        const isConfigValid = await browser.runtime.sendMessage({ type: 'validate-configuration', source: 'user_action' });
        if (isConfigValid) {
          await processAction(); // 调用统一的处理函数
        }
      }
    }
  });

  // --- DOM 变化监听 (逻辑已完全简化) ---
  if (settings.triggerMode === TriggerMode.AUTOMATIC) {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            // 对新添加的每一个节点，都使用 viewportProcessor 去处理它下面的内容
            viewportProcessor.processAll(node);
          });
        } else if (mutation.type === 'characterData') {
          // 如果文本内容变化，处理其父元素
          if (mutation.target.parentElement) {
            viewportProcessor.processAll(mutation.target.parentElement)
          }
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

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
// async function processPage(
//   textProcessor: TextProcessor,
//   textReplacer: TextReplacer,
//   originalWordDisplayMode: OriginalWordDisplayMode,
//   maxLength: number | undefined,
//   translationPosition: TranslationPosition,
//   showParentheses: boolean,
// ) {
//   await textProcessor.processRoot(
//     document.body,
//     textReplacer,
//     originalWordDisplayMode,
//     maxLength,
//     translationPosition,
//     showParentheses,
//   );
// }

/**
 * 设置所有监听器，包括消息和DOM变化
 */
// function setupListeners(
//   settings: UserSettings,
//   styleManager: StyleManager,
//   textProcessor: TextProcessor,
//   textReplacer: TextReplacer,
//   floatingBallManager: FloatingBallManager,
// ) {
//   // 监听来自 popup 的消息
//   browser.runtime.onMessage.addListener(async (message) => {
//     if (
//       message.type === 'settings_updated' ||
//       message.type === 'api_config_updated'
//     ) {
//       // 设置已更新
//       const newSettings: UserSettings = message.settings;

//       // 检查是否需要刷新页面的关键设置
//       const needsPageReload =
//         settings.triggerMode !== newSettings.triggerMode ||
//         settings.isEnabled !== newSettings.isEnabled ||
//         settings.enablePronunciationTooltip !==
//         newSettings.enablePronunciationTooltip ||
//         settings.translationDirection !== newSettings.translationDirection ||
//         settings.userLevel !== newSettings.userLevel ||
//         settings.useGptApi !== newSettings.useGptApi;

//       if (needsPageReload) {
//         window.location.reload();
//         return;
//       }

//       // 更新本地设置对象
//       Object.assign(settings, newSettings);

//       // 应用新配置
//       updateConfiguration(settings, styleManager, textReplacer);

//       // 更新API配置
//       const newActiveConfig = newSettings.apiConfigs.find(
//         (config) => config.id === newSettings.activeApiConfigId,
//       );
//       if (newActiveConfig) {
//         textProcessor.updateApiConfig(newActiveConfig.config);
//       }

//       // 更新悬浮球配置
//       floatingBallManager.updateConfig(settings.floatingBall);
//     } else if (message.type === 'MANUAL_TRANSLATE') {
//       // 收到手动翻译请求
//       if (settings.triggerMode === TriggerMode.MANUAL) {
//         const isConfigValid = await browser.runtime.sendMessage({
//           type: 'validate-configuration',
//           source: 'user_action',
//         });
//         if (isConfigValid) {
//           await processPage(
//             textProcessor,
//             textReplacer,
//             settings.originalWordDisplayMode,
//             settings.maxLength,
//             settings.translationPosition,
//             settings.showParentheses,
//           );
//         }
//       }
//     }
//   });

//   // 仅在自动模式下观察DOM变化
//   if (settings.triggerMode === TriggerMode.AUTOMATIC) {
//     setupDomObserver(
//       textProcessor,
//       textReplacer,
//       settings.originalWordDisplayMode,
//       settings.maxLength,
//       settings.translationPosition,
//       settings.showParentheses,
//     );
//   }
// }

/**
 * 设置 DOM 观察器以处理动态内容
 * 使用新的状态管理器进行更智能的重复处理检测
 */
// function setupDomObserver(
//   textProcessor: TextProcessor,
//   textReplacer: TextReplacer,
//   originalWordDisplayMode: OriginalWordDisplayMode,
//   maxLength: number | undefined,
//   translationPosition: TranslationPosition,
//   showParentheses: boolean,
// ) {
//   let debounceTimer: number;
//   const nodesToProcess = new Set<Node>();
//   const observerConfig = {
//     childList: true,
//     subtree: true,
//     characterData: true,
//   };

//   const observer = new MutationObserver((mutations) => {
//     let hasValidChanges = false;

//     mutations.forEach((mutation) => {
//       if (mutation.type === 'childList') {
//         mutation.addedNodes.forEach((node) => {
//           // 跳过已知的处理结果元素
//           if (isProcessingResultNode(node)) {
//             return;
//           }

//           // 对所有新添加的元素节点都进行处理尝试
//           if (node.nodeType === Node.ELEMENT_NODE) {
//             const element = node as Element;
//             const textContent = element.textContent?.trim();

//             // 只要有足够的文本内容就尝试处理
//             if (textContent && textContent.length > 15) {
//               nodesToProcess.add(node);
//               hasValidChanges = true;
//             }
//           }
//         });
//       } else if (
//         mutation.type === 'characterData' &&
//         mutation.target.parentElement
//       ) {
//         const parentElement = mutation.target.parentElement;
//         if (!isProcessingResultNode(parentElement)) {
//           nodesToProcess.add(parentElement);
//           hasValidChanges = true;
//         }
//       }
//     });

//     // 只有在有有效变化时才进行处理
//     if (!hasValidChanges) {
//       return;
//     }

//     clearTimeout(debounceTimer);
//     debounceTimer = window.setTimeout(async () => {
//       if (nodesToProcess.size === 0) return;

//       const topLevelNodes = new Set<Node>();
//       nodesToProcess.forEach((node) => {
//         if (
//           document.body.contains(node) &&
//           !isDescendant(node, nodesToProcess)
//         ) {
//           topLevelNodes.add(node);
//         }
//       });

//       // 暂停观察器避免处理过程中的循环触发
//       observer.disconnect();

//       try {
//         for (const node of topLevelNodes) {
//           await textProcessor.processRoot(
//             node,
//             textReplacer,
//             originalWordDisplayMode,
//             maxLength,
//             translationPosition,
//             showParentheses,
//           );
//         }
//       } catch (_) {
//         // 静默处理错误
//       }

//       nodesToProcess.clear();
//       observer.observe(document.body, observerConfig);
//     }, 150);
//   });

//   observer.observe(document.body, observerConfig);
// }

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

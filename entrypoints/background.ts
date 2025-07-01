import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS } from '@/src/modules/types';
import { StorageManager } from '@/src/modules/storageManager';
import { ContextMenuManager } from '@/src/modules/contextMenu';
import { WebsiteManager } from '@/src/modules/options/website-management/manager';

export default defineBackground(() => {
  // 初始化右键菜单管理器
  const websiteManager = new WebsiteManager();
  const contextMenuManager = new ContextMenuManager(websiteManager);

  // 在扩展首次安装时，设置默认值
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      try {
        // 使用StorageManager保存默认设置，确保使用序列化格式
        const storageManager = new StorageManager();
        await storageManager.saveUserSettings(DEFAULT_SETTINGS);
        console.log('DEFAULT_SETTINGS', DEFAULT_SETTINGS);
      } catch (error) {
        console.error('保存默认设置失败:', error);
        // 回退到旧的保存方式
        browser.storage.sync.set(DEFAULT_SETTINGS);
      }
    }

    // 初始化右键菜单
    try {
      await contextMenuManager.init();
      console.log('右键菜单初始化完成');
    } catch (error) {
      console.error('右键菜单初始化失败:', error);
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'show-notification') {
      browser.notifications.create(message.options);
      return;
    }

    if (message.type === 'open-popup') {
      // 打开扩展的popup界面
      try {
        browser.action.openPopup();
      } catch (error) {
        console.error('无法打开popup:', error);
        const optionsUrl = browser.runtime.getURL('/options.html');
        browser.tabs.create({ url: optionsUrl });
      }
      return;
    }

    if (message.type === 'validate-configuration') {
      (async () => {
        try {
          // 使用StorageManager获取设置
          const storageManager = new StorageManager();
          const settings = await storageManager.getUserSettings();

          // 检查多配置系统中的活跃配置
          const activeConfig = settings.apiConfigs?.find(
            (config) => config.id === settings.activeApiConfigId,
          );
          const isConfigValid = !!activeConfig?.config?.apiKey;

          if (isConfigValid) {
            sendResponse(true);
            return;
          }
        } catch (error) {
          console.error('配置验证失败:', error);
          sendResponse(false);
          return;
        }

        // --- 无效配置处理 ---
        const notificationOptions = {
          type: 'basic' as const,
          title: '[浸入式学语言助手] API 配置错误',
          message: 'API 密钥未设置。请点击扩展图标进入设置页面进行配置。',
          iconUrl: browser.runtime.getURL('/warning.png'),
        };

        if (message.source === 'user_action') {
          browser.notifications.create(notificationOptions);
        } else {
          // 默认为 page_load 逻辑
          const { apiKeyNotificationShown } = await browser.storage.session.get(
            'apiKeyNotificationShown',
          );
          if (!apiKeyNotificationShown) {
            browser.notifications.create(notificationOptions);
            await browser.storage.session.set({
              apiKeyNotificationShown: true,
            });
          }
        }
        sendResponse(false);
      })();
      return true;
    }

    // 打开options页面
    if (message.type === 'open-options') {
      const optionsUrl = browser.runtime.getURL('/options.html');
      browser.tabs.create({ url: optionsUrl });
      return;
    }

    // API请求代理 - 绕过CORS限制
    if (message.type === 'api-request') {
      (async () => {
        try {
          const { url, method, headers, body, timeout } = message.data;

          // 创建AbortController用于超时控制
          const controller = new AbortController();
          let timeoutId: NodeJS.Timeout | undefined;

          // 只有在timeout大于0时才设置超时
          if (timeout && timeout > 0) {
            timeoutId = setTimeout(() => controller.abort(), timeout);
          }

          const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
          });

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // 读取响应数据
          const responseData = await response.text();
          let parsedData;

          try {
            parsedData = JSON.parse(responseData);
          } catch {
            parsedData = responseData;
          }

          if (response.ok) {
            sendResponse({
              success: true,
              data: parsedData,
            });
          } else {
            sendResponse({
              success: false,
              error: {
                message: `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                statusText: response.statusText,
              },
            });
          }
        } catch (error: any) {
          console.error('Background API请求失败:', error);

          let errorMessage = '请求失败';
          if (error.name === 'AbortError') {
            errorMessage = '请求超时';
          } else if (error.message) {
            errorMessage = error.message;
          }

          sendResponse({
            success: false,
            error: {
              message: errorMessage,
            },
          });
        }
      })();
      return true; // 保持消息通道开放用于异步响应
    }
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'translate-page') {
      // 验证API配置
      const isValid = await validateApiConfiguration();
      if (!isValid) {
        return;
      }

      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id) {
          await browser.tabs.sendMessage(tabs[0].id, {
            type: 'translate-page-command',
          });
        }
      } catch (error) {
        console.error('[Background] 翻译整页失败:', error);
      }
    }
  });

  // 独立的API配置验证函数
  async function validateApiConfiguration(): Promise<boolean> {
    try {
      const storageManager = new StorageManager();
      const settings = await storageManager.getUserSettings();

      const activeConfig = settings.apiConfigs?.find(
        (config) => config.id === settings.activeApiConfigId,
      );
      const isConfigValid = !!activeConfig?.config?.apiKey;

      if (!isConfigValid) {
        const notificationOptions = {
          type: 'basic' as const,
          title: '[浸入式学语言助手] API 配置错误',
          message: 'API 密钥未设置。请点击扩展图标进入设置页面进行配置。',
          iconUrl: browser.runtime.getURL('/warning.png'),
        };
        browser.notifications.create(notificationOptions);
      }

      return isConfigValid;
    } catch (error) {
      console.error('[Background] 配置验证失败:', error);
      return false;
    }
  }
});

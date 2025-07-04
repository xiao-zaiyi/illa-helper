import { ContentManager } from '@/src/modules/content/ContentManager';

/**
 * Content Script 入口点
 * 使用服务化架构进行初始化和管理
 */
export default defineContentScript({
  // 匹配所有网站
  matches: ['<all_urls>'],

  // 主函数
  async main() {
    const contentManager = new ContentManager();

    try {
      await contentManager.init();
    } catch (error) {
      console.error('[Content Script] 初始化失败:', error);
      // 清理资源
      contentManager.destroy();
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      contentManager.destroy();
    });
  },
});

/**
 * 翻译状态管理器
 * 负责管理翻译功能的开启/关闭状态
 */

class TranslationStateManager {
  private static instance: TranslationStateManager;
  private isActive: boolean = false;
  private listeners: Array<(isActive: boolean) => void> = [];
  private instanceId: string;
  private initialized: boolean = false;

  private constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log('[TranslationStateManager] 创建实例:', this.instanceId);
  }

  static getInstance(): TranslationStateManager {
    if (!TranslationStateManager.instance) {
      TranslationStateManager.instance = new TranslationStateManager();
    }
    return TranslationStateManager.instance;
  }

  /**
   * 初始化状态管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 从存储中恢复状态
      const result = await browser.storage.local.get('translationActive');
      this.isActive = result.translationActive || false;
      console.log('[TranslationStateManager] 从存储恢复状态:', this.isActive);
      this.initialized = true;
    } catch (error) {
      console.error('[TranslationStateManager] 初始化失败:', error);
      this.isActive = false;
      this.initialized = true;
    }
  }

  /**
   * 保存状态到存储
   */
  private async saveState(): Promise<void> {
    try {
      await browser.storage.local.set({ translationActive: this.isActive });
    } catch (error) {
      console.error('[TranslationStateManager] 保存状态失败:', error);
    }
  }

  /**
   * 获取当前翻译状态
   */
  getTranslationState(): boolean {
    // 如果已初始化，返回内存中的状态
    if (this.initialized) {
      console.log('[TranslationStateManager] 获取内存状态:', this.isActive, '实例ID:', this.instanceId);
      return this.isActive;
    } else {
      // 如果未初始化，返回默认状态
      console.log('[TranslationStateManager] 获取默认状态: false, 实例ID:', this.instanceId);
      return false;
    }
  }

  /**
   * 同步获取当前翻译状态（从存储中读取）
   */
  async getTranslationStateAsync(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get('translationActive');
      const state = result.translationActive || false;
      console.log('[TranslationStateManager] 从存储获取状态:', state, '实例ID:', this.instanceId);
      return state;
    } catch (error) {
      console.error('[TranslationStateManager] 从存储获取状态失败:', error);
      return false;
    }
  }

  /**
   * 强制从存储中刷新状态
   */
  async refreshStateFromStorage(): Promise<void> {
    try {
      const result = await browser.storage.local.get('translationActive');
      this.isActive = result.translationActive || false;
      this.initialized = true; // 确保设置为已初始化
      console.log('[TranslationStateManager] 从存储刷新状态:', this.isActive, '实例ID:', this.instanceId);
    } catch (error) {
      console.error('[TranslationStateManager] 从存储刷新状态失败:', error);
      this.isActive = false;
      this.initialized = true;
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 切换翻译状态
   */
  async toggleTranslation(): Promise<boolean> {
    const oldState = this.isActive;
    this.isActive = !this.isActive;
    console.log('[TranslationStateManager] 实例', this.instanceId, '状态从', oldState, '切换为:', this.isActive);
    await this.saveState();
    this.notifyListeners();
    return this.isActive;
  }

  /**
   * 开启翻译
   */
  async enableTranslation(): Promise<void> {
    if (!this.isActive) {
      this.isActive = true;
      await this.saveState();
      this.notifyListeners();
    }
  }

  /**
   * 关闭翻译
   */
  async disableTranslation(): Promise<void> {
    if (this.isActive) {
      this.isActive = false;
      await this.saveState();
      this.notifyListeners();
    }
  }

  /**
   * 添加状态变化监听器
   */
  addListener(listener: (isActive: boolean) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(listener: (isActive: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isActive);
      } catch (error) {
        console.error('翻译状态监听器执行失败:', error);
      }
    });
  }
}

export const translationStateManager = TranslationStateManager.getInstance(); 
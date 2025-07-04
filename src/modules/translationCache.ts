/**
 * 翻译缓存管理器
 * 负责保存和恢复翻译结果，提升用户体验
 */

export interface TranslationCacheEntry {
  /** 原始文本 */
  originalText: string;
  /** 翻译结果 */
  translationResult: any;
  /** 缓存时间戳 */
  timestamp: number;
  /** 页面URL（用于区分不同页面） */
  pageUrl: string;
  /** 内容指纹 */
  fingerprint: string;
}

export interface TranslationCacheStats {
  /** 缓存条目数量 */
  entryCount: number;
  /** 缓存大小（字节） */
  cacheSize: number;
  /** 命中次数 */
  hitCount: number;
  /** 未命中次数 */
  missCount: number;
}

/**
 * 翻译缓存管理器
 */
export class TranslationCacheManager {
  private cache = new Map<string, TranslationCacheEntry>();
  private stats = {
    hitCount: 0,
    missCount: 0,
  };
  
  /** 缓存过期时间（24小时） */
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;
  
  /** 最大缓存条目数 */
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(text: string, pageUrl: string, fingerprint: string): string {
    const keyData = {
      text: text.trim(),
      pageUrl,
      fingerprint,
    };
    
    // 使用简单的哈希算法
    const str = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 保存翻译结果到缓存
   */
  saveTranslation(
    originalText: string,
    translationResult: any,
    fingerprint: string,
  ): void {
    try {
      const pageUrl = window.location.href;
      const cacheKey = this.generateCacheKey(originalText, pageUrl, fingerprint);
      
      const entry: TranslationCacheEntry = {
        originalText,
        translationResult,
        timestamp: Date.now(),
        pageUrl,
        fingerprint,
      };
      
      this.cache.set(cacheKey, entry);
      
      // 清理过期和超量的缓存
      this.cleanup();
      
      // 保存到存储
      this.saveToStorage();
      
      console.log('[TranslationCache] 保存翻译结果:', {
        key: cacheKey,
        text: originalText.substring(0, 50) + '...',
        fingerprint,
        pageUrl: pageUrl.substring(0, 50) + '...',
        textLength: originalText.length,
        replacements: translationResult.replacements?.length || 0,
        cacheSize: this.cache.size,
      });
    } catch (error) {
      console.error('[TranslationCache] 保存翻译结果失败:', error);
    }
  }

  /**
   * 从缓存中获取翻译结果
   */
  getTranslation(
    originalText: string,
    fingerprint: string,
  ): any | null {
    try {
      const pageUrl = window.location.href;
      const cacheKey = this.generateCacheKey(originalText, pageUrl, fingerprint);
      
      console.log('[TranslationCache] 查找缓存:', {
        text: originalText.substring(0, 50) + '...',
        fingerprint,
        pageUrl: pageUrl.substring(0, 50) + '...',
        cacheKey,
        cacheSize: this.cache.size,
      });
      
      const entry = this.cache.get(cacheKey);
      
      if (!entry) {
        this.stats.missCount++;
        console.log('[TranslationCache] 缓存未命中');
        return null;
      }
      
      // 检查是否过期
      if (Date.now() - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(cacheKey);
        this.stats.missCount++;
        console.log('[TranslationCache] 缓存已过期');
        return null;
      }
      
      // 检查页面URL是否匹配
      if (entry.pageUrl !== pageUrl) {
        this.stats.missCount++;
        console.log('[TranslationCache] 页面URL不匹配');
        return null;
      }
      
      this.stats.hitCount++;
      console.log('[TranslationCache] 缓存命中:', {
        key: cacheKey,
        textLength: originalText.length,
        replacements: entry.translationResult.replacements?.length || 0,
      });
      
      return entry.translationResult;
    } catch (error) {
      console.error('[TranslationCache] 获取翻译结果失败:', error);
      this.stats.missCount++;
      return null;
    }
  }

  /**
   * 清理过期和超量的缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // 找出过期的条目
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    // 删除过期条目
    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });
    
    // 如果仍然超过最大大小，删除最旧的条目
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const deleteCount = this.cache.size - this.MAX_CACHE_SIZE;
      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
    
    if (expiredKeys.length > 0 || this.cache.size > this.MAX_CACHE_SIZE) {
      console.log('[TranslationCache] 清理缓存:', {
        expired: expiredKeys.length,
        currentSize: this.cache.size,
      });
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): TranslationCacheStats {
    const cacheSize = JSON.stringify(Array.from(this.cache.entries())).length;
    
    return {
      entryCount: this.cache.size,
      cacheSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
    };
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.cache.clear();
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.saveToStorage();
    console.log('[TranslationCache] 已清空所有缓存');
  }

  /**
   * 保存缓存到存储
   */
  private async saveToStorage(): Promise<void> {
    try {
      const cacheData = Array.from(this.cache.entries());
      const storageData = {
        cache: cacheData,
        stats: this.stats,
        timestamp: Date.now(),
      };
      
      await chrome.storage.local.set({
        'translation-cache': storageData,
      });
    } catch (error) {
      console.error('[TranslationCache] 保存到存储失败:', error);
    }
  }

  /**
   * 从存储加载缓存
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('translation-cache');
      const storageData = result['translation-cache'];
      
      if (storageData && storageData.cache) {
        this.cache = new Map(storageData.cache);
        this.stats = storageData.stats || { hitCount: 0, missCount: 0 };
        
        // 清理过期条目
        this.cleanup();
        
        console.log('[TranslationCache] 从存储加载缓存:', {
          entryCount: this.cache.size,
          hitCount: this.stats.hitCount,
          missCount: this.stats.missCount,
        });
      }
    } catch (error) {
      console.error('[TranslationCache] 从存储加载失败:', error);
    }
  }
}

// 全局单例实例
export const translationCacheManager = new TranslationCacheManager(); 
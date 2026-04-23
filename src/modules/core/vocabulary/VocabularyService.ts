/**
 * 生词本服务
 * 负责管理生词条目的存储、查询、统计和导出功能
 *
 * 功能特性：
 * - 自动记录翻译过的单词和译文
 * - 统计单词翻译频次
 * - 支持收藏/取消收藏
 * - 支持多种排序和筛选方式
 * - 支持导出为 txt/csv/json 格式
 * - 事件通知机制
 */

import { browser } from 'wxt/browser';
import {
  VocabularyEntry,
  VocabularyQueryOptions,
  VocabularyQueryResult,
  VocabularyStats,
  VocabularyServiceConfig,
  VocabularyOperationResult,
  ExportFormat,
  ExportOptions,
  VocabularyEventType,
  VocabularyEventData,
  VocabularyEventListener,
} from '../../shared/types/vocabulary';

const DEFAULT_STORAGE_KEY = 'vocabulary-data';
const DEFAULT_MAX_ENTRIES = 10000;

export class VocabularyService {
  private static instance: VocabularyService;

  private readonly config: VocabularyServiceConfig;
  private readonly storageKey: string;

  private entriesCache: Map<string, VocabularyEntry> = new Map();
  private cacheLoaded = false;

  private eventListeners: Map<VocabularyEventType, VocabularyEventListener[]> =
    new Map();

  private constructor(config: VocabularyServiceConfig = {}) {
    this.config = {
      autoRecord: true,
      maxEntries: DEFAULT_MAX_ENTRIES,
      enableCache: true,
      storageKey: DEFAULT_STORAGE_KEY,
      ...config,
    };
    this.storageKey = this.config.storageKey!;
  }

  public static getInstance(config?: VocabularyServiceConfig): VocabularyService {
    if (!VocabularyService.instance) {
      VocabularyService.instance = new VocabularyService(config);
    }
    return VocabularyService.instance;
  }

  // ==================== 事件管理 ====================

  public addEventListener(
    eventType: VocabularyEventType,
    listener: VocabularyEventListener,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  public removeEventListener(
    eventType: VocabularyEventType,
    listener: VocabularyEventListener,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(eventType: VocabularyEventType, data?: Partial<VocabularyEventData>): void {
    const event: VocabularyEventData = {
      type: eventType,
      timestamp: Date.now(),
      ...data,
    };

    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          console.error('Vocabulary event listener error:', e);
        }
      });
    }
  }

  // ==================== 核心存储操作 ====================

  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded || !this.config.enableCache) return;
    await this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    console.log('[VocabularyService] loadFromStorage 开始执行:', {
      storageKey: this.storageKey,
      cacheSizeBefore: this.entriesCache.size,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await browser.storage.local.get(this.storageKey);
      const serializedData = result[this.storageKey];

      console.log('[VocabularyService] 从存储读取结果:', {
        hasData: !!serializedData,
        dataLength: serializedData?.length || 0,
      });

      if (serializedData) {
        try {
          const entries: VocabularyEntry[] = JSON.parse(serializedData);
          console.log('[VocabularyService] 解析数据成功:', {
            entryCount: entries.length,
          });

          this.entriesCache.clear();
          entries.forEach((entry) => {
            this.entriesCache.set(entry.word, entry);
          });

          console.log('[VocabularyService] 缓存加载完成:', {
            cacheSizeAfter: this.entriesCache.size,
          });
        } catch (parseError) {
          const err = parseError as Error;
          console.error('[VocabularyService] ❌ 解析存储数据失败:', {
            errorMessage: err?.message || String(parseError),
            errorStack: err?.stack,
            dataPreview: serializedData?.substring(0, 200),
          });
          throw parseError;
        }
      } else {
        console.log('[VocabularyService] 存储中没有数据，使用空缓存');
      }

      this.cacheLoaded = true;
      console.log('[VocabularyService] ✅ loadFromStorage 执行完成');
    } catch (error) {
      const err = error as Error;
      console.error('[VocabularyService] ❌ loadFromStorage 执行失败:', {
        storageKey: this.storageKey,
        errorMessage: err?.message || String(error),
        errorStack: err?.stack,
        timestamp: new Date().toISOString(),
      });
      console.error('[VocabularyService] 详细错误:', error);
      this.cacheLoaded = true;
    }
  }

  private async saveToStorage(): Promise<void> {
    console.log('[VocabularyService] saveToStorage 开始执行:', {
      storageKey: this.storageKey,
      cacheSize: this.entriesCache.size,
      timestamp: new Date().toISOString(),
    });

    try {
      const entries = Array.from(this.entriesCache.values());
      console.log('[VocabularyService] 准备序列化数据:', {
        entryCount: entries.length,
      });

      const serializedData = JSON.stringify(entries);
      console.log('[VocabularyService] 序列化完成:', {
        dataSize: serializedData.length,
      });

      await browser.storage.local.set({ [this.storageKey]: serializedData });
      console.log('[VocabularyService] ✅ 保存到存储成功:', {
        storageKey: this.storageKey,
        entryCount: entries.length,
        dataSize: serializedData.length,
      });
    } catch (error) {
      const err = error as Error;
      console.error('[VocabularyService] ❌ saveToStorage 执行失败:', {
        storageKey: this.storageKey,
        cacheSize: this.entriesCache.size,
        errorMessage: err?.message || String(error),
        errorStack: err?.stack,
        timestamp: new Date().toISOString(),
      });
      console.error('[VocabularyService] 详细错误:', error);
    }
  }

  // ==================== CRUD 操作 ====================

  public async recordTranslation(
    word: string,
    translation: string,
    source: string = 'ai-translation',
    phonetic?: string,
    partOfSpeech?: string,
  ): Promise<VocabularyEntry> {
    console.log('[VocabularyService] recordTranslation 开始执行:', {
      word,
      normalizedWord: word?.toLowerCase()?.trim(),
      translation: translation?.substring(0, 50),
      source,
      phonetic,
      partOfSpeech,
      cacheLoaded: this.cacheLoaded,
      cacheSize: this.entriesCache.size,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.ensureCacheLoaded();

      const normalizedWord = word.toLowerCase().trim();
      const now = Date.now();

      console.log('[VocabularyService] 缓存加载完成:', {
        normalizedWord,
        cacheLoaded: this.cacheLoaded,
        cacheSize: this.entriesCache.size,
      });

      let entry = this.entriesCache.get(normalizedWord);

      if (entry) {
        console.log('[VocabularyService] 找到现有条目，更新频次:', {
          word: entry.word,
          originalWord: entry.originalWord,
          oldFrequency: entry.frequency,
          newFrequency: entry.frequency + 1,
          isFavorite: entry.isFavorite,
        });

        entry.frequency += 1;
        entry.lastTranslatedAt = now;
        entry.translation = translation || entry.translation;
        if (phonetic) entry.phonetic = phonetic;
        if (partOfSpeech) entry.partOfSpeech = partOfSpeech;

        this.emitEvent(VocabularyEventType.WORD_UPDATED, {
          word: normalizedWord,
          entry,
        });
      } else {
        console.log('[VocabularyService] 未找到现有条目，创建新条目:', {
          normalizedWord,
          originalWord: word,
          cacheSizeBefore: this.entriesCache.size,
        });

        await this.ensureSpaceAvailable();

        entry = {
          id: this.generateId(),
          word: normalizedWord,
          originalWord: word,
          translation,
          source,
          frequency: 1,
          isFavorite: false,
          firstTranslatedAt: now,
          lastTranslatedAt: now,
          phonetic,
          partOfSpeech,
          tags: [],
        };

        console.log('[VocabularyService] 创建新条目:', {
          id: entry.id,
          word: entry.word,
          originalWord: entry.originalWord,
          frequency: entry.frequency,
        });

        this.entriesCache.set(normalizedWord, entry);

        console.log('[VocabularyService] 缓存更新后大小:', {
          cacheSizeAfter: this.entriesCache.size,
        });

        this.emitEvent(VocabularyEventType.WORD_ADDED, {
          word: normalizedWord,
          entry,
        });
      }

      console.log('[VocabularyService] 准备保存到存储...');
      await this.saveToStorage();
      console.log('[VocabularyService] ✅ 保存到存储成功');

      return entry;
    } catch (error) {
      const err = error as Error;
      console.error('[VocabularyService] ❌ recordTranslation 执行失败:', {
        word,
        translation: translation?.substring(0, 50),
        source,
        errorMessage: err?.message || String(error),
        errorStack: err?.stack,
        timestamp: new Date().toISOString(),
      });
      console.error('[VocabularyService] 详细错误:', error);
      throw error;
    }
  }

  private async ensureSpaceAvailable(): Promise<void> {
    const maxEntries = this.config.maxEntries || DEFAULT_MAX_ENTRIES;

    if (this.entriesCache.size >= maxEntries) {
      const entries = Array.from(this.entriesCache.values());

      const sorted = entries.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? 1 : -1;
        }
        return a.lastTranslatedAt - b.lastTranslatedAt;
      });

      const toRemove = sorted.slice(0, Math.ceil(maxEntries * 0.1));

      toRemove.forEach((entry) => {
        if (!entry.isFavorite) {
          this.entriesCache.delete(entry.word);
        }
      });
    }
  }

  public async getEntry(word: string): Promise<VocabularyEntry | undefined> {
    await this.ensureCacheLoaded();
    const normalizedWord = word.toLowerCase().trim();
    return this.entriesCache.get(normalizedWord);
  }

  public async updateEntry(
    word: string,
    updates: Partial<VocabularyEntry>,
  ): Promise<VocabularyOperationResult> {
    await this.ensureCacheLoaded();
    const normalizedWord = word.toLowerCase().trim();
    const entry = this.entriesCache.get(normalizedWord);

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    const updatedEntry: VocabularyEntry = {
      ...entry,
      ...updates,
      word: normalizedWord,
    };

    this.entriesCache.set(normalizedWord, updatedEntry);
    await this.saveToStorage();

    this.emitEvent(VocabularyEventType.WORD_UPDATED, {
      word: normalizedWord,
      entry: updatedEntry,
    });

    return { success: true, data: updatedEntry };
  }

  public async deleteEntry(word: string): Promise<VocabularyOperationResult> {
    await this.ensureCacheLoaded();
    const normalizedWord = word.toLowerCase().trim();
    const entry = this.entriesCache.get(normalizedWord);

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    this.entriesCache.delete(normalizedWord);
    await this.saveToStorage();

    this.emitEvent(VocabularyEventType.WORD_REMOVED, {
      word: normalizedWord,
    });

    return { success: true };
  }

  public async toggleFavorite(word: string): Promise<boolean> {
    await this.ensureCacheLoaded();
    const normalizedWord = word.toLowerCase().trim();
    const entry = this.entriesCache.get(normalizedWord);

    if (!entry) {
      return false;
    }

    entry.isFavorite = !entry.isFavorite;
    await this.saveToStorage();

    const eventType = entry.isFavorite
      ? VocabularyEventType.FAVORITE_ADDED
      : VocabularyEventType.FAVORITE_REMOVED;

    this.emitEvent(eventType, {
      word: normalizedWord,
      entry,
    });

    return entry.isFavorite;
  }

  // ==================== 查询操作 ====================

  public async query(
    options: VocabularyQueryOptions = {},
  ): Promise<VocabularyQueryResult> {
    await this.ensureCacheLoaded();

    let entries = Array.from(this.entriesCache.values());

    if (options.search) {
      const searchLower = options.search.toLowerCase().trim();
      entries = entries.filter(
        (entry) =>
          entry.word.includes(searchLower) ||
          entry.translation.toLowerCase().includes(searchLower) ||
          entry.originalWord.toLowerCase().includes(searchLower),
      );
    }

    if (options.favoritesOnly) {
      entries = entries.filter((entry) => entry.isFavorite);
    }

    if (options.minFrequency !== undefined && options.minFrequency > 0) {
      entries = entries.filter((entry) => entry.frequency >= options.minFrequency!);
    }

    if (options.dateFrom !== undefined) {
      entries = entries.filter((entry) => entry.lastTranslatedAt >= options.dateFrom!);
    }

    if (options.dateTo !== undefined) {
      entries = entries.filter((entry) => entry.lastTranslatedAt <= options.dateTo!);
    }

    const sortBy = options.sortBy || 'lastTranslatedAt';
    const sortOrder = options.sortOrder || 'desc';

    entries.sort((a, b) => {
      let comparison: number;

      switch (sortBy) {
        case 'frequency':
          comparison = a.frequency - b.frequency;
          break;
        case 'firstTranslatedAt':
          comparison = a.firstTranslatedAt - b.firstTranslatedAt;
          break;
        case 'lastTranslatedAt':
          comparison = a.lastTranslatedAt - b.lastTranslatedAt;
          break;
        case 'word':
          comparison = a.word.localeCompare(b.word);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = entries.length;
    const offset = options.offset || 0;
    const limit = options.limit || total;

    const paginatedEntries = entries.slice(offset, offset + limit);

    return {
      entries: paginatedEntries,
      total,
      offset,
      limit,
    };
  }

  // ==================== 统计信息 ====================

  public async getStats(): Promise<VocabularyStats> {
    await this.ensureCacheLoaded();

    const entries = Array.from(this.entriesCache.values());
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    const totalTranslations = entries.reduce((sum, entry) => sum + entry.frequency, 0);

    const todayTranslations = entries
      .filter((entry) => entry.lastTranslatedAt > now - oneDay)
      .reduce((sum, entry) => sum + entry.frequency, 0);

    const weekTranslations = entries
      .filter((entry) => entry.lastTranslatedAt > now - oneWeek)
      .reduce((sum, entry) => sum + entry.frequency, 0);

    const dates = entries
      .filter((entry) => entry.firstTranslatedAt > 0)
      .map((entry) => entry.firstTranslatedAt);

    const lastDates = entries
      .filter((entry) => entry.lastTranslatedAt > 0)
      .map((entry) => entry.lastTranslatedAt);

    return {
      totalWords: entries.length,
      favoriteWords: entries.filter((entry) => entry.isFavorite).length,
      totalTranslations,
      todayTranslations,
      weekTranslations,
      firstTranslationDate: dates.length > 0 ? Math.min(...dates) : null,
      lastTranslationDate: lastDates.length > 0 ? Math.max(...lastDates) : null,
    };
  }

  // ==================== 导出功能 ====================

  public async exportData(options: ExportOptions): Promise<string> {
    const queryOptions: VocabularyQueryOptions = {
      favoritesOnly: options.favoritesOnly,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      sortBy: 'lastTranslatedAt',
      sortOrder: 'desc',
    };

    const result = await this.query(queryOptions);
    const entries = result.entries;

    switch (options.format) {
      case ExportFormat.CSV:
        return this.exportAsCSV(entries, options);
      case ExportFormat.JSON:
        return this.exportAsJSON(entries);
      case ExportFormat.TXT:
      default:
        return this.exportAsTXT(entries, options);
    }
  }

  private exportAsTXT(entries: VocabularyEntry[], options: ExportOptions): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString().split('T')[0];

    lines.push(`# 生词本导出 - ${timestamp}`);
    lines.push(`# 共 ${entries.length} 个单词`);
    lines.push('');

    entries.forEach((entry, index) => {
      const parts: string[] = [];

      parts.push(`${index + 1}. ${entry.originalWord}`);

      if (options.includePhonetic && entry.phonetic) {
        parts.push(`   [${entry.phonetic}]`);
      }

      parts.push(`   ${entry.translation}`);

      if (options.includeFrequency) {
        parts.push(`   翻译次数: ${entry.frequency}`);
      }

      if (entry.isFavorite) {
        parts.push(`   ⭐ 已收藏`);
      }

      if (options.includeTimestamps) {
        const lastDate = new Date(entry.lastTranslatedAt).toLocaleDateString('zh-CN');
        parts.push(`   最近翻译: ${lastDate}`);
      }

      lines.push(parts.join('\n'));
      lines.push('');
    });

    return lines.join('\n');
  }

  private exportAsCSV(entries: VocabularyEntry[], options: ExportOptions): string {
    const headers: string[] = ['单词', '翻译'];

    if (options.includePhonetic) {
      headers.push('音标');
    }

    if (options.includeFrequency) {
      headers.push('翻译次数');
    }

    headers.push('是否收藏');

    if (options.includeTimestamps) {
      headers.push('首次翻译时间');
      headers.push('最近翻译时间');
    }

    const lines: string[] = [headers.map((h) => this.escapeCSV(h)).join(',')];

    entries.forEach((entry) => {
      const row: string[] = [
        this.escapeCSV(entry.originalWord),
        this.escapeCSV(entry.translation),
      ];

      if (options.includePhonetic) {
        row.push(this.escapeCSV(entry.phonetic || ''));
      }

      if (options.includeFrequency) {
        row.push(entry.frequency.toString());
      }

      row.push(entry.isFavorite ? '是' : '否');

      if (options.includeTimestamps) {
        row.push(new Date(entry.firstTranslatedAt).toISOString());
        row.push(new Date(entry.lastTranslatedAt).toISOString());
      }

      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private exportAsJSON(entries: VocabularyEntry[]): string {
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      count: entries.length,
      entries: entries.map((entry) => ({
        ...entry,
        firstTranslatedAtISO: new Date(entry.firstTranslatedAt).toISOString(),
        lastTranslatedAtISO: new Date(entry.lastTranslatedAt).toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // ==================== 数据管理 ====================

  public async clearAllData(): Promise<VocabularyOperationResult> {
    try {
      this.entriesCache.clear();
      await browser.storage.local.remove(this.storageKey);
      this.cacheLoaded = true;

      this.emitEvent(VocabularyEventType.DATA_CLEARED, {
        count: 0,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear data',
      };
    }
  }

  public async importData(
    entries: VocabularyEntry[],
    mergeStrategy: 'skip' | 'overwrite' | 'merge' = 'merge',
  ): Promise<VocabularyOperationResult> {
    await this.ensureCacheLoaded();

    let importedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      const normalizedWord = entry.word.toLowerCase().trim();
      const existing = this.entriesCache.get(normalizedWord);

      if (existing) {
        switch (mergeStrategy) {
          case 'skip':
            skippedCount++;
            continue;
          case 'overwrite':
            this.entriesCache.set(normalizedWord, {
              ...entry,
              word: normalizedWord,
            });
            importedCount++;
            break;
          case 'merge':
          default:
            this.entriesCache.set(normalizedWord, {
              ...existing,
              ...entry,
              word: normalizedWord,
              frequency: Math.max(existing.frequency, entry.frequency),
              firstTranslatedAt: Math.min(
                existing.firstTranslatedAt,
                entry.firstTranslatedAt,
              ),
              lastTranslatedAt: Math.max(
                existing.lastTranslatedAt,
                entry.lastTranslatedAt,
              ),
              isFavorite: existing.isFavorite || entry.isFavorite,
            });
            importedCount++;
            break;
        }
      } else {
        this.entriesCache.set(normalizedWord, {
          ...entry,
          word: normalizedWord,
        });
        importedCount++;
      }
    }

    await this.saveToStorage();

    this.emitEvent(VocabularyEventType.DATA_IMPORTED, {
      count: importedCount,
    });

    return {
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
      },
    };
  }

  public async getAllEntries(): Promise<VocabularyEntry[]> {
    await this.ensureCacheLoaded();
    return Array.from(this.entriesCache.values());
  }

  private generateId(): string {
    return `vocab-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const vocabularyService = VocabularyService.getInstance();
export default VocabularyService;

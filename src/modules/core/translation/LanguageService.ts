/**
 * 语言管理服务
 * 负责语言支持、翻译方向管理、语言验证等功能
 *
 * 功能特性：
 * - 30+ 主流语言支持
 * - 智能翻译模式管理
 * - 翻译方向选项
 * - 语言验证和标准化
 * - 性能优化缓存
 */

import { LanguageOption, MultilingualConfig } from '../../shared/types/api';
import { Language, LanguageNames, TranslationDirectionOption } from './types';

// ==================== 语言数据定义 ====================

/**
 * 支持的语言数据
 * 扩展到30+主流语言
 */
const LANGUAGE_DEFINITIONS: { [key: string]: Language } = {
  // 常用语言 (优先级高)
  en: { code: 'en', name: 'English', nativeName: 'English', isPopular: true },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', isPopular: true },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', isPopular: true },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', isPopular: true },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', isPopular: true },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', isPopular: true },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', isPopular: true },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', isPopular: true },

  // 其他主流语言
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
};

/**
 * 语言代码标准化映射
 * 处理常见的语言代码变体
 */
const LANGUAGE_CODE_NORMALIZATION: { [key: string]: string } = {
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  'zh-hk': 'zh',
  'en-us': 'en',
  'en-gb': 'en',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  'es-es': 'es',
  'es-mx': 'es',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
};

// ==================== 语言管理服务类 ====================

/**
 * 语言管理服务
 * 采用单例模式，提供统一的语言管理功能
 */
export class LanguageService {
  private static instance: LanguageService;

  // 缓存机制，提高性能
  private _targetLanguageOptionsCache: LanguageOption[] | null = null;
  private _translationDirectionOptionsCache:
    | TranslationDirectionOption[]
    | null = null;
  private _popularLanguagesCache: Language[] | null = null;
  private _otherLanguagesCache: Language[] | null = null;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取服务实例
   * @returns LanguageService 实例
   */
  public static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  // ==================== 语言数据访问 ====================

  /**
   * 获取所有支持的语言
   * @returns 语言定义对象
   */
  public get languages(): { [key: string]: Language } {
    return LANGUAGE_DEFINITIONS;
  }

  /**
   * 获取指定语言信息
   * @param code 语言代码
   * @returns 语言信息或null
   */
  public getLanguage(code: string): Language | null {
    const normalizedCode = this.normalizeLanguageCode(code);
    return LANGUAGE_DEFINITIONS[normalizedCode] || null;
  }

  /**
   * 检查语言是否受支持
   * @param code 语言代码
   * @returns 是否支持
   */
  public isSupportedLanguage(code: string): boolean {
    const normalizedCode = this.normalizeLanguageCode(code);
    return normalizedCode in LANGUAGE_DEFINITIONS;
  }

  /**
   * 标准化语言代码
   * @param code 原始语言代码
   * @returns 标准化后的代码
   */
  public normalizeLanguageCode(code: string): string {
    const lowerCode = code.toLowerCase();
    return LANGUAGE_CODE_NORMALIZATION[lowerCode] || lowerCode;
  }

  // ==================== 语言选项生成 ====================

  /**
   * 获取常用语言列表（缓存）
   * @returns 常用语言数组
   */
  private getPopularLanguages(): Language[] {
    if (!this._popularLanguagesCache) {
      this._popularLanguagesCache = Object.values(LANGUAGE_DEFINITIONS)
        .filter((lang) => lang.isPopular)
        .sort((a, b) => {
          // 英文第一，中文第二，其他按字母排序
          if (a.code === 'en') return -1;
          if (b.code === 'en') return 1;
          if (a.code === 'zh') return -1;
          if (b.code === 'zh') return 1;
          return a.name.localeCompare(b.name);
        });
    }
    return this._popularLanguagesCache;
  }

  /**
   * 获取其他语言列表（缓存）
   * @returns 其他语言数组
   */
  private getOtherLanguages(): Language[] {
    if (!this._otherLanguagesCache) {
      this._otherLanguagesCache = Object.values(LANGUAGE_DEFINITIONS)
        .filter((lang) => !lang.isPopular)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return this._otherLanguagesCache;
  }

  /**
   * 获取目标语言选择选项（智能翻译模式用）
   * @returns 语言选项数组
   */
  public getTargetLanguageOptions(): LanguageOption[] {
    if (!this._targetLanguageOptionsCache) {
      const allLanguages = [
        ...this.getPopularLanguages(),
        ...this.getOtherLanguages(),
      ];

      this._targetLanguageOptionsCache = allLanguages.map((lang) => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        isPopular: lang.isPopular,
      }));
    }
    return this._targetLanguageOptionsCache;
  }

  /**
   * 获取翻译方向选项
   * @returns 翻译方向选项数组
   */
  public getTranslationDirectionOptions(): TranslationDirectionOption[] {
    if (!this._translationDirectionOptionsCache) {
      const options: TranslationDirectionOption[] = [
        { value: 'intelligent', label: '🧠智能模式' },
        { value: 'zh-to-en', label: '中译英文' },
        { value: 'en-to-zh', label: '英译中文' },
      ];

      // 添加其他常用语言的传统翻译选项
      const popularLanguageCodes = ['ja', 'ko', 'fr', 'de', 'es', 'ru'];
      for (const langCode of popularLanguageCodes) {
        const language = LANGUAGE_DEFINITIONS[langCode];
        if (language) {
          options.push({
            value: `zh-to-${langCode}`,
            label: `中文译${language.nativeName}`,
          });
        }
      }

      this._translationDirectionOptionsCache = options;
    }
    return this._translationDirectionOptionsCache;
  }

  // ==================== 翻译模式管理 ====================

  /**
   * 判断是否启用智能模式
   * @param config 多语言配置
   * @returns 是否启用智能模式
   */
  public isIntelligentModeEnabled(config: MultilingualConfig): boolean {
    return config.intelligentMode === true;
  }

  /**
   * 获取目标语言显示名称（智能模式用）
   * @param languageCode 语言代码
   * @returns 格式化的显示名称
   */
  public getTargetLanguageDisplayName(languageCode: string): string {
    const language = this.getLanguage(languageCode);
    return language
      ? `${language.nativeName} (${language.name})`
      : languageCode.toUpperCase();
  }

  /**
   * 获取翻译方向的语言名称对（传统模式用）
   * @param direction 翻译方向字符串
   * @returns 语言名称对或null
   */
  public getLanguageNames(direction: string): LanguageNames | null {
    if (direction === 'intelligent') {
      return null;
    }

    const parts = direction.split('-to-');
    if (parts.length !== 2) {
      return null;
    }

    const sourceLang = this.getLanguage(parts[0]);
    const targetLang = this.getLanguage(parts[1]);

    if (!sourceLang || !targetLang) {
      return null;
    }

    return {
      source: sourceLang.name,
      target: targetLang.name,
    };
  }

  // ==================== 工具方法 ====================

  /**
   * 清空缓存（用于测试或重置）
   */
  public clearCache(): void {
    this._targetLanguageOptionsCache = null;
    this._translationDirectionOptionsCache = null;
    this._popularLanguagesCache = null;
    this._otherLanguagesCache = null;
  }

  /**
   * 获取支持的语言代码列表
   * @returns 语言代码数组
   */
  public getSupportedLanguageCodes(): string[] {
    return Object.keys(LANGUAGE_DEFINITIONS);
  }

  /**
   * 获取常用语言代码列表
   * @returns 常用语言代码数组
   */
  public getPopularLanguageCodes(): string[] {
    return this.getPopularLanguages().map((lang) => lang.code);
  }

  /**
   * 验证翻译方向字符串是否有效
   * @param direction 翻译方向
   * @returns 是否有效
   */
  public isValidTranslationDirection(direction: string): boolean {
    if (direction === 'intelligent') {
      return true;
    }
    return this.getLanguageNames(direction) !== null;
  }
}

// ==================== 导出 ====================

// 单例实例导出
export const languageService = LanguageService.getInstance();

// 默认导出
export default LanguageService;

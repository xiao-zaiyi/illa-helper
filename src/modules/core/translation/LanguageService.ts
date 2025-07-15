/**
 * 语言管理服务 - 简化版本
 * 负责语言支持、语言验证等功能
 *
 * 功能特性：
 * - 30+ 主流语言支持
 * - 语言验证和标准化
 * - 性能优化缓存
 */

import { LanguageOption } from '../../shared/types/api';
import { Language } from './types';

// ==================== 语言数据定义 ====================

/**
 * 支持的语言数据
 * 扩展到45+主流语言
 */
const LANGUAGE_DEFINITIONS: { [key: string]: Language } = {
  // 常用语言 (优先级高) - 世界主要语言
  en: { code: 'en', name: 'English', nativeName: 'English', isPopular: true },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', isPopular: true },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', isPopular: true },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', isPopular: true },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', isPopular: true },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', isPopular: true },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', isPopular: true },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', isPopular: true },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    isPopular: true,
  },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', isPopular: true },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isPopular: true },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', isPopular: true },

  // 欧洲语言
  nl: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  no: { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  da: { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  fi: { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  sv: { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  el: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  cs: { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  hu: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  ro: { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  uk: { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  bg: { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  hr: { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  sk: { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  sl: { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  et: { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  lv: { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  lt: { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  ca: { code: 'ca', name: 'Catalan', nativeName: 'Català' },

  // 亚洲语言
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  ms: { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  tl: { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  fa: { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  kk: { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
  ky: { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  uz: { code: 'uz', name: 'Uzbek', nativeName: "O'zbek" },

  // 其他地区语言
  sw: { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  am: { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  zu: { code: 'zu', name: 'Zulu', nativeName: 'IsiZulu' },
  af: { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  is: { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  mt: { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
};

/**
 * 语言代码标准化映射
 * 处理常见的语言代码变体
 */
const LANGUAGE_CODE_NORMALIZATION: { [key: string]: string } = {
  // 中文变体
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  'zh-hk': 'zh',
  'zh-sg': 'zh',
  cmn: 'zh',
  chs: 'zh',
  cht: 'zh',

  // 英文变体
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'en-nz': 'en',
  'en-za': 'en',
  'en-ie': 'en',

  // 葡萄牙语变体
  'pt-br': 'pt',
  'pt-pt': 'pt',

  // 西班牙语变体
  'es-es': 'es',
  'es-mx': 'es',
  'es-ar': 'es',
  'es-co': 'es',
  'es-cl': 'es',
  'es-pe': 'es',
  'es-ve': 'es',

  // 法语变体
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  'fr-be': 'fr',
  'fr-ch': 'fr',

  // 德语变体
  'de-de': 'de',
  'de-at': 'de',
  'de-ch': 'de',

  // 阿拉伯语变体
  'ar-sa': 'ar',
  'ar-eg': 'ar',
  'ar-ae': 'ar',
  'ar-ma': 'ar',
  'ar-iq': 'ar',
  'ar-dz': 'ar',
  'ar-ly': 'ar',

  // 其他常见变体
  nb: 'no', // 挪威语变体
  nn: 'no', // 挪威语变体
  fil: 'tl', // 菲律宾语变体
  iw: 'he', // 希伯来语旧代码
  ji: 'he', // 意第绪语映射到希伯来语
  jw: 'ms', // 爪哇语映射到马来语
  in: 'id', // 印尼语旧代码
  mo: 'ro', // 摩尔多瓦语映射到罗马尼亚语
  sh: 'hr', // 塞尔维亚-克罗地亚语映射到克罗地亚语
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

  // ==================== 翻译模式管理 ====================

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

  // ==================== 工具方法 ====================

  /**
   * 清空缓存（用于测试或重置）
   */
  public clearCache(): void {
    this._targetLanguageOptionsCache = null;
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

  // ==================== 母语相关方法 ====================

  /**
   * 获取母语选择选项
   * @returns 母语选择选项数组
   */
  public getNativeLanguageOptions(): LanguageOption[] {
    // 复用现有的目标语言选项
    return this.getTargetLanguageOptions();
  }
}

// ==================== 导出 ====================

// 单例实例导出
export const languageService = LanguageService.getInstance();

// 默认导出
export default LanguageService;

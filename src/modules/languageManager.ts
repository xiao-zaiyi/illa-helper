import { LanguageOption, MultilingualConfig } from './shared/types/api';

export interface Language {
  code: string; // e.g., 'en', 'zh', 'ja'
  name: string; // e.g., 'English', 'Chinese', 'Japanese'
  nativeName: string; // e.g., 'English', '中文', '日本語'
  isPopular?: boolean; // 标记常用语言
}

// 扩展语言支持到30+主流语言
export const LANGUAGES: { [key: string]: Language } = {
  // 常用语言
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
 * 新增：获取目标语言选择选项
 * 用于智能翻译模式的目标语言选择器
 */
export function getTargetLanguageOptions(): LanguageOption[] {
  const options: LanguageOption[] = [];

  // 首先添加常用语言
  const popularLanguages = Object.values(LANGUAGES)
    .filter((lang) => lang.isPopular)
    .sort((a, b) => {
      // 英文排第一，中文排第二，其他按字母排序
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      if (a.code === 'zh') return -1;
      if (b.code === 'zh') return 1;
      return a.name.localeCompare(b.name);
    });

  // 然后添加其他语言
  const otherLanguages = Object.values(LANGUAGES)
    .filter((lang) => !lang.isPopular)
    .sort((a, b) => a.name.localeCompare(b.name));

  // 合并并转换为 LanguageOption 格式
  [...popularLanguages, ...otherLanguages].forEach((lang) => {
    options.push({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      isPopular: lang.isPopular,
    });
  });

  return options;
}

/**
 * 新增：判断是否启用智能模式
 */
export function isIntelligentModeEnabled(config: MultilingualConfig): boolean {
  return config.intelligentMode === true;
}

/**
 * 新增：获取语言显示名称（智能模式）
 * 返回目标语言的显示名称
 */
export function getTargetLanguageDisplayName(languageCode: string): string {
  const language = LANGUAGES[languageCode];
  return language
    ? `${language.nativeName} (${language.name})`
    : languageCode.toUpperCase();
}

/**
 * 保持向后兼容：原有的翻译方向选项函数
 * 优化：简化智能模式选项，提高用户体验
 */
export function getTranslationDirectionOptions() {
  const options = [
    { value: 'intelligent', label: '🧠智能模式' },
    { value: 'zh-to-en', label: '中译英文' },
    { value: 'en-to-zh', label: '英译中文' },
  ];

  // 添加其他常用语言的传统翻译选项
  const popularLanguages = ['ja', 'ko', 'fr', 'de', 'es', 'ru'];
  for (const langCode of popularLanguages) {
    const language = LANGUAGES[langCode];
    if (language) {
      options.push({
        value: `zh-to-${langCode}`,
        label: `中文译${language.nativeName}`,
      });
    }
  }

  return options;
}

/**
 * 保持向后兼容：原有的语言名称获取函数
 */
export function getLanguageNames(
  direction: string,
): { source: string; target: string } | null {
  if (direction === 'intelligent') {
    return null;
  }
  const parts = direction.split('-to-');
  if (parts.length !== 2) return null;

  const sourceLang = LANGUAGES[parts[0]];
  const targetLang = LANGUAGES[parts[1]];

  if (!sourceLang || !targetLang) return null;

  return {
    source: sourceLang.name,
    target: targetLang.name,
  };
}

/**
 * 新增：验证语言代码是否受支持
 */
export function isSupportedLanguage(languageCode: string): boolean {
  return languageCode in LANGUAGES;
}

/**
 * 新增：获取语言代码的标准化版本
 * 处理一些常见的语言代码变体
 */
export function normalizeLanguageCode(languageCode: string): string {
  const code = languageCode.toLowerCase();

  // 处理一些常见的代码变体
  const codeMap: { [key: string]: string } = {
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

  return codeMap[code] || code;
}

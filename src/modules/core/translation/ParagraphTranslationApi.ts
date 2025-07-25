/**
 * 段落翻译API服务
 *
 * 复用项目现有的UniversalApiService架构，专门用于段落级别的完整翻译
 * 与单词替换API不同，这个服务使用简单的翻译prompt
 */

import { callAI } from '../../api/services/UniversalApiService';
import { StorageService } from '../storage';
import { UserSettings } from '../../shared/types/storage';

/**
 * 段落翻译prompt模板
 */
const PARAGRAPH_TRANSLATION_PROMPT = `You are a professional translator. Translate the following text to {{targetLang}}. 

Requirements:
- Output ONLY the translation, no explanations
- Maintain the original meaning and tone
- If the text is already in the target language or doesn't need translation, return the original text
- Keep proper nouns, technical terms, and formatting as appropriate

Text to translate:
{{input}}`;

/**
 * 段落翻译API服务类
 */
export class ParagraphTranslationApi {
  private static instance: ParagraphTranslationApi | null = null;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * 获取服务实例（单例模式）
   */
  public static getInstance(): ParagraphTranslationApi {
    if (!ParagraphTranslationApi.instance) {
      ParagraphTranslationApi.instance = new ParagraphTranslationApi();
    }
    return ParagraphTranslationApi.instance;
  }

  /**
   * 翻译段落文本
   * @param sourceText 源文本
   * @param targetLanguage 目标语言（可选，默认使用用户设置）
   * @returns 翻译后的文本
   */
  public async translateParagraph(
    sourceText: string,
    targetLanguage?: string,
  ): Promise<string> {
    if (!sourceText || !sourceText.trim()) {
      return '';
    }

    // 清理文本（移除零宽度空格等）
    const cleanSourceText = sourceText.replace(/\u200B/g, '').trim();

    try {
      // 获取用户设置
      const settings = await this.storageService.getUserSettings();

      // 智能确定目标语言（复用TextReplacerService的逻辑）
      const finalTargetLanguage =
        targetLanguage || this.determineOptimalTargetLanguage(settings);

      // 构建段落翻译prompt
      const prompt = this.buildParagraphTranslationPrompt(
        cleanSourceText,
        finalTargetLanguage,
      );

      console.log(`[ParagraphTranslationApi] 调用API...`);
      const result = await callAI(prompt);
      console.log(`[ParagraphTranslationApi] API原始结果:`, result);

      if (!result.success) {
        throw new Error(result.error || '翻译API调用失败');
      }

      // 处理翻译结果
      const processedResult = this.processTranslationResult(
        result.content,
        cleanSourceText,
      );

      return processedResult;
    } catch (error) {
      console.error('段落翻译API调用失败:', error);
      throw error;
    }
  }

  /**
   * 构建段落翻译prompt
   */
  private buildParagraphTranslationPrompt(
    sourceText: string,
    targetLanguage: string,
  ): string {
    // 将语言代码转换为清晰的语言名称
    const languageNames: { [key: string]: string } = {
      zh: 'Chinese',
      'zh-cn': 'Chinese',
      chinese: 'Chinese',
      en: 'English',
      'en-us': 'English',
      english: 'English',
      ja: 'Japanese',
      japanese: 'Japanese',
      ko: 'Korean',
      korean: 'Korean',
      fr: 'French',
      french: 'French',
      de: 'German',
      german: 'German',
      es: 'Spanish',
      spanish: 'Spanish',
      ru: 'Russian',
      russian: 'Russian',
    };

    const finalLanguageName =
      languageNames[targetLanguage.toLowerCase()] || targetLanguage;

    return PARAGRAPH_TRANSLATION_PROMPT.replace(
      '{{targetLang}}',
      finalLanguageName,
    ).replace('{{input}}', sourceText);
  }

  /**
   * 智能确定目标语言（复用TextReplacerService的逻辑）
   */
  private determineOptimalTargetLanguage(settings: UserSettings): string {
    try {
      // 检测当前页面语言
      const detectedPageLanguage = this.detectCurrentPageLanguage();

      if (!detectedPageLanguage) {
        return settings.multilingualConfig.targetLanguage;
      }

      const config = settings.multilingualConfig;

      // 标准化语言代码
      const normalizedPageLang =
        this.normalizeLanguageCode(detectedPageLanguage);
      const normalizedTargetLang = this.normalizeLanguageCode(
        config.targetLanguage,
      );
      const normalizedNativeLang = this.normalizeLanguageCode(
        config.nativeLanguage,
      );

      // 页面语言 = 目标语言 → 翻译到母语
      if (normalizedPageLang === normalizedTargetLang) {
        console.log(
          `[ParagraphTranslationApi] 页面语言(${detectedPageLanguage})与目标语言(${config.targetLanguage})一致，切换到母语(${config.nativeLanguage})`,
        );
        return config.nativeLanguage;
      }

      // 页面语言 = 母语 → 翻译到目标语言
      if (normalizedPageLang === normalizedNativeLang) {
        console.log(
          `[ParagraphTranslationApi] 页面语言(${detectedPageLanguage})与母语(${config.nativeLanguage})一致，切换到目标语言(${config.targetLanguage})`,
        );
        return config.targetLanguage;
      }

      // 其他情况 → 翻译到目标语言
      return config.targetLanguage;
    } catch (error) {
      console.warn(
        '[ParagraphTranslationApi] 语言检测失败，使用默认目标语言:',
        error,
      );
      return settings.multilingualConfig.targetLanguage;
    }
  }

  /**
   * 检测当前页面语言
   */
  private detectCurrentPageLanguage(): string | null {
    try {
      // 方法1：从HTML标签获取
      const htmlLang = document.documentElement.lang;
      if (htmlLang) {
        return htmlLang;
      }

      // 方法2：从meta标签获取
      const metaLang = document.querySelector(
        'meta[http-equiv="Content-Language"]',
      );
      if (metaLang) {
        return metaLang.getAttribute('content') || null;
      }

      // 方法3：简单的文本检测（作为后备）
      const textSample = document.body.innerText.substring(0, 100);
      if (/[\u4e00-\u9fff]/.test(textSample)) {
        return 'zh';
      } else if (/^[a-zA-Z\s\d\.,!?;:'"()-]*$/.test(textSample)) {
        return 'en';
      }

      return null;
    } catch (error) {
      console.warn('[ParagraphTranslationApi] 页面语言检测失败:', error);
      return null;
    }
  }

  /**
   * 标准化语言代码
   */
  private normalizeLanguageCode(langCode: string): string {
    if (!langCode) return '';

    // 移除地区代码，只保留主要语言代码
    const mainLang = langCode.toLowerCase().split('-')[0];

    // 标准化映射
    const normalizedMapping: { [key: string]: string } = {
      zh: 'zh',
      'zh-cn': 'zh',
      'zh-tw': 'zh',
      'zh-hk': 'zh',
      chinese: 'zh',
      en: 'en',
      'en-us': 'en',
      'en-gb': 'en',
      english: 'en',
    };

    return normalizedMapping[mainLang] || mainLang;
  }

  /**
   * 处理翻译结果
   */
  private processTranslationResult(
    translatedText: string,
    originalText: string,
  ): string {
    if (!translatedText || !translatedText.trim()) {
      return '';
    }

    let cleanedResult = translatedText.trim();

    // 移除思考标签（如deepseek等模型可能返回）
    const thinkMatch = cleanedResult.match(/<\/think>([\s\S]*)/);
    if (thinkMatch) {
      cleanedResult = thinkMatch[1].trim();
    }

    // 修复：放宽判断条件，避免误判
    // 只有当翻译结果完全相同且长度较短时才认为无需翻译
    if (cleanedResult === originalText && originalText.length < 50) {
      console.log(
        `[ParagraphTranslationApi] 翻译结果与原文相同，可能无需翻译: "${originalText}"`,
      );
      return '';
    }

    // 如果翻译结果太短，可能是翻译失败
    if (cleanedResult.length < 3) {
      console.warn(
        `[ParagraphTranslationApi] 翻译结果过短: "${cleanedResult}"`,
      );
      return '';
    }

    return cleanedResult;
  }

  /**
   * 批量翻译多个段落
   * @param paragraphs 段落数组
   * @param targetLanguage 目标语言（可选）
   * @param concurrency 并发数量（默认3，避免API限流）
   * @returns 翻译结果数组
   */
  public async translateMultipleParagraphs(
    paragraphs: string[],
    targetLanguage?: string,
    concurrency: number = 3,
  ): Promise<string[]> {
    if (paragraphs.length === 0) {
      return [];
    }

    const results: string[] = new Array(paragraphs.length).fill('');

    // 分批处理，避免API限流
    for (let i = 0; i < paragraphs.length; i += concurrency) {
      const batch = paragraphs.slice(i, i + concurrency);
      const batchPromises = batch.map(async (paragraph, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const translated = await this.translateParagraph(
            paragraph,
            targetLanguage,
          );
          results[actualIndex] = translated;
        } catch (error) {
          console.warn(`段落翻译失败 [索引${actualIndex}]:`, error);
          results[actualIndex] = ''; // 翻译失败时返回空字符串
        }
      });

      await Promise.all(batchPromises);

      // 批次间稍微延迟，避免API限流
      if (i + concurrency < paragraphs.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }
}

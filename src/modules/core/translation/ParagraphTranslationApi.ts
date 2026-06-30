/**
 * 段落翻译API服务
 *
 * 复用项目现有的UniversalApiService架构，专门用于段落级别的完整翻译
 * 与单词替换API不同，这个服务使用简单的翻译prompt
 */

import { callAI } from '../../api/services/UniversalApiService';
import { StorageService } from '../storage';
import { languageService } from './LanguageService';

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

      const detectedPageLanguage = await languageService.detectPageLanguage();
      const finalTargetLanguage =
        targetLanguage ||
        languageService.resolveTargetLanguage(
          settings.multilingualConfig,
          detectedPageLanguage,
        );

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

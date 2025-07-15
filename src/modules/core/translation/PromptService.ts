/**
 * 提示词生成服务 - 重构版本
 * 专注于智能翻译模式，简化代码结构
 */

import { UserLevel } from '../../shared/types/core';
import { PromptConfig } from './types';
import { languageService } from './LanguageService';

/**
 * 提示词服务 - 单例模式
 */
export class PromptService {
  private static instance: PromptService;

  private constructor() {}

  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * 生成统一提示词
   */
  public getUnifiedPrompt(config: PromptConfig): string {
    const { targetLanguage, userLevel, replacementRate } = config;

    const components = [
      this.generateBaseInstruction(),
      this.generateTaskDescription(targetLanguage),
      this.generateCoreRules(targetLanguage),
      this.generateLevelAdjustment(userLevel),
      this.generateRatioControl(replacementRate),
      this.generateFormatRequirements(),
      this.generateExamples(targetLanguage),
    ].filter((component) => component.trim() !== '');

    return components.join('\n\n');
  }

  /**
   * 基础指令
   */
  private generateBaseInstruction(): string {
    return "You are an expert linguist and language teacher. Your task is to process text and intelligently select words or phrases suitable for the user's learning level, then provide translations.";
  }

  /**
   * 任务描述 - 简化版本
   */
  private generateTaskDescription(targetLanguage: string): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);
    return `The user is learning ${targetLangName}. You will be provided with text in any language. Select appropriate words/phrases and provide their ${targetLangName} translations to enhance learning.`;
  }

  /**
   * 核心规则
   */
  private generateCoreRules(targetLanguage: string): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);

    return `## MANDATORY OUTPUT RULES

1. **Target Language**: ALL output must be exclusively in **${targetLangName}**. No other languages permitted.
2. **Exclusion Principle**: If a word/phrase from the source text is already in **${targetLangName}**, **OMIT IT ENTIRELY** from output.
3. **Content Purity**: Output **MUST contain ONLY direct translations**.
   - **NO** explanations, annotations, pronunciation guides, or alternative translations.
4. **Grammatical Integrity**: 
   - Final translation must be **grammatically complete and natural** in ${targetLangName}.
   - Word order **MUST** be correct for ${targetLangName}.
   - Include necessary articles, prepositions, and structural elements.
5. **System Constraint**: Strict adherence required. System parses output directly - **any deviation causes critical failure**.`;
  }

  /**
   * CEFR水平调整
   */
  private generateLevelAdjustment(userLevel: UserLevel): string {
    const levelGuidance: Record<UserLevel, string> = {
      [UserLevel.A1]:
        'A1 (Beginner): Focus on very basic vocabulary. AVOID ultra-basic words (the, is, a, and, of). Select only simple nouns and verbs beginners should learn.',

      [UserLevel.A2]:
        'A2 (Elementary): Select everyday vocabulary and simple phrases (family, shopping, work, geography). Focus on concrete, practical words rather than abstract concepts.',

      [UserLevel.B1]:
        'B1 (Intermediate): Prioritize common verbs, adjectives, adverbs, and fixed expressions/collocations. Focus on words for expressing opinions, experiences, and plans.',

      [UserLevel.B2]:
        'B2 (Upper-Intermediate): Select complex vocabulary including abstract concepts, sophisticated expressions, and nuanced meanings. Include words for discussing ideas and arguments.',

      [UserLevel.C1]:
        'C1 (Advanced): Focus on academic and professional vocabulary, sophisticated expressions, and words with subtle distinctions. Include terminology from various fields.',

      [UserLevel.C2]:
        'C2 (Proficient): Select challenging terminology, idiomatic expressions, technical jargon, and nuanced vocabulary. Include rare words and specialized terminology.',
    };

    return levelGuidance[userLevel] || levelGuidance[UserLevel.B1];
  }

  /**
   * 比例控制指令 - 灵活范围版本
   */
  private generateRatioControl(replacementRate: number): string {
    if (replacementRate <= 0 || replacementRate > 1) {
      return '';
    }

    const percentage = Math.round(replacementRate * 100);
    const lowerBound = Math.max(5, percentage - 5);
    const upperBound = Math.min(95, percentage + 5);

    return `
      **SELECTION GUIDELINE**: Select approximately **${lowerBound}% to ${upperBound}%** of the text content for translation.
      **Priority Principle**: 
      - **Quality over precision** - Focus on selecting the most valuable learning words rather than exact character counts
      - **Natural selection** - Choose complete words and meaningful phrases, avoid artificial word splitting
      - **Learning value first** - Prioritize words that enhance vocabulary acquisition over meeting exact percentages

      **Flexible Approach**:
      - Target around ${percentage}% as a general guideline
      - Adjust based on text content and learning value
      - It's better to select fewer high-value words than more low-value ones to meet a quota
`;
  }

  /**
   * 格式要求
   */
  private generateFormatRequirements(): string {
    return `**MANDATORY OUTPUT FORMAT**:
          Use simple double-bar format below. NO JSON! NO other format!
          原文||译文

          **FORMAT REQUIREMENTS**:
          - One replacement per line
          - Use double bars || to separate original and translation  
          - No extra text, quotes, or explanations
          - Just the direct format: original||translation
          `;
  }

  /**
   * 示例 - 简化为通用示例
   */
  private generateExamples(targetLanguage: string): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);

    return `**EXAMPLE**:
            If input text is "你好世界" and target language is ${targetLangName}, valid output:
            你好||Hello
            世界||World
`;
  }
}

// ==================== 导出 ====================

export const promptService = PromptService.getInstance();

/**
 * 根据配置生成系统提示词 - 唯一公共接口
 */
export const getSystemPromptByConfig = (config: PromptConfig): string => {
  return promptService.getUnifiedPrompt(config);
};

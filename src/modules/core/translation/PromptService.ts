/**
 * 提示词生成服务
 * 负责为不同翻译模式和提供商生成系统提示词
 *
 * 重构为统一提示词模板，减少维护成本
 */

import { UserLevel } from '../../shared/types/core';
import { PromptConfig } from './types';
import { languageService } from './LanguageService';

// ==================== 统一提示词模板 ====================

/**
 * 统一的提示词模板
 * 通过参数控制不同场景的差异
 */
export class PromptService {
  private static instance: PromptService;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取服务实例
   * @returns PromptService 实例
   */
  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * 统一的提示词生成器
   * @param config 配置参数
   * @returns 生成的提示词
   */
  public getUnifiedPrompt(config: PromptConfig): string {
    const {
      targetLanguage,
      translationDirection,
      userLevel,
      replacementRate,
      provider = 'openai',
      intelligentMode = false,
    } = config;

    // 1. 基础指令
    const baseInstruction =
      "You are an expert in linguistics and a language teacher. Your task is to process a given text paragraph, identify words or phrases suitable for a user's learning level, and provide translations. Your only task is to translate the text in {{}}, which is important";

    // 2. 任务描述（动态生成）
    const taskDescription = this.generateTaskDescription(
      targetLanguage,
      translationDirection,
      intelligentMode,
    );

    // 3. 核心规则（通用）
    const coreRules = this.generateCoreRules(targetLanguage);

    // 4. 用户水平调整
    const levelAdjustment = this.generateLevelAdjustment(userLevel);

    // 5. 比例控制（根据provider调整详细程度）
    const ratioControl = this.generateRatioControl(replacementRate, provider);

    // 6. 格式要求（通用）
    const formatRequirements = this.generateFormatRequirements();

    // 7. 示例（动态生成）
    const examples = this.generateExamples(
      targetLanguage,
      translationDirection,
    );

    // 组装完整提示词
    const components = [
      baseInstruction,
      taskDescription,
      coreRules,
      levelAdjustment,
      ratioControl,
      formatRequirements,
      examples,
    ].filter((component) => component.trim() !== '');

    return components.join('\n\n');
  }

  /**
   * 生成任务描述
   */
  private generateTaskDescription(
    targetLanguage: string,
    translationDirection: string,
    intelligentMode: boolean,
  ): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);

    if (intelligentMode || translationDirection === 'intelligent') {
      return `The user is a native speaker learning other languages. You will be provided with a text that could be in any language. Your task is to select key words or phrases and provide their ${targetLangName} translations.`;
    } else {
      const langNames = languageService.getLanguageNames(translationDirection);
      if (langNames) {
        const userDesc =
          langNames.source === 'Chinese'
            ? 'The user is a native Chinese speaker.'
            : `The user is a native Chinese speaker learning ${langNames.source}.`;
        return `${userDesc} The provided text is in ${langNames.source}. Your goal is to select key words or phrases and provide their ${langNames.target} translations.`;
      }
      return `The user is a native Chinese speaker. Your goal is to select key words or phrases and provide their ${targetLangName} translations.`;
    }
  }

  /**
   * 生成核心规则
   */
  private generateCoreRules(targetLanguage: string): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);

    return `## CRITICAL RULES:
- ALL translations must be in ${targetLangName}. Do not translate to any other language.
- ABSOLUTELY CRITICAL: If a word or phrase in the source text is already written in ${targetLangName}, you MUST completely skip it. Do NOT include it in your response at all.
- The translation must contain ONLY the direct translation of the word/phrase. Do NOT include explanations, pronunciation guides, or additional context.
- If you don't follow the rules, my program will crash, so please follow the rules strictly.

 ## WORD ORDER GUIDELINES:
- CRITICAL: Maintain proper word order for the target language
- NEVER mix languages within a single sentence unless creating parallel translations
- Ensure grammatical completeness: include necessary connecting words, particles, and structural elements
- When translating mixed-language text, separate by language and maintain internal coherence
`;
  }

  /**
   * 生成用户水平调整
   */
  private generateLevelAdjustment(userLevel: UserLevel): string {
    return `The user's proficiency is at the ${UserLevel[userLevel]} level. Please adjust the difficulty and frequency of the selected words accordingly.`;
  }

  /**
   * 生成比例控制指令
   */
  private generateRatioControl(
    replacementRate: number,
    provider: string,
  ): string {
    if (replacementRate <= 0 || replacementRate > 1) {
      return '';
    }

    const percentage = Math.round(replacementRate * 100);
    const basicInstruction = `IMPORTANT: Select words totaling exactly ${percentage}% of the text by character count.`;

    if (provider === 'gemini') {
      return `${basicInstruction}

## RATIO CALCULATION STEPS:
- Step 1: Count total characters in input text (including spaces, punctuation)
- Step 2: Calculate target: ${percentage}% × total characters = required character count
- Step 3: Select words until sum of "original" character lengths equals target
- Step 4: VERIFY before output: sum of selected original characters ÷ total characters = ${replacementRate.toFixed(2)}

EXAMPLE VERIFICATION:
Input: "这是测试文本" (6 characters total)
Target: ${percentage}% = ${Math.round((6 * percentage) / 100)} characters needed
If selecting "测试" (2 chars): 2÷6 = 33.3% (verify this matches target)`;
    }

    return `${basicInstruction}
Example: "这是测试文本" (6 chars) → ${percentage}% = ${Math.round((6 * percentage) / 100)} chars needed.`;
  }

  /**
   * 生成格式要求
   */
  private generateFormatRequirements(): string {
    return `You must respond using the simple double-bar format below. NO JSON! NO other format!

MANDATORY OUTPUT FORMAT:
原文||译文

FORMAT REQUIREMENTS:
- One replacement per line
- Use double bars || to separate original and translation
- No extra text, quotes, or explanations (such as "Here's the translation:" or "Translation as follows:")
- Just the direct format: original||translation`;
  }

  /**
   * 生成示例
   */
  private generateExamples(
    targetLanguage: string,
    translationDirection: string,
  ): string {
    const targetLangName =
      languageService.getTargetLanguageDisplayName(targetLanguage);

    if (translationDirection === 'intelligent' || !translationDirection) {
      return `EXAMPLE:
              If the input text is "你好世界" and the target language is ${targetLangName}, a valid output is:
              你好||Hello
              世界||World`;
    }

    // 传统模式示例
    const langNames = languageService.getLanguageNames(translationDirection);
    if (langNames) {
      if (translationDirection === 'zh-to-en') {
        return `EXAMPLE:
                学习||learning
                重要的||important
                技术||technology`;
      } else if (translationDirection === 'en-to-zh') {
        return `EXAMPLE:
                Hello||你好
                World||世界
                Technology||技术`;
      }
    }

    return `EXAMPLE:
            source_word||target_translation
            another_word||another_translation`;
  }

  /**
   * 向后兼容的公共接口
   */
  public getSystemPromptByConfig(config: PromptConfig): string {
    return this.getUnifiedPrompt(config);
  }
}

// ==================== 导出 ====================

export const promptService = PromptService.getInstance();

// 向后兼容的导出函数
export const getSystemPrompt = (
  direction: string,
  level: UserLevel,
  replacementRate: number,
): string => {
  // 从翻译方向推断目标语言
  const targetLanguage = direction.includes('en') ? 'en' : 'zh';

  return promptService.getUnifiedPrompt({
    translationDirection: direction,
    targetLanguage: targetLanguage,
    userLevel: level,
    replacementRate: replacementRate,
  });
};

export const getGeminiSystemPrompt = (
  targetLanguage: string,
  level: UserLevel,
  replacementRate: number,
): string => {
  return promptService.getUnifiedPrompt({
    targetLanguage: targetLanguage,
    translationDirection: 'intelligent',
    userLevel: level,
    replacementRate: replacementRate,
    provider: 'gemini',
    intelligentMode: true,
  });
};

export const getSystemPromptByConfig = (config: PromptConfig): string => {
  return promptService.getSystemPromptByConfig(config);
};

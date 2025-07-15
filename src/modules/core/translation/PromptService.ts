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
   * 生成统一提示词 - 精简版
   */
  public getUnifiedPrompt(config: PromptConfig): string {
    const { targetLanguage, userLevel, replacementRate } = config;

    const components = [
      this.generateBaseInstruction(), // 保持，但稍精简
      this.generateTaskAndRules(targetLanguage), // 新合并：任务+规则
      this.generateUserConfig(userLevel, replacementRate), // 新合并：水平+比例
      this.generateFormatRequirements(), // 强化强调
      this.generateExamples(targetLanguage), // 增加示例
    ].filter((component) => component.trim() !== '');

    return components.join('\n\n');
  }

  /**
   * 基础指令 - 精简
   */
  private generateBaseInstruction(): string {
    return 'You are an AI translator for language learners. Strictly follow instructions: select suitable words/phrases from input text based on user level and ratio, then output ONLY their translations in the specified format. No extra text allowed.';
  }

  /**
   * 任务与规则 - 合并简化，澄清冲突
   */
  private generateTaskAndRules(targetLanguage: string): string {
    const langName =
      languageService.getTargetLanguageDisplayName(targetLanguage);
    return `Task: User is learning ${langName}. Given any input text, intelligently select high-value words/phrases (e.g., key nouns, verbs, idioms) for learning, and provide their direct ${langName} translations.
    
## Strict Rules
1. Select based on context: Prioritize words that aid learning, avoid fillers (e.g., 'a', 'the', 'is').
2. Preserve original code, proper nouns, HTML tags unchanged.
3. Skip any text already in ${langName}.
4. Output ONLY the selected original||translation pairs. Rigorous ban on any additions, explanations, or prefixes (e.g., no 'Here is the translation:').
5. Output that does not meet the requirements, directly return the empty string.
6. Consider the context of the text when translating.
`;
  }

  /**
   * 用户配置 - 合并水平与比例，添加指导
   */
  private generateUserConfig(
    userLevel: UserLevel,
    replacementRate: number,
  ): string {
    const levelGuidance: Record<UserLevel, string> = {
      [UserLevel.A1]: 'A1 (Beginner): Select very basic words only.',
      [UserLevel.A2]: 'A2 (Elementary): Select simple everyday words.',
      [UserLevel.B1]: 'B1 (Intermediate): Select common phrases and verbs.',
      [UserLevel.B2]: 'B2 (Upper-Intermediate): Select nuanced vocabulary.',
      [UserLevel.C1]: 'C1 (Advanced): Select advanced idioms and terms.',
      [UserLevel.C2]: 'C2 (Proficient): Select rare or specialized words.',
    };

    let ratioPart = '';
    if (replacementRate > 0 && replacementRate <= 1) {
      const percentage = Math.round(replacementRate * 100);
      const lower = Math.max(0, percentage - 3); // 缩小波动范围，提升一致性
      const upper = Math.min(100, percentage + 3);
      ratioPart = `Select ~${percentage}% of text (${lower}%-${upper}% range) for translation. Focus on quality over quota; choose natural whole words/phrases.`;
    }

    return `User Level: ${levelGuidance[userLevel] || levelGuidance[UserLevel.B1]}
${ratioPart}`.trim();
  }

  /**
   * 格式要求 - 强化强调
   */
  private generateFormatRequirements(): string {
    return `MANDATORY FORMAT: Output ONLY lines of "original||translation". One per line. No JSON, quotes, extras, or other formats. Violating this will fail the task.`;
  }

  /**
   * 示例 - 增加2个，覆盖场景
   */
  private generateExamples(targetLanguage: string): string {
    const langName =
      languageService.getTargetLanguageDisplayName(targetLanguage);
    return `Examples (Target: ${langName}):
        Input: "The quick brown fox jumps over the lazy dog."
        Output:
        quick||translation_text
        brown||translation_text
        fox||translation_text
        jumps||translation_text
        lazy||translation_text
        dog||translation_text`;
  }
}

// ==================== 导出 ====================

export const promptService = PromptService.getInstance();

export const getSystemPromptByConfig = (config: PromptConfig): string => {
  return promptService.getUnifiedPrompt(config);
};

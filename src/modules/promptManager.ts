import { UserLevel } from './types';
import {
  getLanguageNames,
  getTargetLanguageDisplayName,
  LANGUAGES,
} from './languageManager';

// ==================== 常量定义 ====================

/**
 * 共享的基础指令
 */
const BASE_INSTRUCTION =
  "You are an expert in linguistics and a language teacher. Your task is to process a given text paragraph, identify words or phrases suitable for a user's learning level, and provide translations.Your only task is to translate the text in {{}}, which is important";

/**
 * JSON响应格式的基础要求
 */
const JSON_FORMAT_BASE = `You MUST respond with a JSON object containing a single key "replacements", which is an array of objects. Each object in the array must have two keys: "original" (the word or phrase from the source text) and "translation" (the translated version of that word or phrase).
For example:output:
{"replacements": [{"original": "source_word", "translation": "target_translation"},{"original": "source_word1", "translation": "target_translation2"}]}
`;

/**
 * 传统模式的响应格式示例
 */
const TRADITIONAL_FORMAT_EXAMPLES = `Example for zh-to-en: {"replacements": [{"original": "你好", "translation": "Hello"}]}
Example for en-to-zh: {"replacements": [{"original": "Hello", "translation": "你好"}]}`;

// ==================== 辅助函数 ====================

/**
 * 生成用户水平调整指令
 * @param level 用户水平
 * @param isTraditional 是否为传统模式（影响语言描述）
 * @returns 水平调整指令
 */
function generateDifficultyAdjustment(
  level: UserLevel,
  isTraditional: boolean = false,
): string {
  const proficiencyType = isTraditional ? 'English proficiency' : 'proficiency';
  return `The user's ${proficiencyType} is at the ${UserLevel[level]} level. Please adjust the difficulty and frequency of the selected words accordingly.`;
}

/**
 * 生成替换比例控制指令
 * @param replacementRate 替换比例
 * @returns 比例控制指令
 */
function generateRateAdjustment(replacementRate: number): string {
  if (replacementRate <= 0 || replacementRate > 1) {
    return '';
  }

  const percentage = Math.round(replacementRate * 100);

  if (percentage <= 10) {
    return `CRITICAL REPLACEMENT RATE CONTROL: You must be extremely selective and translate only ${percentage}% of the text by character count. For very low rates like ${percentage}%, this means translating only 1-2 key words in a typical sentence. Be very conservative in your selection. If in doubt, translate fewer words rather than more.`;
  } else if (percentage <= 30) {
    return `STRICT REPLACEMENT RATE CONTROL: You must translate exactly ${percentage}% of the text by character count. First, identify all words/phrases suitable for the user's level. Then, from that list, select a conservative subset ensuring the total character length of the *original* words/phrases matches the target percentage as closely as possible.`;
  } else {
    return `REPLACEMENT RATE CONTROL: You must translate a portion of the text that corresponds to ${percentage}% of the total character count. First, identify all words/phrases suitable for the user's level. Then, from that list, select a subset for translation ensuring the total character length of the *original* words/phrases is as close as possible to the target percentage. For example, for a 1000-character text and a ${percentage}% rate, the total length of the words you choose to translate should be very close to ${Math.round(1000 * replacementRate)} characters.`;
  }
}

/**
 * 生成智能模式的响应格式示例
 * @param targetLanguage 目标语言代码
 * @returns 格式化的响应示例
 */
function generateIntelligentFormatExample(targetLanguage: string): string {
  // 从LANGUAGES对象动态获取目标语言的原生名称作为示例翻译
  const targetLangInfo = LANGUAGES[targetLanguage];
  const exampleTranslation = targetLangInfo
    ? targetLangInfo.nativeName
    : 'target_translation';

  return `Example for any-to-${targetLanguage}: {"replacements": [{"original": "source_word", "translation": "${exampleTranslation}_translation"}]}`;
}

// ==================== 核心函数 ====================

/**
 * 智能多语言翻译的系统提示词
 * @param targetLanguage 目标语言代码
 * @param level 用户水平
 * @param replacementRate 替换比例
 * @returns 智能模式的系统提示词
 */
export function getIntelligentSystemPrompt(
  targetLanguage: string,
  level: UserLevel,
  replacementRate: number,
): string {
  const targetLanguageName = getTargetLanguageDisplayName(targetLanguage);

  // 核心任务指令
  const taskInstruction = `The user is a native speaker learning other languages. You will be provided with a text that could be in any language. Your task is to:
                            1. Select key words or phrases suitable for learning
                            2. Provide their ${targetLanguageName} translations

                            CRITICAL RULES:
                            - ALL translations must be in ${targetLanguageName}. Do not translate to any other language.
                            - ABSOLUTELY CRITICAL: If a word or phrase in the source text is already written in ${targetLanguageName}, you MUST completely skip it. Do NOT include it in your response at all. Only translate words that are clearly in a different language than ${targetLanguageName}.
                            - For example, if translating to English and you see "Hello" in the source text, skip it entirely. If translating to Chinese and you see "你好" in the source text, skip it entirely.
                            - The "translation" field must contain ONLY the direct translation of the word/phrase. Do NOT include explanations, pronunciation guides, or additional context.
                            - If you don't follow the rules, my program will crash, so please follow the rules strictly.
                            In the JSON response, the "original" key must contain the source word/phrase, and the "translation" key must contain its ${targetLanguageName} translation.

                            WRONG EXAMPLES (DO NOT DO THIS):
                            - If target is English, DO NOT output: {"original": "Hello", "translation": "Hello"}
                            - If target is Chinese, DO NOT output: {"original": "你好", "translation": "你好"}
                            - DO NOT output: {"original": "word", "translation": "word translation with explanation"}
`;

  // 响应格式（包含示例）
  const responseFormat = `${JSON_FORMAT_BASE}
${generateIntelligentFormatExample(targetLanguage)}`;

  // 组装完整提示词
  const components = [
    BASE_INSTRUCTION,
    taskInstruction,
    generateDifficultyAdjustment(level),
    generateRateAdjustment(replacementRate),
    responseFormat,
  ].filter((component) => component.trim() !== '');

  return components.join('\n\n');
}

/**
 * 传统固定翻译方向的系统提示词
 * @param direction 翻译方向 (例如 'zh-to-en')
 * @param level 用户的英语水平
 * @param replacementRate 替换比例
 * @returns 传统模式的系统提示词
 */
export function getSystemPrompt(
  direction: string,
  level: UserLevel,
  replacementRate: number,
): string {
  // 智能模式检查
  if (direction === 'intelligent') {
    console.error(
      '错误：智能模式应该通过getSystemPromptByConfig调用，而不是getSystemPrompt',
    );
    throw new Error('智能模式应该通过getSystemPromptByConfig调用');
  }

  // 生成任务指令
  const taskInstruction = generateTraditionalTaskInstruction(direction);

  // 格式约束指令
  const formatConstraint = `CRITICAL: The "translation" field must contain ONLY the direct translation of the word/phrase. Do NOT include explanations, pronunciation guides, or additional context.`;

  // 响应格式（包含示例）
  const responseFormat = `${JSON_FORMAT_BASE}
${TRADITIONAL_FORMAT_EXAMPLES}`;

  // 组装完整提示词
  const components = [
    BASE_INSTRUCTION,
    taskInstruction,
    generateDifficultyAdjustment(level, true), // 传统模式使用英语水平描述
    generateRateAdjustment(replacementRate),
    formatConstraint,
    responseFormat,
  ].filter((component) => component.trim() !== '');

  return components.join('\n\n');
}

/**
 * 生成传统模式的任务指令
 * @param direction 翻译方向
 * @returns 任务指令字符串
 */
function generateTraditionalTaskInstruction(direction: string): string {
  const langNames = getLanguageNames(direction);

  if (langNames) {
    const userDescription =
      langNames.source === 'Chinese'
        ? 'The user is a native Chinese speaker.'
        : `The user is a native Chinese speaker learning ${langNames.source}.`;

    return `${userDescription} The provided text is in ${langNames.source}. Your goal is to select key words or phrases and provide their ${langNames.target} translations. In the JSON response, the "original" key must contain the ${langNames.source} word/phrase, and the "translation" key must contain its ${langNames.target} translation.`;
  } else {
    // 默认情况（向后兼容）
    return 'The user is a native Chinese speaker. The provided text is in Chinese. Your goal is to select Chinese words or phrases and provide their ENGLISH translations to create a mixed-language learning environment. In the JSON response, the "original" key must contain the Chinese word/phrase, and the "translation" key must contain its English translation.';
  }
}

/**
 * 统一的提示词获取入口
 * @param config 翻译配置对象
 * @returns 系统提示词
 */
export function getSystemPromptByConfig(config: {
  translationDirection: string;
  targetLanguage?: string;
  userLevel: UserLevel;
  replacementRate: number;
  intelligentMode?: boolean;
}): string {
  // 智能模式路由
  if (config.intelligentMode || config.translationDirection === 'intelligent') {
    if (!config.targetLanguage) {
      throw new Error('智能模式下必须提供目标语言');
    }
    return getIntelligentSystemPrompt(
      config.targetLanguage,
      config.userLevel,
      config.replacementRate,
    );
  }

  // 传统模式路由
  return getSystemPrompt(
    config.translationDirection,
    config.userLevel,
    config.replacementRate,
  );
}

/**
 * 简单文本解析器
 * 专为 "原文||译文" 格式设计，极简高效
 */

export interface ParsedReplacement {
  original: string;
  translation: string;
}

export interface ParseResult {
  success: boolean;
  replacements: ParsedReplacement[];
  errors: string[];
}

/**
 * 简单文本解析器类
 */
export class StructuredTextParser {
  /**
   * 解析简单的双竖线格式文本
   * @param text AI返回的文本
   * @returns 解析结果
   */
  public static parse(text: string): ParseResult {
    const result: ParseResult = {
      success: false,
      replacements: [],
      errors: [],
    };

    try {
      // 清理文本
      const cleanedText = this.cleanText(text);

      // 解析替换项
      const replacements = this.parseDoubleBarFormat(cleanedText);

      result.replacements = replacements.filter(
        (r: ParsedReplacement) => r.original && r.translation,
      );
      result.success = result.replacements.length > 0;

      if (result.replacements.length === 0) {
        result.errors.push('没有找到有效的替换项');
      }
    } catch (error) {
      result.errors.push(
        `解析错误: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('[双竖线解析] 解析失败:', error);
    }

    return result;
  }

  /**
   * 清理文本，移除多余的空白和格式字符
   */
  private static cleanText(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '') // 移除代码块
      .replace(/^\s*[\r\n]/gm, '') // 移除空行
      .trim();
  }

  /**
   * 解析双竖线格式: 原文||译文
   */
  private static parseDoubleBarFormat(text: string): ParsedReplacement[] {
    const replacements: ParsedReplacement[] = [];

    // 按行分割
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      // 首先尝试双竖线分隔符
      if (line.includes('||')) {
        const parts = line.split('||');
        if (parts.length >= 2) {
          const original = parts[0].trim();
          const translation = parts[1].trim();
          if (original && translation) {
            // [双竖线解析] 找到替换项
            replacements.push({ original, translation });
            continue;
          }
        }
      }

      // 备用分隔符（容错处理）
      const fallbackResult = this.parseFallbackSeparators(line);
      if (fallbackResult) {
        replacements.push(fallbackResult);
      }
    }

    return replacements;
  }

  /**
   * 解析备用分隔符格式（容错处理）
   */
  private static parseFallbackSeparators(
    line: string,
  ): ParsedReplacement | null {
    // 常见的分隔符，按优先级排序
    const separators = ['→', '->', ':', '=', '|'];

    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep);
        if (parts.length >= 2) {
          const original = parts[0].trim();
          const translation = parts[1].trim();
          if (original && translation) {
            return { original, translation };
          }
        }
      }
    }

    return null;
  }

  /**
   * 验证解析结果
   */
  public static validateResult(
    result: ParseResult,
    expectedMinimum: number = 1,
  ): boolean {
    if (!result.success) {
      console.warn('[双竖线解析] 解析失败:', result.errors);
      return false;
    }

    if (result.replacements.length < expectedMinimum) {
      return false;
    }

    // 验证每个替换项的有效性
    for (const replacement of result.replacements) {
      if (!replacement.original || !replacement.translation) {
        console.warn('[双竖线解析] 发现无效的替换项:', replacement);
        return false;
      }

      if (
        replacement.original.length < 1 ||
        replacement.translation.length < 1
      ) {
        console.warn('[双竖线解析] 替换项内容过短:', replacement);
        return false;
      }
    }

    return true;
  }
}

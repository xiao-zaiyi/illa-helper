import type { Replacement } from '../shared/types/api';
import type { ContentSegment } from './ProcessingStateManager';

export function countTranslationUnits(text: string): number {
  const latinWords = text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) ?? [];
  const cjkChars = text.match(/[\p{Script=Han}]/gu) ?? [];

  // 中文没有天然空格分词。按单字计算会让低替换率明显偏高；
  // 这里用两字≈一个学习单位的保守估算，避免为限额引入分词依赖。
  return latinWords.length + Math.ceil(cjkChars.length / 2);
}

export function calculateReplacementLimit(
  text: string,
  replacementRate?: number,
): number | undefined {
  if (replacementRate === undefined || Number.isNaN(replacementRate)) {
    return undefined;
  }

  if (replacementRate <= 0) {
    return 0;
  }

  if (replacementRate >= 1) {
    return undefined;
  }

  const unitCount = countTranslationUnits(text);
  if (unitCount === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(unitCount * replacementRate));
}

export class ReplacementBudget {
  private remainingCount: number | undefined;

  private constructor(totalLimit: number | undefined) {
    this.remainingCount = totalLimit;
  }

  static unlimited(): ReplacementBudget {
    return new ReplacementBudget(undefined);
  }

  static fromText(text: string, replacementRate?: number): ReplacementBudget {
    return new ReplacementBudget(
      calculateReplacementLimit(text, replacementRate),
    );
  }

  static fromSegments(
    segments: ContentSegment[],
    replacementRate?: number,
  ): ReplacementBudget {
    const text = segments.map((segment) => segment.textContent).join('');
    return this.fromText(text, replacementRate);
  }

  addSegments(segments: ContentSegment[], replacementRate?: number): void {
    const text = segments.map((segment) => segment.textContent).join('');
    this.addText(text, replacementRate);
  }

  addText(text: string, replacementRate?: number): void {
    if (this.remainingCount === undefined) {
      return;
    }

    const additionalLimit = calculateReplacementLimit(text, replacementRate);
    if (additionalLimit === undefined || additionalLimit <= 0) {
      return;
    }

    this.remainingCount += additionalLimit;
  }

  take<T extends Replacement>(replacements: T[]): T[] {
    if (this.remainingCount === undefined) {
      return replacements;
    }

    if (this.remainingCount <= 0) {
      return [];
    }

    const accepted = replacements.slice(0, this.remainingCount);
    this.remainingCount -= accepted.length;
    return accepted;
  }

  restore(count: number): void {
    if (this.remainingCount === undefined || count <= 0) {
      return;
    }

    this.remainingCount += count;
  }

  getRemainingCount(): number | undefined {
    return this.remainingCount;
  }
}

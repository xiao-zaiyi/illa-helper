/**
 * 文本处理工具函数
 */

import { Replacement } from '../../shared/types/api';
import { calculateReplacementLimit } from '../../processing/ReplacementBudget';

export interface ReplacementLimitOptions {
  replacementRate?: number;
}

/**
 * 为替换项添加位置信息
 */
export function addPositionsToReplacements(
  originalText: string,
  replacements: Array<{ original: string; translation: string }>,
  options: ReplacementLimitOptions = {},
): Replacement[] {
  const result: Replacement[] = [];
  let lastIndex = 0;

  for (const rep of replacements) {
    if (!rep.original || !rep.translation) continue;

    const index = originalText.indexOf(rep.original, lastIndex);
    if (index !== -1) {
      const foundText = originalText.substring(
        index,
        index + rep.original.length,
      );
      if (foundText === rep.original) {
        result.push({
          ...rep,
          position: { start: index, end: index + rep.original.length },
          isNew: true,
        });
        lastIndex = index + rep.original.length;
      }
    } else {
      const globalIndex = originalText.indexOf(rep.original);
      if (
        globalIndex !== -1 &&
        !result.some(
          (r) =>
            r.position.start <= globalIndex && r.position.end > globalIndex,
        )
      ) {
        result.push({
          ...rep,
          position: {
            start: globalIndex,
            end: globalIndex + rep.original.length,
          },
          isNew: true,
        });
      }
    }
  }

  result.sort((a, b) => a.position.start - b.position.start);
  return limitReplacementsByRate(originalText, result, options.replacementRate);
}

export function limitReplacementsByRate(
  originalText: string,
  replacements: Replacement[],
  replacementRate?: number,
): Replacement[] {
  if (replacementRate === undefined || Number.isNaN(replacementRate)) {
    return replacements;
  }

  if (replacementRate <= 0) {
    return [];
  }

  if (replacementRate >= 1 || replacements.length <= 1) {
    return replacements;
  }

  const maxReplacementCount = calculateReplacementLimit(
    originalText,
    replacementRate,
  );

  if (maxReplacementCount === undefined) {
    return replacements;
  }

  if (maxReplacementCount <= 0) {
    return [];
  }

  return replacements.slice(0, maxReplacementCount);
}

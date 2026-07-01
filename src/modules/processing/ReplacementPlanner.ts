import type { Replacement } from '../shared/types/api';

export function buildTextFromNodes(textNodes: Text[]): string {
  return textNodes.map((node) => node.textContent || '').join('');
}

export function planStableReplacements(
  currentText: string,
  replacements: Replacement[],
): Replacement[] {
  const occupiedRanges: Array<{ start: number; end: number }> = [];

  return replacements
    .map((replacement) => resolveReplacementPosition(currentText, replacement))
    .filter((replacement): replacement is Replacement => replacement !== null)
    .sort((a, b) => a.position.start - b.position.start)
    .filter((replacement) => {
      if (hasOverlap(occupiedRanges, replacement.position)) {
        return false;
      }

      occupiedRanges.push(replacement.position);
      return true;
    });
}

function resolveReplacementPosition(
  currentText: string,
  replacement: Replacement,
): Replacement | null {
  const { start, end } = replacement.position;

  if (
    start >= 0 &&
    end <= currentText.length &&
    start < end &&
    currentText.substring(start, end) === replacement.original
  ) {
    return replacement;
  }

  // DOM 可能在模型返回前发生轻微变化。只在原位置附近找，避免重复词被重定位到第一处。
  const nearbyStart = Math.max(0, start - replacement.original.length);
  const nearbyEnd = Math.min(
    currentText.length,
    end + replacement.original.length,
  );
  const nearbyText = currentText.slice(nearbyStart, nearbyEnd);
  const nearbyIndex = nearbyText.indexOf(replacement.original);

  if (nearbyIndex === -1) {
    return null;
  }

  const resolvedStart = nearbyStart + nearbyIndex;
  return {
    ...replacement,
    position: {
      start: resolvedStart,
      end: resolvedStart + replacement.original.length,
    },
  };
}

function hasOverlap(
  ranges: Array<{ start: number; end: number }>,
  position: { start: number; end: number },
): boolean {
  return ranges.some(
    (range) => position.start < range.end && position.end > range.start,
  );
}

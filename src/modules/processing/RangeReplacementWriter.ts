import {
  OriginalWordDisplayMode,
  TranslationPosition,
} from '../shared/types/core';
import type { Replacement } from '../shared/types/api';

export interface RangeReplacementOptions {
  styleClass: string;
  originalWordDisplayMode: OriginalWordDisplayMode;
  translationPosition: TranslationPosition;
  showParentheses: boolean;
}

export function applyReplacementToRange(
  range: Range,
  replacement: Replacement,
  options: RangeReplacementOptions,
): { success: boolean; translationElement?: HTMLElement } {
  try {
    const originalWordWrapper = document.createElement('span');
    originalWordWrapper.className = 'wxt-original-word';
    originalWordWrapper.setAttribute('data-wxt-word-processed', 'true');

    const extractedContent = range.extractContents();
    originalWordWrapper.appendChild(extractedContent);

    if (!originalWordWrapper.textContent) {
      return { success: false };
    }

    const translationSpan = document.createElement('span');
    translationSpan.className = `wxt-translation-term ${options.styleClass}`;
    translationSpan.setAttribute('data-original-text', replacement.original);
    translationSpan.textContent = options.showParentheses
      ? ` (${replacement.translation}) `
      : ` ${replacement.translation} `;

    switch (options.originalWordDisplayMode) {
      case OriginalWordDisplayMode.HIDDEN:
        originalWordWrapper.style.display = 'none';
        break;
      case OriginalWordDisplayMode.LEARNING:
        originalWordWrapper.classList.add('wxt-original-word--learning');
        break;
    }

    range.insertNode(originalWordWrapper);
    if (options.translationPosition === TranslationPosition.BEFORE) {
      originalWordWrapper.before(translationSpan);
    } else {
      originalWordWrapper.after(translationSpan);
    }

    return { success: true, translationElement: translationSpan };
  } catch (_) {
    return { success: false };
  }
}

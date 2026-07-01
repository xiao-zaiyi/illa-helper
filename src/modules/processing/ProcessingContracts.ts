import type { FullTextAnalysisResponse } from '../shared/types/api';

export interface TranslationStyleProvider {
  getCurrentStyleClass(): string;
}

export interface TextReplacementEngine {
  readonly styleManager: TranslationStyleProvider;
  replaceText(text: string): Promise<FullTextAnalysisResponse>;
  getConfig(): {
    replacementRate?: number;
  };
}

export interface PronunciationRegistrar {
  addPronunciationToElement(
    element: HTMLElement,
    word: string,
    isPhrase?: boolean,
  ): Promise<boolean>;
}

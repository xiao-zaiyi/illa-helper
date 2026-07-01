import { PARAGRAPH_TRANSLATION } from '../../shared/constants';

const INLINE_CONTAINER_TAGS = new Set(['TABLE', 'TD', 'TH', 'LI']);
const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const INTERNAL_BLOCK_TAGS = new Set(['P', 'BLOCKQUOTE']);

export function renderParagraphTranslation(
  element: HTMLElement,
  translatedText: string,
  styleClass: string,
): void {
  const display = window.getComputedStyle(element).display;

  if (INTERNAL_BLOCK_TAGS.has(element.tagName)) {
    const translationElement = document.createElement('span');
    translationElement.classList.add(
      PARAGRAPH_TRANSLATION.WRAPPER_CLASS,
      styleClass,
    );
    translationElement.textContent = translatedText;
    applyStyles(translationElement, [
      ['display', 'block', 'important'],
      ['position', 'static'],
      ['float', 'none'],
      ['clear', 'none'],
      ['width', 'auto'],
      ['max-width', '100%'],
      ['margin', '0.35em 0 0'],
      ['padding', '0'],
      ['white-space', 'normal'],
      ['writing-mode', 'horizontal-tb'],
      ['text-orientation', 'mixed'],
    ]);
    element.appendChild(translationElement);
    return;
  }

  if (INLINE_CONTAINER_TAGS.has(element.tagName)) {
    appendInlineTranslation(element, translatedText, styleClass, [
      'display: inline-block',
      'margin-left: 8px',
      'vertical-align: baseline',
      'white-space: normal',
      'writing-mode: horizontal-tb',
    ]);
    return;
  }

  if (
    shouldRenderInline(element, display) ||
    hasOnlyInlineFlowContent(element)
  ) {
    appendInlineTranslation(element, translatedText, styleClass, [
      'display: inline',
      'margin-left: 0.35em',
      'white-space: normal',
      'writing-mode: horizontal-tb',
    ]);
    return;
  }

  if (HEADING_TAGS.has(element.tagName)) {
    const translationElement = createBlockTranslationElement(
      translatedText,
      styleClass,
      [
        'display: block',
        'position: static',
        'float: none',
        'clear: none',
        'width: auto',
        'max-width: 100%',
        'margin: 0.25em 0 0',
        'padding: 0',
        'white-space: normal',
        'writing-mode: horizontal-tb',
        'text-orientation: mixed',
      ],
    );
    element.appendChild(translationElement);
    return;
  }

  const translationElement = createBlockTranslationElement(
    translatedText,
    styleClass,
    [
      'display: block',
      'position: static',
      'float: none',
      'clear: both',
      'width: auto',
      'max-width: 100%',
      'margin: 0.35em 0 0.8em',
      'padding: 0',
      'white-space: normal',
      'writing-mode: horizontal-tb',
      'text-orientation: mixed',
    ],
  );

  element.parentNode?.insertBefore(translationElement, element.nextSibling);
}

function appendInlineTranslation(
  element: HTMLElement,
  translatedText: string,
  styleClass: string,
  styles: string[],
): void {
  const span = document.createElement('span');
  span.classList.add(PARAGRAPH_TRANSLATION.WRAPPER_CLASS, styleClass);
  span.style.cssText = styles.join('; ');
  span.textContent = translatedText;
  element.appendChild(span);
}

function applyStyles(
  element: HTMLElement,
  styles: Array<[string, string, 'important'?]>,
): void {
  styles.forEach(([property, value, priority]) => {
    element.style.setProperty(property, value, priority);
  });
}

function createBlockTranslationElement(
  translatedText: string,
  styleClass: string,
  styles: string[],
): HTMLElement {
  const translationElement = document.createElement('div');
  translationElement.classList.add(
    PARAGRAPH_TRANSLATION.WRAPPER_CLASS,
    styleClass,
  );
  translationElement.textContent = translatedText;
  translationElement.style.cssText = styles.join('; ');
  return translationElement;
}

function shouldRenderInline(element: HTMLElement, display: string): boolean {
  if (element.tagName === 'SPAN') return true;
  if (!display) return false;
  return display === 'contents' || display.includes('inline');
}

function hasOnlyInlineFlowContent(element: HTMLElement): boolean {
  const children = Array.from(element.children) as HTMLElement[];
  if (children.length === 0) return false;

  return children.every((child) => {
    const display = window.getComputedStyle(child).display;
    return (
      child.tagName === 'A' ||
      display === 'contents' ||
      display.includes('inline')
    );
  });
}

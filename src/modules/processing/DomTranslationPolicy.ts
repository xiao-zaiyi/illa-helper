import { SKIP_TAGS } from '../shared/constants';

const EXTENSION_RESULT_SELECTOR = [
  '.wxt-translation-term',
  '.wxt-original-word',
  '.wxt-pronunciation-tooltip',
  '.wxt-word-tooltip',
  '.wxt-interactive-word',
  '.wxt-phonetic-text',
  '.wxt-phonetic-loading',
  '.wxt-meaning-container',
  '.wxt-meaning-text',
  '.wxt-meaning-loading',
  '.wxt-audio-btn',
  '.wxt-accent-audio-btn',
  '.wxt-tts-button',
  '.wxt-floating-ball',
  '.wxt-floating-panel',
  '.wxt-processing',
  '.illa-paragraph-translation',
  '.illa-paragraph-loading',
].join(',');

const PROCESSED_ATTRIBUTES = [
  'data-wxt-text-processed',
  'data-wxt-word-processed',
  'data-pronunciation-added',
];

export function isHTMLElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE && 'tagName' in node;
}

export function isProcessingResultNode(node: Node): boolean {
  if (!isHTMLElement(node)) {
    return false;
  }

  return isExtensionOwnedElement(node) || hasProcessedAttribute(node);
}

export function shouldSkipSubtree(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName.toUpperCase())) {
    return true;
  }

  if (isHiddenElement(element)) {
    return true;
  }

  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  if (element.hasAttribute('inert')) {
    return true;
  }

  if ((element as HTMLElement).isContentEditable) {
    return true;
  }

  return isExtensionOwnedElement(element) || hasProcessedAttribute(element);
}

export function isTranslatableTextNode(
  node: Text,
  boundary?: Element,
): boolean {
  if (!node.textContent?.trim()) {
    return false;
  }

  let parent = node.parentElement;
  while (parent) {
    if (shouldSkipSubtree(parent)) {
      return false;
    }

    if (parent === boundary) {
      break;
    }

    parent = parent.parentElement;
  }

  return true;
}

export function isTranslationCandidateNode(
  node: Node,
  minTextLength = 1,
): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? '';
    return text.length >= minTextLength && isTranslatableTextNode(node as Text);
  }

  if (!isHTMLElement(node) || shouldSkipSubtree(node)) {
    return false;
  }

  const text = node.textContent?.trim() ?? '';
  return text.length >= minTextLength && !isMostlyPunctuation(text);
}

function isExtensionOwnedElement(element: Element): boolean {
  if (element.tagName.toLowerCase() === 'wxt-floating-menu') {
    return true;
  }

  return Boolean(
    element.matches?.(EXTENSION_RESULT_SELECTOR) ||
      element.closest?.(EXTENSION_RESULT_SELECTOR),
  );
}

function hasProcessedAttribute(element: Element): boolean {
  return PROCESSED_ATTRIBUTES.some((attr) => element.hasAttribute(attr));
}

function isHiddenElement(element: Element): boolean {
  if (element.hasAttribute('hidden')) {
    return true;
  }

  const style = element.ownerDocument.defaultView?.getComputedStyle?.(element);
  if (!style) {
    return false;
  }

  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  );
}

function isMostlyPunctuation(text: string): boolean {
  return /^[\d\s.,!?\-+=()[\]{}:;'"，。！？、（）【】《》]+$/.test(text);
}

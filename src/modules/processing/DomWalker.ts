/**
 * DOM Walker - 统一的 DOM 遍历与标记模块
 *
 * 参考 read-frog 的 walk-label 设计：
 * 1. 深度优先遍历 DOM 树
 * 2. 基于 getComputedStyle 判断 block/inline（语义标签强制 block）
 * 3. 含有 inline 子内容的节点标记为 "paragraph"（翻译基本单元）
 * 4. walkId 防重，避免并发冲突和重复遍历
 *
 * 单词翻译和段落翻译共用此模块获取 DOM 节点。
 */

import {
  SKIP_TAGS,
  ATOMIC_INLINE_TAGS,
  FORCE_BLOCK_TAGS,
  DOM_LABELS,
} from '../shared/constants';

// ============================================================
// 类型定义
// ============================================================

export interface WalkResult {
  /** 是否强制为 block */
  forceBlock: boolean;
  /** 是否为 inline 节点 */
  isInline: boolean;
}

export interface ParagraphInfo {
  /** 段落元素 */
  element: HTMLElement;
  /** 提取的文本内容 */
  textContent: string;
  /** 段落内的文本节点 */
  textNodes: Text[];
}

// ============================================================
// 元素分类判断
// ============================================================

function isHTMLElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE && 'tagName' in node;
}

/** 是否应该完全跳过（不遍历、不翻译） */
function shouldSkipEntirely(element: HTMLElement): boolean {
  if (SKIP_TAGS.has(element.tagName)) return true;

  // 隐藏元素
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return true;

  // aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') return true;

  // 可编辑元素
  if (element.isContentEditable) return true;

  // 扩展自身注入的元素
  if (
    element.classList.contains('wxt-translation-term') ||
    element.classList.contains('wxt-original-word') ||
    element.classList.contains('wxt-pronunciation-tooltip') ||
    element.classList.contains('illa-paragraph-translation') ||
    element.id?.includes('wxt') ||
    element.tagName.toLowerCase() === 'wxt-floating-menu'
  ) {
    return true;
  }

  // 已处理的元素
  if (
    element.hasAttribute('data-wxt-text-processed') ||
    element.hasAttribute('data-wxt-word-processed')
  ) {
    return true;
  }

  return false;
}

/** 是否为原子 inline 元素（不深入遍历，但文本参与父级翻译） */
function isAtomicInline(element: HTMLElement): boolean {
  return ATOMIC_INLINE_TAGS.has(element.tagName);
}

/** 基于计算样式判断是否为 inline 元素 */
function isInlineElement(element: HTMLElement): boolean {
  // 无文本内容的元素不算 inline
  if (!element.textContent?.trim()) return false;

  // 强制 block 标签
  if (FORCE_BLOCK_TAGS.has(element.tagName)) return false;

  const style = window.getComputedStyle(element);
  const display = style.display;

  // inline / inline-block / inline-flex / contents 视为 inline
  return display.includes('inline') || display === 'contents';
}

// ============================================================
// 文本提取
// ============================================================

/**
 * 从段落节点中提取文本内容，保留合理的空白
 */
function extractTextFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    const trimmed = text.trim();
    if (!trimmed) return '';

    // 保留有意义的前后空格（非换行空白）
    const hasLeading = /^\s/.test(text) && !/^\n/.test(text);
    const hasTrailing = /\s$/.test(text) && !/\n$/.test(text);
    return (hasLeading ? ' ' : '') + trimmed + (hasTrailing ? ' ' : '');
  }

  if (!isHTMLElement(node)) return '';

  const element = node as HTMLElement;

  if (element.tagName === 'BR') return '\n';

  // 跳过完全忽略的元素
  if (shouldSkipEntirely(element)) return '';

  // 原子 inline 元素 - 直接取文本
  if (isAtomicInline(element)) {
    return element.textContent?.trim() ?? '';
  }

  // 递归子节点
  let result = '';
  for (const child of element.childNodes) {
    result += extractTextFromNode(child);
  }
  return result;
}

/**
 * 收集段落内的文本节点
 */
function collectTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;

      // 检查父元素是否应该跳过
      let parent = node.parentElement;
      while (parent && parent !== element) {
        if (shouldSkipEntirely(parent)) return NodeFilter.FILTER_REJECT;
        parent = parent.parentElement;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }
  return textNodes;
}

// ============================================================
// 核心遍历逻辑
// ============================================================

/**
 * 遍历并标记 DOM 元素
 *
 * 递归遍历 element 的子树，给每个节点打上语义标签：
 * - data-illa-walked: 已遍历（值为 walkId）
 * - data-illa-paragraph: 段落节点（含有 inline 子内容，是翻译单元）
 * - data-illa-block: 块级节点
 * - data-illa-inline: 行内节点
 */
function walkAndLabel(element: HTMLElement, walkId: string): WalkResult {
  // 已经被本次 walk 遍历过，跳过
  if (element.getAttribute(DOM_LABELS.WALKED) === walkId) {
    return { forceBlock: false, isInline: false };
  }

  // 原子 inline - 不深入，标记为 inline
  if (isAtomicInline(element)) {
    return { forceBlock: false, isInline: true };
  }

  // 完全跳过
  if (shouldSkipEntirely(element)) {
    return { forceBlock: false, isInline: false };
  }

  // 标记已遍历
  element.setAttribute(DOM_LABELS.WALKED, walkId);

  let hasInlineChild = false;

  // 遍历子节点
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) {
        hasInlineChild = true;
      }
    } else if (isHTMLElement(child)) {
      const result = walkAndLabel(child, walkId);
      if (result.isInline) {
        hasInlineChild = true;
      }
    }
  }

  // 标记段落：含有 inline 子内容的节点
  if (hasInlineChild) {
    element.setAttribute(DOM_LABELS.PARAGRAPH, '');
  }

  // 判断 block / inline
  const inline = isInlineElement(element);
  if (inline) {
    element.setAttribute(DOM_LABELS.INLINE, '');
  } else {
    element.setAttribute(DOM_LABELS.BLOCK, '');
  }

  return { forceBlock: false, isInline: inline };
}

/**
 * 清除 walk 标记
 */
function clearLabels(root: HTMLElement): void {
  const labeled = root.querySelectorAll(
    `[${DOM_LABELS.WALKED}], [${DOM_LABELS.PARAGRAPH}], [${DOM_LABELS.BLOCK}], [${DOM_LABELS.INLINE}]`,
  );
  for (const el of labeled) {
    el.removeAttribute(DOM_LABELS.WALKED);
    el.removeAttribute(DOM_LABELS.PARAGRAPH);
    el.removeAttribute(DOM_LABELS.BLOCK);
    el.removeAttribute(DOM_LABELS.INLINE);
  }
  // 也清除 root 自身
  root.removeAttribute(DOM_LABELS.WALKED);
  root.removeAttribute(DOM_LABELS.PARAGRAPH);
  root.removeAttribute(DOM_LABELS.BLOCK);
  root.removeAttribute(DOM_LABELS.INLINE);
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 遍历 DOM 并收集所有段落信息
 *
 * 这是两种翻译模式共用的入口：
 * - 单词翻译模式：用返回的 ParagraphInfo 构建 ContentSegment
 * - 段落翻译模式：用返回的 ParagraphInfo.element 作为翻译单元
 *
 * @param root 遍历的根节点
 * @returns 段落信息列表（按文档顺序）
 */
export function walkAndCollectParagraphs(root: HTMLElement): ParagraphInfo[] {
  const walkId = crypto.randomUUID();

  // 第一步：遍历并标记
  walkAndLabel(root, walkId);

  // 第二步：收集所有段落节点
  const paragraphElements = root.querySelectorAll<HTMLElement>(
    `[${DOM_LABELS.PARAGRAPH}]`,
  );

  const paragraphs: ParagraphInfo[] = [];

  for (const element of paragraphElements) {
    // 跳过内部包含其他段落的节点（只取叶子段落）
    // 但如果段落内有 block 子节点，仍然保留（后续由调用方处理混合内容）
    const childParagraphs = element.querySelectorAll(
      `[${DOM_LABELS.PARAGRAPH}]`,
    );
    if (childParagraphs.length > 0) {
      // 检查是否所有子段落都是 inline 的（即这个节点本身就是最终段落）
      let hasBlockParagraphChild = false;
      for (const cp of childParagraphs) {
        if (cp.hasAttribute(DOM_LABELS.BLOCK)) {
          hasBlockParagraphChild = true;
          break;
        }
      }
      // 如果有 block 子段落，跳过当前节点（让子段落各自处理）
      if (hasBlockParagraphChild) continue;
    }

    const textContent = extractTextFromNode(element);
    if (!textContent.trim() || textContent.trim().length < 2) continue;

    const textNodes = collectTextNodes(element);
    if (textNodes.length === 0) continue;

    paragraphs.push({ element, textContent, textNodes });
  }

  // 第三步：清除标记，避免污染 DOM
  clearLabels(root);

  return paragraphs;
}

/**
 * 判断一个元素是否应该被跳过（供外部模块使用）
 */
export {
  shouldSkipEntirely,
  isInlineElement,
  isHTMLElement,
  extractTextFromNode,
  collectTextNodes,
};

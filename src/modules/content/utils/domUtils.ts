import { browser } from 'wxt/browser';
import { languageService } from '../../core/translation/LanguageService';

/**
 * 检查节点是否是处理结果节点（翻译、发音等功能元素）
 */
export function isProcessingResultNode(node: Node): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    // 检查是否是翻译或发音相关的元素
    const processingClasses = [
      'wxt-translation-term',
      'wxt-original-word',
      'wxt-pronunciation-tooltip',
      'wxt-phonetic-text',
      'wxt-tts-button',
      'wxt-processing',
    ];

    for (const className of processingClasses) {
      if (element.classList.contains(className)) {
        return true;
      }
    }

    // 检查是否包含处理标记属性
    if (
      element.hasAttribute('data-wxt-word-processed') ||
      element.hasAttribute('data-pronunciation-added')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 检查一个节点是否是节点集合中任何其他节点的后代
 */
export function isDescendant(node: Node, nodeSet: Set<Node>): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (nodeSet.has(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 使用 browser.i18n.detectLanguage API 自动检测页面主要语言
 * @returns 检测到的语言代码（标准化后）
 */
export async function detectPageLanguage(): Promise<string> {
  try {
    const textSample = document.body.innerText.substring(0, 1000);
    if (!textSample.trim()) {
      return 'zh'; // 默认返回中文
    }

    const result = await browser.i18n.detectLanguage(textSample);

    if (result?.languages?.[0]?.language) {
      const detectedLang = result.languages[0].language;
      // 使用LanguageService进行语言代码标准化
      return languageService.normalizeLanguageCode(detectedLang);
    }

    return 'zh'; // 检测失败时默认返回中文
  } catch (error) {
    console.warn('页面语言检测失败:', error);
    return 'zh'; // 出错时默认返回中文
  }
}

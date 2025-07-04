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
 */
export async function detectPageLanguage(): Promise<string> {
    try {
        const textSample = document.body.innerText.substring(0, 1000);
        if (!textSample.trim()) return 'zh-to-en';

        const result = await browser.i18n.detectLanguage(textSample);

        if (result?.languages?.[0]?.language === 'en') {
            return 'en-to-zh';
        }
        return 'zh-to-en';
    } catch (_) {
        return 'zh-to-en'; // 出错时默认
    }
}
